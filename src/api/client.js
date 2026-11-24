// Small fetch wrapper used when talking to the real Node.js backend.
const BASE = import.meta.env.VITE_API_URL || '/api';

export async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    // When you add login later, attach the token here:
    // headers: { ..., Authorization: `Bearer ${token}` },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let message = res.statusText || 'Request failed';
    try {
      const data = await res.json();
      message = data.message || message;
    } catch {
      /* response had no JSON body */
    }
    throw new Error(message);
  }

  return res.status === 204 ? null : res.json();
}