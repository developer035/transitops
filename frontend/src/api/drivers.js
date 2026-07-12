import client from './client';

export const listDrivers = (params = {}) => client.get('/drivers/', { params });
export const getDriver = (id) => client.get(`/drivers/${id}`);
export const createDriver = (data) => client.post('/drivers/', data);
export const updateDriver = (id, data) => client.put(`/drivers/${id}`, data);
export const deleteDriver = (id) => client.delete(`/drivers/${id}`);
