import client from './client';

export const createMaintenance = (data) => client.post('/maintenance/', data);
export const closeMaintenance = (id) => client.put(`/maintenance/${id}/close`);
