import request from './api';

function addDoctor({ name, email, phone, specialization, department }, token) {
  return request('/api/admin/doctors', {
    method: 'POST',
    body: { name, email, phone, specialization, department },
    token,
  });
}

function listDoctors(token) {
  return request('/api/admin/doctors', { token });
}

export { addDoctor, listDoctors };
