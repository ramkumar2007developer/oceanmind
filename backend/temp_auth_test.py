import json
import urllib.request
import urllib.error
import time

def request(url, data=None, headers=None):
    req = urllib.request.Request(url, data=data, headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status, resp.read().decode('utf-8')
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf-8')
    except Exception as e:
        return type(e).__name__, str(e)


test_email = f'testuser_{int(time.time())}@example.com'
user = {
    'first_name': 'Test',
    'last_name': 'User',
    'date_of_birth': '1990-01-01',
    'nationality': 'Indian',
    'state': 'Kerala',
    'district': 'Kochi',
    'aadhaar_number': '999999999999',
    'phone': '9999999999',
    'email': test_email,
    'password': 'TestPassword123',
    'role': 'fisherman'
}

status_signup, body_signup = request(
    'http://127.0.0.1:8000/api/auth/signup',
    data=json.dumps(user).encode('utf-8'),
    headers={'Content-Type': 'application/json'}
)
print('SIGNUP', status_signup, body_signup)

if status_signup in (200, 201):
    credentials = {'email': test_email, 'password': 'TestPassword123'}
    status_login, body_login = request(
        'http://127.0.0.1:8000/api/auth/login',
        data=json.dumps(credentials).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    print('LOGIN', status_login, body_login)
    if status_login == 200:
        token = json.loads(body_login).get('access_token')
        status_me, body_me = request(
            'http://127.0.0.1:8000/api/auth/me',
            headers={'Authorization': f'Bearer {token}'}
        )
        print('ME', status_me, body_me)
