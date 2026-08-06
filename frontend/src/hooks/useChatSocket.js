import { useCallback, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { API_URL } from '../services/api';

// Opens an authenticated socket scoped to a single chat panel's lifetime
// (mirrors the per-component socket pattern already used for the live queue
// in DoctorDashboardPage.jsx - no shared/global socket needed for a single
// modal chat panel). Joins the appointment's room on connect and leaves it
// on cleanup; callbacks are read from a ref so callers don't need to
// memoize them to avoid needless reconnects.
function useChatSocket(appointmentId, token, { onMessage, onTyping, onRead } = {}) {
  const socketRef = useRef(null);
  const callbacksRef = useRef({ onMessage, onTyping, onRead });
  callbacksRef.current = { onMessage, onTyping, onRead };

  useEffect(() => {
    if (!appointmentId || !token) return undefined;

    const socket = io(API_URL, { auth: { token } });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('chat:join', { appointmentId });
    });

    socket.on('chat:message', (payload) => callbacksRef.current.onMessage?.(payload));
    socket.on('chat:typing', (payload) => callbacksRef.current.onTyping?.(payload));
    socket.on('chat:read', (payload) => callbacksRef.current.onRead?.(payload));

    return () => {
      socket.emit('chat:leave', { appointmentId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [appointmentId, token]);

  const emitTyping = useCallback(
    (isTyping) => {
      socketRef.current?.emit('chat:typing', { appointmentId, isTyping });
    },
    [appointmentId],
  );

  return { emitTyping };
}

export default useChatSocket;
