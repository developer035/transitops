import client from './client';

export const listVehicles = (params = {}) => client.get('/vehicles/', { params });
export const getVehicle = (id) => client.get(`/vehicles/${id}`);
export const createVehicle = (data) => client.post('/vehicles/', data);
export const updateVehicle = (id, data) => client.put(`/vehicles/${id}`, data);
