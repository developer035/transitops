import { useEffect, useState } from 'react';
import { listTrips, createTrip, dispatchTrip, completeTrip, cancelTrip } from '../api/trips';
import { listVehicles } from '../api/vehicles';
import { listDrivers } from '../api/drivers';
import { useAuth } from '../context/AuthContext';

const STATUS_COLORS = {
  Draft: '#6b7280',
  Dispatched: '#3b82f6',
  Completed: '#22c55e',
  Cancelled: '#ef4444',
};

const EMPTY_FORM = {
  source: '',
  destination: '',
  vehicle_id: '',
  driver_id: '',
  cargo_weight: '',
  planned_distance: '',
};

export default function Trips() {
  const { role, userInfo } = useAuth();
  const canCreate = role === 'driver';
  const canManage = role === 'driver'; // driver manages own trips; FM just views

  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [availableVehicles, setAvailableVehicles] = useState([]);
  const [availableDrivers, setAvailableDrivers] = useState([]);

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const params = filterStatus ? { status: filterStatus } : {};
      const res = await listTrips(params);
      setTrips(res.data);
    } catch {
      setError('Failed to load trips.');
    } finally {
      setLoading(false);
    }
  };

  const loadFormData = async () => {
    try {
      const [vRes, dRes] = await Promise.all([
        listVehicles({ status: 'Available' }),
        listDrivers({ status: 'Available' }),
      ]);
      setAvailableVehicles(vRes.data);
      setAvailableDrivers(dRes.data);
    } catch {
      setError('Failed to load available vehicles/drivers.');
    }
  };

  useEffect(() => { fetchTrips(); }, [filterStatus]);

  const openCreate = async () => {
    setForm(EMPTY_FORM);
    setError('');
    await loadFormData();
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const data = {
        ...form,
        cargo_weight: parseFloat(form.cargo_weight),
        planned_distance: parseFloat(form.planned_distance),
      };
      await createTrip(data);
      setSuccess('Trip created as Draft.');
      setShowModal(false);
      fetchTrips();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create trip.');
    } finally {
      setSaving(false);
    }
  };

  const handleAction = async (action, tripId) => {
    setError('');
    try {
      if (action === 'dispatch') await dispatchTrip(tripId);
      if (action === 'complete') await completeTrip(tripId);
      if (action === 'cancel') await cancelTrip(tripId);
      setSuccess(`Trip ${action}ed successfully.`);
      fetchTrips();
    } catch (err) {
      setError(err.response?.data?.detail || `Failed to ${action} trip.`);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Trip Management</h1>
        {canCreate && (
          <button className="btn btn-primary" onClick={openCreate}>+ Create Trip</button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="filter-bar">
        <select className="form-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option>Draft</option>
          <option>Dispatched</option>
          <option>Completed</option>
          <option>Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Destination</th>
                <th>Vehicle ID</th>
                <th>Driver ID</th>
                <th>Cargo (kg)</th>
                <th>Distance (km)</th>
                <th>Status</th>
                {canManage && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {trips.length === 0 && (
                <tr><td colSpan={canManage ? 8 : 7} className="empty-row">No trips found.</td></tr>
              )}
              {trips.map((t) => (
                <tr key={t._id}>
                  <td>{t.source}</td>
                  <td>{t.destination}</td>
                  <td className="id-cell">{t.vehicle_id}</td>
                  <td className="id-cell">{t.driver_id}</td>
                  <td>{t.cargo_weight}</td>
                  <td>{t.planned_distance}</td>
                  <td>
                    <span className="status-badge" style={{ background: STATUS_COLORS[t.status] + '22', color: STATUS_COLORS[t.status] }}>
                      {t.status}
                    </span>
                  </td>
                  {canManage && (
                    <td className="actions-cell">
                      {t.status === 'Draft' && (
                        <>
                          <button className="btn btn-sm btn-primary" onClick={() => handleAction('dispatch', t._id)}>Dispatch</button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleAction('cancel', t._id)}>Cancel</button>
                        </>
                      )}
                      {t.status === 'Dispatched' && (
                        <>
                          <button className="btn btn-sm btn-success" onClick={() => handleAction('complete', t._id)}>Complete</button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleAction('cancel', t._id)}>Cancel</button>
                        </>
                      )}
                      {(t.status === 'Completed' || t.status === 'Cancelled') && (
                        <span className="muted">—</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Trip Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create Trip</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form className="modal-body" onSubmit={handleSubmit}>
              {error && <div className="alert alert-error">{error}</div>}
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Source *</label>
                  <input className="form-input" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Destination *</label>
                  <input className="form-input" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Vehicle (Available) *</label>
                  <select className="form-select" value={form.vehicle_id} onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })} required>
                    <option value="">Select vehicle...</option>
                    {availableVehicles.map((v) => (
                      <option key={v._id} value={v._id}>
                        {v.registration_number} — {v.name_model} (Max: {v.max_load_capacity}kg)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Driver (Available) *</label>
                  <select className="form-select" value={form.driver_id} onChange={(e) => setForm({ ...form, driver_id: e.target.value })} required>
                    <option value="">Select driver...</option>
                    {availableDrivers.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.name} — {d.license_number}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Cargo Weight (kg) *</label>
                  <input className="form-input" type="number" min="0" step="0.1" value={form.cargo_weight} onChange={(e) => setForm({ ...form, cargo_weight: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Planned Distance (km) *</label>
                  <input className="form-input" type="number" min="0" step="0.1" value={form.planned_distance} onChange={(e) => setForm({ ...form, planned_distance: e.target.value })} required />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating...' : 'Create Trip'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
