import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext.jsx';
import { API_URL } from '../services/api';
import { listDepartments, getQueueSummary } from '../services/departmentService';

const HIGHLIGHTS = [
  {
    title: 'Real-time queue position',
    body: 'Your place in line updates live, so you always know where you stand.',
    icon: <path strokeLinecap="round" strokeLinejoin="round" d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" />,
  },
  {
    title: 'Secure by default',
    body: 'Passwords are hashed, sessions are token-based, and every request is validated.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 22s8-3.5 8-10V6l-8-3-8 3v6c0 6.5 8 10 8 10Z"
      />
    ),
  },
  {
    title: 'Built for fairness',
    body: 'A foundation ready for priority-based scheduling, not just arrival order.',
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3v18M5 8l-3 6a3 3 0 0 0 6 0l-3-6ZM19 8l-3 6a3 3 0 0 0 6 0l-3-6ZM5 8h14M8 21h8"
      />
    ),
  },
];

function Icon({ children, className = 'h-5 w-5' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

// Finds the department this preview should track. Falls back to whichever
// department sorts first if none is named "General" - the seed data or a
// clinic's own setup may not use that exact name.
function pickPreviewDepartment(departments) {
  if (departments.length === 0) return null;
  return departments.find((d) => /general/i.test(d.name)) || departments[0];
}

function QueuePreviewCard() {
  const [department, setDepartment] = useState(null);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listDepartments()
      .then((data) => {
        if (cancelled) return;
        const match = pickPreviewDepartment(data.departments || []);
        if (!match) {
          setError(true);
          return;
        }
        setDepartment(match);
      })
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!department) return undefined;
    let cancelled = false;

    getQueueSummary(department.id)
      .then((data) => !cancelled && setSummary(data))
      .catch(() => !cancelled && setError(true));

    const socket = io(API_URL);
    function refresh(payload) {
      if (payload.departmentId !== department.id) return;
      getQueueSummary(department.id)
        .then((data) => !cancelled && setSummary(data))
        .catch(() => {});
    }
    socket.on('queue:updated', refresh);
    socket.on('appointment:called', refresh);
    socket.on('appointment:completed', refresh);

    return () => {
      cancelled = true;
      socket.disconnect();
    };
  }, [department]);

  const departmentName = department?.name || 'General Outpatient';
  const nowServing = summary?.currentTokenNumber;
  const waitingCount = summary?.waitingCount ?? 0;
  const nextTokens = summary?.nextTokenNumbers || [];

  return (
    <div className="w-full max-w-sm rounded-lg border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
      <div className="flex items-center justify-between border-b border-stone-100 pb-3 dark:border-stone-800">
        <span className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
          {departmentName}
        </span>
        <span className="flex items-center gap-1.5 rounded-md bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-800 dark:bg-teal-950 dark:text-teal-300">
          <span className="h-1.5 w-1.5 rounded-full bg-teal-500" aria-hidden="true" />
          Live
        </span>
      </div>

      <div className="mt-4 flex items-end gap-2">
        <span className="text-5xl font-bold text-stone-900 dark:text-white">
          {nowServing || '-'}
        </span>
        <span className="mb-1 text-sm text-stone-500 dark:text-stone-400">now serving</span>
      </div>

      {error ? (
        <p className="mt-5 text-sm text-stone-500 dark:text-stone-400">
          Live queue data is unavailable right now.
        </p>
      ) : (
        <ul className="mt-5 space-y-2">
          <li className="flex items-center justify-between rounded-md bg-teal-50 px-3 py-2 text-sm font-semibold text-teal-800 dark:bg-teal-950 dark:text-teal-300">
            <span>Waiting</span>
            <span>{waitingCount}</span>
          </li>
          {nextTokens.length > 0 ? (
            <li className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-stone-500 dark:text-stone-400">
              <span>Up next</span>
              <span className="text-xs">{nextTokens.join(', ')}</span>
            </li>
          ) : null}
        </ul>
      )}
    </div>
  );
}

function LandingPage() {
  const { isAuthenticated } = useAuth();
  const bookingHref = isAuthenticated ? '/dashboard' : '/signup';

  return (
    <div>
      <section className="border-b border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-950">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:py-28">
          <div>
            <span className="inline-flex items-center rounded-md border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800 dark:border-teal-800 dark:bg-teal-950 dark:text-teal-300">
              Fairer than first-come-first-served
            </span>

            <h1 className="mt-5 text-4xl font-bold tracking-tight text-stone-900 dark:text-white sm:text-5xl">
              Hospital appointments and queues,{' '}
              <span className="text-teal-700 dark:text-teal-400">managed fairly.</span>
            </h1>
            <p className="mt-4 max-w-xl text-lg text-stone-600 dark:text-stone-400">
              MediQueue lets patients book appointments and track their place in line in real time,
              while giving clinics a clear, orderly way to manage who's seen next.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to={bookingHref}
                className="rounded-md bg-teal-600 px-6 py-3 text-center font-semibold text-white transition-colors hover:bg-teal-700"
              >
                Book an Appointment
              </Link>
              <Link
                to="/login"
                className="rounded-md border border-stone-300 bg-white px-6 py-3 text-center font-semibold text-stone-700 transition-colors hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
              >
                Log In
              </Link>
            </div>

            <p className="mt-4 text-sm text-stone-500 dark:text-stone-400">
              Curious how it works?{' '}
              <Link
                to="/about"
                className="font-medium text-teal-700 hover:underline dark:text-teal-400"
              >
                Read more about MediQueue
              </Link>
              .
            </p>
          </div>

          <div className="flex justify-center lg:justify-end">
            <QueuePreviewCard />
          </div>
        </div>
      </section>

      <section className="bg-stone-50 dark:bg-stone-900">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {HIGHLIGHTS.map((item) => (
              <div key={item.title} className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-teal-600 text-white">
                  <Icon>{item.icon}</Icon>
                </span>
                <div>
                  <h3 className="font-semibold text-stone-900 dark:text-white">{item.title}</h3>
                  <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default LandingPage;
