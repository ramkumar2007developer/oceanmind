import json
import urllib.request
import urllib.error
import time

suffix = str(int(time.time()))
payload = {
    "first_name": "Asha",
    "last_name": "Nair",
    "date_of_birth": "1992-05-10",
    "nationality": "Indian",
    "state": "Kerala",
    "district": "Alappuzha",
    "aadhaar_number": "87451236" + suffix[-4:],
    "phone": "9847012" + suffix[-4:],
    "email": f"asha.nair{suffix}@example.com",
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
