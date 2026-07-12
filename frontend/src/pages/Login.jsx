import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROLE_OPTIONS = [
  { key: 'fleet_manager',     label: 'Fleet Manager',     icon: '🚛', color: '#2563eb' },
  { key: 'driver',            label: 'Driver',            icon: '👤', color: '#16a34a' },
  { key: 'safety_officer',    label: 'Safety Officer',    icon: '🛡️', color: '#d97706' },
  { key: 'financial_analyst', label: 'Financial Analyst', icon: '📊', color: '#7c3aed' },
];

export default function Login() {
  const [selectedRole, setSelectedRole] = useState('fleet_manager');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      switch (err.code) {
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
        case 'auth/user-not-found':
          setError('Invalid email or password.');
          break;
        case 'auth/too-many-requests':
          setError('Too many failed attempts. Please try again later.');
          break;
        case 'auth/network-request-failed':
          setError('Network error. Check your connection.');
          break;
        default:
          setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const activeRole = ROLE_OPTIONS.find((r) => r.key === selectedRole);

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">🚌</div>
          <h1 className="login-title">TransitOps</h1>
          <p className="login-subtitle">Smart Transport Operations Platform</p>
        </div>

        {/* Role Selector */}
        <div className="role-selector">
          <p className="role-selector-label">Sign in as</p>
          <div className="role-grid">
            {ROLE_OPTIONS.map((r) => (
              <button
                key={r.key}
                type="button"
                className={`role-btn ${selectedRole === r.key ? 'role-btn-active' : ''}`}
                style={selectedRole === r.key ? { '--role-color': r.color } : {}}
                onClick={() => setSelectedRole(r.key)}
              >
                <span className="role-btn-icon">{r.icon}</span>
                <span className="role-btn-label">{r.label}</span>
              </button>
            ))}
          </div>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder={`${activeRole?.label} email`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading}
            style={{ background: activeRole?.color }}
          >
            {loading ? 'Signing in...' : `Sign In as ${activeRole?.label}`}
          </button>
        </form>

        <p className="login-note">
          Access is provided by your administrator.
        </p>
      </div>
    </div>
  );
}

