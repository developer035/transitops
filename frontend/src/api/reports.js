import client from './client';

export const exportCsv = () =>
  client.get('/reports/export', { responseType: 'blob' });
