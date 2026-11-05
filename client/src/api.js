// Backend alohida manzilda bo'lsa: VITE_API_URL=https://sizning-backend.onrender.com
export const BASE = import.meta.env.VITE_API_URL || '';
export const src = u => (u ? BASE + u : '');

export const tk = {
  get: () => localStorage.getItem('tf_token'),
  set: t => localStorage.setItem('tf_token', t),
  clear: () => localStorage.removeItem('tf_token'),
};

export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = {};
  const t = tk.get();
  if (t) headers.Authorization = 'Bearer ' + t;
  let payload;
  if (form) payload = form;
  else if (body) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  const r = await fetch(BASE + '/api' + path, { method, headers, body: payload });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(data.error || 'Xatolik yuz berdi'), { data, status: r.status });
  return data;
}

// Barcha vaqtlar doimiy UTC+5 (Asia/Tashkent) bo'yicha
const TZ = 'Asia/Tashkent';
export const fmt = d => new Date(d).toLocaleString('en-GB', {
  timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
});
export const clock = d => ({
  time: d.toLocaleTimeString('en-GB', { timeZone: TZ }),
  date: d.toLocaleDateString('en-GB', { timeZone: TZ, weekday: 'short', day: '2-digit', month: 'short' }),
});
