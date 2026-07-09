'use client';

import {
  Award,
  BookOpenCheck,
  BookOpenText,
  ClipboardList,
  GraduationCap,
} from 'lucide-react';
import { type FormEvent, useCallback, useEffect, useState } from 'react';
import type { SessionUser } from '@/shared/contracts';
import { api } from '@/lib/api';

interface StudentClass {
  id: string;
  name: string;
  description: string;
  teacherName: string;
}
interface WorkRow {
  classId: string;
  className: string;
  lessonId: string | null;
  lessonTitle: string | null;
  lessonContent: string | null;
  assignmentId: string | null;
  assignmentTitle: string | null;
  assignmentDescription: string | null;
  dueAt: string | null;
  submissionId: string | null;
  grade: number | null;
  feedback: string | null;
}

export function StudentDashboard({ user }: { user: SessionUser }) {
  const [classes, setClasses] = useState<StudentClass[]>([]);
  const [work, setWork] = useState<WorkRow[]>([]);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try {
      const [nextClasses, nextWork] = await Promise.all([
        api<StudentClass[]>('/api/student/classes'),
        api<WorkRow[]>('/api/student/work'),
      ]);
      setClasses(nextClasses);
      setWork(nextWork);
      setError('');
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Unable to load coursework.'
      );
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  async function submit(
    event: FormEvent<HTMLFormElement>,
    assignmentId: string
  ) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await api(`/api/student/assignments/${assignmentId}/submission`, {
        method: 'PUT',
        body: JSON.stringify({
          content: form.get('content'),
          linkUrl: form.get('linkUrl'),
        }),
      });
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Unable to submit work.'
      );
    }
  }
  const assignments = [
    ...new Map(
      work
        .filter((item) => item.assignmentId)
        .map((item) => [item.assignmentId, item])
    ).values(),
  ];
  const lessons = [
    ...new Map(
      work.filter((item) => item.lessonId).map((item) => [item.lessonId, item])
    ).values(),
  ];
  return (
    <>
      <header className="page-header">
        <p className="eyebrow">Student dashboard</p>
        <h1>Hi, {user.name.split(' ')[0]}.</h1>
        <p className="muted">Here is what is happening across your classes.</p>
      </header>
      {error && <div className="error section">{error}</div>}
      <section className="grid-3 section grid">
        <div className="card stat-card green">
          <span className="stat-icon">
            <GraduationCap size={23} />
          </span>
          <div>
            <span className="stat-label">Classes</span>
            <div className="stat">{classes.length}</div>
          </div>
        </div>
        <div className="card stat-card navy">
          <span className="stat-icon">
            <ClipboardList size={22} />
          </span>
          <div>
            <span className="stat-label">Assignments</span>
            <div className="stat">{assignments.length}</div>
          </div>
        </div>
        <div className="card stat-card gold">
          <span className="stat-icon">
            <Award size={22} />
          </span>
          <div>
            <span className="stat-label">Graded</span>
            <div className="stat">
              {assignments.filter((item) => item.grade !== null).length}
            </div>
          </div>
        </div>
      </section>
      <section className="grid-2 section grid">
        <div className="card">
          <div className="section-heading">
            <BookOpenCheck size={21} />
            <div>
              <h2>My classes</h2>
              <p className="meta">The spaces where your learning happens.</p>
            </div>
          </div>
          {classes.length === 0 ? (
            <div className="empty">You are not enrolled in a class yet.</div>
          ) : (
            classes.map((item) => (
              <div className="content-item" key={item.id}>
                <strong>{item.name}</strong>
                <div className="muted">{item.teacherName}</div>
                <p>{item.description}</p>
              </div>
            ))
          )}
        </div>
        <div className="card">
          <div className="section-heading">
            <BookOpenText size={21} />
            <div>
              <h2>Published lessons</h2>
              <p className="meta">Recent material from your teachers.</p>
            </div>
          </div>
          {lessons.length === 0 ? (
            <div className="empty">No lessons published yet.</div>
          ) : (
            lessons.map((item) => (
              <div className="content-item" key={item.lessonId}>
                <span className="badge">{item.className}</span>
                <h3 className="content-title">{item.lessonTitle}</h3>
                <p>{item.lessonContent}</p>
              </div>
            ))
          )}
        </div>
      </section>
      <section className="card section">
        <div className="section-heading">
          <ClipboardList size={21} />
          <div>
            <h2>Assignments and grades</h2>
            <p className="meta">
              Submit your work and follow teacher feedback.
            </p>
          </div>
        </div>
        {assignments.length === 0 ? (
          <div className="empty">No assignments are due.</div>
        ) : (
          assignments.map((item) => (
            <div className="content-item" key={item.assignmentId}>
              <div className="row mobile-stack">
                <div>
                  <span className="badge">{item.className}</span>
                  <h3 className="content-title">{item.assignmentTitle}</h3>
                  <p>{item.assignmentDescription}</p>
                  {item.dueAt && (
                    <div className="muted">
                      Due {new Date(item.dueAt).toLocaleString()}
                    </div>
                  )}
                </div>
                {item.grade !== null && (
                  <div>
                    <div className="stat">{item.grade}%</div>
                    <div className="muted">{item.feedback}</div>
                  </div>
                )}
              </div>
              {item.grade === null && item.assignmentId && (
                <form
                  className="form-grid section"
                  onSubmit={(event) => submit(event, item.assignmentId!)}
                >
                  <div className="field">
                    <label htmlFor={`response-${item.assignmentId}`}>
                      Written response
                    </label>
                    <textarea
                      id={`response-${item.assignmentId}`}
                      name="content"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor={`link-${item.assignmentId}`}>
                      Supporting link
                    </label>
                    <input
                      id={`link-${item.assignmentId}`}
                      name="linkUrl"
                      type="url"
                      placeholder="https://"
                    />
                  </div>
                  <button className="button span-2">
                    {item.submissionId
                      ? 'Update submission'
                      : 'Submit assignment'}
                  </button>
                </form>
              )}
            </div>
          ))
        )}
      </section>
    </>
  );
}
