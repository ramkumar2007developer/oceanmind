import json
import urllib.request
import urllib.error

payload = {
    "first_name": "Asha",
    "last_name": "Nair",
    "date_of_birth": "1992-05-10",
    "nationality": "Indian",
    "state": "Kerala",
    "district": "Alappuzha",
    "aadhaar_number": "874512369015",
    "phone": "9847012346",
    "email": "asha.nair4@example.com",
    "password": "SecurePass123!",
    "role": "fisherman"
}

req = urllib.request.Request(
    'http://127.0.0.1:8000/api/auth/signup',
    data=json.dumps(payload).encode('utf-8'),
    headers={'Content-Type': 'application/json'}
)
try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        print(resp.status)
        print(resp.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print('HTTP', e.code)
    print(e.read().decode('utf-8'))
except Exception as e:
    print(type(e).__name__, e)
