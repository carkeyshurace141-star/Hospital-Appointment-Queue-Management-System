import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  getDoctorWorkloadReport,
  getQueuePerformanceReport,
  getBenchmarkResults,
  downloadReportCsv,
} from '../../services/adminService';

const ALGORITHM_LABELS = {
  fcfs: 'FCFS',
  priority: 'Priority',
  'round-robin': 'Round Robin',
  'multi-level-queue': 'Multi-Level Queue',
};

function ReportTable({ rows, columns }) {
  if (rows.length === 0) {
    return <p className="mt-3 text-sm text-stone-600 dark:text-stone-400">No data for this range.</p>;
  }

  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-stone-200 dark:border-stone-800">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-stone-200 bg-stone-50 text-stone-600 dark:border-stone-800 dark:bg-stone-950 dark:text-stone-400">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-2 font-medium">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
          {rows.map((row, index) => (
            // eslint-disable-next-line react/no-array-index-key
            <tr key={index}>
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-2 text-stone-900 dark:text-white">
                  {row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReportsPage() {
  const { token } = useAuth();
  const [range, setRange] = useState({ from: '', to: '' });
  const [workload, setWorkload] = useState([]);
  const [queuePerformance, setQueuePerformance] = useState([]);
  const [error, setError] = useState('');
  const [downloadError, setDownloadError] = useState('');
  const [benchmark, setBenchmark] = useState(null);
  const [benchmarkError, setBenchmarkError] = useState('');

  useEffect(() => {
    Promise.all([
      getDoctorWorkloadReport(range, token),
      getQueuePerformanceReport(range, token),
    ])
      .then(([workloadData, queueData]) => {
        setWorkload(workloadData.rows);
        setQueuePerformance(queueData.rows);
        setError('');
      })
      .catch((err) => setError(err.message));
  }, [range, token]);

  useEffect(() => {
    getBenchmarkResults(token)
      .then(setBenchmark)
      .catch((err) => setBenchmarkError(err.message));
  }, [token]);

  function handleRangeChange(event) {
    const { name, value } = event.target;
    setRange((prev) => ({ ...prev, [name]: value }));
  }

  async function handleDownload(reportPath, filename) {
    setDownloadError('');
    try {
      await downloadReportCsv(reportPath, range, token, filename);
    } catch (err) {
      setDownloadError(err.message);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Reports</h1>
      <p className="mt-1 text-stone-600 dark:text-stone-400">
        Defaults to the last 7 days when no range is chosen.
      </p>

      <div className="mt-6 flex flex-wrap items-end gap-4">
        <div>
          <label htmlFor="from" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            From
          </label>
          <input
            id="from"
            name="from"
            type="date"
            value={range.from}
            onChange={handleRangeChange}
            className="mt-1 rounded-md border border-stone-300 px-3 py-2 dark:border-stone-700 dark:bg-stone-900 dark:text-white"
          />
        </div>
        <div>
          <label htmlFor="to" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
            To
          </label>
          <input
            id="to"
            name="to"
            type="date"
            value={range.to}
            onChange={handleRangeChange}
            className="mt-1 rounded-md border border-stone-300 px-3 py-2 dark:border-stone-700 dark:bg-stone-900 dark:text-white"
          />
        </div>
      </div>

      {error ? (
        <p role="alert" aria-live="assertive" className="mt-4 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
      {downloadError ? (
        <p role="alert" aria-live="assertive" className="mt-4 text-sm text-red-600 dark:text-red-400">
          {downloadError}
        </p>
      ) : null}

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-white">Doctor workload</h2>
          <button
            type="button"
            onClick={() => handleDownload('/api/admin/reports/doctor-workload', 'doctor-workload.csv')}
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            Download CSV
          </button>
        </div>
        <ReportTable
          rows={workload}
          columns={[
            { key: 'doctorName', label: 'Doctor' },
            { key: 'department', label: 'Department' },
            { key: 'completedCount', label: 'Completed' },
          ]}
        />
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-white">Queue performance</h2>
          <button
            type="button"
            onClick={() =>
              handleDownload('/api/admin/reports/queue-performance', 'queue-performance.csv')
            }
            className="rounded-md border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            Download CSV
          </button>
        </div>
        <ReportTable
          rows={queuePerformance}
          columns={[
            { key: 'departmentName', label: 'Department' },
            { key: 'tokenCount', label: 'Tokens issued' },
            { key: 'avgWaitMinutes', label: 'Avg wait (min)' },
          ]}
        />
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-white">Algorithm comparison</h2>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
          From the benchmark harness (<code>npm run benchmark</code>), comparing FCFS, Priority,
          Round Robin, and Multi-Level Queue under identical simulated load.
        </p>
        {benchmarkError ? (
          <p className="mt-3 text-sm text-stone-600 dark:text-stone-400">
            No benchmark results yet — run <code>npm run benchmark</code> in the backend.
          </p>
        ) : benchmark ? (
          Object.entries(benchmark.results).map(([scenario, perAlgorithm]) => (
            <div key={scenario} className="mt-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                {scenario} load
              </h3>
              <ReportTable
                rows={Object.entries(perAlgorithm).map(([algorithm, metrics]) => ({
                  algorithm: ALGORITHM_LABELS[algorithm] || algorithm,
                  ...metrics,
                }))}
                columns={[
                  { key: 'algorithm', label: 'Algorithm' },
                  { key: 'averageWaitingTime', label: 'Avg wait (min)' },
                  { key: 'averageResponseTime', label: 'Avg response (min)' },
                  { key: 'throughputPerHour', label: 'Throughput/hr' },
                  { key: 'resourceUtilization', label: 'Utilization' },
                  { key: 'fairnessIndex', label: "Jain's index" },
                  { key: 'patientSatisfaction', label: 'Satisfaction' },
                ]}
              />
            </div>
          ))
        ) : (
          <p className="mt-3 text-sm text-stone-600 dark:text-stone-400">Loading…</p>
        )}
      </section>
    </div>
  );
}

export default ReportsPage;
