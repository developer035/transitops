import { useEffect, useState } from 'react';
import { recordFuel, recordExpense, getOperationalCost } from '../api/expenses';
import { listVehicles } from '../api/vehicles';
import { useAuth } from '../context/AuthContext';

const EMPTY_FUEL = { vehicle_id: '', liters: '', cost: '', date: '' };
const EMPTY_EXPENSE = { vehicle_id: '', expense_type: 'Toll', cost: '', date: '' };

export default function Expenses() {
  const { role } = useAuth();
  const canCRUD = role === 'financial_analyst';
  const canAddFuel = role === 'driver' || role === 'financial_analyst';

  const [vehicles, setVehicles] = useState([]);
  const [costs, setCosts] = useState({}); // vehicle_id → cost summary
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showFuelModal, setShowFuelModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [fuelForm, setFuelForm] = useState(EMPTY_FUEL);
  const [expenseForm, setExpenseForm] = useState(EMPTY_EXPENSE);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const vRes = await listVehicles();
      setVehicles(vRes.data);

      // Fetch operational costs for each vehicle
      const costMap = {};
      await Promise.all(
        vRes.data.map(async (v) => {
          try {
            const res = await getOperationalCost(v._id);
            costMap[v._id] = res.data;
          } catch {
            costMap[v._id] = { total_fuel_cost: 0, total_other_expenses: 0, total_operational_cost: 0 };
          }
        })
      );
      setCosts(costMap);
    } catch {
      setError('Failed to load expense data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleFuelSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await recordFuel({
        ...fuelForm,
        liters: parseFloat(fuelForm.liters),
        cost: parseFloat(fuelForm.cost),
      });
      setSuccess('Fuel log recorded.');
      setShowFuelModal(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to record fuel log.');
    } finally {
      setSaving(false);
    }
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await recordExpense({
        ...expenseForm,
        cost: parseFloat(expenseForm.cost),
      });
      setSuccess('Expense recorded.');
      setShowExpenseModal(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to record expense.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Fuel & Expenses</h1>
        <div className="button-group">
          {canAddFuel && (
            <button className="btn btn-primary" onClick={() => { setFuelForm(EMPTY_FUEL); setShowFuelModal(true); }}>
              ⛽ Add Fuel Log
            </button>
          )}
          {canCRUD && (
            <button className="btn btn-secondary" onClick={() => { setExpenseForm(EMPTY_EXPENSE); setShowExpenseModal(true); }}>
              + Add Expense
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Registration</th>
                <th>Model</th>
                <th>Total Fuel Cost (₹)</th>
                <th>Other Expenses (₹)</th>
                <th>Total Operational Cost (₹)</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.length === 0 && (
                <tr><td colSpan={5} className="empty-row">No vehicles found.</td></tr>
              )}
              {vehicles.map((v) => {
                const c = costs[v._id] || {};
                return (
                  <tr key={v._id}>
                    <td><strong>{v.registration_number}</strong></td>
                    <td>{v.name_model}</td>
                    <td>{c.total_fuel_cost?.toLocaleString() ?? '—'}</td>
                    <td>{c.total_other_expenses?.toLocaleString() ?? '—'}</td>
                    <td><strong>{c.total_operational_cost?.toLocaleString() ?? '—'}</strong></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Fuel Log Modal */}
      {showFuelModal && (
        <div className="modal-overlay" onClick={() => setShowFuelModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>⛽ Add Fuel Log</h2>
              <button className="modal-close" onClick={() => setShowFuelModal(false)}>✕</button>
            </div>
            <form className="modal-body" onSubmit={handleFuelSubmit}>
              {error && <div className="alert alert-error">{error}</div>}
              <div className="form-grid-2">
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Vehicle *</label>
                  <select className="form-select" value={fuelForm.vehicle_id} onChange={(e) => setFuelForm({ ...fuelForm, vehicle_id: e.target.value })} required>
                    <option value="">Select vehicle...</option>
                    {vehicles.map((v) => (
                      <option key={v._id} value={v._id}>{v.registration_number} — {v.name_model}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Liters *</label>
                  <input className="form-input" type="number" min="0" step="0.01" value={fuelForm.liters} onChange={(e) => setFuelForm({ ...fuelForm, liters: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Cost (₹) *</label>
                  <input className="form-input" type="number" min="0" step="0.01" value={fuelForm.cost} onChange={(e) => setFuelForm({ ...fuelForm, cost: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Date *</label>
                  <input className="form-input" type="date" value={fuelForm.date} onChange={(e) => setFuelForm({ ...fuelForm, date: e.target.value })} required />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowFuelModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Fuel Log'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Other Expense Modal */}
      {showExpenseModal && (
        <div className="modal-overlay" onClick={() => setShowExpenseModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Expense</h2>
              <button className="modal-close" onClick={() => setShowExpenseModal(false)}>✕</button>
            </div>
            <form className="modal-body" onSubmit={handleExpenseSubmit}>
              {error && <div className="alert alert-error">{error}</div>}
              <div className="form-grid-2">
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Vehicle *</label>
                  <select className="form-select" value={expenseForm.vehicle_id} onChange={(e) => setExpenseForm({ ...expenseForm, vehicle_id: e.target.value })} required>
                    <option value="">Select vehicle...</option>
                    {vehicles.map((v) => (
                      <option key={v._id} value={v._id}>{v.registration_number} — {v.name_model}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Expense Type *</label>
                  <select className="form-select" value={expenseForm.expense_type} onChange={(e) => setExpenseForm({ ...expenseForm, expense_type: e.target.value })}>
                    <option>Toll</option>
                    <option>Maintenance</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Cost (₹) *</label>
                  <input className="form-input" type="number" min="0" step="0.01" value={expenseForm.cost} onChange={(e) => setExpenseForm({ ...expenseForm, cost: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Date *</label>
                  <input className="form-input" type="date" value={expenseForm.date} onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })} required />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowExpenseModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Expense'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
