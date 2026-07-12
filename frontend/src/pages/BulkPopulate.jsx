import { useState, useEffect } from 'react';
import { bulkPopulate, getCollectionCounts } from '../api/admin';

const COLLECTIONS = [
  {
    key: 'vehicles',
    label: 'Vehicles',
    icon: '🚛',
    description: 'registration_number, name_model, vehicle_type, max_load_capacity, odometer, acquisition_cost, region, status',
    order: 1,
    note: 'Insert FIRST — other collections reference vehicle _id',
    noteType: 'critical',
  },
  {
    key: 'drivers',
    label: 'Drivers',
    icon: '👤',
    description: 'name, license_number, license_category, license_expiry_date, contact_number, safety_score, status',
    order: 2,
    note: 'Insert SECOND — trips and users reference driver _id',
    noteType: 'critical',
  },
  {
    key: 'maintenance_logs',
    label: 'Maintenance Logs',
    icon: '🔧',
    description: 'vehicle_id, description, cost, date, status',
    order: 3,
    note: 'Replace REPLACE_WITH_VEHICLE_ID_X placeholders before uploading',
    noteType: 'warning',
  },
  {
    key: 'fuel_logs',
    label: 'Fuel Logs',
    icon: '⛽',
    description: 'vehicle_id, liters, cost, date',
    order: 4,
    note: 'Replace REPLACE_WITH_VEHICLE_ID_X placeholders before uploading',
    noteType: 'warning',
  },
  {
    key: 'expenses',
    label: 'Expenses',
    icon: '💸',
    description: 'vehicle_id, expense_type (Toll/Maintenance/Other), cost, date',
    order: 5,
    note: 'Replace REPLACE_WITH_VEHICLE_ID_X placeholders before uploading',
    noteType: 'warning',
  },
  {
    key: 'trips',
    label: 'Trips',
    icon: '🗺️',
    description: 'source, destination, vehicle_id, driver_id, cargo_weight, planned_distance, status',
    order: 6,
    note: 'Replace BOTH vehicle_id AND driver_id placeholders before uploading',
    noteType: 'warning',
  },
  {
    key: 'users',
    label: 'Users',
    icon: '👥',
    description: 'firebase_uid, email, name, role, driver_id',
    order: 7,
    note: 'Use the User Manager page to set firebase_uid after creating accounts in Firebase Console',
    noteType: 'info',
  },
];

function CollectionCard({ collection, dbCount, onRefreshCounts }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null); // { count, records }
  const [status, setStatus] = useState(null);   // { type: 'success'|'error', message }
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setStatus(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target.result);
        if (!Array.isArray(parsed)) {
          setStatus({ type: 'error', message: 'JSON must be an array of objects.' });
          setPreview(null);
          setFile(null);
          return;
        }
        setPreview({ count: parsed.length, records: parsed });
      } catch {
        setStatus({ type: 'error', message: 'Invalid JSON file.' });
        setPreview(null);
        setFile(null);
      }
    };
    reader.readAsText(f);
  };

  const handleUpload = async () => {
    if (!preview) return;
    setUploading(true);
    setStatus(null);
    try {
      const res = await bulkPopulate(collection.key, preview.records);
      setStatus({
        type: 'success',
        message: `✅ Inserted ${res.data.inserted} document${res.data.inserted !== 1 ? 's' : ''} into "${collection.key}"`,
      });
      setFile(null);
      setPreview(null);
      onRefreshCounts();
    } catch (err) {
      const detail = err.response?.data?.detail || err.message;
      setStatus({ type: 'error', message: `❌ ${detail}` });
    } finally {
      setUploading(false);
    }
  };

  const noteColors = {
    critical: { bg: '#fef2f2', border: '#fca5a5', text: '#b91c1c' },
    warning:  { bg: '#fffbeb', border: '#fcd34d', text: '#92400e' },
    info:     { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af' },
  };
  const nc = noteColors[collection.noteType];

  return (
    <div className="bp-card">
      <div className="bp-card-header">
        <div className="bp-card-title">
          <span className="bp-icon">{collection.icon}</span>
          <div>
            <h3 className="bp-name">{collection.label}</h3>
            <span className="bp-order">Step {collection.order}</span>
          </div>
        </div>
        <div className="bp-count-badge">
          <span className="bp-count-num">{dbCount ?? '…'}</span>
          <span className="bp-count-label">in DB</span>
        </div>
      </div>

      <p className="bp-fields">{collection.description}</p>

      <div className="bp-note" style={{ background: nc.bg, borderColor: nc.border, color: nc.text }}>
        {collection.note}
      </div>

      <div className="bp-upload-area">
        <label className="bp-file-label" htmlFor={`file-${collection.key}`}>
          {file ? `📄 ${file.name}` : '📁 Choose JSON file…'}
        </label>
        <input
          id={`file-${collection.key}`}
          type="file"
          accept=".json"
          className="bp-file-input"
          onChange={handleFileChange}
        />
      </div>

      {preview && (
        <div className="bp-preview">
          <span className="bp-preview-count">{preview.count} record{preview.count !== 1 ? 's' : ''} ready to insert</span>
          <details className="bp-preview-details">
            <summary>Preview first record</summary>
            <pre className="bp-preview-json">{JSON.stringify(preview.records[0], null, 2)}</pre>
          </details>
        </div>
      )}

      {status && (
        <div className={`alert ${status.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          {status.message}
        </div>
      )}

      <button
        className="btn btn-primary btn-full"
        disabled={!preview || uploading}
        onClick={handleUpload}
      >
        {uploading ? 'Inserting…' : `Insert into ${collection.key}`}
      </button>
    </div>
  );
}

export default function BulkPopulate() {
  const [counts, setCounts] = useState({});
  const [loadingCounts, setLoadingCounts] = useState(true);

  const fetchCounts = async () => {
    try {
      const res = await getCollectionCounts();
      setCounts(res.data);
    } catch {
      setCounts({});
    } finally {
      setLoadingCounts(false);
    }
  };

  useEffect(() => { fetchCounts(); }, []);

  return (
    <div className="bp-page">
      <div className="bp-page-header">
        <div>
          <h1 className="bp-title">🗃️ Bulk Data Populate</h1>
          <p className="bp-subtitle">Dev tool — upload JSON arrays to populate MongoDB collections. No auth required.</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchCounts}>↻ Refresh Counts</button>
      </div>

      <div className="bp-warning-banner">
        ⚠️ <strong>Insert in order:</strong> Vehicles → Drivers → Maintenance/Fuel/Expenses → Trips → Users.
        Collections reference each other by MongoDB <code>_id</code>.
      </div>

      <div className="bp-grid">
        {COLLECTIONS.map((col) => (
          <CollectionCard
            key={col.key}
            collection={col}
            dbCount={loadingCounts ? null : counts[col.key]}
            onRefreshCounts={fetchCounts}
          />
        ))}
      </div>
    </div>
  );
}
