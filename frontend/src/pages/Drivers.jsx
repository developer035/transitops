import { useEffect, useState } from 'react';
import { listDrivers, createDriver, updateDriver, deleteDriver, getDriver } from '../api/drivers';
import { useAuth } from '../context/AuthContext';

const STATUS_COLORS = {
  Available: '#22c55e',
  'On Trip': '#3b82f6',
  'Off Duty': '#6b7280',
  Suspended: '#ef4444',
};

const EMPTY_FORM = {
  name: '',
  license_number: '',
  license_category: '',
  license_expiry_date: '',
  contact_number: '',
  safety_score: 100,
  status: 'Available',
};

export default function Drivers() {
  const { role, userInfo } = useAuth();
  const canCRUD = role === 'safety_officer';
  const isDriver = role === 'driver';

  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editDriver, setEditDriver] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      if (isDriver) {
        // Driver sees only their own profile
        if (userInfo?.driver_id) {
          const res = await getDriver(userInfo.driver_id);
          setDrivers([res.data]);
        } else {
          setDrivers([]);
        }
      } else {
        const params = filterStatus ? { status: filterStatus } : {};
        const res = await listDrivers(params);
        setDrivers(res.data);
      }
    } catch {
      setError('Failed to load driver data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDrivers(); }, [filterStatus]);

  const openCreate = () => {
    setEditDriver(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (d) => {
    setEditDriver(d);
    setForm({
      name: d.name,
      license_number: d.license_number,
      license_category: d.license_category,
      license_expiry_date: d.license_expiry_date?.split('T')[0] || '',
      contact_number: d.contact_number,
      safety_score: d.safety_score,
      status: d.status,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const data = { ...form, safety_score: parseFloat(form.safety_score) };
      if (editDriver) {
        await updateDriver(editDriver._id, data);
        setSuccess('Driver updated.');
      } else {
        await createDriver(data);
        setSuccess('Driver created.');
      }
      setShowModal(false);
      fetchDrivers();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save driver.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this driver? This cannot be undone.')) return;
    try {
      await deleteDriver(id);
      setSuccess('Driver deleted.');
      fetchDrivers();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete driver.');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">
          {isDriver ? 'My Profile' : 'Driver Management'}
        </h1>
        {canCRUD && (
          <button className="btn btn-primary" onClick={openCreate}>+ Add Driver</button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {!isDriver && (
        <div className="filter-bar">
          <select className="form-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option>Available</option>
            <option>On Trip</option>
            <option>Off Duty</option>
            <option>Suspended</option>
          </select>
        </div>
      )}

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>License No.</th>
                <th>Category</th>
                <th>License Expiry</th>
                <th>Contact</th>
                <th>Safety Score</th>
                <th>Status</th>
                {canCRUD && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {drivers.length === 0 && (
                <tr>
                  <td colSpan={canCRUD ? 8 : 7} className="empty-row">
                    {isDriver ? 'Your driver profile has not been created yet. Contact your Fleet Manager.' : 'No drivers found.'}
                  </td>
                </tr>
              )}
              {drivers.map((d) => (
                <tr key={d._id}>
                  <td><strong>{d.name}</strong></td>
                  <td>{d.license_number}</td>
                  <td>{d.license_category}</td>
                  <td>{d.license_expiry_date?.split('T')[0] || d.license_expiry_date}</td>
                  <td>{d.contact_number}</td>
                  <td>
                    <span className={`score-badge ${d.safety_score >= 80 ? 'score-good' : d.safety_score >= 50 ? 'score-medium' : 'score-bad'}`}>
                      {d.safety_score}
                    </span>
                  </td>
                  <td>
                    <span className="status-badge" style={{ background: STATUS_COLORS[d.status] + '22', color: STATUS_COLORS[d.status] }}>
                      {d.status}
                    </span>
                  </td>
                  {canCRUD && (
                    <td className="actions-cell">
                      <button className="btn btn-sm btn-secondary" onClick={() => openEdit(d)}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(d._id)}>Delete</button>
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
              <h2>{editDriver ? 'Edit Driver' : 'Add Driver'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form className="modal-body" onSubmit={handleSubmit}>
              {error && <div className="alert alert-error">{error}</div>}
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Name *</label>
                  <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">License Number *</label>
                  <input className="form-input" value={form.license_number} onChange={(e) => setForm({ ...form, license_number: e.target.value })} required disabled={!!editDriver} />
                </div>
                <div className="form-group">
                  <label className="form-label">License Category *</label>
                  <input className="form-input" value={form.license_category} onChange={(e) => setForm({ ...form, license_category: e.target.value })} placeholder="A, B, C, D..." required />
                </div>
                <div className="form-group">
                  <label className="form-label">License Expiry Date *</label>
                  <input className="form-input" type="date" value={form.license_expiry_date} onChange={(e) => setForm({ ...form, license_expiry_date: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Contact Number *</label>
                  <input className="form-input" value={form.contact_number} onChange={(e) => setForm({ ...form, contact_number: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Safety Score (0–100)</label>
                  <input className="form-input" type="number" min="0" max="100" step="0.1" value={form.safety_score} onChange={(e) => setForm({ ...form, safety_score: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option>Available</option>
                    <option>On Trip</option>
                    <option>Off Duty</option>
                    <option>Suspended</option>
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
