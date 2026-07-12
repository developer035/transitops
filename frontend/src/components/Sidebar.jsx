import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Role-based nav items
const NAV_ITEMS = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: '📊',
    roles: ['fleet_manager', 'driver', 'safety_officer', 'financial_analyst'],
  },
  {
    label: 'Vehicles',
    path: '/vehicles',
    icon: '🚛',
    roles: ['fleet_manager', 'safety_officer', 'financial_analyst'],
  },
  {
    label: 'Drivers',
    path: '/drivers',
    icon: '👤',
    roles: ['fleet_manager', 'driver', 'safety_officer', 'financial_analyst'],
  },
  {
    label: 'Trips',
    path: '/trips',
    icon: '🗺️',
    roles: ['fleet_manager', 'driver', 'safety_officer', 'financial_analyst'],
  },
  {
    label: 'Maintenance',
    path: '/maintenance',
    icon: '🔧',
    roles: ['fleet_manager', 'safety_officer', 'financial_analyst'],
  },
  {
    label: 'Fuel & Expenses',
    path: '/expenses',
    icon: '⛽',
    roles: ['fleet_manager', 'driver', 'safety_officer', 'financial_analyst'],
  },
  {
    label: 'Reports',
    path: '/reports',
    icon: '📈',
    roles: ['fleet_manager', 'safety_officer', 'financial_analyst'],
  },
];

const ROLE_LABELS = {
  fleet_manager: 'Fleet Manager',
  driver: 'Driver',
  safety_officer: 'Safety Officer',
  financial_analyst: 'Financial Analyst',
};

export default function Sidebar() {
  const { role, userInfo, logout } = useAuth();
  const navigate = useNavigate();

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <span className="logo-icon">🚌</span>
          <span className="logo-text">TransitOps</span>
        </div>
      </div>

      <div className="sidebar-user">
        <div className="user-avatar">{(userInfo?.name || 'U')[0].toUpperCase()}</div>
        <div className="user-info">
          <p className="user-name">{userInfo?.name || userInfo?.email || 'User'}</p>
          <span className="role-badge">{ROLE_LABELS[role] || role}</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {visibleItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `nav-link ${isActive ? 'nav-link-active' : ''}`
            }
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="logout-btn" onClick={handleLogout}>
          <span>🚪</span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
