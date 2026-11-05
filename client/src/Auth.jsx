import React, { useState } from 'react';
import { api, tk } from './api.js';

const TITLES = { login: 'Kirish', register: 'Ro‘yxatdan o‘tish', verify: 'Emailni tasdiqlash', forgot: 'Parolni tiklash', reset: 'Yangi parol o‘rnatish' };
const BUTTONS = { login: 'Kirish', register: 'Kod yuborish', verify: 'Tasdiqlash', forgot: 'Kod yuborish', reset: 'Parolni saqlash va kirish' };

export default function Auth({ onAuth, start = 'login' }) {
  const [mode, setMode] = useState(start); // login | register | verify | forgot | reset
  const [f, setF] = useState({ name: '', email: '', password: '', code: '' });
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const go = m => { setMode(m); setErr(''); setInfo(''); };

  async function submit(e) {
    e.preventDefault(); setErr(''); setInfo(''); setBusy(true);
    try {
      if (mode === 'register') {
        const d = await api('/auth/register', { method: 'POST', body: f });
        setInfo(d.message); setMode('verify');
      } else if (mode === 'forgot') {
        const d = await api('/auth/forgot', { method: 'POST', body: f });
        setInfo(d.message); setMode('reset'); setF({ ...f, code: '', password: '' });
      } else {
        const path = { verify: '/auth/verify', reset: '/auth/reset', login: '/auth/login' }[mode];
        const d = await api(path, { method: 'POST', body: f });
        tk.set(d.token); onAuth(d.user);
      }
    } catch (e) {
      setErr(e.message);
      if (e.data?.needVerify) setMode('verify');
    } finally { setBusy(false); }
  }

  async function resend() {
    try {
      await api(mode === 'reset' ? '/auth/forgot' : '/auth/resend', { method: 'POST', body: f });
      setInfo('Yangi kod yuborildi'); setErr('');
    } catch (e) { setErr(e.message); }
  }

  const showCode = mode === 'verify' || mode === 'reset';
  const showPass = mode === 'login' || mode === 'register' || mode === 'reset';

  return (
    <div className="auth">
      <div className="auth-intro">
        <h1>Vazifalar oqimi — bir joyda.</h1>
        <p>Loyiha oching, ishchiga email orqali vazifa bering, hisobotni ko‘rib chiqing va tayyor ishni “Tasdiqlandi” ustuniga o‘tkazing.</p>
      </div>
      <form className="panel" onSubmit={submit}>
        <h2>{TITLES[mode]}</h2>
        {mode === 'register' && <label>Ism<input value={f.name} onChange={set('name')} required /></label>}
        <label>Email<input type="email" value={f.email} onChange={set('email')} required disabled={mode === 'verify' || mode === 'reset'} /></label>
        {showCode && <label>Emailga yuborilgan 6 xonali kod<input value={f.code} onChange={set('code')} inputMode="numeric" maxLength={6} required autoFocus /></label>}
        {showPass && <label>{mode === 'reset' ? 'Yangi parol' : 'Parol'}<input type="password" value={f.password} onChange={set('password')} minLength={6} required /></label>}
        {err && <p className="msg err">{err}</p>}
        {info && <p className="msg ok">{info}</p>}
        {mode === 'login' && err && <button type="button" className="link" onClick={() => go('forgot')}>Parolni unutdingizmi?</button>}
        <button className="primary" disabled={busy}>{BUTTONS[mode]}</button>
        {showCode && <button type="button" className="link" onClick={resend}>Kodni qayta yuborish</button>}
        {mode === 'login' && <button type="button" className="link" onClick={() => go('register')}>Hisobingiz yo‘qmi? Ro‘yxatdan o‘ting</button>}
        {mode !== 'login' && <button type="button" className="link" onClick={() => go('login')}>Kirish sahifasiga qaytish</button>}
      </form>
    </div>
  );
}
