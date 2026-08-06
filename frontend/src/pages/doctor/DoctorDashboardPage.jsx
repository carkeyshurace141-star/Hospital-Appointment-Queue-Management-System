import { useCallback, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import SelectField from '../../components/SelectField.jsx';
import ChatPanel, { formatClosesAt } from '../../components/ChatPanel.jsx';
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
  getRecentPatients,
} from '../../services/clinicianService';
import { listDepartments } from '../../services/departmentService';
import { getUnreadCount } from '../../services/chatService';
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

// Adds `offset` days to a 'YYYY-MM-DD' string, staying in UTC so it can't
// drift a day off depending on the doctor's local timezone.
function addDays(dateKey, offset) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + offset));
  return date.toISOString().slice(0, 10);
}

function MessageButton({ patientName, unreadCount = 0, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative text-sm font-medium text-teal-700 hover:underline dark:text-teal-400"
    >
      Message {patientName}
      {unreadCount > 0 ? (
        <span className="ml-1.5 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
          {unreadCount}
        </span>
      ) : null}
    </button>
  );
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
  const [dateOverrides, setDateOverrides] = useState(user?.availability?.dateOverrides || []);
  const [weekStartDate, setWeekStartDate] = useState('');
  // Monday's date is the one the doctor picks; every other day's date is
  // derived from it in increasing order, so they always stay in sequence.
  const weekDates = weekStartDate ? DAYS.map((_, index) => addDays(weekStartDate, index)) : null;
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [availabilitySaved, setAvailabilitySaved] = useState(false);

  const [recentPatients, setRecentPatients] = useState([]);
  const [unreadByAppointment, setUnreadByAppointment] = useState({});
  const [chatTarget, setChatTarget] = useState(null);

  const refreshQueue = useCallback(async () => {
    try {
      const result = await getQueue(token);
      setData(result);
      setLoadError('');
    } catch (err) {
      setLoadError(err.message);
    }
  }, [token]);

  const refreshRecentPatients = useCallback(() => {
    getRecentPatients(token)
      .then((result) => setRecentPatients(result.patients))
      .catch(() => setRecentPatients([]));
  }, [token]);

  const refreshUnread = useCallback(() => {
    getUnreadCount(token)
      .then((result) =>
        setUnreadByAppointment(
          Object.fromEntries(result.byAppointment.map((row) => [row.appointmentId, row.count])),
        ),
      )
      .catch(() => setUnreadByAppointment({}));
  }, [token]);

  useEffect(() => {
    refreshQueue().finally(() => setIsLoading(false));
    refreshRecentPatients();
    refreshUnread();
  }, [refreshQueue, refreshRecentPatients, refreshUnread]);

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

  function clearDayAvailability(day) {
    setAvailabilitySaved(false);
    setAvailability((prev) => ({ ...prev, [day]: { start: '', end: '' } }));
  }

  function addDateOverride() {
    setAvailabilitySaved(false);
    setDateOverrides((prev) => [...prev, { date: '', start: '', end: '', isUnavailable: false }]);
  }

  function handleDateOverrideChange(index, field, value) {
    setAvailabilitySaved(false);
    setDateOverrides((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, [field]: value } : entry)),
    );
  }

  function removeDateOverride(index) {
    setAvailabilitySaved(false);
    setDateOverrides((prev) => prev.filter((_, i) => i !== index));
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
      // Rows the doctor added but never picked a date for are dropped
      // rather than sent - they're not a valid override yet.
      const cleanedOverrides = dateOverrides.filter((entry) => entry.date);

      // A chosen week-starting date pins that day's hours to real calendar
      // dates (Mon = weekStartDate, Tue = +1, ...), one dateOverride per day
      // that actually has hours set. Blank days are left alone - they're
      // already unavailable by default with no hours set.
      const weekOverrides = [];
      if (weekDates) {
        DAYS.forEach(([key], index) => {
          const start = availability[key]?.start || '';
          const end = availability[key]?.end || '';
          if (start && end) {
            weekOverrides.push({ date: weekDates[index], start, end, isUnavailable: false });
          }
        });
      }

      const mergedOverrides = new Map(cleanedOverrides.map((entry) => [entry.date, entry]));
      weekOverrides.forEach((entry) => mergedOverrides.set(entry.date, entry));

      const result = await updateAvailability(
        {
          isUnavailable: Boolean(availability.isUnavailable),
          hours,
          dateOverrides: Array.from(mergedOverrides.values()),
        },
        token,
      );
      setAvailability(result.availability);
      setDateOverrides(result.availability.dateOverrides || []);
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
            <div className="mt-2">
              <MessageButton
                patientName={current.patientName}
                unreadCount={unreadByAppointment[current.appointmentId] || 0}
                onClick={() =>
                  setChatTarget({
                    appointmentId: current.appointmentId,
                    title: current.patientName,
                    chatOpen: true,
                    chatClosesAt: null,
                  })
                }
              />
            </div>

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
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-stone-200 px-4 py-2 text-sm dark:border-stone-800"
            >
              <span className="font-medium text-stone-900 dark:text-white">
                Token {patient.tokenNumber} · {patient.patientName}
              </span>
              <span className="flex items-center gap-3">
                <span className="text-stone-600 dark:text-stone-400">
                  {categoryLabel(patient.category)} · waiting {minutesWaiting(patient.queuedAt)}m
                </span>
                <MessageButton
                  patientName={patient.patientName}
                  unreadCount={unreadByAppointment[patient.appointmentId] || 0}
                  onClick={() =>
                    setChatTarget({
                      appointmentId: patient.appointmentId,
                      title: patient.patientName,
                      chatOpen: true,
                      chatClosesAt: null,
                    })
                  }
                />
              </span>
            </li>
          ))}
        </ul>
      </section>

      {recentPatients.length > 0 ? (
        <section className="mt-6 rounded-lg border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-950">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-white">
            Recent patients
          </h2>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
            Follow-up messaging stays open for 24 hours after a completed visit.
          </p>
          <ul className="mt-4 space-y-2">
            {recentPatients.map((patient) => (
              <li
                key={patient.appointmentId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-stone-200 px-4 py-2 text-sm dark:border-stone-800"
              >
                <span className="font-medium text-stone-900 dark:text-white">
                  {patient.patientName}
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-stone-600 dark:text-stone-400">
                    {formatClosesAt(patient.chatClosesAt)}
                  </span>
                  <MessageButton
                    patientName={patient.patientName}
                    unreadCount={unreadByAppointment[patient.appointmentId] || 0}
                    onClick={() =>
                      setChatTarget({
                        appointmentId: patient.appointmentId,
                        title: patient.patientName,
                        chatOpen: patient.chatOpen,
                        chatClosesAt: patient.chatClosesAt,
                      })
                    }
                  />
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

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

          <div>
            <label
              htmlFor="week-start-date"
              className="text-sm font-medium text-stone-700 dark:text-stone-300"
            >
              Week starting
            </label>
            <input
              id="week-start-date"
              type="date"
              value={weekStartDate}
              onChange={(e) => {
                setAvailabilitySaved(false);
                setWeekStartDate(e.target.value);
              }}
              className="ml-3 rounded-md border border-stone-300 px-2 py-1 text-sm dark:border-stone-700 dark:bg-stone-900 dark:text-white"
            />
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
              Optional: pick Monday&apos;s date and each day below gets the matching date for
              that week, in order. Saving pins that week&apos;s hours to those exact dates.
            </p>
          </div>

          <div className="space-y-2">
            {DAYS.map(([key, label], index) => (
              <div key={key} className="flex items-center gap-3 text-sm">
                <span className="w-24 text-stone-700 dark:text-stone-300">{label}</span>
                {weekDates ? (
                  <span className="w-28 text-xs text-stone-500 dark:text-stone-400">
                    {weekDates[index]}
                  </span>
                ) : null}
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
                <button
                  type="button"
                  onClick={() => clearDayAvailability(key)}
                  disabled={!availability[key]?.start && !availability[key]?.end}
                  className="text-sm font-medium text-red-700 hover:underline disabled:cursor-not-allowed disabled:text-stone-400 disabled:no-underline dark:text-red-400 dark:disabled:text-stone-600"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-stone-900 dark:text-white">
              Specific dates
            </h3>
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
              For a schedule that doesn&apos;t repeat every week - add just the dates you&apos;re
              available (or mark a single date unavailable). A date here overrides that
              weekday&apos;s hours above.
            </p>

            <div className="mt-3 space-y-2">
              {dateOverrides.map((entry, index) => (
                <div key={index} className="flex flex-wrap items-center gap-3 text-sm">
                  <label className="sr-only" htmlFor={`date-override-${index}`}>
                    Date
                  </label>
                  <input
                    id={`date-override-${index}`}
                    type="date"
                    value={entry.date}
                    onChange={(e) => handleDateOverrideChange(index, 'date', e.target.value)}
                    className="rounded-md border border-stone-300 px-2 py-1 dark:border-stone-700 dark:bg-stone-900 dark:text-white"
                  />
                  <label className="sr-only" htmlFor={`date-override-${index}-start`}>
                    Start time
                  </label>
                  <input
                    id={`date-override-${index}-start`}
                    type="time"
                    value={entry.start}
                    disabled={entry.isUnavailable}
                    onChange={(e) => handleDateOverrideChange(index, 'start', e.target.value)}
                    className="rounded-md border border-stone-300 px-2 py-1 disabled:opacity-50 dark:border-stone-700 dark:bg-stone-900 dark:text-white"
                  />
                  <span className="text-stone-400">to</span>
                  <label className="sr-only" htmlFor={`date-override-${index}-end`}>
                    End time
                  </label>
                  <input
                    id={`date-override-${index}-end`}
                    type="time"
                    value={entry.end}
                    disabled={entry.isUnavailable}
                    onChange={(e) => handleDateOverrideChange(index, 'end', e.target.value)}
                    className="rounded-md border border-stone-300 px-2 py-1 disabled:opacity-50 dark:border-stone-700 dark:bg-stone-900 dark:text-white"
                  />
                  <label className="flex items-center gap-1.5 text-stone-700 dark:text-stone-300">
                    <input
                      type="checkbox"
                      checked={entry.isUnavailable}
                      onChange={(e) =>
                        handleDateOverrideChange(index, 'isUnavailable', e.target.checked)
                      }
                      className="h-4 w-4 rounded border-stone-300 text-teal-600 focus:ring-teal-500"
                    />
                    Unavailable
                  </label>
                  <button
                    type="button"
                    onClick={() => removeDateOverride(index)}
                    className="text-sm font-medium text-red-700 hover:underline dark:text-red-400"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addDateOverride}
              className="mt-3 rounded-md border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
            >
              + Add date
            </button>
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

      {chatTarget ? (
        <ChatPanel
          appointmentId={chatTarget.appointmentId}
          title={chatTarget.title}
          token={token}
          currentUserId={user.id}
          chatOpen={chatTarget.chatOpen}
          chatClosesAt={chatTarget.chatClosesAt}
          onClose={() => {
            setChatTarget(null);
            refreshUnread();
          }}
          onMessagesRead={refreshUnread}
        />
      ) : null}
    </div>
  );
}

export default DoctorDashboardPage;
