'use client';

import { BookOpen, Github } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import type { SessionUser } from '@/shared/contracts';
import { api } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('student@canvas.test');
  const [password, setPassword] = useState('StudentDemo123!');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api<{ user: SessionUser }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      router.push('/dashboard');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login">
      <section className="login-art">
        <div className="brand">
          <span className="brand-mark">
            <BookOpen size={19} />
          </span>{' '}
          Canvas
        </div>
        <div style={{ marginTop: 'auto', paddingTop: '5rem' }}>
          <p className="eyebrow" style={{ color: '#bdeedc' }}>
            A better school day
          </p>
          <h1>Everything your class needs, in one calm place.</h1>
          <p>
            Teach, learn, submit work, and stay connected without digging
            through five different tools.
          </p>
        </div>
      </section>
      <section className="login-panel">
        <div className="login-box stack">
          <div>
            <p className="eyebrow">Welcome back</p>
            <h1>Sign in to Canvas</h1>
            <p className="muted">Use your school account to continue.</p>
          </div>
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          <form className="stack" onSubmit={submit}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            <button className="button" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <a
            className="button secondary row"
            style={{ justifyContent: 'center', textDecoration: 'none' }}
            href="/api/auth/github"
          >
            <Github size={17} /> Continue with GitHub
          </a>
          <div className="demo-note">
            <strong>Demo accounts</strong>
            <br />
            admin@canvas.test · teacher@canvas.test · student@canvas.test
          </div>
        </div>
      </section>
    </main>
  );
}
