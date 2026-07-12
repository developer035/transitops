import { useEffect, useState } from 'react';
import { getKpis } from '../api/dashboard';
import { useAuth } from '../context/AuthContext';

const KPI_CONFIG = {
  fleet_manager: [
    { key: 'active_vehicles', label: 'Active Vehicles', icon: '🚛', color: '#3b82f6' },
    { key: 'available_vehicles', label: 'Available Vehicles', icon: '✅', color: '#22c55e' },
    { key: 'vehicles_in_maintenance', label: 'In Maintenance', icon: '🔧', color: '#f59e0b' },
    { key: 'active_trips', label: 'Active Trips', icon: '🗺️', color: '#8b5cf6' },
    { key: 'pending_trips', label: 'Pending Trips', icon: '⏳', color: '#ec4899' },
    { key: 'drivers_on_duty', label: 'Drivers On Duty', icon: '👤', color: '#06b6d4' },
    { key: 'fleet_utilization_percent', label: 'Fleet Utilization', icon: '📊', color: '#10b981', suffix: '%' },
  ],
  driver: [
    { key: 'active_trips', label: 'Active Trips', icon: '🗺️', color: '#8b5cf6' },
    { key: 'pending_trips', label: 'Pending Trips', icon: '⏳', color: '#ec4899' },
  ],
  safety_officer: [
    { key: 'active_vehicles', label: 'Active Vehicles', icon: '🚛', color: '#3b82f6' },
    { key: 'vehicles_in_maintenance', label: 'In Maintenance', icon: '🔧', color: '#f59e0b' },
    { key: 'drivers_on_duty', label: 'Drivers On Duty', icon: '👤', color: '#06b6d4' },
    { key: 'active_trips', label: 'Active Trips', icon: '🗺️', color: '#8b5cf6' },
  ],
  financial_analyst: [
    { key: 'active_vehicles', label: 'Active Vehicles', icon: '🚛', color: '#3b82f6' },
    { key: 'fleet_utilization_percent', label: 'Fleet Utilization', icon: '📊', color: '#10b981', suffix: '%' },
    { key: 'active_trips', label: 'Active Trips', icon: '🗺️', color: '#8b5cf6' },
  ],
};

export default function Dashboard() {
  const { role } = useAuth();
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ vehicle_type: '', vehicle_status: '', region: '' });

  const fetchKpis = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.vehicle_type) params.vehicle_type = filters.vehicle_type;
      if (filters.vehicle_status) params.vehicle_status = filters.vehicle_status;
      if (filters.region) params.region = filters.region;
      const res = await getKpis(params);
      setKpis(res.data);
    } catch {
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKpis();
  }, []);

  const cards = KPI_CONFIG[role] || KPI_CONFIG.fleet_manager;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <button className="btn btn-secondary" onClick={fetchKpis}>↻ Refresh</button>
      </div>

      {/* Filters — only for fleet_manager */}
      {role === 'fleet_manager' && (
        <div className="filter-bar">
          <select
            className="form-select"
            value={filters.vehicle_type}
            onChange={(e) => setFilters({ ...filters, vehicle_type: e.target.value })}
          >
            <option value="">All Types</option>
            <option value="Truck">Truck</option>
            <option value="Van">Van</option>
            <option value="Bus">Bus</option>
            <option value="Car">Car</option>
          </select>
          <select
            className="form-select"
            value={filters.vehicle_status}
            onChange={(e) => setFilters({ ...filters, vehicle_status: e.target.value })}
          >
            <option value="">All Statuses</option>
            <option value="Available">Available</option>
            <option value="On Trip">On Trip</option>
            <option value="In Shop">In Shop</option>
            <option value="Retired">Retired</option>
          </select>
          <input
            className="form-input"
            placeholder="Region..."
            value={filters.region}
            onChange={(e) => setFilters({ ...filters, region: e.target.value })}
          />
          <button className="btn btn-primary" onClick={fetchKpis}>Apply</button>
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <div className="kpi-grid">
          {cards.map(({ key, label, icon, color, suffix }) => (
            <div key={key} className="kpi-card" style={{ '--card-color': color }}>
              <div className="kpi-icon">{icon}</div>
              <div className="kpi-body">
                <p className="kpi-label">{label}</p>
                <p className="kpi-value">
                  {kpis?.[key] ?? '—'}
                  {suffix && <span className="kpi-suffix">{suffix}</span>}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
