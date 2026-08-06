import request from './api';

function getMessages(appointmentId, token) {
  return request(`/api/chat/${appointmentId}/messages`, { token });
}

function sendMessage(appointmentId, body, token) {
  return request(`/api/chat/${appointmentId}/messages`, {
    method: 'POST',
    body: { body },
    token,
  });
}

function getUnreadCount(token) {
  return request('/api/chat/unread-count', { token });
}

export { getMessages, sendMessage, getUnreadCount };
