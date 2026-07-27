import request from './api';

function signup({ name, email, phone, password }) {
  return request('/api/auth/signup', {
    method: 'POST',
    body: { name, email, phone, password },
  });
}

function login({ email, password }) {
  return request('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

function googleLogin(credential) {
  return request('/api/auth/google', {
    method: 'POST',
    body: { credential },
  });
}

function fetchMe(token) {
  return request('/api/auth/me', { token });
}

function changePassword({ currentPassword, newPassword }, token) {
  return request('/api/auth/change-password', {
    method: 'PATCH',
    body: { currentPassword, newPassword },
    token,
  });
}

export { signup, login, googleLogin, fetchMe, changePassword };
