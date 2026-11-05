import React, { useEffect, useState } from 'react';
import { api, tk, clock } from './api.js';
import Auth from './Auth.jsx';
import Landing from './Landing.jsx';
import Projects from './Projects.jsx';
import Project from './Project.jsx';
import Profile from './Profile.jsx';
import Notifications from './Notifications.jsx';
import Avatar from './Avatar.jsx';

function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const i = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(i); }, []);
  const c = clock(now);
  return <div className="clock" title="Doimiy UTC+5 vaqti"><b>{c.time}</b><span>{c.date} · UTC+5</span></div>;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [guest, setGuest] = useState('landing'); // landing | login | register
  const [view, setView] = useState('home');      // home | profile
  const [projectId, setProjectId] = useState(null);
  const [rev, setRev] = useState(0);
  const [theme, setTheme] = useState(localStorage.getItem('tf_theme') || 'dark');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('tf_theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!tk.get()) return setReady(true);
    api('/me').then(d => setUser(d.user)).catch(() => tk.clear()).finally(() => setReady(true));
  }, []);

  const home = () => { setProjectId(null); setView('home'); setGuest('landing'); };
  const logout = () => { tk.clear(); setUser(null); setProjectId(null); setView('home'); setGuest('landing'); };
  const openProject = id => { setView('home'); setProjectId(id); };
  if (!ready) return null;

  return (
    <>
      <header className="top">
        <button className="logo" onClick={home}>Team Flow</button>
        <div className="top-right">
          <Clock />
          <button className="ghost" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? 'Yorug‘ rejim' : 'Qorong‘i rejim'}</button>
          {user ? (
            <>
              <Notifications onOpenProject={openProject} onChanged={() => setRev(r => r + 1)} />
              <button className="me" onClick={() => { setProjectId(null); setView('profile'); }}><Avatar u={user} size={30} /><span className="who">{user.name}</span></button>
              <button className="ghost" onClick={logout}>Chiqish</button>
            </>
          ) : (
            <>
              <button className={'ghost' + (guest === 'login' ? ' on' : '')} onClick={() => setGuest('login')}>Kirish</button>
              <button className="primary small" onClick={() => setGuest('register')}>Ro‘yxatdan o‘tish</button>
            </>
          )}
        </div>
      </header>
      <main>
        {!user
          ? guest === 'landing'
            ? <Landing onLogin={() => setGuest('login')} onRegister={() => setGuest('register')} />
            : <Auth key={guest} start={guest} onAuth={setUser} />
          : view === 'profile' ? <Profile me={user} onSaved={setUser} onBack={() => setView('home')} />
          : projectId ? <Project id={projectId} me={user} onBack={() => setProjectId(null)} />
          : <Projects key={rev} me={user} onOpen={openProject} />}
      </main>
    </>
  );
}
