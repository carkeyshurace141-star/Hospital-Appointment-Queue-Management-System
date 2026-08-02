import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { API_URL } from '../services/api';

// Dev-only component: proves the Socket.io connection works by logging
// server:ping events to the browser console. Renders nothing.
function DevSocketListener() {
  useEffect(() => {
    if (!import.meta.env.DEV) return undefined;

    const socket = io(API_URL);

    socket.on('connect', () => {
      console.log('[socket] connected:', socket.id);
    });

    socket.on('server:ping', (payload) => {
      console.log('[socket] server:ping', payload);
    });

    socket.on('queue:updated', (payload) => {
      console.log('[socket] queue:updated', payload);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return null;
}

export default DevSocketListener;
