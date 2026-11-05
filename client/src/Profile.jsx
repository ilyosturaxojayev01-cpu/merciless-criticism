import React, { useState } from 'react';
import { api } from './api.js';
import Avatar from './Avatar.jsx';

export default function Profile({ me, onSaved, onBack }) {
  const [name, setName] = useState(me.name);
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState({ t: '', err: false });
  const preview = file ? { ...me, avatar: null } : me;

  async function save(e) {
    e.preventDefault();
    const fd = new FormData();
    fd.append('name', name);
    if (file) fd.append('avatar', file);
    try { const d = await api('/profile', { method: 'PATCH', form: fd }); onSaved(d.user); setFile(null); setMsg({ t: 'Saqlandi', err: false }); }
    catch (e) { setMsg({ t: e.message, err: true }); }
  }

  return (
    <div className="profile">
      <button className="ghost" onClick={onBack}>Orqaga</button>
      <form className="panel" onSubmit={save}>
        <h2>Profil</h2>
        <div className="prow">
          {file ? <img className="avatar" style={{ width: 96, height: 96 }} src={URL.createObjectURL(file)} alt="" /> : <Avatar u={preview} size={96} />}
          <label>Avatarka (rasm)<input type="file" accept="image/*" onChange={e => setFile(e.target.files[0] || null)} /></label>
        </div>
        <label>Ism<input value={name} onChange={e => setName(e.target.value)} required /></label>
        <label>Email<input value={me.email} readOnly /></label>
        {msg.t && <p className={'msg ' + (msg.err ? 'err' : 'ok')}>{msg.t}</p>}
        <button className="primary">Saqlash</button>
      </form>
    </div>
  );
}
