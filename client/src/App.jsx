import { useEffect, useState } from 'react';
import { api, getToken, setToken } from './api';
import AuthForm from './components/AuthForm';
import ReadingForm from './components/ReadingForm';
import ReadingsList from './components/ReadingsList';
import Reports from './components/Reports';

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(Boolean(getToken()));
  const [editing, setEditing] = useState(null);
  const [version, setVersion] = useState(0); // bump to refetch list + reports
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!getToken()) return;
    api.me()
      .then(({ user: u }) => setUser(u))
      .catch(() => setToken(null))
      .finally(() => setChecking(false));
  }, []);

  const changed = (message) => { setVersion((v) => v + 1); setNotice(message); };

  async function save(data) {
    if (editing) {
      await api.updateReading(editing.id, data);
      setEditing(null);
      changed('Reading updated.');
    } else {
      await api.createReading(data);
      changed('Reading added.');
    }
  }

  async function remove(reading) {
    if (!window.confirm('Delete this reading?')) return;
    try {
      await api.deleteReading(reading.id);
      if (editing?.id === reading.id) setEditing(null);
      changed('Reading deleted.');
    } catch (err) {
      setNotice(err.message);
    }
  }

  function logout() {
    setToken(null);
    setUser(null);
    setEditing(null);
    setNotice('');
  }

  if (checking) return <p className="loading">Loading…</p>;
  if (!user) return <AuthForm onAuthed={setUser} />;

  return (
    <div className="app">
      <header className="topbar">
        <h1 className="brand">Sweety</h1>
        <div>
          <span className="who">Hi, {user.name}</span>
          <button onClick={logout}>Log out</button>
        </div>
      </header>

      <p className="notice" role="status" aria-live="polite">{notice}</p>

      <div className="layout">
        <aside>
          <ReadingForm key={editing ? editing.id : 'new'} initial={editing} onSubmit={save} onCancel={() => setEditing(null)} />
          <ReadingsList version={version} onEdit={setEditing} onDelete={remove} />
        </aside>
        <Reports version={version} />
      </div>
    </div>
  );
}
