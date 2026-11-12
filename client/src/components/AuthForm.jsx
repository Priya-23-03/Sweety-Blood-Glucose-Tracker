import { useState } from 'react';
import { api, setToken } from '../api';

export default function AuthForm({ onAuthed }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isRegister = mode === 'register';

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { token, user } = isRegister ? await api.register(form) : await api.login(form);
      setToken(token);
      onAuthed(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth">
      <h1 className="brand">Sweety</h1>
      <p className="tagline">Log up to four glucose readings a day and see how your numbers trend.</p>

      <form onSubmit={submit} className="panel" noValidate>
        <h2>{isRegister ? 'Create your account' : 'Log in'}</h2>

        {isRegister && (
          <label>
            Name
            <input value={form.name} onChange={set('name')} autoComplete="name" required />
          </label>
        )}
        <label>
          Email
          <input type="email" value={form.email} onChange={set('email')} autoComplete="email" required />
        </label>
        <label>
          Password
          <input
            type="password"
            value={form.password}
            onChange={set('password')}
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            minLength={8}
            required
          />
        </label>
        {isRegister && <p className="hint">At least 8 characters.</p>}

        {error && <p role="alert" className="error">{error}</p>}

        <button type="submit" className="primary" disabled={busy}>
          {busy ? 'Please wait…' : isRegister ? 'Sign up' : 'Log in'}
        </button>
        <button
          type="button"
          className="link"
          onClick={() => { setMode(isRegister ? 'login' : 'register'); setError(''); }}
        >
          {isRegister ? 'I already have an account' : 'Create an account'}
        </button>
      </form>
    </main>
  );
}
