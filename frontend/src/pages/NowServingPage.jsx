import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { API_URL } from '../services/api';
import { listDepartments } from '../services/departmentService';

// Short native beep via the Web Audio API - no external audio file or
// library needed, and it never plays until a call actually happens.
function playBeep() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.2, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.6);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.6);
  } catch (_err) {
    // Audio is a nice-to-have on this display; never let it break the page.
  }
}

function NowServingPage() {
  const [searchParams] = useSearchParams();
  const departmentId = searchParams.get('department');
  const [departmentName, setDepartmentName] = useState('');
  const [now, setNow] = useState(null);
  const [pulse, setPulse] = useState(false);
  const pulseTimeoutRef = useRef(null);

  useEffect(() => {
    if (!departmentId) return;
    listDepartments()
      .then((data) => {
        const match = data.departments.find((d) => d.id === departmentId);
        if (match) setDepartmentName(match.name);
      })
      .catch(() => {});
  }, [departmentId]);

  useEffect(() => {
    if (!departmentId) return undefined;

    const socket = io(API_URL);
    function onAppointmentCalled(payload) {
      if (payload.departmentId !== departmentId) return;
      setNow({ tokenNumber: payload.tokenNumber });
      setPulse(true);
      playBeep();
      clearTimeout(pulseTimeoutRef.current);
      pulseTimeoutRef.current = setTimeout(() => setPulse(false), 2000);
    }

    socket.on('appointment:called', onAppointmentCalled);
    return () => {
      socket.disconnect();
      clearTimeout(pulseTimeoutRef.current);
    };
  }, [departmentId]);

  if (!departmentId) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Now Serving</h1>
        <p className="mt-2 text-stone-600 dark:text-stone-400">
          Add <code>?department=&lt;id&gt;</code> to this page&apos;s URL to point it at a
          department&apos;s waiting-room screen.
        </p>
        <Link
          to="/"
          className="mt-6 inline-block font-medium text-teal-700 hover:underline dark:text-teal-400"
        >
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-stone-900 px-4 text-center text-white">
      <p className="text-2xl font-medium tracking-wide text-stone-300">
        {departmentName || 'Now Serving'}
      </p>
      <p
        role="status"
        aria-live="polite"
        className={`mt-6 text-[10rem] font-bold leading-none transition-transform duration-500 ${
          pulse ? 'scale-110 text-teal-400' : 'text-white'
        }`}
      >
        {now ? now.tokenNumber : '-'}
      </p>
      <p className="mt-6 text-xl text-stone-400">
        {now ? 'Please proceed to the consultation room' : 'Waiting for the next call'}
      </p>
    </div>
  );
}

export default NowServingPage;
