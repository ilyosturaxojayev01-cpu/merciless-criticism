import React, { useEffect, useRef, useState } from 'react';
import { api, fmt } from './api.js';

const LABEL = { accepted: 'Qabul qilindi', rejected: 'Rad etildi' };

export default function Notifications({ onOpenProject, onChanged }) {
  const [open, setOpen] = useState(false);
  const [d, setD] = useState({ items: [], unread: 0 });
  const box = useRef();
  const load = () => api('/notifications').then(setD).catch(() => {});

  useEffect(() => { load(); const i = setInterval(load, 20000); return () => clearInterval(i); }, []);
  useEffect(() => {
    const close = e => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close); return () => document.removeEventListener('mousedown', close);
  }, []);

  async function toggle() {
    const next = !open; setOpen(next);
    if (next) { await load(); if (d.unread) { await api('/notifications/read', { method: 'POST' }); setD(x => ({ ...x, unread: 0 })); } }
  }
  async function respond(id, decision) {
    try { await api('/invites/' + id, { method: 'PATCH', body: { decision } }); await load(); onChanged?.(); } catch (e) { alert(e.message); }
  }

  return (
    <div className="bellbox" ref={box}>
      <button className="ghost bell" onClick={toggle} aria-label="Xabarlar">
        Xabarlar{d.unread > 0 && <span className="count">{d.unread}</span>}
      </button>
      {open && (
        <div className="notif-panel">
          {d.items.length === 0 && <p className="empty">Xabarlar yo‘q</p>}
          {d.items.map(n => (
            <div key={n._id} className={'notif ' + (n.read ? '' : 'new')}>
              <p onClick={() => { if (n.project && n.type !== 'invite') { onOpenProject(n.project); setOpen(false); } }}>{n.text}</p>
              <small>{fmt(n.createdAt)}</small>
              {n.type === 'invite' && n.invite?.status === 'pending' && (
                <div className="actions"><button className="primary" onClick={() => respond(n.invite._id, 'accepted')}>Qabul qilish</button><button className="danger-btn" onClick={() => respond(n.invite._id, 'rejected')}>Rad etish</button></div>
              )}
              {n.type === 'invite' && n.invite && n.invite.status !== 'pending' && <span className={'badge ' + n.invite.status}>{LABEL[n.invite.status]}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
