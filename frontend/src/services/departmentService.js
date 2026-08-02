import request from './api';

function listDepartments() {
  return request('/api/departments');
}

function listDoctorsForDepartment(departmentId) {
  return request(`/api/departments/${departmentId}/doctors`);
}

export { listDepartments, listDoctorsForDepartment };
