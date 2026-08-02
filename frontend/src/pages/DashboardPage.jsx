import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { listMine } from '../services/appointmentService';

const ACTIVE_STATUSES = ['booked', 'checked-in', 'in-queue', 'in-consultation'];

const CHECK_ICON = (
  <>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
    <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </>
);

const CALENDAR_ICON = (
  <path
    strokeLinecap="round"
    strokeLinejoin="round"
    d="M7 3v4M17 3v4M4 8h16M5 21h14a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1Z"
  />
);

const CLOCK_ICON = (
  <path
    strokeLinecap="round"
    strokeLinejoin="round"
    d="M12 7v5l3 3M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
  />
);

const CONSULT_ICON = (
  <path
    strokeLinecap="round"
    strokeLinejoin="round"
    d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v10Z"
  />
);

const WALK_IN_ICON = (
  <path
    strokeLinecap="round"
    strokeLinejoin="round"
    d="M11 16l-5-4 5-4M6 12h9M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4"
  />
);

const FLOW_STEPS = [
  { key: 'booked', label: 'Booked', icon: CALENDAR_ICON },
  { key: 'checked-in', label: 'Checked In', icon: CHECK_ICON },
  { key: 'in-queue', label: 'In Queue', icon: CLOCK_ICON },
  { key: 'in-consultation', label: 'Being Seen', icon: CONSULT_ICON },
  { key: 'completed', label: 'Done', icon: CHECK_ICON },
];

const ACTIONS = [
  {
    to: '/book-appointment',
    title: 'Book an appointment',
    description: 'Choose a department, doctor, and time slot.',
    icon: CALENDAR_ICON,
  },
  {
    to: '/walk-in',
    title: 'Register as a walk-in',
    description: 'Join the queue now without a booked time slot.',
    icon: WALK_IN_ICON,
  },
  {
    to: '/check-in',
    title: 'Check in',
    description: 'Check in to a booked appointment when you arrive.',
    icon: CHECK_ICON,
  },
  {
    to: '/queue-status',
    title: 'My queue status',
    description: 'See your live position and estimated wait time.',
    icon: CLOCK_ICON,
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

function JourneyFlow({ currentIndex }) {
  return (
    <ol
      aria-label="Appointment journey progress"
      className="flex flex-wrap items-start gap-x-2 gap-y-4 sm:flex-nowrap"
    >
      {FLOW_STEPS.map((step, index) => {
        const state =
          index < currentIndex ? 'done' : index === currentIndex ? 'current' : 'pending';
        return (
          <li key={step.key} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1 text-center">
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 ${
                  state === 'current'
                    ? 'border-teal-600 bg-teal-600 text-white'
                    : state === 'done'
                      ? 'border-teal-600 bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-400'
                      : 'border-stone-300 text-stone-400 dark:border-stone-700 dark:text-stone-600'
                }`}
                aria-current={state === 'current' ? 'step' : undefined}
              >
                <Icon className="h-4 w-4">{step.icon}</Icon>
              </span>
              <span
                className={`text-xs font-medium ${
                  state === 'pending'
                    ? 'text-stone-400 dark:text-stone-600'
                    : 'text-stone-700 dark:text-stone-300'
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < FLOW_STEPS.length - 1 ? (
              <span
                aria-hidden="true"
                className={`mx-2 hidden h-0.5 flex-1 sm:block ${
                  index < currentIndex ? 'bg-teal-600' : 'bg-stone-200 dark:bg-stone-800'
                }`}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function DashboardPage() {
  const { user, token } = useAuth();
  const [activeAppointment, setActiveAppointment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    listMine(token)
      .then((data) => {
        const active = data.appointments.find((a) => ACTIVE_STATUSES.includes(a.status));
        setActiveAppointment(active || null);
      })
      .catch(() => setActiveAppointment(null))
      .finally(() => setIsLoading(false));
  }, [token]);

  const currentIndex = activeAppointment
    ? FLOW_STEPS.findIndex((step) => step.key === activeAppointment.status)
    : -1;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Welcome, {user?.name}</h1>
      <p className="mt-1 text-stone-600 dark:text-stone-400">
        Book an appointment, register as a walk-in, or check in below.
      </p>

      <section className="mt-6 rounded-lg border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-950">
        {isLoading ? (
          <p className="text-sm text-stone-500 dark:text-stone-400">Loading your status…</p>
        ) : activeAppointment ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                Your journey — {activeAppointment.department?.name}
              </h2>
              {activeAppointment.status === 'booked' ? (
                <Link
                  to="/check-in"
                  className="text-sm font-medium text-teal-700 hover:underline dark:text-teal-400"
                >
                  Check in now
                </Link>
              ) : ['in-queue', 'in-consultation'].includes(activeAppointment.status) ? (
                <Link
                  to="/queue-status"
                  className="text-sm font-medium text-teal-700 hover:underline dark:text-teal-400"
                >
                  View live status
                </Link>
              ) : null}
            </div>
            <div className="mt-4">
              <JourneyFlow currentIndex={currentIndex} />
            </div>
          </>
        ) : (
          <div className="text-center">
            <p className="text-stone-700 dark:text-stone-300">
              You don&apos;t have an active appointment right now.
            </p>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
              Book ahead or walk in below to get started.
            </p>
          </div>
        )}
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {ACTIONS.map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className="flex items-start gap-4 rounded-lg border border-stone-200 bg-white p-4 transition-colors hover:border-teal-500 hover:bg-teal-50 dark:border-stone-800 dark:bg-stone-950 dark:hover:border-teal-500 dark:hover:bg-teal-950"
          >
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-400">
              <Icon>{action.icon}</Icon>
            </span>
            <span>
              <span className="block font-medium text-stone-900 dark:text-white">
                {action.title}
              </span>
              <span className="mt-1 block text-sm text-stone-600 dark:text-stone-400">
                {action.description}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default DashboardPage;
