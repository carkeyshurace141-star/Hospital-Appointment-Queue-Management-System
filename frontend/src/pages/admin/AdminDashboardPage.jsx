import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { listDoctors, getOverview } from '../../services/adminService';

const OVERVIEW_POLL_MS = 20000;

const OVERVIEW_TILES = [
  { key: 'patientsQueued', label: 'Patients queued' },
  { key: 'averageWaitMinutesToday', label: 'Avg wait today (min)' },
  { key: 'doctorsOnDuty', label: 'Doctors on duty' },
  { key: 'doctorsUnavailable', label: 'Doctors unavailable' },
  { key: 'consultationsCompletedToday', label: 'Completed today' },
];

function AdminDashboardPage() {
  const { token, user } = useAuth();
  const [doctors, setDoctors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [overview, setOverview] = useState(null);
  const [overviewError, setOverviewError] = useState('');

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

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Welcome, {user?.name}</h1>
          <p className="mt-1 text-stone-600 dark:text-stone-400">Manage doctor accounts for the clinic.</p>
        </div>
        <div className="flex gap-3">
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
              <div
                key={tile.key}
                className="rounded-lg border border-stone-200 bg-white p-4 text-center dark:border-stone-800 dark:bg-stone-900"
              >
                <p className="text-2xl font-bold text-teal-700 dark:text-teal-400">
                  {overview ? overview[tile.key] : '-'}
                </p>
                <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">{tile.label}</p>
              </div>
            ))}
          </div>
        )}
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
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-stone-500 dark:text-stone-400">
                  Loading…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-red-600 dark:text-red-400">
                  {error}
                </td>
              </tr>
            ) : doctors.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-stone-500 dark:text-stone-400">
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
