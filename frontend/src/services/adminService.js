import request, { API_URL } from './api';

function toQueryString(params) {
  return new URLSearchParams(
    Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v)),
  ).toString();
}

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

function getOverview(token) {
  return request('/api/admin/overview', { token });
}

function getAuditLog(params, token) {
  const query = toQueryString(params);
  return request(`/api/admin/audit-log${query ? `?${query}` : ''}`, { token });
}

function getDoctorWorkloadReport(params, token) {
  const query = toQueryString(params);
  return request(`/api/admin/reports/doctor-workload${query ? `?${query}` : ''}`, { token });
}

function getQueuePerformanceReport(params, token) {
  const query = toQueryString(params);
  return request(`/api/admin/reports/queue-performance${query ? `?${query}` : ''}`, { token });
}

function getBenchmarkResults(token) {
  return request('/api/admin/benchmark-results', { token });
}

// Reports are auth-protected, so the CSV can't just be a plain <a href>
// link — fetch it with the bearer token, then trigger the browser download
// from the resulting blob.
async function downloadReportCsv(path, params, token, filename) {
  const query = toQueryString({ ...params, format: 'csv' });
  const response = await fetch(`${API_URL}${path}?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('Could not download the report. Please try again.');
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export {
  addDoctor,
  listDoctors,
  getOverview,
  getAuditLog,
  getDoctorWorkloadReport,
  getQueuePerformanceReport,
  getBenchmarkResults,
  downloadReportCsv,
};
