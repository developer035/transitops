// No auth header — these are dev-only endpoints called without Firebase
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const adminClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

export const bulkPopulate = (collection, records) =>
  adminClient.post(`/admin/bulk-populate/${collection}`, records);

export const getCollectionCounts = () =>
  adminClient.get('/admin/collections');

export const listAdminUsers = () =>
  adminClient.get('/admin/users');

export const createAdminUser = (user) =>
  adminClient.post('/admin/users', user);

export const setFirebaseUid = (userId, firebaseUid) =>
  adminClient.put(`/admin/users/${userId}/firebase-uid`, { firebase_uid: firebaseUid });

export const setUserRole = (userId, role) =>
  adminClient.put(`/admin/users/${userId}/role`, { role });

export const deleteAdminUser = (userId) =>
  adminClient.delete(`/admin/users/${userId}`);
