import client from './client';

export const getKpis = (params = {}) => client.get('/dashboard/kpis', { params });
