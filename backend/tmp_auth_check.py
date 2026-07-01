from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
r = client.post('/api/auth/login', json={'email':'admin@test.com','password':'password'})
print(r.status_code)
print(r.text)
