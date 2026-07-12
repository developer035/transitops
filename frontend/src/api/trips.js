import client from './client';

export const listTrips = (params = {}) => client.get('/trips/', { params });
export const createTrip = (data) => client.post('/trips/', data);
export const dispatchTrip = (id) => client.put(`/trips/${id}/dispatch`);
export const completeTrip = (id) => client.put(`/trips/${id}/complete`);
export const cancelTrip = (id) => client.put(`/trips/${id}/cancel`);
