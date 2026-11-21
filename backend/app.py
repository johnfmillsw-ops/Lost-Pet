
import os
import io
import uuid
from datetime import datetime, timezone
from functools import wraps
from pathlib import Path
from math import radians, sin, cos, asin, sqrt

from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from PIL import Image, ImageOps
from itsdangerous import (
    URLSafeTimedSerializer,
    BadSignature,
    SignatureExpired,
)
import imagehash


# ============================================================
# CONFIGURATION
# ============================================================

ROOT = Path(__file__).resolve().parent.parent

UPLOADS = Path(
    os.environ.get("UPLOAD_DIR", str(ROOT / "uploads"))
)
UPLOADS.mkdir(parents=True, exist_ok=True)

app = Flask(
    __name__,
    static_folder=str(ROOT / "frontend" / "dist"),
    static_url_path="",
)

app.config["SECRET_KEY"] = os.environ.get(
    "SECRET_KEY", "dev-only-change-me"
)

app.config["SQLALCHEMY_DATABASE_URI"] = (
    os.environ.get(
        "DATABASE_URL",
        "sqlite:///" + str(ROOT / "pets.db"),
    ).replace("postgres://", "postgresql://", 1)
)

app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["MAX_CONTENT_LENGTH"] = 8 * 1024 * 1024

CORS(
    app,
    resources={
        r"/api/*": {
            "origins": os.environ.get(
                "CORS_ORIGIN",
                "http://localhost:5173",
            )
        }
    },
)

db = SQLAlchemy(app)
signer = URLSafeTimedSerializer(app.config["SECRET_KEY"])


# ============================================================
# DATABASE MODELS
# ============================================================

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    email = db.Column(
        db.String(255),
        unique=True,
        nullable=False,
    )

    password = db.Column(
        db.String(255),
        nullable=False,
    )


class Report(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    owner_id = db.Column(
        db.Integer,
        db.ForeignKey("user.id"),
        nullable=True,
    )

    kind = db.Column(db.String(10), nullable=False)
    name = db.Column(db.String(100), default="")
    species = db.Column(db.String(50), nullable=False)
    description = db.Column(db.Text, default="")
    city = db.Column(db.String(150), nullable=False)

    lat = db.Column(db.Float, nullable=True)
    lon = db.Column(db.Float, nullable=True)

    event_date = db.Column(db.String(10), nullable=False)

    source_url = db.Column(
        db.String(1000),
        default="",
    )

    photo = db.Column(db.String(80), nullable=False)
    phash = db.Column(db.String(16), nullable=False)

    created = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
    )


with app.app_context():
    db.create_all()


# ============================================================
# AUTHENTICATION
# ============================================================

def token_user():
    auth = request.headers.get("Authorization", "")

    if not auth.startswith("Bearer "):
        return None

    try:
        uid = signer.loads(
            auth[7:],
            max_age=60 * 60 * 24 * 14,
        )

        return db.session.get(User, int(uid))

    except (BadSignature, SignatureExpired, ValueError, TypeError):
        return None


def login_required(fn):
    @wraps(fn)
    def inner(*args, **kwargs):
        user = token_user()

        if not user:
            return jsonify(error="Login required"), 401

        return fn(user, *args, **kwargs)

    return inner


def error(message, code=400):
    return jsonify(error=message), code


# ============================================================
# REGISTER
# ============================================================

@app.post("/api/register")
def register():
    data = request.get_json(silent=True) or {}

    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    if "@" not in email or len(password) < 10:
        return error(
            "Valid email and password of at least "
            "10 characters required"
        )

    existing = db.session.query(User).filter_by(
        email=email
    ).first()

    if existing:
        return error("Email already registered", 409)

    # Explicit PBKDF2 avoids the hashlib.scrypt error
    # in your current Python environment.
    hashed_password = generate_password_hash(
        password,
        method="pbkdf2:sha256",
        salt_length=16,
    )

    user = User(
        email=email,
        password=hashed_password,
    )

    db.session.add(user)
    db.session.commit()

    return jsonify(
        token=signer.dumps(user.id),
        email=user.email,
    ), 201


# ============================================================
# LOGIN
# ============================================================

@app.post("/api/login")
def login():
    data = request.get_json(silent=True) or {}

    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", ""))

    user = db.session.query(User).filter_by(
        email=email
    ).first()

    if not user:
        return error("Invalid credentials", 401)

    if not check_password_hash(user.password, password):
        return error("Invalid credentials", 401)

    return jsonify(
        token=signer.dumps(user.id),
        email=user.email,
    )


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/api/health")
def health():
    return jsonify(
        status="ok",
        application="Lost-Pet",
    )


# ============================================================
# REPORT SERIALIZATION
# ============================================================

def report_json(report):
    return {
        "id": report.id,
        "kind": report.kind,
        "name": report.name,
        "species": report.species,
        "description": report.description,
        "city": report.city,
        "lat": report.lat,
        "lon": report.lon,
        "event_date": report.event_date,
        "source_url": report.source_url,
        "photo_url": f"/api/photos/{report.photo}",
        "created": report.created.isoformat(),
    }


# ============================================================
# UPLOAD LOST OR FOUND PET
# ============================================================

@app.post("/api/reports")
@login_required
def create_report(user):
    kind = request.form.get("kind", "").strip().lower()
    species = request.form.get(
        "species", ""
    ).strip().lower()

    city = request.form.get("city", "").strip()
    event_date = request.form.get("event_date", "").strip()

    if kind not in ("lost", "found"):
        return error("Report type must be lost or found")

    if not species or not city:
        return error("Species and city are required")

    try:
        datetime.strptime(event_date, "%Y-%m-%d")
    except ValueError:
        return error("Date must be YYYY-MM-DD")

    source_url = request.form.get(
        "source_url", ""
    ).strip()

    if source_url and not source_url.startswith(
        ("https://", "http://")
    ):
        return error("Invalid source URL")

    def coordinate(key, minimum, maximum):
        value = request.form.get(key, "").strip()

        if not value:
            return None

        number = float(value)

        if not minimum <= number <= maximum:
            raise ValueError()

        return number

    try:
        lat = coordinate("lat", -90, 90)
        lon = coordinate("lon", -180, 180)
    except ValueError:
        return error("Invalid coordinates")

    photo = request.files.get("photo")

    if not photo:
        return error("Pet photograph required")

    try:
        raw = photo.read()

        image = Image.open(io.BytesIO(raw))
        image.verify()

        image = Image.open(io.BytesIO(raw))
        image = ImageOps.exif_transpose(image)
        image = image.convert("RGB")

        if image.width * image.height > 25_000_000:
            return error("Image dimensions too large")

        image.thumbnail((1400, 1400))

        photo_hash = str(imagehash.phash(image))
        filename = uuid.uuid4().hex + ".jpg"

        image.save(
            UPLOADS / filename,
            format="JPEG",
            quality=84,
        )

    except (OSError, ValueError, Image.DecompressionBombError):
        return error("Invalid photograph")

    report = Report(
        owner_id=user.id,
        kind=kind,
        name=request.form.get("name", "")[:100],
        species=species[:50],
        description=request.form.get(
            "description", ""
        )[:3000],
        city=city[:150],
        lat=lat,
        lon=lon,
        event_date=event_date,
        source_url=source_url[:1000],
        photo=filename,
        phash=photo_hash,
    )

    try:
        db.session.add(report)
        db.session.commit()
    except Exception:
        db.session.rollback()
        (UPLOADS / filename).unlink(missing_ok=True)
        raise

    return jsonify(report=report_json(report)), 201


# ============================================================
# GET USER REPORTS
# ============================================================

@app.get("/api/reports")
@login_required
def get_reports(user):
    reports = (
        Report.query
        .filter_by(owner_id=user.id)
        .order_by(Report.id.desc())
        .all()
    )

    return jsonify(
        reports=[report_json(r) for r in reports]
    )


# ============================================================
# SERVE PET PHOTOS
# ============================================================

@app.get("/api/photos/<name>")
def get_photo(name):
    report = Report.query.filter_by(
        photo=name
    ).first()

    if not report:
        return error("Photo not found", 404)

    return send_from_directory(UPLOADS, name)


# ============================================================
# GEOGRAPHIC DISTANCE
# ============================================================

def distance_km(a, b):
    if None in (a.lat, a.lon, b.lat, b.lon):
        return None

    lat1, lon1, lat2, lon2 = map(
        radians,
        [a.lat, a.lon, b.lat, b.lon],
    )

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    value = (
        sin(dlat / 2) ** 2
        + cos(lat1)
        * cos(lat2)
        * sin(dlon / 2) ** 2
    )

    return 6371 * 2 * asin(min(1, sqrt(value)))


# ============================================================
# PET IMAGE MATCHING
# ============================================================

@app.get("/api/reports/<int:rid>/matches")
@login_required
def find_matches(user, rid):
    target = db.session.get(Report, rid)

    if not target or target.owner_id != user.id:
        return error("Report not found", 404)

    try:
        radius = float(
            request.args.get("radius_km", 100)
        )

        if not 1 <= radius <= 1000:
            return error(
                "Radius must be between 1 and 1000 km"
            )

    except (ValueError, TypeError):
        return error("Invalid search radius")

    candidates = (
        Report.query
        .filter(
            Report.kind != target.kind,
            Report.species == target.species,
        )
        .limit(2000)
        .all()
    )

    results = []

    for candidate in candidates:
        km = distance_km(target, candidate)

        if km is not None and km > radius:
            continue

        if km is None:
            if (
                candidate.city.strip().lower()
                != target.city.strip().lower()
            ):
                continue

        hash1 = imagehash.hex_to_hash(target.phash)
        hash2 = imagehash.hex_to_hash(candidate.phash)

        similarity = max(
            0,
            1 - (hash1 - hash2) / 64,
        )

        results.append({
            **report_json(candidate),
            "visual_similarity": round(similarity, 3),
            "distance_km": (
                round(km, 1)
                if km is not None
                else None
            ),
        })

    results.sort(
        key=lambda item: item["visual_similarity"],
        reverse=True,
    )

    return jsonify(
        matches=results[:50],
        notice=(
            "Prototype image similarity only. "
            "Results do not confirm animal identity. "
            "External Facebook and shelter scanning "
            "is not connected yet."
        ),
    )


# ============================================================
# REACT FRONTEND
# ============================================================

@app.get("/")
def index():
    index_file = ROOT / "frontend" / "dist" / "index.html"

    if index_file.exists():
        return send_from_directory(
            index_file.parent,
            index_file.name,
        )

    return jsonify(
        message="API ready; run React frontend at localhost:5173"
    )


# ============================================================
# ERROR HANDLING
# ============================================================

@app.errorhandler(413)
def upload_too_large(e):
    return error("Maximum upload size is 8 MB", 413)


# ============================================================
# START SERVER
# ============================================================

if __name__ == "__main__":
    app.run(
        port=int(os.environ.get("PORT", 5000)),
        debug=os.environ.get("FLASK_DEBUG") == "1",
    )
