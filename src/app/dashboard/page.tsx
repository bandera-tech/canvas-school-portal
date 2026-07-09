'use client';

import { BookOpen, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { SessionUser } from '@/shared/contracts';
import { api } from '@/lib/api';
import { AdminDashboard } from './admin-dashboard';
import { StudentDashboard } from './student-dashboard';
import { TeacherDashboard } from './teacher-dashboard';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<{ user: SessionUser }>('/api/auth/me')
      .then((result) => setUser(result.user))
      .catch(() => router.replace('/'));
  }, [router]);

  async function logout() {
    try {
      await api('/api/auth/logout', { method: 'POST' });
      router.replace('/');
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Could not sign out.'
      );
    }
  }

  if (!user)
    return (
      <main className="page">
        <div className="card">Loading your dashboard…</div>
      </main>
    );
  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">
            <BookOpen size={19} />
          </span>{' '}
          Canvas
        </div>
        <div className="row">
          <span className="badge">{user.role}</span>
          <span>{user.name}</span>
          <button
            className="button ghost"
            onClick={logout}
            aria-label="Sign out"
          >
            <LogOut size={17} />
          </button>
        </div>
      </header>
      <main className="page">
        {error && <div className="error">{error}</div>}
        {user.role === 'admin' && <AdminDashboard user={user} />}
        {user.role === 'teacher' && <TeacherDashboard user={user} />}
        {user.role === 'student' && <StudentDashboard user={user} />}
      </main>
    </div>
  );
}
