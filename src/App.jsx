import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { HRProvider, useHR } from './context/HRContext'
import Layout from './components/Layout'
import HRDashboard from './pages/hr/HRDashboard'
import Employees from './pages/hr/Employees'
import Attendance from './pages/hr/Attendance'
import Leaves from './pages/hr/Leaves'
import Payroll from './pages/hr/Payroll'
import Pickups from './pages/hr/Pickups'

function RoleSwitcher() {
  const { role, setRole } = useHR()
  return (
    <select className="role-switch" value={role} onChange={(e) => setRole(e.target.value)} title="当前角色（工资数据权限控制）">
      <option value="admin">管理员</option>
      <option value="finance">财务</option>
      <option value="hr">人事</option>
      <option value="employee">普通员工</option>
    </select>
  )
}

export default function App() {
  return (
    <HRProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout footer={<RoleSwitcher />} />}>
            <Route path="/" element={<Navigate to="/hr" replace />} />
            <Route path="/hr" element={<HRDashboard />} />
            <Route path="/hr/employees" element={<Employees />} />
            <Route path="/hr/attendance" element={<Attendance />} />
            <Route path="/hr/leaves" element={<Leaves />} />
            <Route path="/hr/payroll" element={<Payroll />} />
            <Route path="/hr/pickups" element={<Pickups />} />
            <Route path="*" element={<Navigate to="/hr" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </HRProvider>
  )
}
