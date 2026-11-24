import { NavLink, Outlet } from 'react-router-dom';
import { USE_MOCK } from '../api/index.js';

const links = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/pos', label: 'Point of Sale' },
  { to: '/inventory', label: 'Inventory' },
  { to: '/sales', label: 'Sales History' },
];

export default function Layout() {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">MP</span>
          <div>
            <strong>MotoParts</strong>
            <small>POS &amp; Inventory</small>
          </div>
        </div>
        <nav>
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          {USE_MOCK ? (
            <span className="pill warn" title="Data is stored only in this browser">
              Demo data (browser)
            </span>
          ) : (
            <span className="pill ok">Connected to API</span>
          )}
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}