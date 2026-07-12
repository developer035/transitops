import client from './client';

export const syncUser = () => client.post('/auth/sync');
export const getMe = () => client.get('/auth/me');
export const setRole = (firebaseUid, role) =>
  client.put(`/auth/set-role/${firebaseUid}?role=${role}`);
