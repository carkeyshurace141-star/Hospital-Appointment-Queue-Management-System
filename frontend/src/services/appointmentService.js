import request from './api';

function createAppointment({ department, doctor, category, timeSlot }, token) {
  return request('/api/appointments', {
    method: 'POST',
    body: { department, doctor: doctor || undefined, category, timeSlot },
    token,
  });
}

function createWalkIn({ department, doctor, category }, token) {
  return request('/api/appointments/walk-in', {
    method: 'POST',
    body: { department, doctor: doctor || undefined, category },
    token,
  });
}

function listMine(token) {
  return request('/api/appointments/mine', { token });
}

function cancelAppointment(id, token) {
  return request(`/api/appointments/${id}/cancel`, { method: 'PATCH', token });
}

function rescheduleAppointment(id, { timeSlot }, token) {
  return request(`/api/appointments/${id}/reschedule`, {
    method: 'PATCH',
    body: { timeSlot },
    token,
  });
}

function checkIn(id, token) {
  return request(`/api/appointments/${id}/checkin`, { method: 'POST', token });
}

function queueStatus(id, token) {
  return request(`/api/appointments/${id}/queue-status`, { token });
}

export {
  createAppointment,
  createWalkIn,
  listMine,
  cancelAppointment,
  rescheduleAppointment,
  checkIn,
  queueStatus,
};
