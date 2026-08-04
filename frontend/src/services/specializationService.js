import request from './api';

function listSpecializations() {
  return request('/api/specializations');
}

export { listSpecializations };
