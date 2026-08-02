import { useCallback, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import SelectField from '../../components/SelectField.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { API_URL } from '../../services/api';
import {
  getQueue,
  callNext,
  skip,
  recall,
  complete,
  refer,
  markNoShow,
  updateAvailability,
} from '../../services/clinicianService';
import { listDepartments } from '../../services/departmentService';
import { categoryLabel } from '../../utils/categories';

const DAYS = [
  ['monday', 'Monday'],
  ['tuesday', 'Tuesday'],
  ['wednesday', 'Wednesday'],
  ['thursday', 'Thursday'],
  ['friday', 'Friday'],
  ['saturday', 'Saturday'],
  ['sunday', 'Sunday'],
];

function minutesWaiting(queuedAt) {
  if (!queuedAt) return 0;
  return Math.max(0, Math.round((Date.now() - queuedAt) / 60000));
}

function DoctorDashboardPage() {
  const { user, token } = useAuth();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionLoading, setActionLoading] = useState('');

  const [referOpen, setReferOpen] = useState(false);
  const [referDepartments, setReferDepartments] = useState([]);
  const [referDepartmentId, setReferDepartmentId] = useState('');
  const [confirmingRefer, setConfirmingRefer] = useState(false);
  const [confirmingNoShow, setConfirmingNoShow] = useState(false);

  const [availability, setAvailability] = useState(user?.availability || {});
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [availabilitySaved, setAvailabilitySaved] = useState(false);

  const refreshQueue = useCallback(async () => {
    try {
      const result = await getQueue(token);
      setData(result);
      setLoadError('');
    } catch (err) {
      setLoadError(err.message);
    }
  }, [token]);

  useEffect(() => {
    refreshQueue().finally(() => setIsLoading(false));
  }, [refreshQueue]);

  useEffect(() => {
    if (!data?.department?.id) return undefined;

    const socket = io(API_URL);
    function onQueueUpdated(payload) {
      if (payload.departmentId === data.department.id) refreshQueue();
    }
    function onAppointmentCalled(payload) {
      if (payload.departmentId === data.department.id) refreshQueue();
    }

    socket.on('queue:updated', onQueueUpdated);
    socket.on('appointment:called', onAppointmentCalled);

    return () => socket.disconnect();
  }, [data?.department?.id, refreshQueue]);

  async function runAction(name, action) {
    setActionError('');
    setActionLoading(name);
    try {
      await action();
      await refreshQueue();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionLoading('');
    }
  }

  function openRefer() {
    setReferOpen(true);
    setReferDepartmentId('');
    if (referDepartments.length === 0) {
      listDepartments()
        .then((result) =>
          setReferDepartments(result.departments.filter((d) => d.id !== data?.department?.id)),
        )
        .catch((err) => setActionError(err.message));
    }
  }

  async function confirmRefer() {
    setActionError('');
    setActionLoading('refer');
    try {
      await refer(referDepartmentId, token);
      setConfirmingRefer(false);
      setReferOpen(false);
      await refreshQueue();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionLoading('');
    }
  }

  async function confirmNoShow() {
    setActionError('');
    setActionLoading('no-show');
    try {
      await markNoShow(token);
      setConfirmingNoShow(false);
      await refreshQueue();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionLoading('');
    }
  }

  function handleDayChange(day, field, value) {
    setAvailabilitySaved(false);
    setAvailability((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  }

  async function handleSaveAvailability(event) {
    event.preventDefault();
    setSavingAvailability(true);
    setActionError('');
    try {
      const hours = Object.fromEntries(
        DAYS.map(([key]) => [
          key,
          { start: availability[key]?.start || '', end: availability[key]?.end || '' },
        ]),
      );
      const result = await updateAvailability(
        { isUnavailable: Boolean(availability.isUnavailable), hours },
        token,
      );
      setAvailability(result.availability);
      setAvailabilitySaved(true);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSavingAvailability(false);
    }
  }

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

  const current = data?.current;
  const queue = data?.queue || [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-bold text-stone-900 dark:text-white">
        Welcome, Dr. {user?.name}
      </h1>
      <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
        {data?.department?.name} queue
      </p>

      {loadError ? (
        <p
          role="alert"
          aria-live="assertive"
          className="mt-4 text-sm text-red-600 dark:text-red-400"
        >
          {loadError}
        </p>
      ) : null}
      {actionError ? (
        <p
          role="alert"
          aria-live="assertive"
          className="mt-4 text-sm text-red-600 dark:text-red-400"
        >
          {actionError}
        </p>
      ) : null}

      <section className="mt-6 rounded-lg border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-950">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-white">Current patient</h2>

        {current ? (
          <div className="mt-4">
            <p className="text-3xl font-bold text-teal-700 dark:text-teal-400">
              Token {current.tokenNumber}
            </p>
            <p className="mt-1 text-stone-700 dark:text-stone-300">
              {current.patientName} · {categoryLabel(current.category)}
            </p>

            {referOpen ? (
              <div className="mt-4 rounded-md border border-stone-200 p-4 dark:border-stone-800">
                <SelectField
                  id="refer-department"
                  label="Refer to department"
                  placeholder="Select a department"
                  value={referDepartmentId}
                  onChange={(e) => setReferDepartmentId(e.target.value)}
                  options={referDepartments.map((d) => ({ value: d.id, label: d.name }))}
                />
                <div className="mt-3 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setConfirmingRefer(true)}
                    disabled={!referDepartmentId}
                    className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-stone-300 dark:disabled:bg-stone-700"
                  >
                    Refer patient
                  </button>
                  <button
                    type="button"
                    onClick={() => setReferOpen(false)}
                    className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => runAction('skip', () => skip(token))}
                  disabled={Boolean(actionLoading)}
                  className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
                >
                  {actionLoading === 'skip' ? 'Skipping…' : 'Skip'}
                </button>
                <button
                  type="button"
                  onClick={() => runAction('complete', () => complete(token))}
                  disabled={Boolean(actionLoading)}
                  className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-stone-300 dark:disabled:bg-stone-700"
                >
                  {actionLoading === 'complete' ? 'Completing…' : 'Complete'}
                </button>
                <button
                  type="button"
                  onClick={openRefer}
                  disabled={Boolean(actionLoading)}
                  className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
                >
                  Refer
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingNoShow(true)}
                  disabled={Boolean(actionLoading)}
                  className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
                >
                  No-Show
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-stone-600 dark:text-stone-400">
              No patient is currently being seen.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => runAction('call', () => callNext(token))}
                disabled={Boolean(actionLoading) || queue.length === 0}
                className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-stone-300 dark:disabled:bg-stone-700"
              >
                {actionLoading === 'call' ? 'Calling…' : 'Call Next'}
              </button>
              <button
                type="button"
                onClick={() => runAction('recall', () => recall(token))}
                disabled={Boolean(actionLoading)}
                className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
              >
                {actionLoading === 'recall' ? 'Recalling…' : 'Recall'}
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="mt-6 rounded-lg border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-950">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-white">
          Waiting ({queue.length})
        </h2>
        <ul className="mt-4 space-y-2">
          {queue.length === 0 ? (
            <li className="text-sm text-stone-600 dark:text-stone-400">No patients waiting.</li>
          ) : null}
          {queue.map((patient) => (
            <li
              key={patient.appointmentId}
              className="flex items-center justify-between rounded-md border border-stone-200 px-4 py-2 text-sm dark:border-stone-800"
            >
              <span className="font-medium text-stone-900 dark:text-white">
                Token {patient.tokenNumber} · {patient.patientName}
              </span>
              <span className="text-stone-600 dark:text-stone-400">
                {categoryLabel(patient.category)} · waiting {minutesWaiting(patient.queuedAt)}m
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded-lg border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-950">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-white">Availability</h2>
        <form className="mt-4 space-y-4" onSubmit={handleSaveAvailability}>
          <label className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300">
            <input
              type="checkbox"
              checked={Boolean(availability.isUnavailable)}
              onChange={(e) => {
                setAvailabilitySaved(false);
                setAvailability((prev) => ({ ...prev, isUnavailable: e.target.checked }));
              }}
              className="h-4 w-4 rounded border-stone-300 text-teal-600 focus:ring-teal-500"
            />
            Mark myself unavailable (I will be skipped for new patient assignment)
          </label>

          <div className="space-y-2">
            {DAYS.map(([key, label]) => (
              <div key={key} className="flex items-center gap-3 text-sm">
                <span className="w-24 text-stone-700 dark:text-stone-300">{label}</span>
                <label className="sr-only" htmlFor={`${key}-start`}>
                  {label} start time
                </label>
                <input
                  id={`${key}-start`}
                  type="time"
                  value={availability[key]?.start || ''}
                  onChange={(e) => handleDayChange(key, 'start', e.target.value)}
                  className="rounded-md border border-stone-300 px-2 py-1 dark:border-stone-700 dark:bg-stone-900 dark:text-white"
                />
                <span className="text-stone-400">to</span>
                <label className="sr-only" htmlFor={`${key}-end`}>
                  {label} end time
                </label>
                <input
                  id={`${key}-end`}
                  type="time"
                  value={availability[key]?.end || ''}
                  onChange={(e) => handleDayChange(key, 'end', e.target.value)}
                  className="rounded-md border border-stone-300 px-2 py-1 dark:border-stone-700 dark:bg-stone-900 dark:text-white"
                />
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={savingAvailability}
            className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-stone-300 dark:disabled:bg-stone-700"
          >
            {savingAvailability ? 'Saving…' : 'Save availability'}
          </button>
          {availabilitySaved ? (
            <span
              role="status"
              aria-live="polite"
              className="ml-3 text-sm text-teal-700 dark:text-teal-400"
            >
              Saved.
            </span>
          ) : null}
        </form>
      </section>

      {confirmingNoShow ? (
        <ConfirmDialog
          title="Mark patient as no-show?"
          message="This removes them from the queue as a no-show. This cannot be undone from here."
          confirmLabel="Mark no-show"
          isConfirming={actionLoading === 'no-show'}
          onConfirm={confirmNoShow}
          onCancel={() => setConfirmingNoShow(false)}
        />
      ) : null}

      {confirmingRefer ? (
        <ConfirmDialog
          title="Refer this patient?"
          message={`This moves the patient to ${
            referDepartments.find((d) => d.id === referDepartmentId)?.name ||
            'the selected department'
          } and re-assigns their doctor there.`}
          confirmLabel="Refer patient"
          isConfirming={actionLoading === 'refer'}
          onConfirm={confirmRefer}
          onCancel={() => setConfirmingRefer(false)}
        />
      ) : null}
    </div>
  );
}

export default DoctorDashboardPage;
