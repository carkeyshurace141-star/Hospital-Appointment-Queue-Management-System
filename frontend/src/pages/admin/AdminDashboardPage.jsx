import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  listDoctors,
  deleteDoctor,
  getOverview,
  getQueues,
  getCompletedToday,
  getQueuePerformanceReport,
} from '../../services/adminService';

const OVERVIEW_POLL_MS = 20000;
const QUEUES_POLL_MS = 20000;

// `panel` is which detail panel opens when the tile is clicked - separate
// from `key` because "Patients queued" reuses the same live-queue panel as
// the standalone Monitor Queue button rather than getting its own.
const OVERVIEW_TILES = [
  { key: 'patientsQueued', label: 'Patients queued', panel: 'queues' },
  { key: 'averageWaitMinutesToday', label: 'Avg wait today (min)', panel: 'averageWaitMinutesToday' },
  { key: 'doctorsOnDuty', label: 'Doctors on duty', panel: 'doctorsOnDuty' },
  { key: 'doctorsUnavailable', label: 'Doctors unavailable', panel: 'doctorsUnavailable' },
  { key: 'consultationsCompletedToday', label: 'Completed today', panel: 'consultationsCompletedToday' },
];

function startOfTodayIso() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start.toISOString();
}

function formatClockTime(timestamp) {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Expandable row for one department's live queue - collapsed it just shows
// counts, clicking it reveals who's currently being seen and everyone
// waiting behind them.
function QueueRow({ queue, expanded, onToggle }) {
  const { department, current, waiting, waitingCount } = queue;

  return (
    <div className="border-b border-stone-200 last:border-b-0 dark:border-stone-800">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-stone-50 dark:hover:bg-stone-800/50"
      >
        <div>
          <p className="font-medium text-stone-900 dark:text-white">{department.name}</p>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            {current ? `Now serving token #${current.tokenNumber}` : 'No patient currently being seen'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-700 dark:bg-teal-950 dark:text-teal-400">
            {waitingCount} waiting
          </span>
          <span aria-hidden="true" className="text-stone-400">
            {expanded ? '−' : '+'}
          </span>
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-stone-200 bg-stone-50 px-4 py-3 dark:border-stone-800 dark:bg-stone-950">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
              Currently being seen
            </p>
            {current ? (
              <p className="mt-1 text-sm text-stone-800 dark:text-stone-200">
                Token #{current.tokenNumber} - {current.patientName} ({current.category}
                {current.type === 'walk-in' ? ', walk-in' : ''})
              </p>
            ) : (
              <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">Nobody right now.</p>
            )}
          </div>

          <div className="mt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
              Waiting ({waitingCount})
            </p>
            {waiting.length === 0 ? (
              <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                Nobody waiting in this queue.
              </p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {waiting.map((patient) => (
                  <li
                    key={patient.appointmentId}
                    className="flex items-center justify-between text-sm text-stone-800 dark:text-stone-200"
                  >
                    <span>
                      Token #{patient.tokenNumber} - {patient.patientName} ({patient.category}
                      {patient.type === 'walk-in' ? ', walk-in' : ''})
                    </span>
                    <span className="text-xs text-stone-500 dark:text-stone-400">
                      queued {formatClockTime(patient.queuedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PanelMessage({ children }) {
  return <p className="p-4 text-sm text-stone-500 dark:text-stone-400">{children}</p>;
}

function PanelError({ children }) {
  return (
    <p role="alert" className="p-4 text-sm text-red-600 dark:text-red-400">
      {children}
    </p>
  );
}

function QueuesPanel({ queues, error, expandedDepartmentId, onToggleDepartment }) {
  if (error) return <PanelError>{error}</PanelError>;
  if (queues === null) return <PanelMessage>Loading…</PanelMessage>;
  if (queues.length === 0) return <PanelMessage>No departments yet.</PanelMessage>;

  return (
    <div>
      {queues.map((queue) => (
        <QueueRow
          key={queue.department.id}
          queue={queue}
          expanded={expandedDepartmentId === queue.department.id}
          onToggle={() => onToggleDepartment(queue.department.id)}
        />
      ))}
    </div>
  );
}

function DoctorListPanel({ doctors, emptyText }) {
  if (doctors.length === 0) return <PanelMessage>{emptyText}</PanelMessage>;

  return (
    <ul className="divide-y divide-stone-200 dark:divide-stone-800">
      {doctors.map((doctor) => (
        <li key={doctor.id} className="flex items-center justify-between px-4 py-3 text-sm">
          <span className="text-stone-900 dark:text-white">{doctor.name}</span>
          <span className="text-stone-500 dark:text-stone-400">
            {doctor.specialization ? `${doctor.specialization} - ` : ''}
            {doctor.department}
          </span>
        </li>
      ))}
    </ul>
  );
}

function AverageWaitPanel({ rows, error }) {
  if (error) return <PanelError>{error}</PanelError>;
  if (rows === null) return <PanelMessage>Loading…</PanelMessage>;
  if (rows.length === 0) return <PanelMessage>No queue activity yet today.</PanelMessage>;

  return (
    <ul className="divide-y divide-stone-200 dark:divide-stone-800">
      {rows.map((row) => (
        <li key={row.departmentId} className="flex items-center justify-between px-4 py-3 text-sm">
          <span className="text-stone-900 dark:text-white">{row.departmentName}</span>
          <span className="text-stone-500 dark:text-stone-400">
            {row.avgWaitMinutes} min avg - {row.tokenCount} token{row.tokenCount === 1 ? '' : 's'}
          </span>
        </li>
      ))}
    </ul>
  );
}

function CompletedTodayPanel({ completed, error }) {
  if (error) return <PanelError>{error}</PanelError>;
  if (completed === null) return <PanelMessage>Loading…</PanelMessage>;
  if (completed.length === 0) return <PanelMessage>No consultations completed yet today.</PanelMessage>;

  return (
    <ul className="divide-y divide-stone-200 dark:divide-stone-800">
      {completed.map((entry, index) => (
        <li
          key={`${entry.tokenNumber}-${entry.department}-${index}`}
          className="flex items-center justify-between px-4 py-3 text-sm"
        >
          <span className="text-stone-900 dark:text-white">{entry.patientName}</span>
          <span className="text-stone-500 dark:text-stone-400">
            {entry.doctorName} - {entry.department} - {formatClockTime(entry.completedAt)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function AdminDashboardPage() {
  const { token, user } = useAuth();
  const [doctors, setDoctors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [overview, setOverview] = useState(null);
  const [overviewError, setOverviewError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [rowErrors, setRowErrors] = useState({});

  // Which detail panel (if any) is currently open below the overview tiles.
  // Only one at a time - opening another, or re-clicking the open one,
  // replaces/closes it.
  const [activePanel, setActivePanel] = useState(null);
  const [expandedDepartmentId, setExpandedDepartmentId] = useState(null);

  const [queues, setQueues] = useState(null);
  const [queuesError, setQueuesError] = useState('');
  const [avgWaitRows, setAvgWaitRows] = useState(null);
  const [avgWaitError, setAvgWaitError] = useState('');
  const [completedToday, setCompletedToday] = useState(null);
  const [completedTodayError, setCompletedTodayError] = useState('');

  useEffect(() => {
    listDoctors(token)
      .then((data) => setDoctors(data.doctors))
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [token]);

  useEffect(() => {
    let cancelled = false;

    function poll() {
      getOverview(token)
        .then((data) => {
          if (!cancelled) setOverview(data);
        })
        .catch((err) => {
          if (!cancelled) setOverviewError(err.message);
        });
    }

    poll();
    const interval = setInterval(poll, OVERVIEW_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [token]);

  // Live queue detail is only fetched (and kept fresh) while its panel is
  // actually open - no point polling a panel nobody's looking at.
  useEffect(() => {
    if (activePanel !== 'queues') return undefined;
    let cancelled = false;

    function poll() {
      getQueues(token)
        .then((data) => {
          if (!cancelled) setQueues(data.queues);
        })
        .catch((err) => {
          if (!cancelled) setQueuesError(err.message);
        });
    }

    poll();
    const interval = setInterval(poll, QUEUES_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [activePanel, token]);

  useEffect(() => {
    if (activePanel !== 'averageWaitMinutesToday') return;
    setAvgWaitError('');
    getQueuePerformanceReport({ from: startOfTodayIso(), to: new Date().toISOString() }, token)
      .then((data) => setAvgWaitRows(data.rows))
      .catch((err) => setAvgWaitError(err.message));
  }, [activePanel, token]);

  useEffect(() => {
    if (activePanel !== 'consultationsCompletedToday') return;
    setCompletedTodayError('');
    getCompletedToday(token)
      .then((data) => setCompletedToday(data.completed))
      .catch((err) => setCompletedTodayError(err.message));
  }, [activePanel, token]);

  function togglePanel(panel) {
    setActivePanel((prev) => (prev === panel ? null : panel));
  }

  async function handleDelete(doctor) {
    if (!window.confirm(`Delete ${doctor.name}'s account? This cannot be undone.`)) return;

    setDeletingId(doctor.id);
    setRowErrors((prev) => ({ ...prev, [doctor.id]: '' }));
    try {
      await deleteDoctor(doctor.id, token);
      setDoctors((prev) => prev.filter((d) => d.id !== doctor.id));
    } catch (err) {
      setRowErrors((prev) => ({ ...prev, [doctor.id]: err.message }));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Welcome, {user?.name}</h1>
          <p className="mt-1 text-stone-600 dark:text-stone-400">Manage doctor accounts for the clinic.</p>
        </div>
        <div className="flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={() => togglePanel('queues')}
            aria-expanded={activePanel === 'queues'}
            className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            {activePanel === 'queues' ? 'Hide Monitor Queue' : 'Monitor Queue'}
          </button>
          <Link
            to="/admin/reports"
            className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            Reports
          </Link>
          <Link
            to="/admin/audit-log"
            className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            Audit Log
          </Link>
          <Link
            to="/admin/doctors/new"
            className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
          >
            + Add Doctor
          </Link>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-white">System overview</h2>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
          Click a tile for the details behind it.
        </p>
        {overviewError ? (
          <p role="alert" aria-live="assertive" className="mt-2 text-sm text-red-600 dark:text-red-400">
            {overviewError}
          </p>
        ) : (
          <div
            role="status"
            aria-live="polite"
            className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5"
          >
            {OVERVIEW_TILES.map((tile) => (
              <button
                key={tile.key}
                type="button"
                onClick={() => togglePanel(tile.panel)}
                aria-expanded={activePanel === tile.panel}
                className="rounded-lg border border-stone-200 bg-white p-4 text-center transition-colors hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900 dark:hover:bg-stone-800/50"
              >
                <p className="text-2xl font-bold text-teal-700 dark:text-teal-400">
                  {overview ? overview[tile.key] : '-'}
                </p>
                <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">{tile.label}</p>
              </button>
            ))}
          </div>
        )}

        {activePanel ? (
          <div className="mt-4 overflow-hidden rounded-lg border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
            {activePanel === 'queues' ? (
              <QueuesPanel
                queues={queues}
                error={queuesError}
                expandedDepartmentId={expandedDepartmentId}
                onToggleDepartment={(id) =>
                  setExpandedDepartmentId((prev) => (prev === id ? null : id))
                }
              />
            ) : null}
            {activePanel === 'doctorsOnDuty' ? (
              <DoctorListPanel
                doctors={doctors.filter((doctor) => !doctor.unavailable)}
                emptyText="No doctors currently on duty."
              />
            ) : null}
            {activePanel === 'doctorsUnavailable' ? (
              <DoctorListPanel
                doctors={doctors.filter((doctor) => doctor.unavailable)}
                emptyText="No doctors are marked unavailable."
              />
            ) : null}
            {activePanel === 'averageWaitMinutesToday' ? (
              <AverageWaitPanel rows={avgWaitRows} error={avgWaitError} />
            ) : null}
            {activePanel === 'consultationsCompletedToday' ? (
              <CompletedTodayPanel completed={completedToday} error={completedTodayError} />
            ) : null}
          </div>
        ) : null}
      </section>

      <h2 className="mt-8 text-lg font-semibold text-stone-900 dark:text-white">Doctors</h2>
      <div className="mt-4 overflow-hidden rounded-lg border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-stone-600 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-400">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Specialization</th>
              <th className="px-4 py-3 font-medium">Department</th>
              <th className="px-4 py-3 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-stone-500 dark:text-stone-400">
                  Loading…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-red-600 dark:text-red-400">
                  {error}
                </td>
              </tr>
            ) : doctors.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-stone-500 dark:text-stone-400">
                  No doctors yet. Add your first doctor to get started.
                </td>
              </tr>
            ) : (
              doctors.map((doctor) => (
                <tr key={doctor.id}>
                  <td className="px-4 py-3 text-stone-900 dark:text-white">{doctor.name}</td>
                  <td className="px-4 py-3 text-stone-600 dark:text-stone-400">{doctor.email}</td>
                  <td className="px-4 py-3 text-stone-600 dark:text-stone-400">{doctor.specialization}</td>
                  <td className="px-4 py-3 text-stone-600 dark:text-stone-400">{doctor.department}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(doctor)}
                      disabled={deletingId === doctor.id}
                      className="font-medium text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400"
                    >
                      {deletingId === doctor.id ? 'Deleting…' : 'Delete'}
                    </button>
                    {rowErrors[doctor.id] ? (
                      <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">
                        {rowErrors[doctor.id]}
                      </p>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminDashboardPage;
