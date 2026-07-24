import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

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

const QUEUE_PREVIEW = [
  { label: 'Called', sub: 'Room 2', status: 'done' },
  { label: 'In progress', sub: 'Room 4', status: 'done' },
  { label: 'You', sub: 'General outpatient', status: 'current' },
  { label: 'Waiting', sub: '', status: 'pending' },
];

function Icon({ children, className = 'h-5 w-5' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className={className}
    >
      {children}
    </svg>
  );
}

function QueuePreviewCard() {
  return (
    <div className="w-full max-w-sm rounded-lg border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
      <div className="flex items-center justify-between border-b border-stone-100 pb-3 dark:border-stone-800">
        <span className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
          General Outpatient
        </span>
        <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-800 dark:bg-teal-950 dark:text-teal-300">
          Waiting
        </span>
      </div>

      <div className="mt-4 flex items-end gap-2">
        <span className="text-5xl font-bold text-stone-900 dark:text-white">03</span>
        <span className="mb-1 text-sm text-stone-500 dark:text-stone-400">your position</span>
      </div>

      <ul className="mt-5 space-y-2">
        {QUEUE_PREVIEW.map((row) => (
          <li
            key={row.label}
            className={`flex items-center justify-between rounded-md px-3 py-2 text-sm ${
              row.status === 'current'
                ? 'bg-teal-50 font-semibold text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                : 'text-stone-500 dark:text-stone-400'
            }`}
          >
            <span>{row.label}</span>
            {row.sub ? <span className="text-xs">{row.sub}</span> : null}
          </li>
        ))}
      </ul>
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
