import os,tempfile,io,sys
from PIL import Image
os.environ['DATABASE_URL']='sqlite:///'+tempfile.mktemp(suffix='.db')
os.environ['UPLOAD_DIR']=tempfile.mkdtemp()
os.environ['SECRET_KEY']='test-secret'
sys.path.insert(0,os.path.join(os.path.dirname(__file__),'..','backend'))
from app import app
c=app.test_client()
assert c.get('/api/health').json['status']=='ok'
r=c.post('/api/register',json={'email':'test@example.com','password':'longpassword123'});assert r.status_code==201,r.json
token=r.json['token'];h={'Authorization':'Bearer '+token}
assert c.get('/api/reports').status_code==401
for kind in ('lost','found'):
    im=Image.new('RGB',(100,100),'tan');b=io.BytesIO();im.save(b,format='JPEG');b.seek(0)
    r=c.post('/api/reports',headers=h,data={'kind':kind,'species':'dog','city':'Tampa','event_date':'2026-11-20','photo':(b,'dog.jpg')},content_type='multipart/form-data');assert r.status_code==201,r.json
r=c.get('/api/reports/1/matches',headers=h);assert r.status_code==200 and len(r.json['matches'])==1,r.json
assert r.json['matches'][0]['visual_similarity']==1.0
print('PASS: health, registration, auth, upload, listing, matching')
