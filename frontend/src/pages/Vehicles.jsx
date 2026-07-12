import { useEffect, useState } from 'react';
import { listVehicles, createVehicle, updateVehicle } from '../api/vehicles';
import { useAuth } from '../context/AuthContext';

const STATUS_COLORS = {
  Available: '#22c55e',
  'On Trip': '#3b82f6',
  'In Shop': '#f59e0b',
  Retired: '#6b7280',
};

const EMPTY_FORM = {
  registration_number: '',
  name_model: '',
  vehicle_type: '',
  max_load_capacity: '',
  odometer: '',
  acquisition_cost: '',
  region: '',
  status: 'Available',
};

export default function Vehicles() {
  const { role } = useAuth();
  const canCRUD = role === 'fleet_manager';

  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editVehicle, setEditVehicle] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterType) params.type = filterType;
      const res = await listVehicles(params);
      setVehicles(res.data);
    } catch {
      setError('Failed to load vehicles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVehicles(); }, [filterStatus, filterType]);

  const openCreate = () => {
    setEditVehicle(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (v) => {
    setEditVehicle(v);
    setForm({
      registration_number: v.registration_number,
      name_model: v.name_model,
      vehicle_type: v.vehicle_type,
      max_load_capacity: v.max_load_capacity,
      odometer: v.odometer,
      acquisition_cost: v.acquisition_cost,
      region: v.region || '',
      status: v.status,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const data = {
        ...form,
        max_load_capacity: parseFloat(form.max_load_capacity),
        odometer: parseFloat(form.odometer) || 0,
        acquisition_cost: parseFloat(form.acquisition_cost),
      };
      if (editVehicle) {
        await updateVehicle(editVehicle._id, data);
        setSuccess('Vehicle updated.');
      } else {
        await createVehicle(data);
        setSuccess('Vehicle created.');
      }
      setShowModal(false);
      fetchVehicles();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save vehicle.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Vehicle Registry</h1>
        {canCRUD && (
          <button className="btn btn-primary" onClick={openCreate}>+ Add Vehicle</button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="filter-bar">
        <select className="form-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option>Available</option>
          <option>On Trip</option>
          <option>In Shop</option>
          <option>Retired</option>
        </select>
        <input
          className="form-input"
          placeholder="Filter by type..."
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Reg. Number</th>
                <th>Name/Model</th>
                <th>Type</th>
                <th>Max Load (kg)</th>
                <th>Odometer (km)</th>
                <th>Acq. Cost (₹)</th>
                <th>Region</th>
                <th>Status</th>
                {canCRUD && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {vehicles.length === 0 && (
                <tr><td colSpan={canCRUD ? 9 : 8} className="empty-row">No vehicles found.</td></tr>
              )}
              {vehicles.map((v) => (
                <tr key={v._id}>
                  <td><strong>{v.registration_number}</strong></td>
                  <td>{v.name_model}</td>
                  <td>{v.vehicle_type}</td>
                  <td>{v.max_load_capacity}</td>
                  <td>{v.odometer}</td>
                  <td>{v.acquisition_cost?.toLocaleString()}</td>
                  <td>{v.region || '—'}</td>
                  <td>
                    <span className="status-badge" style={{ background: STATUS_COLORS[v.status] + '22', color: STATUS_COLORS[v.status] }}>
                      {v.status}
                    </span>
                  </td>
                  {canCRUD && (
                    <td>
                      <button className="btn btn-sm btn-secondary" onClick={() => openEdit(v)}>Edit</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editVehicle ? 'Edit Vehicle' : 'Add Vehicle'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form className="modal-body" onSubmit={handleSubmit}>
              {error && <div className="alert alert-error">{error}</div>}
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Registration Number *</label>
                  <input className="form-input" value={form.registration_number} onChange={(e) => setForm({ ...form, registration_number: e.target.value })} required disabled={!!editVehicle} />
                </div>
                <div className="form-group">
                  <label className="form-label">Name/Model *</label>
                  <input className="form-input" value={form.name_model} onChange={(e) => setForm({ ...form, name_model: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Vehicle Type *</label>
                  <input className="form-input" value={form.vehicle_type} onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })} placeholder="Truck, Van, Bus..." required />
                </div>
                <div className="form-group">
                  <label className="form-label">Max Load Capacity (kg) *</label>
                  <input className="form-input" type="number" min="0" step="0.1" value={form.max_load_capacity} onChange={(e) => setForm({ ...form, max_load_capacity: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Odometer (km)</label>
                  <input className="form-input" type="number" min="0" value={form.odometer} onChange={(e) => setForm({ ...form, odometer: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Acquisition Cost (₹) *</label>
                  <input className="form-input" type="number" min="0" step="0.01" value={form.acquisition_cost} onChange={(e) => setForm({ ...form, acquisition_cost: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Region</label>
                  <input className="form-input" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option>Available</option>
                    <option>On Trip</option>
                    <option>In Shop</option>
                    <option>Retired</option>
                  </select>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
