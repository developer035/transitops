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
          const roi = (0 - totalOps) / acqCost;

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

  const handlePrintPdf = () => {
    window.print();
  };

  // SVG Chart Config
  const utilization = kpis?.fleet_utilization_percent || 0;
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (utilization / 100) * circumference;

  // Find max cost to scale the bar chart
  const maxCost = analytics.length > 0 ? Math.max(...analytics.map(v => v.total_operational_cost), 1000) : 1000;

  return (
    <div className="page print-section">
      <div className="page-header no-print">
        <h1 className="page-title">Reports & Analytics</h1>
        <div className="button-group">
          <button className="btn btn-secondary" onClick={handlePrintPdf}>
            📄 Print PDF Report
          </button>
          <button className="btn btn-primary" onClick={handleExportCsv} disabled={exporting}>
            {exporting ? 'Exporting...' : '⬇ Export CSV'}
          </button>
        </div>
      </div>

      <div className="print-header-only">
        <h1>TransitOps Fleet Analytics & Reports</h1>
        <p>Generated on: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
      </div>

      {error && <div className="alert alert-error no-print">{error}</div>}

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
          {/* Charts Row */}
          <div className="charts-row">
            {/* Utilization Gauge */}
            <div className="chart-card">
              <h3 className="chart-title">Fleet Utilization</h3>
              <div className="utilization-gauge-container">
                <svg className="gauge-svg" width="160" height="160" viewBox="0 0 120 120">
                  <circle className="gauge-bg" cx="60" cy="60" r={radius} strokeWidth="10" fill="transparent" />
                  <circle 
                    className="gauge-progress" 
                    cx="60" 
                    cy="60" 
                    r={radius} 
                    strokeWidth="10" 
                    fill="transparent" 
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                  />
                  <text className="gauge-text" x="50%" y="50%" dominantBaseline="middle" textAnchor="middle">
                    {Math.round(utilization)}%
                  </text>
                </svg>
                <div className="gauge-legend">
                  <span className="legend-label">Utilization Rate</span>
                </div>
              </div>
            </div>

            {/* Operational Cost Bar Chart */}
            <div className="chart-card flex-1">
              <h3 className="chart-title">Operational Cost Breakdown (₹)</h3>
              <div className="bar-chart-container">
                {analytics.slice(0, 6).map((v) => {
                  const fuelPercent = (v.total_fuel_cost / maxCost) * 100;
                  const otherPercent = (v.total_other_expenses / maxCost) * 100;
                  return (
                    <div className="bar-row" key={v._id}>
                      <div className="bar-label">{v.registration_number}</div>
                      <div className="bar-wrapper">
                        <div className="bar-fill-fuel" style={{ width: `${fuelPercent}%` }} title={`Fuel: ₹${v.total_fuel_cost}`} />
                        <div className="bar-fill-other" style={{ width: `${otherPercent}%` }} title={`Other: ₹${v.total_other_expenses}`} />
                        <span className="bar-value">₹{v.total_operational_cost.toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })}
                <div className="chart-legend">
                  <div className="legend-item"><span className="legend-dot fuel-dot" /> Fuel</div>
                  <div className="legend-item"><span className="legend-dot other-dot" /> Expenses</div>
                </div>
              </div>
            </div>
          </div>

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
                      <span className={parseFloat(v.roi) >= 0 ? 'text-success' : 'text-danger'}>
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
