import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { getAuditLog } from '../../services/adminService';

const PAGE_SIZE = 20;

function AuditLogPage() {
  const { token } = useAuth();
  const [filters, setFilters] = useState({ user: '', action: '', from: '', to: '' });
  const [page, setPage] = useState(1);
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setIsLoading(true);
    getAuditLog({ ...filters, page, pageSize: PAGE_SIZE }, token)
      .then((data) => {
        setLogs(data.logs);
        setTotal(data.total);
        setError('');
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [filters, page, token]);

  function handleFilterChange(event) {
    const { name, value } = event.target;
    setPage(1);
    setFilters((prev) => ({ ...prev, [name]: value }));
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Audit Log</h1>
      <p className="mt-1 text-stone-600 dark:text-stone-400">
        Every recorded access to patient data by clinicians and admins.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <div>
          <label htmlFor="filter-user" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            User ID
          </label>
          <input
            id="filter-user"
            name="user"
            value={filters.user}
            onChange={handleFilterChange}
            className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 dark:border-stone-700 dark:bg-stone-900 dark:text-white"
          />
        </div>
        <div>
          <label htmlFor="filter-action" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            Action
          </label>
          <input
            id="filter-action"
            name="action"
            placeholder="e.g. call_patient"
            value={filters.action}
            onChange={handleFilterChange}
            className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 dark:border-stone-700 dark:bg-stone-900 dark:text-white"
          />
        </div>
        <div>
          <label htmlFor="filter-from" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            From
          </label>
          <input
            id="filter-from"
            name="from"
            type="date"
            value={filters.from}
            onChange={handleFilterChange}
            className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 dark:border-stone-700 dark:bg-stone-900 dark:text-white"
          />
        </div>
        <div>
          <label htmlFor="filter-to" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            To
          </label>
          <input
            id="filter-to"
            name="to"
            type="date"
            value={filters.to}
            onChange={handleFilterChange}
            className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 dark:border-stone-700 dark:bg-stone-900 dark:text-white"
          />
        </div>
      </div>

      {error ? (
        <p role="alert" aria-live="assertive" className="mt-4 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <div className="mt-6 overflow-hidden rounded-lg border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-stone-600 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-400">
            <tr>
              <th className="px-4 py-3 font-medium">Timestamp</th>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Target</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-stone-500 dark:text-stone-400">
                  Loading…
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-stone-500 dark:text-stone-400">
                  No audit entries match these filters.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td className="px-4 py-3 text-stone-600 dark:text-stone-400">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-stone-900 dark:text-white">
                    {log.user ? `${log.user.name} (${log.user.email})` : 'Unknown'}
                  </td>
                  <td className="px-4 py-3 text-stone-600 dark:text-stone-400">{log.action}</td>
                  <td className="px-4 py-3 text-stone-600 dark:text-stone-400">
                    {log.targetType}
                    {log.targetId ? ` · ${log.targetId}` : ''}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-stone-600 dark:text-stone-400">
        <span>
          Page {page} of {totalPages} ({total} entries)
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-md border border-stone-300 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50 dark:border-stone-700"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-md border border-stone-300 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50 dark:border-stone-700"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

export default AuditLogPage;
