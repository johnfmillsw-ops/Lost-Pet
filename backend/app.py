import os, io, uuid, json, hmac, hashlib
from datetime import datetime, timezone
from functools import wraps
from pathlib import Path
from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from PIL import Image, ImageOps
import imagehash
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

ROOT = Path(__file__).resolve().parent.parent
UPLOADS = Path(os.environ.get('UPLOAD_DIR', str(ROOT/'uploads')))
UPLOADS.mkdir(parents=True, exist_ok=True)
app = Flask(__name__, static_folder=str(ROOT/'frontend'/'dist'), static_url_path='')
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-only-change-me')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///'+str(ROOT/'pets.db')).replace('postgres://','postgresql://',1)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['MAX_CONTENT_LENGTH'] = 8 * 1024 * 1024
CORS(app, resources={r'/api/*': {'origins': os.environ.get('CORS_ORIGIN','http://localhost:5173')}})
db = SQLAlchemy(app)
signer = URLSafeTimedSerializer(app.config['SECRET_KEY'])

class User(db.Model):
    id=db.Column(db.Integer,primary_key=True)
    email=db.Column(db.String(255),unique=True,nullable=False)
    password=db.Column(db.String(255),nullable=False)
class Report(db.Model):
    id=db.Column(db.Integer,primary_key=True)
    owner_id=db.Column(db.Integer,db.ForeignKey('user.id'),nullable=True)
    kind=db.Column(db.String(10),nullable=False)
    name=db.Column(db.String(100),default='')
    species=db.Column(db.String(50),nullable=False)
    description=db.Column(db.Text,default='')
    city=db.Column(db.String(150),nullable=False)
    lat=db.Column(db.Float,nullable=True)
    lon=db.Column(db.Float,nullable=True)
    event_date=db.Column(db.String(10),nullable=False)
    source_url=db.Column(db.String(1000),default='')
    photo=db.Column(db.String(80),nullable=False)
    phash=db.Column(db.String(16),nullable=False)
    created=db.Column(db.DateTime,default=lambda:datetime.now(timezone.utc))

with app.app_context(): db.create_all()

def token_user():
    auth=request.headers.get('Authorization','')
    if not auth.startswith('Bearer '): return None
    try: uid=signer.loads(auth[7:],max_age=60*60*24*14)
    except (BadSignature,SignatureExpired): return None
    return db.session.get(User,int(uid))
def login_required(fn):
    @wraps(fn)
    def inner(*args,**kwargs):
        u=token_user()
        if not u:return jsonify(error='Login required'),401
        return fn(u,*args,**kwargs)
    return inner

def error(message,code=400): return jsonify(error=message),code

@app.post('/api/register')
def register():
    data=request.get_json(silent=True) or {}
    email=str(data.get('email','')).strip().lower(); password=str(data.get('password',''))
    if '@' not in email or len(password)<10:return error('Valid email and password of at least 10 characters required')
    if db.session.query(User).filter_by(email=email).first():return error('Email already registered',409)
    u=User(email=email,password=generate_password_hash(password));db.session.add(u);db.session.commit()
    return jsonify(token=signer.dumps(u.id),email=u.email),201
@app.post('/api/login')
def login():
    data=request.get_json(silent=True) or {}
    u=db.session.query(User).filter_by(email=str(data.get('email','')).strip().lower()).first()
    if not u or not check_password_hash(u.password,str(data.get('password',''))):return error('Invalid credentials',401)
    return jsonify(token=signer.dumps(u.id),email=u.email)

@app.get('/api/health')
def health():return jsonify(status='ok')

def report_json(r):
    return dict(id=r.id,kind=r.kind,name=r.name,species=r.species,description=r.description,city=r.city,lat=r.lat,lon=r.lon,event_date=r.event_date,source_url=r.source_url,photo_url=f'/api/photos/{r.photo}',created=r.created.isoformat())

@app.post('/api/reports')
@login_required
def create_report(u):
    kind=request.form.get('kind','');species=request.form.get('species','').strip().lower()
    city=request.form.get('city','').strip();date=request.form.get('event_date','').strip()
    if kind not in ('lost','found') or not species or not city:return error('Kind, species and city required')
    try: datetime.strptime(date,'%Y-%m-%d')
    except ValueError:return error('Date must be YYYY-MM-DD')
    f=request.files.get('photo')
    if not f:return error('Photo required')
    try:
        raw=f.read(); img=Image.open(io.BytesIO(raw));img.verify()
        img=Image.open(io.BytesIO(raw));img=ImageOps.exif_transpose(img).convert('RGB')
        if img.width*img.height>25000000:return error('Image too large')
        img.thumbnail((1400,1400));ph=str(imagehash.phash(img))
        name=uuid.uuid4().hex+'.jpg';img.save(UPLOADS/name,format='JPEG',quality=84)
    except (OSError,ValueError):return error('Invalid image')
    def coordinate(key,low,high):
        v=request.form.get(key,'').strip()
        if not v:return None
        n=float(v)
        if not low<=n<=high:raise ValueError()
        return n
    try:lat=coordinate('lat',-90,90);lon=coordinate('lon',-180,180)
    except ValueError:
        (UPLOADS/name).unlink(missing_ok=True)
        return error('Invalid coordinates')
    url=request.form.get('source_url','').strip()
    if url and not url.startswith(('https://','http://')):return error('Source URL must start with https:// or http://')
    r=Report(owner_id=u.id,kind=kind,name=request.form.get('name','')[:100],species=species[:50],description=request.form.get('description','')[:3000],city=city[:150],lat=lat,lon=lon,event_date=date,source_url=url[:1000],photo=name,phash=ph)
    db.session.add(r);db.session.commit();return jsonify(report=report_json(r)),201

@app.get('/api/reports')
@login_required
def reports(u):
    return jsonify(reports=[report_json(r) for r in Report.query.filter_by(owner_id=u.id).order_by(Report.id.desc()).all()])

@app.get('/api/photos/<name>')
def photos(name):
    if not Report.query.filter_by(photo=name).first():return error('Not found',404)
    return send_from_directory(UPLOADS,name)

def distance_km(a,b):
    if None in (a.lat,a.lon,b.lat,b.lon):return None
    from math import radians,sin,cos,asin,sqrt
    lat1,lon1,lat2,lon2=map(radians,[a.lat,a.lon,b.lat,b.lon]);dlat=lat2-lat1;dlon=lon2-lon1
    return 6371*2*asin(sqrt(sin(dlat/2)**2+cos(lat1)*cos(lat2)*sin(dlon/2)**2))

@app.get('/api/reports/<int:rid>/matches')
@login_required
def matches(u,rid):
    target=db.session.get(Report,rid)
    if not target or target.owner_id!=u.id:return error('Not found',404)
    radius=min(max(float(request.args.get('radius_km',100)),1),1000)
    candidates=Report.query.filter(Report.kind!=target.kind,Report.species==target.species).limit(2000).all()
    results=[]
    for c in candidates:
        km=distance_km(target,c)
        if km is not None and km>radius:continue
        if km is None and c.city.strip().lower()!=target.city.strip().lower():continue
        visual=max(0,1-(imagehash.hex_to_hash(target.phash)-imagehash.hex_to_hash(c.phash))/64)
        results.append(dict(**report_json(c),visual_similarity=round(visual,3),distance_km=round(km,1) if km is not None else None))
    results.sort(key=lambda x:x['visual_similarity'],reverse=True)
    return jsonify(matches=results[:50],notice='Prototype perceptual-hash similarity, NOT identity verification. Listings are user-submitted; external social/shelter scanning is not yet connected.')

@app.get('/')
def index():
    p=ROOT/'frontend'/'dist'/'index.html'
    return send_from_directory(p.parent,p.name) if p.exists() else jsonify(message='API ready; run React frontend at localhost:5173')
@app.errorhandler(413)
def too_big(e):return error('Maximum upload size is 8 MB',413)

if __name__=='__main__':app.run(port=5000,debug=os.environ.get('FLASK_DEBUG')=='1')
