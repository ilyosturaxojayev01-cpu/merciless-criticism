import React, { useEffect, useState } from 'react';
import { api, fmt } from './api.js';

export default function Projects({ me, onOpen }) {
  const [list, setList] = useState([]);
  const [f, setF] = useState({ name: '', description: '' });
  const [err, setErr] = useState('');
  const load = () => api('/projects').then(setList).catch(e => setErr(e.message));
  useEffect(() => { load(); }, []);

  async function create(e) {
    e.preventDefault(); setErr('');
    try { const p = await api('/projects', { method: 'POST', body: f }); setF({ name: '', description: '' }); onOpen(p._id); }
    catch (e) { setErr(e.message); }
  }

  return (
    <div className="projects">
      <section>
        <h2>Loyihalarim</h2>
        {list.length === 0 && <p className="empty">Hali loyiha yo‘q. O‘ngdagi shakldan birinchi loyihani oching.</p>}
        <div className="grid">
          {list.map(p => (
            <button key={p._id} className="panel proj" onClick={() => onOpen(p._id)}>
              <b>{p.name}</b>
              <span>{p.description || 'Tavsif yo‘q'}</span>
              <small>{p.leader === me.email ? 'Siz Team Leader' : 'Siz ishtirokchi'} · {fmt(p.createdAt)}</small>
            </button>
          ))}
        </div>
      </section>
      <form className="panel" onSubmit={create}>
        <h3>Yangi loyiha</h3>
        <label>Nomi<input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} required /></label>
        <label>Tavsif<textarea rows={3} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} /></label>
        {err && <p className="msg err">{err}</p>}
        <button className="primary">Loyiha ochish</button>
      </form>
    </div>
  );
}
