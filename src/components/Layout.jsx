import { NavLink, Outlet } from 'react-router-dom'

const hrNav = [
  { to: '/hr', label: '人事工作台', icon: '🗂️', end: true },
  { to: '/hr/employees', label: '员工档案', icon: '👤' },
  { to: '/hr/attendance', label: '考勤管理', icon: '🕐' },
  { to: '/hr/leaves', label: '请假管理', icon: '🏖️' },
  { to: '/hr/payroll', label: '薪酬管理', icon: '💰' },
  { to: '/hr/pickups', label: '接送机', icon: '✈️' },
]

export default function Layout({ footer }) {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-logo">H</span>
          <span className="brand-name">MyHR</span>
        </div>
        <nav>
          {hrNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          {footer}
          <div style={{ marginTop: 8 }}>人事管理系统 v0.2</div>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
