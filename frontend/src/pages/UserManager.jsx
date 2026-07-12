import { useState, useEffect } from 'react';
import { listAdminUsers, setFirebaseUid, setUserRole, deleteAdminUser, createAdminUser } from '../api/admin';

const ROLES = ['fleet_manager', 'driver', 'safety_officer', 'financial_analyst'];

const ROLE_COLORS = {
  fleet_manager:     { bg: '#dbeafe', text: '#1e40af' },
  driver:            { bg: '#dcfce7', text: '#14532d' },
  safety_officer:    { bg: '#fef9c3', text: '#713f12' },
  financial_analyst: { bg: '#f3e8ff', text: '#581c87' },
};

const EMPTY_NEW_USER = {
  firebase_uid: '',
  email: '',
  name: '',
  role: 'fleet_manager',
  driver_id: '',
  password: '',
};

function UserRow({ user, onUpdated, onDeleted }) {
  const [editingUid, setEditingUid] = useState(false);
  const [uidInput, setUidInput] = useState(user.firebase_uid || '');
  const [editingRole, setEditingRole] = useState(false);
  const [roleInput, setRoleInput] = useState(user.role || 'driver');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const hasUid = user.firebase_uid && !user.firebase_uid.startsWith('FILL_IN');

  const saveUid = async () => {
    if (!uidInput.trim()) return;
    setSaving(true);
    setError('');
    try {
      const res = await setFirebaseUid(user._id, uidInput.trim());
      onUpdated(res.data);
      setEditingUid(false);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to update UID');
    } finally {
      setSaving(false);
    }
  };

  const saveRole = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await setUserRole(user._id, roleInput);
      onUpdated(res.data);
      setEditingRole(false);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to update role');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete user "${user.name || user.email}"?`)) return;
    try {
      await deleteAdminUser(user._id);
      onDeleted(user._id);
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to delete');
    }
  };

  const rc = ROLE_COLORS[user.role] || { bg: '#f1f5f9', text: '#475569' };

  return (
    <tr>
      <td>
        <div className="um-name">{user.name || '—'}</div>
        <div className="um-email">{user.email}</div>
      </td>
      <td>
        {editingRole ? (
          <div className="um-inline-edit">
            <select className="form-select form-select-sm" value={roleInput} onChange={(e) => setRoleInput(e.target.value)}>
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <button className="btn btn-sm btn-primary" onClick={saveRole} disabled={saving}>
              {saving ? '…' : '✓'}
            </button>
            <button className="btn btn-sm btn-secondary" onClick={() => setEditingRole(false)}>✕</button>
          </div>
        ) : (
          <span
            className="role-badge"
            style={{ background: rc.bg, color: rc.text, cursor: 'pointer' }}
            title="Click to change role"
            onClick={() => setEditingRole(true)}
          >
            {user.role}
          </span>
        )}
      </td>
      <td>
        {editingUid ? (
          <div className="um-inline-edit">
            <input
              className="form-input form-input-sm"
              value={uidInput}
              onChange={(e) => setUidInput(e.target.value)}
              placeholder="Paste Firebase UID…"
              autoFocus
            />
            <button className="btn btn-sm btn-primary" onClick={saveUid} disabled={saving || !uidInput.trim()}>
              {saving ? '…' : '✓'}
            </button>
            <button className="btn btn-sm btn-secondary" onClick={() => setEditingUid(false)}>✕</button>
          </div>
        ) : (
          <div className="um-uid-cell">
            {hasUid ? (
              <code className="um-uid-set" title={user.firebase_uid}>
                {user.firebase_uid.slice(0, 16)}…
              </code>
            ) : (
              <span className="um-uid-missing">Not set</span>
            )}
            <button className="btn btn-sm btn-secondary" onClick={() => { setUidInput(user.firebase_uid || ''); setEditingUid(true); }}>
              {hasUid ? 'Edit' : 'Set UID'}
            </button>
          </div>
        )}
      </td>
      <td>
        <code className="um-driver-id">{user.driver_id || '—'}</code>
      </td>
      <td>
        {error && <div className="um-row-error">{error}</div>}
        <button className="btn btn-sm btn-danger" onClick={handleDelete}>Delete</button>
      </td>
    </tr>
  );
}

export default function UserManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [newUser, setNewUser] = useState(EMPTY_NEW_USER);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await listAdminUsers();
      setUsers(res.data);
    } catch {
      setError('Failed to load users. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleUserUpdated = (updatedUser) => {
    setUsers((prev) => prev.map((u) => (u._id === updatedUser._id ? updatedUser : u)));
  };

  const handleUserDeleted = (id) => {
    setUsers((prev) => prev.filter((u) => u._id !== id));
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    try {
      const payload = { ...newUser };
      if (!payload.driver_id) delete payload.driver_id;
      if (!payload.firebase_uid) delete payload.firebase_uid;
      if (!payload.password) delete payload.password;
      const res = await createAdminUser(payload);
      setUsers((prev) => [...prev, res.data]);
      setNewUser(EMPTY_NEW_USER);
      setShowNewForm(false);
    } catch (e) {
      setCreateError(e.response?.data?.detail || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const noUidCount = users.filter((u) => !u.firebase_uid || u.firebase_uid.startsWith('FILL_IN')).length;

  return (
    <div className="bp-page">
      <div className="bp-page-header">
        <div>
          <h1 className="bp-title">👥 User Manager</h1>
          <p className="bp-subtitle">Dev tool — manage MongoDB user documents and set Firebase UIDs. No auth required.</p>
        </div>
        <div className="button-group">
          <button className="btn btn-secondary" onClick={fetchUsers}>↻ Refresh</button>
          <button className="btn btn-primary" onClick={() => setShowNewForm(!showNewForm)}>+ Add User</button>
        </div>
      </div>

      {noUidCount > 0 && (
        <div className="bp-warning-banner">
          ⚠️ <strong>{noUidCount} user{noUidCount > 1 ? 's' : ''}</strong> without a Firebase UID.
          Create them in <strong>Firebase Console → Authentication → Users</strong>, then paste their UID using the "Set UID" button below.
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      {/* New user form */}
      {showNewForm && (
        <div className="um-new-form">
          <h3 className="um-new-title">Create New User Record</h3>
          {createError && <div className="alert alert-error">{createError}</div>}
          <form onSubmit={handleCreateUser}>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input className="form-input" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input className="form-input" type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">Role *</label>
                <select className="form-select" value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Password <span className="um-optional">(optional — if set, auto-registers in Firebase Auth)</span></label>
                <input className="form-input" type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} placeholder="At least 6 characters" minLength={6} />
              </div>
              <div className="form-group">
                <label className="form-label">Firebase UID <span className="um-optional">(optional — if not using password)</span></label>
                <input className="form-input" value={newUser.firebase_uid} onChange={(e) => setNewUser({ ...newUser, firebase_uid: e.target.value })} placeholder="Paste UID if already created" />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Driver ID <span className="um-optional">(MongoDB _id of driver doc — drivers only)</span></label>
                <input className="form-input" value={newUser.driver_id} onChange={(e) => setNewUser({ ...newUser, driver_id: e.target.value })} placeholder="Leave blank for non-drivers" />
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowNewForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={creating}>{creating ? 'Creating…' : 'Create User'}</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name / Email</th>
                <th>Role <span className="um-hint">(click to change)</span></th>
                <th>Firebase UID</th>
                <th>Driver ID</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty-row">
                    No users yet. Upload users.json via Bulk Populate, or click "+ Add User" above.
                  </td>
                </tr>
              )}
              {users.map((u) => (
                <UserRow
                  key={u._id}
                  user={u}
                  onUpdated={handleUserUpdated}
                  onDeleted={handleUserDeleted}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="um-guide">
        <h3>How to get Firebase UIDs</h3>
        <ol>
          <li>Go to <strong>Firebase Console → Authentication → Users</strong></li>
          <li>Click <strong>Add User</strong> → enter email + password for each person</li>
          <li>Click the user → copy the <strong>User UID</strong> shown in the side panel</li>
          <li>Come back here and click <strong>"Set UID"</strong> next to their name → paste the UID → ✓</li>
        </ol>
      </div>
    </div>
  );
}
