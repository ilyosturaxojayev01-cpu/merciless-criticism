import React, { useCallback, useEffect, useState } from 'react';
import { api, fmt, src } from './api.js';
import Avatar from './Avatar.jsx';
import Members from './Members.jsx';

export const COLS = [
  { key: 'todo', title: 'ToDo' },
  { key: 'processing', title: 'Process' },
  { key: 'viewing', title: 'Process Viewing' },
  { key: 'done', title: 'Done' },
];
export const STATUS = Object.fromEntries(COLS.map(c => [c.key, c.title]));
const BADGE = { pending: 'Ko‘rib chiqilmoqda', accepted: 'Qabul qilindi', rejected: 'Rad etildi' };

export default function Project({ id, me, onBack }) {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('board');
  const [toast, setToast] = useState('');
  const load = useCallback(() => api('/projects/' + id).then(setData).catch(e => setToast(e.message)), [id]);
  useEffect(() => { load(); const i = setInterval(load, 15000); return () => clearInterval(i); }, [load]);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(''), 4000); return () => clearTimeout(t); } }, [toast]);

  if (!data) return <p className="empty">Yuklanmoqda…</p>;
  const { project, tasks, reports, users, joined, invites } = data;
  const isLeader = project.leader === me.email;
  const userOf = e => users[e] || { email: e, name: e };
  const run = async fn => { try { await fn(); await load(); } catch (e) { setToast(e.message); } };
  const common = { project, tasks, reports, users, me, isLeader, userOf, run };

  return (
    <div>
      <div className="bar">
        <button className="ghost" onClick={onBack}>Orqaga</button>
        <div><h2>{project.name}</h2><small>Team Leader: {userOf(project.leader).name} ({project.leader})</small></div>
        <div className="tabs">
          {[['board', 'Vazifalar'], ['reports', `Hisobotlar (${reports.length})`], ['members', `Members (${project.members.length + 1})`]].map(([k, t]) => (
            <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{t}</button>
          ))}
        </div>
      </div>
      {tab === 'board' && <Board {...common} />}
      {tab === 'reports' && <Reports {...common} />}
      {tab === 'members' && <Members {...common} joined={joined} invites={invites} />}
      {toast && <div className="toast" role="alert">{toast}</div>}
    </div>
  );
}

// Ism yoki email harflari bo'yicha guruh a'zolarini qidirish
function Picker({ people, value, onChange }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const sel = people.find(p => p.email === value);
  if (sel) return (
    <div className="chip"><Avatar u={sel} size={26} /><span>{sel.name}<small>{sel.email}</small></span><button type="button" onClick={() => onChange('')} aria-label="Bekor qilish">×</button></div>
  );
  const s = q.trim().toLowerCase();
  const list = people.filter(p => !s || p.name.toLowerCase().includes(s) || p.email.toLowerCase().startsWith(s)).slice(0, 6);
  return (
    <div className="picker">
      <input value={q} placeholder="Ism yoki email harflarini yozing…" onChange={e => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 120)} />
      {open && list.length > 0 && (
        <ul>{list.map(p => (
          <li key={p.email} onMouseDown={() => { onChange(p.email); setQ(''); }}><Avatar u={p} size={28} /><span>{p.name}<small>{p.email}</small></span></li>
        ))}</ul>
      )}
    </div>
  );
}

function Board({ project, tasks, reports, me, isLeader, userOf, run, users }) {
  const [f, setF] = useState({ title: '', description: '', assignee: '' });
  const [over, setOver] = useState(null);
  const [err, setErr] = useState('');
  const people = [project.leader, ...project.members].map(userOf);

  const add = e => {
    e.preventDefault();
    if (!f.assignee) return setErr('Ishchini ro‘yxatdan tanlang');
    setErr('');
    run(async () => { await api(`/projects/${project._id}/tasks`, { method: 'POST', body: f }); setF({ title: '', description: '', assignee: '' }); });
  };
  const move = (taskId, status) => run(() => api(`/tasks/${taskId}/status`, { method: 'PATCH', body: { status } }));
  const lastReport = t => reports.find(r => r.task === t._id);

  return (
    <div className={'board-wrap' + (isLeader ? ' lead' : '')}>
      {isLeader && (
        <form className="panel newtask" onSubmit={add}>
          <h3>Yangi vazifa</h3>
          <label>Vazifa<input value={f.title} onChange={e => setF({ ...f, title: e.target.value })} required /></label>
          <label>Tavsif<textarea rows={2} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} /></label>
          <label>Ishchi<Picker people={people} value={f.assignee} onChange={v => setF({ ...f, assignee: v })} /></label>
          {err && <p className="msg err">{err}</p>}
          <button className="primary">Vazifa berish</button>
          {project.members.length === 0 && <small>Avval “Members” bo‘limida foydalanuvchilarni taklif qiling.</small>}
        </form>
      )}
      <div className="board">
        {COLS.map(c => (
          <div key={c.key} className={'col ' + c.key + (over === c.key ? ' over' : '')}
            onDragOver={e => { e.preventDefault(); setOver(c.key); }}
            onDragLeave={() => setOver(null)}
            onDrop={e => { e.preventDefault(); setOver(null); const id = e.dataTransfer.getData('text'); const t = tasks.find(x => x._id === id); if (t && t.status !== c.key) move(id, c.key); }}>
            <h3>{c.title} <span>{tasks.filter(t => t.status === c.key).length}</span></h3>
            {tasks.filter(t => t.status === c.key).map(t => {
              const r = lastReport(t), a = userOf(t.assignee);
              const canDrag = isLeader || (t.assignee === me.email && t.status === 'todo');
              return (
                <article key={t._id} className={'card ' + t.status} draggable={canDrag} onDragStart={e => e.dataTransfer.setData('text', t._id)}>
                  <b>{t.title}</b>
                  {t.description && <p>{t.description}</p>}
                  <div className="who-row"><Avatar u={a} size={26} /><span>{a.name}<small>{a.email}</small></span></div>
                  {r && <span className={'badge ' + r.status}>{BADGE[r.status]}</span>}
                  {isLeader && <button className="link danger" onClick={() => window.confirm('Vazifa o‘chirilsinmi?') && run(() => api('/tasks/' + t._id, { method: 'DELETE' }))}>O‘chirish</button>}
                </article>
              );
            })}
          </div>
        ))}
      </div>
      {isLeader && <p className="hint">Maslahat: hisobot yuborilganda karta Process Viewing’ga tushadi. Hisobotni qabul qilgach, kartani Done’ga sudrab o‘tkazing. Rad etilsa, karta Process’ga qaytadi.</p>}
    </div>
  );
}

function Reports({ project, tasks, reports, me, isLeader, userOf, run }) {
  const mine = tasks.filter(t => t.assignee === me.email && (t.status === 'todo' || t.status === 'processing'));
  const [f, setF] = useState({ task: '', text: '', file: null });
  const taskTitle = id => tasks.find(t => t._id === id)?.title || 'O‘chirilgan vazifa';

  const send = e => {
    e.preventDefault();
    const form = e.target;
    const fd = new FormData();
    fd.append('text', f.text); fd.append('leader', project.leader);
    if (f.file) fd.append('file', f.file);
    run(async () => { await api(`/tasks/${f.task || mine[0]._id}/reports`, { method: 'POST', form: fd }); setF({ task: '', text: '', file: null }); form.reset(); });
  };

  return (
    <div className={'reports' + (mine.length ? ' withform' : '')}>
      {mine.length > 0 && (
        <form className="panel" onSubmit={send}>
          <h3>Hisobot yuborish</h3>
          <label>Vazifa<select value={f.task || mine[0]._id} onChange={e => setF({ ...f, task: e.target.value })}>{mine.map(t => <option key={t._id} value={t._id}>{t.title}</option>)}</select></label>
          <label>Qilingan ish haqida<textarea rows={4} value={f.text} onChange={e => setF({ ...f, text: e.target.value })} /></label>
          <label>Fayl yoki rasm<input type="file" onChange={e => setF({ ...f, file: e.target.files[0] })} /></label>
          <label>Team Leader emaili<input value={project.leader} readOnly /></label>
          <button className="primary">Hisobotni yuborish</button>
        </form>
      )}
      <div className="rlist">
        {reports.length === 0 && <p className="empty">Hisobotlar hali yo‘q.</p>}
        {reports.map(r => <ReportCard key={r._id} {...{ r, title: taskTitle(r.task), isLeader, run, author: userOf(r.author) }} />)}
      </div>
    </div>
  );
}

function ReportCard({ r, title, isLeader, run, author }) {
  const [text, setText] = useState('');
  const review = decision => run(() => api(`/reports/${r._id}/review`, { method: 'PATCH', body: { decision } }));
  const comment = e => { e.preventDefault(); run(async () => { await api(`/reports/${r._id}/comments`, { method: 'POST', body: { text } }); setText(''); }); };
  return (
    <article className={'panel report ' + r.status}>
      <div className="rhead">
        <Avatar u={author} size={38} />
        <div className="grow"><b>{title}</b><small>{r.authorName} ({r.author}) → {r.leader} · {fmt(r.createdAt)}</small></div>
        <span className={'badge ' + r.status}>{BADGE[r.status]}</span>
      </div>
      {r.text && <p>{r.text}</p>}
      {r.file && (r.file.mime?.startsWith('image/')
        ? <a href={src(r.file.url)} target="_blank" rel="noreferrer"><img className="shot" src={src(r.file.url)} alt={r.file.name} /></a>
        : <a className="file" href={src(r.file.url)} target="_blank" rel="noreferrer">{r.file.name}</a>)}
      {isLeader && r.status === 'pending' && (
        <div className="actions"><button className="primary" onClick={() => review('accepted')}>Qabul qilish</button><button className="danger-btn" onClick={() => review('rejected')}>Rad etish</button></div>
      )}
      <div className="comments">
        {r.comments.map(c => <p key={c._id}><b>{c.authorName}</b> <small>{fmt(c.at)}</small><br />{c.text}</p>)}
        <form onSubmit={comment} className="crow"><input placeholder="Komment yozing…" value={text} onChange={e => setText(e.target.value)} required /><button className="ghost">Yuborish</button></form>
      </div>
    </article>
  );
}
