'use client';

import {
  BookOpenText,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FolderPlus,
  School,
} from 'lucide-react';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import type { SessionUser } from '@/shared/contracts';
import { api } from '@/lib/api';

interface ClassItem {
  id: string;
  name: string;
  description: string;
}
interface Submission {
  id: string;
  studentName: string;
  assignmentTitle: string;
  className: string;
  content: string;
  linkUrl: string;
  grade: number | null;
  feedback: string | null;
}
interface NamedUser {
  id: string;
  name: string;
}

export function TeacherDashboard({ user }: { user: SessionUser }) {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [students, setStudents] = useState<NamedUser[]>([]);
  const [selected, setSelected] = useState('');
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try {
      const [nextClasses, nextSubmissions, nextStudents] = await Promise.all([
        api<ClassItem[]>('/api/teacher/classes'),
        api<Submission[]>('/api/teacher/submissions'),
        api<NamedUser[]>('/api/v0/stats/student-names'),
      ]);
      setClasses(nextClasses);
      setSubmissions(nextSubmissions);
      setStudents(nextStudents);
      setSelected((value) => value || nextClasses[0]?.id || '');
      setError('');
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Unable to load classes.'
      );
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  async function createClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api('/api/teacher/classes', {
        method: 'POST',
        body: JSON.stringify({
          name: form.get('name'),
          description: form.get('description'),
        }),
      });
      event.currentTarget.reset();
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Unable to create class.'
      );
    }
  }
  async function renameClass(item: ClassItem) {
    const name = prompt('Class name', item.name)?.trim();
    if (!name || name === item.name) return;
    try {
      await api(`/api/teacher/classes/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name }),
      });
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Unable to rename class.'
      );
    }
  }
  async function removeClass(item: ClassItem) {
    if (!confirm(`Delete ${item.name} and all of its coursework?`)) return;
    try {
      await api(`/api/teacher/classes/${item.id}`, { method: 'DELETE' });
      if (selected === item.id) setSelected('');
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Unable to delete class.'
      );
    }
  }
  async function createLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api(`/api/teacher/classes/${selected}/lessons`, {
        method: 'POST',
        body: JSON.stringify({
          title: form.get('title'),
          content: form.get('content'),
          published: true,
        }),
      });
      event.currentTarget.reset();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Unable to publish lesson.'
      );
    }
  }
  async function createAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api(`/api/teacher/classes/${selected}/assignments`, {
        method: 'POST',
        body: JSON.stringify({
          title: form.get('title'),
          description: form.get('description'),
          dueAt: new Date(String(form.get('dueAt'))).toISOString(),
          published: true,
        }),
      });
      event.currentTarget.reset();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Unable to publish assignment.'
      );
    }
  }
  async function enroll(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api(`/api/teacher/classes/${selected}/students`, {
        method: 'POST',
        body: JSON.stringify({ userId: form.get('studentId') }),
      });
      setError('');
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Unable to enroll student.'
      );
    }
  }
  async function grade(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api(`/api/teacher/submissions/${id}/grade`, {
        method: 'PATCH',
        body: JSON.stringify({
          grade: Number(form.get('grade')),
          feedback: form.get('feedback'),
        }),
      });
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Unable to save grade.'
      );
    }
  }
  return (
    <>
      <header className="page-header">
        <p className="eyebrow">Teacher workspace</p>
        <h1>Welcome back, {user.name.split(' ')[0]}.</h1>
        <p className="muted">
          Your classes, publishing tools, and grading queue.
        </p>
      </header>
      {error && <div className="error section">{error}</div>}
      <section className="grid-3 section grid">
        <div className="card stat-card green">
          <span className="stat-icon">
            <School size={22} />
          </span>
          <div>
            <span className="stat-label">Classes</span>
            <div className="stat">{classes.length}</div>
          </div>
        </div>
        <div className="card stat-card navy">
          <span className="stat-icon">
            <ClipboardCheck size={22} />
          </span>
          <div>
            <span className="stat-label">Submissions</span>
            <div className="stat">{submissions.length}</div>
          </div>
        </div>
        <div className="card stat-card gold">
          <span className="stat-icon">
            <Clock3 size={22} />
          </span>
          <div>
            <span className="stat-label">Needs grading</span>
            <div className="stat">
              {submissions.filter((item) => item.grade === null).length}
            </div>
          </div>
        </div>
      </section>
      <section className="grid-2 section grid">
        <div className="card">
          <div className="section-heading">
            <FolderPlus size={21} />
            <div>
              <h2>Create a class</h2>
              <p className="meta">Start a focused space for your students.</p>
            </div>
          </div>
          <form className="stack" onSubmit={createClass}>
            <div className="field">
              <label htmlFor="class-name">Class name</label>
              <input id="class-name" name="name" required />
            </div>
            <div className="field">
              <label htmlFor="class-description">Description</label>
              <textarea id="class-description" name="description" />
            </div>
            <button className="button">Create class</button>
          </form>
        </div>
        <div className="card">
          <div className="section-heading">
            <School size={21} />
            <div>
              <h2>Your classes</h2>
              <p className="meta">Choose a class to publish coursework.</p>
            </div>
          </div>
          {classes.length === 0 ? (
            <div className="empty">Create your first class.</div>
          ) : (
            classes.map((item) => (
              <div className="row mobile-stack list-item" key={item.id}>
                <button
                  className={`button ghost class-select-button ${selected === item.id ? 'selected-class' : ''}`}
                  onClick={() => setSelected(item.id)}
                  aria-pressed={selected === item.id}
                >
                  <strong>{item.name}</strong>
                  <div className="muted">
                    {item.description || 'No description'}
                  </div>
                </button>
                <div className="action-group">
                  <button
                    className="button secondary"
                    onClick={() => renameClass(item)}
                  >
                    Rename
                  </button>
                  <button
                    className="button danger"
                    onClick={() => removeClass(item)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
      {selected && (
        <section className="card section">
          <div className="row mobile-stack">
            <div>
              <p className="eyebrow">Publishing</p>
              <h2>{classes.find((item) => item.id === selected)?.name}</h2>
            </div>
            <form className="row" onSubmit={enroll}>
              <select name="studentId" aria-label="Student" required>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name}
                  </option>
                ))}
              </select>
              <button className="button secondary">Enroll</button>
            </form>
          </div>
          <div className="grid-2 section grid">
            <form className="stack" onSubmit={createLesson}>
              <div className="section-heading compact">
                <BookOpenText size={20} />
                <h3>Publish lesson</h3>
              </div>
              <div className="field">
                <label htmlFor="lesson-title">Title</label>
                <input id="lesson-title" name="title" required />
              </div>
              <div className="field">
                <label htmlFor="lesson-content">Content</label>
                <textarea id="lesson-content" name="content" required />
              </div>
              <button className="button">Publish lesson</button>
            </form>
            <form className="stack" onSubmit={createAssignment}>
              <div className="section-heading compact">
                <ClipboardCheck size={20} />
                <h3>Publish assignment</h3>
              </div>
              <div className="field">
                <label htmlFor="assignment-title">Title</label>
                <input id="assignment-title" name="title" required />
              </div>
              <div className="field">
                <label htmlFor="assignment-description">Instructions</label>
                <textarea
                  id="assignment-description"
                  name="description"
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="due-at">Due date</label>
                <input
                  id="due-at"
                  name="dueAt"
                  type="datetime-local"
                  required
                />
              </div>
              <button className="button">Publish assignment</button>
            </form>
          </div>
        </section>
      )}
      <section className="card section">
        <div className="section-heading">
          <CheckCircle2 size={21} />
          <div>
            <h2>Grading queue</h2>
            <p className="meta">Review submissions and leave clear feedback.</p>
          </div>
        </div>
        {submissions.length === 0 ? (
          <div className="empty">No submissions yet.</div>
        ) : (
          submissions.map((item) => (
            <div className="content-item" key={item.id}>
              <div className="row mobile-stack">
                <div>
                  <strong>
                    {item.studentName} · {item.assignmentTitle}
                  </strong>
                  <div className="muted">{item.className}</div>
                </div>
                {item.grade !== null && (
                  <span className="badge success">{item.grade}%</span>
                )}
              </div>
              <p className="section">
                {item.content}
                {item.linkUrl && (
                  <>
                    {' '}
                    · <a href={item.linkUrl}>Open link</a>
                  </>
                )}
              </p>
              <form
                className="form-grid"
                onSubmit={(event) => grade(event, item.id)}
              >
                <div className="field">
                  <label htmlFor={`grade-${item.id}`}>Grade</label>
                  <input
                    id={`grade-${item.id}`}
                    name="grade"
                    type="number"
                    min="0"
                    max="100"
                    defaultValue={item.grade ?? ''}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor={`feedback-${item.id}`}>Feedback</label>
                  <input
                    id={`feedback-${item.id}`}
                    name="feedback"
                    defaultValue={item.feedback ?? ''}
                  />
                </div>
                <button className="button span-2">Save grade</button>
              </form>
            </div>
          ))
        )}
      </section>
    </>
  );
}
