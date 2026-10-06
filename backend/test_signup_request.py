import json
import urllib.request
import urllib.error

url = 'http://127.0.0.1:8000/api/auth/signup'
data = {
    'first_name': 'Test',
    'last_name': 'User',
    'date_of_birth': '1995-01-01',
    'nationality': 'Indian',
    'state': 'Kerala',
    'district': 'Kochi',
    'aadhaar_number': '123456789012',
    'phone': '9876543210',
    'email': 'testuser@example.com',
    'password': '12345678',
    'role': 'fisherman'
}
req = urllib.request.Request(url, data=json.dumps(data).encode(), headers={'Content-Type': 'application/json'}, method='POST')
try:
    with urllib.request.urlopen(req, timeout=10) as response:
        print('status', response.status)
        print(response.read().decode())
except urllib.error.HTTPError as e:
    print('HTTP', e.code)
    print(e.read().decode())
except Exception as e:
    print(type(e).__name__, e)
