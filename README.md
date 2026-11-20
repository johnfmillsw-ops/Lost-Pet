# Pet Search — working MVP foundation

A single-repository React + Flask lost/found pet matching app. Supports account registration/login, photo uploads, reports, geographic filtering (coordinates when supplied; otherwise exact city), perceptual-hash photo ranking, and original listing URLs.

## Important limitations
- **This does not automatically search Facebook, shelters, or other external sites.** No authorized source integration has been configured. Users must submit found reports manually.
- The photo score is a perceptual-hash visual similarity **not animal identity recognition**. Different photos of the same dog can score poorly. Replace `imagehash.phash` with a validated image-embedding model for serious matching.
- This is a demo, **not production ready for public users**: no email verification, password resets, rate limits, content moderation, admin dashboard, consent workflow, abuse controls, or robust object storage. Uploaded photos are accessible via report URLs. Avoid uploading sensitive photos.
- The API uses signed login tokens (14-day expiration); do not deploy with the default secret.

## Local development
Prerequisites: Python 3.11+, Node.js 20+.

Terminal 1:
```
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export SECRET_KEY="$(python3 -c 'import secrets; print(secrets.token_hex(32))')"
python app.py
```
Terminal 2:
```
cd frontend
npm install
npm run dev
```
Open http://localhost:5173. Register, upload a lost pet, upload a found pet, and click **Find matches**.

## Docker (single service)
```
docker build -t pet-search .
docker run --rm -p 8000:8000 -e SECRET_KEY='YOUR_RANDOM_SECRET' -v pet_uploads:/data -e UPLOAD_DIR=/data pet-search
```
For persistent database in deployment, use managed PostgreSQL via `DATABASE_URL`. The Docker command above persists uploads only; its default SQLite database will not persist. For local durable Docker demo, set DATABASE_URL=sqlite:////data/pets.db.

## Deploy to Railway from GitHub
1. Create a private GitHub repository and push this entire folder. Do not commit `.env`, `uploads`, or SQLite files.
2. Create a Railway project, **Deploy from GitHub**, select repository. Railway builds using `Dockerfile`.
3. Add Railway PostgreSQL and set `DATABASE_URL` to its connection URL (internal networking).
4. Set `SECRET_KEY` to a long random value. Set `UPLOAD_DIR=/data` and attach a persistent volume at `/data` to the web service. **Do not use multiple web replicas with local volume storage.** For scaling, switch to S3/R2 object storage.
5. Generate a public domain and test `/api/health` and the full upload/login flow.
6. If using a different frontend domain, set `CORS_ORIGIN` to that exact origin.

## Next development milestones
1. Add authorized shelter / rescue / partner APIs as separate connectors.
2. Add a scheduled ingestion worker with deduplication and source attribution.
3. Replace perceptual hashes with an embedding service (e.g. DINOv2 or SigLIP), test on real same-pet/different-pet image pairs, and calibrate match rankings.
4. Add privacy controls, rate limits, verification, abuse protections, and alert subscriptions.
5. Add PostGIS for indexed radius queries, pagination, and background match computation at scale.

## Architecture
React UI -> Flask REST API -> PostgreSQL (or SQLite locally) + local photo storage -> simple perceptual hash ranking. Image-model provider can be added behind a service boundary without changing React.
