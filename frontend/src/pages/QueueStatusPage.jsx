import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext.jsx';
import { API_URL } from '../services/api';
import { listMine, queueStatus } from '../services/appointmentService';

function QueueStatusPage() {
  const { token } = useAuth();
  const [appointmentId, setAppointmentId] = useState(null);
  const [status, setStatus] = useState(null);
  const [beingCalled, setBeingCalled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    listMine(token)
      .then((data) => {
        const active = data.appointments.find((a) =>
          ['in-queue', 'in-consultation'].includes(a.status),
        );
        if (!active) {
          setIsLoading(false);
          return;
        }
        setAppointmentId(active.id);
        return queueStatus(active.id, token).then(setStatus);
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [token]);

  useEffect(() => {
    if (!status?.department?.id || !appointmentId) return undefined;

    const socket = io(API_URL);

    function refresh() {
      queueStatus(appointmentId, token)
        .then(setStatus)
        .catch((err) => setError(err.message));
    }

    function onQueueUpdated(payload) {
      if (payload.departmentId === status.department.id) refresh();
    }

    function onAppointmentCalled(payload) {
      if (payload.appointmentId === appointmentId) {
        setBeingCalled(true);
      } else if (payload.departmentId === status.department.id) {
        refresh();
      }
    }

    socket.on('queue:updated', onQueueUpdated);
    socket.on('appointment:called', onAppointmentCalled);

    return () => socket.disconnect();
  }, [status?.department?.id, appointmentId, token]);

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

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
        <p role="alert" aria-live="assertive" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      </div>
    );
  }

  if (!appointmentId || !status) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-bold text-stone-900 dark:text-white">No active queue entry</h1>
        <p className="mt-2 text-stone-600 dark:text-stone-400">
          You are not currently checked in anywhere.
        </p>
        <Link
          to="/dashboard"
          className="mt-6 inline-block font-medium text-teal-700 hover:underline dark:text-teal-400"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
      <div className="rounded-lg border border-stone-200 bg-white p-6 text-center dark:border-stone-800 dark:bg-stone-950 sm:p-8">
        <p className="text-sm text-stone-600 dark:text-stone-400">{status.department?.name}</p>
        <p className="mt-1 text-5xl font-bold text-teal-700 dark:text-teal-400">
          {status.tokenNumber ?? '—'}
        </p>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">Your token number</p>

        {beingCalled ? (
          <p
            role="status"
            aria-live="assertive"
            className="mt-6 rounded-md bg-teal-600 px-4 py-3 text-lg font-semibold text-white"
          >
            You are being called now — please proceed to the consultation room.
          </p>
        ) : (
          <div role="status" aria-live="polite" className="mt-6 space-y-1">
            <p className="text-lg text-stone-900 dark:text-white">
              Position in queue: <span className="font-semibold">{status.position}</span>
            </p>
            <p className="text-sm text-stone-600 dark:text-stone-400">
              Estimated wait: about {status.estimatedWaitMinutes} minute
              {status.estimatedWaitMinutes === 1 ? '' : 's'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default QueueStatusPage;
