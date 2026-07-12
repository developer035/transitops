import client from './client';

export const recordFuel = (data) => client.post('/expenses/fuel', data);
export const recordExpense = (data) => client.post('/expenses/other', data);
export const getOperationalCost = (vehicleId) =>
  client.get(`/expenses/vehicle/${vehicleId}/cost`);

// For analytics: fetch all fuel logs and expenses for a vehicle
// We do this by reading from the cost endpoint per vehicle
export const getAllFuelLogs = (vehicleId) =>
  client.get(`/expenses/vehicle/${vehicleId}/cost`);
