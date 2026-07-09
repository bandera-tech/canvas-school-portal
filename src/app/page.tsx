'use client';

import {
  ArrowRight,
  BookOpen,
  Github,
  GraduationCap,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';
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
        <div className="login-hero">
          <p className="eyebrow">A better school day</p>
          <h1>Everything your class needs, in one calm place.</h1>
          <p>
            Teach, learn, submit work, and stay connected without digging
            through five different tools.
          </p>
          <div className="feature-list" aria-label="Portal features">
            <span className="feature-pill">
              <GraduationCap size={16} /> Focused learning
            </span>
            <span className="feature-pill">
              <UsersRound size={16} /> Connected classes
            </span>
            <span className="feature-pill">
              <ShieldCheck size={16} /> Secure by design
            </span>
          </div>
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
              {!loading && <ArrowRight size={17} />}
            </button>
          </form>
          <div className="oauth-divider">or continue with</div>
          <a className="button secondary" href="/api/auth/github">
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
