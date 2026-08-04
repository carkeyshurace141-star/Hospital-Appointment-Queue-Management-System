import request from './api';

function listDepartments() {
  return request('/api/departments');
}

function listDoctorsForDepartment(departmentId) {
  return request(`/api/departments/${departmentId}/doctors`);
}

function getQueueSummary(departmentId) {
  return request(`/api/departments/${departmentId}/queue-summary`);
}

export { listDepartments, listDoctorsForDepartment, getQueueSummary };
