const API_BASE_URL = (typeof window !== 'undefined' && window.location && window.location.origin && window.location.origin.startsWith('http')) 
  ? window.location.origin 
  : 'http://127.0.0.1:8000';

/**
 * Universal fetch wrapper with authorization header injection and error handling.
 */
async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(options.headers || {})
  };

  const token = localStorage.getItem('access_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers
  };

  try {
    const response = await fetch(url, config);

    if (response.status === 401) {
      // Clear invalid token
      localStorage.removeItem('access_token');
      localStorage.removeItem('oceanmind_user');

      const currentPath = window.location.pathname;
      if (!currentPath.includes('login.html') && !currentPath.includes('register.html') && !currentPath.endsWith('/')) {
        if (typeof showToast === 'function') {
          showToast('Session expired or unauthorized. Please log in again.', 'danger');
        }
        setTimeout(() => {
          window.location.href = 'login.html';
        }, 1200);
      }
      const errorData = await response.json().catch(() => ({ detail: 'Unauthorized request' }));
      throw new Error(errorData.detail || 'Unauthorized (401)');
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: `HTTP error ${response.status}` }));
      let errorMessage = errorData.detail || errorData.message || `Request failed with status ${response.status}`;
      if (Array.isArray(errorMessage)) {
        errorMessage = errorMessage.map(err => err.msg || JSON.stringify(err)).join(', ');
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      const msg = 'Unable to connect to the OceanMind backend. Make sure the FastAPI server is running.';
      if (typeof showToast === 'function') {
        showToast(msg, 'danger');
      }
      console.error(msg, error);
      throw new Error(msg);
    }
    throw error;
  }
}

// -----------------------------
// AUTHENTICATION APIs
// -----------------------------
const authApi = {
  // POST /api/auth/signup
  signup: async (userData) => {
    return await apiFetch('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },

  // POST /api/auth/login
  login: async (credentials) => {
    return await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  },

  // GET /api/auth/me
  getMe: async () => {
    return await apiFetch('/api/auth/me', {
      method: 'GET'
    });
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('oceanmind_user');
    window.location.href = 'login.html';
  }
};

// -----------------------------
// BOATS APIs
// -----------------------------
const boatApi = {
  // GET /api/boats (in-memory boats)
  getBoats: async () => {
    return await apiFetch('/api/boats', { method: 'GET' });
  },

  // GET /boats (PostgreSQL boats)
  getBoatsDB: async () => {
    return await apiFetch('/boats', { method: 'GET' });
  },

  // POST /api/boats
  addBoat: async (boatData) => {
    return await apiFetch('/api/boats', {
      method: 'POST',
      body: JSON.stringify(boatData)
    });
  }
};

// -----------------------------
// GPS LOCATIONS APIs
// -----------------------------
const gpsApi = {
  // GET /gps-locations
  getLocations: async () => {
    return await apiFetch('/gps-locations', { method: 'GET' });
  }
};

// -----------------------------
// MARITIME BORDERS APIs
// -----------------------------
const maritimeApi = {
  // GET /maritime-borders
  getBorders: async () => {
    return await apiFetch('/maritime-borders', { method: 'GET' });
  }
};

// -----------------------------
// ALERTS APIs
// -----------------------------
const alertApi = {
  // GET /alerts (PostgreSQL alerts)
  getAlerts: async () => {
    return await apiFetch('/alerts', { method: 'GET' });
  }
};

// -----------------------------
// SOS REQUESTS APIs
// -----------------------------
const sosApi = {
  // GET /sos-requests
  getRequests: async () => {
    return await apiFetch('/sos-requests', { method: 'GET' });
  }
};

// -----------------------------
// LIVE TELEMETRY APIs (DEMO SIMULATION)
// -----------------------------
const telemetryApi = {
  // GET /api/live-telemetry
  getLiveTelemetry: async () => {
    return await apiFetch('/api/live-telemetry', { method: 'GET' });
  }
};

// Export to window for global browser usage
window.API_BASE_URL = API_BASE_URL;
window.apiFetch = apiFetch;
window.authApi = authApi;
window.boatApi = boatApi;
window.gpsApi = gpsApi;
window.maritimeApi = maritimeApi;
window.alertApi = alertApi;
window.sosApi = sosApi;
window.telemetryApi = telemetryApi;
