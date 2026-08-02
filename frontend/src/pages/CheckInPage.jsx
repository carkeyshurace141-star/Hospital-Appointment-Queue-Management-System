import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { listMine, checkIn } from '../services/appointmentService';
import { categoryLabel } from '../utils/categories';

function isEligible(appointment) {
  return appointment.status === 'booked';
}

function CheckInPage() {
  const { token } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [checkingInId, setCheckingInId] = useState(null);
  const [checkedInToken, setCheckedInToken] = useState(null);

  useEffect(() => {
    listMine(token)
      .then((data) => setAppointments(data.appointments))
      .catch((err) => setLoadError(err.message))
      .finally(() => setIsLoading(false));
  }, [token]);

  async function handleCheckIn(appointment) {
    setActionError('');
    setCheckedInToken(null);
    setCheckingInId(appointment.id);
    try {
      const data = await checkIn(appointment.id, token);
      setAppointments((prev) =>
        prev.map((a) => (a.id === appointment.id ? data.appointment : a)),
      );
      setCheckedInToken(data.token);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setCheckingInId(null);
    }
  }

  const upcoming = appointments.filter((a) => a.status !== 'cancelled');

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center" role="status">
        <span
          aria-hidden="true"
          className="h-6 w-6 animate-spin rounded-full border-2 border-stone-300 border-t-teal-600 dark:border-stone-700 dark:border-t-teal-400"
        />
        <p className="ml-3 text-stone-600 dark:text-stone-400">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Check in</h1>
      <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
        Check in to a booked appointment once you have arrived.
      </p>

      {loadError ? (
        <p role="alert" aria-live="assertive" className="mt-4 text-sm text-red-600 dark:text-red-400">
          {loadError}
        </p>
      ) : null}

      {actionError ? (
        <p role="alert" aria-live="assertive" className="mt-4 text-sm text-red-600 dark:text-red-400">
          {actionError}
        </p>
      ) : null}

      {checkedInToken ? (
        <p role="status" aria-live="polite" className="mt-4 text-sm text-teal-700 dark:text-teal-400">
          Checked in. Your token number is {checkedInToken}.
        </p>
      ) : null}

      <ul className="mt-6 space-y-3">
        {upcoming.length === 0 ? (
          <li className="rounded-md border border-stone-200 p-4 text-sm text-stone-600 dark:border-stone-800 dark:text-stone-400">
            You have no appointments yet.
          </li>
        ) : null}

        {upcoming.map((appointment) => (
          <li
            key={appointment.id}
            className="flex items-center justify-between rounded-md border border-stone-200 p-4 dark:border-stone-800"
          >
            <div>
              <p className="font-medium text-stone-900 dark:text-white">
                {appointment.department?.name}
              </p>
              <p className="text-sm text-stone-600 dark:text-stone-400">
                {appointment.timeSlot ? new Date(appointment.timeSlot).toLocaleString() : ''} ·{' '}
                {categoryLabel(appointment.category)} · {appointment.status}
              </p>
            </div>
            {isEligible(appointment) ? (
              <button
                type="button"
                onClick={() => handleCheckIn(appointment)}
                disabled={checkingInId === appointment.id}
                className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-stone-300 dark:disabled:bg-stone-700"
              >
                {checkingInId === appointment.id ? 'Checking in…' : 'Check In'}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default CheckInPage;
