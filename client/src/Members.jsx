import React, { useEffect, useState } from 'react';
import { api, fmt } from './api.js';
import Avatar from './Avatar.jsx';
const STATUS = { todo: 'ToDo', processing: 'Process', viewing: 'Process Viewing', done: 'Done' };

export default function Members({ project, tasks, users, isLeader, userOf, run, joined, invites }) {
  const people = [project.leader, ...project.members];

  return (
    <div className="members">
      {isLeader && <Invite {...{ project, run, invites }} />}
      <div className="mgrid">
        {people.map(email => {
          const u = userOf(email);
          const mine = tasks.filter(t => t.assignee === email);
          const done = mine.filter(t => t.status === 'done').length;
          const pct = mine.length ? Math.round((done / mine.length) * 100) : 0;
          return (
            <article key={email} className="panel mcard">
              <div className="mtop">
                <Avatar u={u} size={52} />
                <div className="grow"><b>{u.name}</b><small>{u.email}</small>
                  <small>{email === project.leader ? 'Team Leader · loyiha ochilgan: ' + fmt(project.createdAt) : 'Qo‘shilgan: ' + fmt(joined[email] || project.createdAt)}</small></div>
              </div>
              <div className="stats">
                <span className="stat s1">Berilgan <b>{mine.length}</b></span>
                <span className="stat s2">Bajarilgan <b>{done}</b></span>
                <span className="stat s3">{pct}%</span>
              </div>
              <div className="progress"><i style={{ width: pct + '%' }} /></div>
              <details>
                <summary>Vazifalar tarixi ({mine.length})</summary>
                {mine.length === 0 && <small>Hali vazifa berilmagan</small>}
                <ul className="thist">{mine.map(t => <li key={t._id}><span>{t.title}<small>{fmt(t.createdAt)}</small></span><em className={'st ' + t.status}>{STATUS[t.status]}</em></li>)}</ul>
              </details>
            </article>
          );
        })}
      </div>
    </div>
  );
}

// Ro'yxatdan o'tgan barcha foydalanuvchilar: Team Leader taklif yuboradi
function Invite({ project, run, invites }) {
  const [q, setQ] = useState('');
  const [list, setList] = useState([]);
  useEffect(() => {
    const t = setTimeout(() => api('/users?q=' + encodeURIComponent(q)).then(setList).catch(() => {}), 200);
    return () => clearTimeout(t);
  }, [q]);

  const stateOf = email => {
    if (project.members.includes(email)) return 'member';
    return invites.find(i => i.to === email)?.status || null; // eng yangisi birinchi
  };
  const send = email => run(() => api(`/projects/${project._id}/invites`, { method: 'POST', body: { email } }));

  return (
    <section className="panel invite">
      <h3>Foydalanuvchilarni taklif qilish</h3>
      <input placeholder="Ism yoki email bo‘yicha qidirish…" value={q} onChange={e => setQ(e.target.value)} />
      <ul className="ulist">
        {list.length === 0 && <li className="empty">Foydalanuvchi topilmadi</li>}
        {list.map(u => {
          const s = stateOf(u.email);
          return (
            <li key={u.email}>
              <Avatar u={u} size={34} />
              <span className="grow">{u.name}<small>{u.email}</small></span>
              {s === 'member' && <span className="badge accepted">Guruhda</span>}
              {s === 'pending' && <span className="badge pending">Javob kutilmoqda</span>}
              {(s === null || s === 'rejected' || s === 'accepted') && s !== 'member' && (
                <>{s === 'rejected' && <span className="badge rejected">Rad etgan</span>}<button className="ghost" onClick={() => send(u.email)}>{s === 'rejected' ? 'Qayta taklif' : 'Taklif yuborish'}</button></>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
