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
        <div className="card loading-card" role="status">
          <span className="spinner" aria-hidden="true" />
          <span>Loading your dashboard…</span>
        </div>
      </main>
    );
  const initials = user.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">
            <BookOpen size={19} />
          </span>{' '}
          Canvas
        </div>
        <div className="user-menu">
          <span className="avatar" aria-hidden="true">
            {initials}
          </span>
          <div className="user-copy">
            <strong>{user.name}</strong>
            <span>{user.role} account</span>
          </div>
          <button
            className="button ghost icon-button"
            onClick={logout}
            aria-label="Sign out"
          >
            <LogOut size={17} />
          </button>
        </div>
      </header>
      <main className="page">
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        {user.role === 'admin' && <AdminDashboard user={user} />}
        {user.role === 'teacher' && <TeacherDashboard user={user} />}
        {user.role === 'student' && <StudentDashboard user={user} />}
      </main>
    </div>
  );
}
