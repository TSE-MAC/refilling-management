import axios from 'axios';

const BACKEND_URL = process.env.NODE_ENV === 'production' ? '/_/backend' : (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000');
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

const TOKEN_KEY = 'refillops_token';
const USER_KEY = 'refillops_user';

export function getToken() { return localStorage.getItem(TOKEN_KEY); }
export function getUser() { return localStorage.getItem(USER_KEY); }
export function setAuth(token, username) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, username);
}
export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

api.interceptors.request.use((config) => {
  const t = getToken();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      clearAuth();
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Dates
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateLong(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
  return `${weekday}, ${formatDate(iso)}`;
}

export function relativeTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  const days = Math.floor(diff / 86400);
  if (days < 7) return `${days} d ago`;
  if (days < 30) return `${Math.floor(days / 7)} w ago`;
  return formatDate(iso);
}

export function ageDays(iso) {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

export function formatINR(amount) {
  const n = Number(amount || 0);
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

// Extinguisher option config
export const EXT_TYPES = ['CO2', 'DCP', 'ABC', 'Water', 'Foam'];
export const EXT_SIZES = {
  CO2: { unit: 'kg', sizes: ['1', '2', '4.5', '6.8', '9'] },
  DCP: { unit: 'kg', sizes: ['1', '2', '4', '6', '9', '25', '50'] },
  ABC: { unit: 'kg', sizes: ['1', '2', '4', '6', '9', '25', '50'] },
  Water: { unit: 'ltr', sizes: ['9', '25', '50', '135'] },
  Foam: { unit: 'ltr', sizes: ['9', '25', '50', '135'] },
};

export function totalExt(job) {
  return (job?.extinguishers || []).reduce((s, e) => s + Number(e.quantity || 0), 0);
}
export function totalParts(job) {
  return (job?.spareParts || []).reduce((s, p) => s + Number(p.quantityUsed || 0), 0);
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// Type accent for cards (left border colour)
export const EXT_ACCENT = {
  CO2: '#0284c7',     // sky
  DCP: '#f59e0b',     // amber (dry chem - yellow)
  ABC: '#dc2626',     // red (multi)
  Water: '#0ea5e9',   // blue
  Foam: '#16a34a',    // green
};
