import request from './api';

function getQueue(token) {
  return request('/api/clinician/queue', { token });
}

function callNext(token) {
  return request('/api/clinician/queue/call', { method: 'POST', token });
}

function skip(token) {
  return request('/api/clinician/queue/skip', { method: 'POST', token });
}

function recall(token) {
  return request('/api/clinician/queue/recall', { method: 'POST', token });
}

function complete(token) {
  return request('/api/clinician/queue/complete', { method: 'POST', token });
}

function refer(newDepartmentId, token) {
  return request('/api/clinician/queue/refer', {
    method: 'POST',
    body: { newDepartmentId },
    token,
  });
}

function markNoShow(token) {
  return request('/api/clinician/queue/no-show', { method: 'POST', token });
}

function updateAvailability(payload, token) {
  return request('/api/clinician/availability', { method: 'PATCH', body: payload, token });
}

function getRecentPatients(token) {
  return request('/api/clinician/recent-patients', { token });
}

export {
  getQueue,
  callNext,
  skip,
  recall,
  complete,
  refer,
  markNoShow,
  updateAvailability,
  getRecentPatients,
};
