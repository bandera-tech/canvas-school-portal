'use client';

import { GraduationCap, Layers3, UserPlus, UsersRound } from 'lucide-react';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import type { SessionUser, UserRole, UserStatus } from '@/shared/contracts';
import { api } from '@/lib/api';

interface ManagedUser extends SessionUser {
  createdAt: string;
}
interface GroupRow {
  id: string;
  name: string;
  teacherId: string | null;
  teacherName: string | null;
}

export function AdminDashboard({ user }: { user: SessionUser }) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try {
      const [nextUsers, nextGroups] = await Promise.all([
        api<ManagedUser[]>('/api/admin/users'),
        api<GroupRow[]>('/api/admin/teacher-groups'),
      ]);
      setUsers(nextUsers);
      setGroups(nextGroups);
      setError('');
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Unable to load data.'
      );
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          name: form.get('name'),
          email: form.get('email'),
          role: form.get('role'),
          password: form.get('password'),
        }),
      });
      event.currentTarget.reset();
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Unable to create user.'
      );
    }
  }
  async function setStatus(id: string, status: UserStatus) {
    try {
      await api(`/api/admin/users/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Unable to update user.'
      );
    }
  }
  async function removeUser(id: string) {
    if (!confirm('Delete this user and their related records?')) return;
    try {
      await api(`/api/admin/users/${id}`, { method: 'DELETE' });
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Unable to delete user.'
      );
    }
  }
  async function editUser(item: ManagedUser) {
    const name = prompt('User name', item.name)?.trim();
    if (!name || name === item.name) return;
    try {
      await api(`/api/admin/users/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name }),
      });
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Unable to update user.'
      );
    }
  }
  async function createGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api('/api/admin/teacher-groups', {
        method: 'POST',
        body: JSON.stringify({ name: form.get('name') }),
      });
      event.currentTarget.reset();
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Unable to create group.'
      );
    }
  }
  async function renameGroup(id: string, currentName: string) {
    const name = prompt('Teacher group name', currentName)?.trim();
    if (!name || name === currentName) return;
    try {
      await api(`/api/admin/teacher-groups/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name }),
      });
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Unable to rename group.'
      );
    }
  }
  async function removeGroup(id: string) {
    if (!confirm('Delete this teacher group?')) return;
    try {
      await api(`/api/admin/teacher-groups/${id}`, { method: 'DELETE' });
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Unable to delete group.'
      );
    }
  }
  async function addTeacher(
    event: FormEvent<HTMLFormElement>,
    groupId: string
  ) {
    event.preventDefault();
    const teacherId = new FormData(event.currentTarget).get('teacherId');
    try {
      await api(`/api/admin/teacher-groups/${groupId}/members`, {
        method: 'POST',
        body: JSON.stringify({ userId: teacherId }),
      });
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Unable to assign teacher.'
      );
    }
  }

  const counts = (role: UserRole) =>
    users.filter((item) => item.role === role).length;
  return (
    <>
      <header className="page-header">
        <p className="eyebrow">School administration</p>
        <h1>Good afternoon, {user.name.split(' ')[0]}.</h1>
        <p className="muted">
          Manage people and teaching teams from one place.
        </p>
      </header>
      {error && <div className="error section">{error}</div>}
      <section className="grid-3 section grid">
        <div className="card stat-card green">
          <span className="stat-icon">
            <GraduationCap size={23} />
          </span>
          <div>
            <span className="stat-label">Teachers</span>
            <div className="stat">{counts('teacher')}</div>
          </div>
        </div>
        <div className="card stat-card navy">
          <span className="stat-icon">
            <UsersRound size={22} />
          </span>
          <div>
            <span className="stat-label">Students</span>
            <div className="stat">{counts('student')}</div>
          </div>
        </div>
        <div className="card stat-card gold">
          <span className="stat-icon">
            <Layers3 size={22} />
          </span>
          <div>
            <span className="stat-label">Teacher groups</span>
            <div className="stat">
              {new Set(groups.map((group) => group.id)).size}
            </div>
          </div>
        </div>
      </section>
      <section className="grid-2 section grid">
        <div className="card">
          <div className="section-heading">
            <UserPlus size={21} />
            <div>
              <h2>Add a user</h2>
              <p className="meta">Create a secure school account.</p>
            </div>
          </div>
          <form className="form-grid" onSubmit={createUser}>
            <div className="field">
              <label htmlFor="new-name">Name</label>
              <input id="new-name" name="name" required />
            </div>
            <div className="field">
              <label htmlFor="new-email">Email</label>
              <input id="new-email" name="email" type="email" required />
            </div>
            <div className="field">
              <label htmlFor="new-role">Role</label>
              <select id="new-role" name="role" defaultValue="student">
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="new-password">Temporary password</label>
              <input
                id="new-password"
                name="password"
                type="password"
                minLength={8}
                required
              />
            </div>
            <button className="button span-2">Create user</button>
          </form>
        </div>
        <div className="card">
          <div className="section-heading">
            <Layers3 size={21} />
            <div>
              <h2>Create a teacher group</h2>
              <p className="meta">Organize teachers by team or subject.</p>
            </div>
          </div>
          <form className="stack" onSubmit={createGroup}>
            <div className="field">
              <label htmlFor="group-name">Group name</label>
              <input
                id="group-name"
                name="name"
                placeholder="Science department"
                required
              />
            </div>
            <button className="button">Create group</button>
          </form>
          <div className="section">
            {groups.length === 0 ? (
              <div className="empty">No groups yet.</div>
            ) : (
              [
                ...new Map(groups.map((group) => [group.id, group])).values(),
              ].map((group) => (
                <div className="list-item" key={group.id}>
                  <div className="row">
                    <strong>{group.name}</strong>
                    <div className="action-group">
                      <button
                        className="button ghost"
                        onClick={() => renameGroup(group.id, group.name)}
                      >
                        Rename
                      </button>
                      <button
                        className="button danger"
                        onClick={() => removeGroup(group.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="muted">
                    {groups
                      .filter((row) => row.id === group.id && row.teacherName)
                      .map((row) => row.teacherName)
                      .join(', ') || 'No teachers assigned'}
                  </div>
                  <form
                    className="row section"
                    onSubmit={(event) => addTeacher(event, group.id)}
                  >
                    <select
                      name="teacherId"
                      aria-label={`Teacher for ${group.name}`}
                    >
                      {users
                        .filter((item) => item.role === 'teacher')
                        .map((teacher) => (
                          <option key={teacher.id} value={teacher.id}>
                            {teacher.name}
                          </option>
                        ))}
                    </select>
                    <button className="button secondary">Assign</button>
                  </form>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
      <section className="card section">
        <div className="row section-heading">
          <div className="section-heading compact">
            <UsersRound size={21} />
            <div>
              <h2>People</h2>
              <p className="meta">Account access and role management.</p>
            </div>
          </div>
          <span className="meta">{users.length} total</span>
        </div>
        {users.map((item) => (
          <div className="row mobile-stack list-item" key={item.id}>
            <div>
              <strong>{item.name}</strong>
              <div className="muted">{item.email}</div>
            </div>
            <div className="action-group">
              <span className="badge">{item.role}</span>
              <span
                className={`badge ${item.status === 'active' ? 'success' : 'danger'}`}
              >
                {item.status}
              </span>
              {item.id !== user.id && (
                <>
                  <button
                    className="button ghost"
                    onClick={() => editUser(item)}
                  >
                    Edit
                  </button>
                  <button
                    className="button secondary"
                    onClick={() =>
                      setStatus(
                        item.id,
                        item.status === 'active' ? 'suspended' : 'active'
                      )
                    }
                  >
                    {item.status === 'active' ? 'Suspend' : 'Restore'}
                  </button>
                  <button
                    className="button danger"
                    onClick={() => removeUser(item.id)}
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
