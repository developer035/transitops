import { useEffect, useState } from 'react';
import { exportCsv } from '../api/reports';
import { listVehicles } from '../api/vehicles';
import { getOperationalCost } from '../api/expenses';
import { getKpis } from '../api/dashboard';
import { useAuth } from '../context/AuthContext';

export default function Reports() {
  const { role } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [vRes, kRes] = await Promise.all([listVehicles(), getKpis()]);
      setVehicles(vRes.data);
      setKpis(kRes.data);

      // Client-side analytics: compute per-vehicle metrics
      const analyticsData = await Promise.all(
        vRes.data.map(async (v) => {
          let costs = { total_fuel_cost: 0, total_other_expenses: 0, total_operational_cost: 0 };
          try {
            const costRes = await getOperationalCost(v._id);
            costs = costRes.data;
          } catch { /* no data yet */ }

          const totalOps = costs.total_operational_cost || 0;
          const acqCost = v.acquisition_cost || 1;
          // ROI = (Revenue - Total Ops Cost) / Acquisition Cost
          // Revenue tracking not implemented, so Revenue = 0 for now
          const roi = (0 - totalOps) / acqCost;

          // Fuel efficiency = Odometer / Total Liters
          // We don't have total liters from the cost endpoint, so show N/A
          return {
            ...v,
            total_fuel_cost: costs.total_fuel_cost,
            total_other_expenses: costs.total_other_expenses,
            total_operational_cost: totalOps,
            roi: roi.toFixed(4),
          };
        })
      );
      setAnalytics(analyticsData);
    } catch {
      setError('Failed to load report data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const res = await exportCsv();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'fleet_report.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError('Failed to export CSV.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Reports & Analytics</h1>
        <button className="btn btn-primary" onClick={handleExportCsv} disabled={exporting}>
          {exporting ? 'Exporting...' : '⬇ Export CSV'}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Summary KPI Strip */}
      {kpis && (
        <div className="kpi-strip">
          <div className="kpi-strip-item">
            <span className="kpi-strip-label">Fleet Utilization</span>
            <span className="kpi-strip-value">{kpis.fleet_utilization_percent}%</span>
          </div>
          <div className="kpi-strip-item">
            <span className="kpi-strip-label">Active Trips</span>
            <span className="kpi-strip-value">{kpis.active_trips}</span>
          </div>
          <div className="kpi-strip-item">
            <span className="kpi-strip-label">Vehicles in Maintenance</span>
            <span className="kpi-strip-value">{kpis.vehicles_in_maintenance}</span>
          </div>
          <div className="kpi-strip-item">
            <span className="kpi-strip-label">Drivers On Duty</span>
            <span className="kpi-strip-value">{kpis.drivers_on_duty}</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <>
          <h2 className="section-title">Vehicle Analytics</h2>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Registration</th>
                  <th>Model</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Odometer (km)</th>
                  <th>Acq. Cost (₹)</th>
                  <th>Total Fuel Cost (₹)</th>
                  <th>Other Expenses (₹)</th>
                  <th>Total Ops Cost (₹)</th>
                  <th>ROI</th>
                </tr>
              </thead>
              <tbody>
                {analytics.length === 0 && (
                  <tr><td colSpan={10} className="empty-row">No vehicle data available.</td></tr>
                )}
                {analytics.map((v) => (
                  <tr key={v._id}>
                    <td><strong>{v.registration_number}</strong></td>
                    <td>{v.name_model}</td>
                    <td>{v.vehicle_type}</td>
                    <td>{v.status}</td>
                    <td>{v.odometer?.toLocaleString()}</td>
                    <td>{v.acquisition_cost?.toLocaleString()}</td>
                    <td>{v.total_fuel_cost?.toLocaleString()}</td>
                    <td>{v.total_other_expenses?.toLocaleString()}</td>
                    <td><strong>{v.total_operational_cost?.toLocaleString()}</strong></td>
                    <td>
                      <span className={v.roi >= 0 ? 'text-success' : 'text-danger'}>
                        {v.roi}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
