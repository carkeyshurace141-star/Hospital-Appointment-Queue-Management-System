import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import FormField from '../components/FormField.jsx';
import { listMine, cancelAppointment, rescheduleAppointment } from '../services/appointmentService';
import { categoryLabel } from '../utils/categories';

const ACTIVE_STATUSES = ['booked', 'checked-in', 'in-queue', 'in-consultation'];

const STATUS_LABELS = {
  booked: 'Booked',
  'checked-in': 'Checked In',
  'in-queue': 'In Queue',
  'in-consultation': 'Being Seen',
  completed: 'Completed',
  'no-show': 'No Show',
  cancelled: 'Cancelled',
};

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

function statusBadgeClasses(status) {
  if (status === 'completed') {
    return 'bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-300';
  }
  if (status === 'cancelled' || status === 'no-show') {
    return 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300';
  }
  return 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300';
}

// datetime-local inputs need "YYYY-MM-DDTHH:mm" in *local* time, not the
// UTC ISO string the API returns.
function toDateTimeLocal(isoString) {
  const date = new Date(isoString);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

function AppointmentCard({ appointment, token, onChanged }) {
  const [isEditing, setIsEditing] = useState(false);
  const [timeSlotValue, setTimeSlotValue] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  function startEditing() {
    setTimeSlotValue(toDateTimeLocal(appointment.timeSlot));
    setError('');
    setIsEditing(true);
  }

  async function handleReschedule(event) {
    event.preventDefault();
    if (!timeSlotValue) {
      setError('Please choose a date and time.');
      return;
    }
    if (new Date(timeSlotValue).getTime() <= Date.now()) {
      setError('Time slot must be in the future.');
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      await rescheduleAppointment(
        appointment.id,
        { timeSlot: new Date(timeSlotValue).toISOString() },
        token,
      );
      setIsEditing(false);
      await onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCancel() {
    if (!window.confirm('Cancel this appointment?')) return;
    setIsCancelling(true);
    setError('');
    try {
      await cancelAppointment(appointment.id, token);
      await onChanged();
    } catch (err) {
      setError(err.message);
      setIsCancelling(false);
    }
  }

  // Mirrors the backend: only a not-yet-seen appointment can be rescheduled,
  // but it can be cancelled any time up to being called in (see
  // CANCELLABLE_STATUSES in appointmentController.js).
  const canReschedule = appointment.status === 'booked';
  const canCancel = ['booked', 'checked-in', 'in-queue'].includes(appointment.status);

  return (
    <li className="rounded-lg border border-stone-200 p-4 dark:border-stone-800">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium text-stone-900 dark:text-white">
            {appointment.department?.name || 'Department'}
          </p>
          <p className="text-sm text-stone-600 dark:text-stone-400">
            {appointment.doctor?.name
              ? `Dr. ${appointment.doctor.name}${
                  appointment.doctor.specialization ? ` - ${appointment.doctor.specialization}` : ''
                }`
              : 'Doctor to be assigned'}
          </p>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            {appointment.timeSlot ? new Date(appointment.timeSlot).toLocaleString() : 'Walk-in'}
            {' · '}
            {categoryLabel(appointment.category)}
          </p>
        </div>
        <span
          className={`rounded-md px-2 py-1 text-xs font-semibold ${statusBadgeClasses(
            appointment.status,
          )}`}
        >
          {STATUS_LABELS[appointment.status] || appointment.status}
        </span>
      </div>

      {error ? (
        <p role="alert" aria-live="assertive" className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      {isEditing ? (
        <form onSubmit={handleReschedule} className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <FormField
              id={`reschedule-${appointment.id}`}
              label="New date and time"
              type="datetime-local"
              value={timeSlotValue}
              onChange={(event) => setTimeSlotValue(event.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
          >
            Cancel
          </button>
        </form>
      ) : canReschedule || canCancel ? (
        <div className="mt-4 flex gap-4 text-sm">
          {canReschedule ? (
            <button
              type="button"
              onClick={startEditing}
              className="font-medium text-teal-700 hover:underline dark:text-teal-400"
            >
              Reschedule
            </button>
          ) : null}
          {canCancel ? (
            <button
              type="button"
              onClick={handleCancel}
              disabled={isCancelling}
              className="font-medium text-red-600 hover:underline disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400"
            >
              {isCancelling ? 'Cancelling…' : 'Cancel appointment'}
            </button>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

const COLLAPSED_APPOINTMENT_COUNT = 2;

function MyAppointments({ appointments, token, onChanged }) {
  const [showAll, setShowAll] = useState(false);

  if (appointments.length === 0) {
    return (
      <p className="text-sm text-stone-500 dark:text-stone-400">
        You haven&apos;t made any appointments yet.
      </p>
    );
  }

  const visibleAppointments = showAll
    ? appointments
    : appointments.slice(0, COLLAPSED_APPOINTMENT_COUNT);
  const hiddenCount = appointments.length - visibleAppointments.length;

  return (
    <>
      <ul className="space-y-3">
        {visibleAppointments.map((appointment) => (
          <AppointmentCard
            key={appointment.id}
            appointment={appointment}
            token={token}
            onChanged={onChanged}
          />
        ))}
      </ul>
      {appointments.length > COLLAPSED_APPOINTMENT_COUNT ? (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => setShowAll((prev) => !prev)}
            className="text-sm font-medium text-teal-700 hover:underline dark:text-teal-400"
          >
            {showAll ? 'Show less' : `Show more (${hiddenCount})`}
          </button>
        </div>
      ) : null}
    </>
  );
}

function DashboardPage() {
  const { user, token } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(
    () =>
      listMine(token)
        .then((data) => setAppointments(data.appointments))
        .catch(() => setAppointments([])),
    [token],
  );

  useEffect(() => {
    setIsLoading(true);
    refetch().finally(() => setIsLoading(false));
  }, [refetch]);

  const activeAppointment = useMemo(
    () => appointments.find((a) => ACTIVE_STATUSES.includes(a.status)) || null,
    [appointments],
  );

  const currentIndex = activeAppointment
    ? FLOW_STEPS.findIndex((step) => step.key === activeAppointment.status)
    : -1;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Welcome, {user?.name}</h1>
      <p className="mt-1 text-stone-600 dark:text-stone-400">
        Book an appointment, register as a walk-in, or check in below.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-lg border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-950">
            {isLoading ? (
              <p className="text-sm text-stone-500 dark:text-stone-400">Loading your status…</p>
            ) : activeAppointment ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    Your journey - {activeAppointment.department?.name}
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

          <div className="grid gap-4 sm:grid-cols-2">
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

        <aside className="lg:col-span-1">
          <section className="rounded-lg border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-950">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
              My appointments
            </h2>
            <div className="mt-4">
              {isLoading ? (
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  Loading your appointments…
                </p>
              ) : (
                <MyAppointments appointments={appointments} token={token} onChanged={refetch} />
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

export default DashboardPage;
