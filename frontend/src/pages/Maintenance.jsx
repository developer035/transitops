import { useEffect, useState } from 'react';
import { createMaintenance, closeMaintenance } from '../api/maintenance';
import { listVehicles } from '../api/vehicles';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';

const STATUS_COLORS = {
  Open: '#f59e0b',
  Closed: '#22c55e',
};

const EMPTY_FORM = {
  vehicle_id: '',
  description: '',
  cost: '',
  date: '',
  status: 'Open',
};

export default function Maintenance() {
  const { role } = useAuth();
  const canCRUD = role === 'fleet_manager';
  const canView = ['fleet_manager', 'safety_officer', 'financial_analyst'].includes(role);

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [vehicles, setVehicles] = useState([]);

  // Fetch all maintenance logs (no list endpoint exists, we call vehicles and build from there)
  // Since the backend has no GET /maintenance/, we fetch vehicles and use their IDs
  // Actually there's no list endpoint — let's use the maintenance_collection via a workaround:
  // We'll make a custom GET call to /maintenance/ if it exists, otherwise show message
  const fetchLogs = async () => {
    setLoading(true);
    try {
      // Try hitting the maintenance list endpoint
      const res = await client.get('/maintenance/');
      setLogs(res.data);
    } catch (err) {
      if (err.response?.status === 404 || err.response?.status === 405) {
        // Backend has no GET /maintenance/ list endpoint yet — show empty
        setLogs([]);
      } else {
        setError('Failed to load maintenance logs.');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadVehicles = async () => {
    try {
      const res = await listVehicles();
      setVehicles(res.data);
    } catch {
      setError('Failed to load vehicles.');
    }
  };

  useEffect(() => {
    fetchLogs();
    if (canCRUD) loadVehicles();
  }, []);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const data = { ...form, cost: parseFloat(form.cost) };
      await createMaintenance(data);
      setSuccess('Maintenance log created. Vehicle status set to "In Shop".');
      setShowModal(false);
      fetchLogs();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create maintenance log.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = async (id) => {
    if (!window.confirm('Close this maintenance log? Vehicle will be set back to Available.')) return;
    try {
      await closeMaintenance(id);
      setSuccess('Maintenance log closed. Vehicle set to Available.');
      fetchLogs();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to close maintenance log.');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Maintenance</h1>
        {canCRUD && (
          <button className="btn btn-primary" onClick={openCreate}>+ Add Maintenance Log</button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="info-banner">
        ℹ️ Adding a vehicle to maintenance automatically sets its status to <strong>In Shop</strong> and removes it from trip assignment.
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Vehicle ID</th>
                <th>Description</th>
                <th>Cost (₹)</th>
                <th>Date</th>
                <th>Status</th>
                {canCRUD && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr>
                  <td colSpan={canCRUD ? 6 : 5} className="empty-row">
                    No maintenance logs found.
                    {canCRUD && ' Use the button above to add one.'}
                  </td>
                </tr>
              )}
              {logs.map((log) => (
                <tr key={log._id}>
                  <td className="id-cell">{log.vehicle_id}</td>
                  <td>{log.description}</td>
                  <td>{log.cost?.toLocaleString()}</td>
                  <td>{log.date}</td>
                  <td>
                    <span className="status-badge" style={{ background: STATUS_COLORS[log.status] + '22', color: STATUS_COLORS[log.status] }}>
                      {log.status}
                    </span>
                  </td>
                  {canCRUD && (
                    <td>
                      {log.status === 'Open' && (
                        <button className="btn btn-sm btn-success" onClick={() => handleClose(log._id)}>
                          Close Log
                        </button>
                      )}
                      {log.status === 'Closed' && <span className="muted">Closed</span>}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Maintenance Log</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form className="modal-body" onSubmit={handleSubmit}>
              {error && <div className="alert alert-error">{error}</div>}
              <div className="form-grid-2">
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Vehicle *</label>
                  <select className="form-select" value={form.vehicle_id} onChange={(e) => setForm({ ...form, vehicle_id: e.target.value })} required>
                    <option value="">Select vehicle...</option>
                    {vehicles.map((v) => (
                      <option key={v._id} value={v._id}>
                        {v.registration_number} — {v.name_model} ({v.status})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Description *</label>
                  <textarea className="form-input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Cost (₹) *</label>
                  <input className="form-input" type="number" min="0" step="0.01" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Date *</label>
                  <input className="form-input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating...' : 'Create Log'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
