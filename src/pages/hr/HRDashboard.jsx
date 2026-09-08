import { Link } from 'react-router-dom'
import { useHR } from '../../context/HRContext'
import { computeReminders, fmtDate } from '../../hr/calc'

export default function HRDashboard() {
  const { employees, leaves, payrolls } = useHR()
  const reminders = computeReminders(employees)
  const active = employees.filter((e) => e.status === 'active')
  const pendingLeaves = leaves.filter((l) => l.status === 'pending')

  const groups = [
    { label: '紧急（30天内/已过期）', level: 'danger', items: reminders.filter((r) => r.level === 'danger') },
    { label: '预警（31-60天）', level: 'warn', items: reminders.filter((r) => r.level === 'warn') },
    { label: '提醒（61-90天/近期）', level: 'info', items: reminders.filter((r) => r.level === 'info') },
  ]

  const stats = [
    { label: '在职员工', value: active.length, sub: `离职 ${employees.length - active.length} 人` },
    { label: '待处理提醒', value: reminders.length, sub: `紧急 ${reminders.filter((r) => r.level === 'danger').length} 项` },
    { label: '待批请假', value: pendingLeaves.length, sub: '需要审批' },
    { label: '已发薪资月数', value: new Set(payrolls.map((p) => p.period)).size, sub: '薪酬核算记录' },
  ]

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>人事工作台</h1>
          <p className="muted">生日 · 合同 · 试用期 · 证件（护照/签证/ITAS/RPTKA/SKTT）· 退休自动提醒</p>
        </div>
        <Link to="/hr/employees" className="btn primary">员工档案</Link>
      </header>

      <div className="stat-grid">
        {stats.map((s) => (
          <div className="card stat-card" key={s.label}>
            <span className="stat-label">{s.label}</span>
            <span className="stat-value">{s.value}</span>
            <span className="stat-sub muted">{s.sub}</span>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-title-row">
          <h2>自动提醒</h2>
          <span className="muted">证件到期按 30 / 60 / 90 天分级预警</span>
        </div>
        {reminders.length === 0 ? (
          <p className="empty">暂无待处理提醒 🎉</p>
        ) : (
          groups.map((g) =>
            g.items.length === 0 ? null : (
              <div key={g.level} style={{ marginBottom: 14 }}>
                <h3 className="reminder-group-title">
                  <span className={`badge ${g.level === 'danger' ? 'danger' : g.level === 'warn' ? 'warn' : 'ok'}`}>
                    {g.label}
                  </span>
                </h3>
                <table>
                  <tbody>
                    {g.items.map((r, i) => (
                      <tr key={i}>
                        <td style={{ width: 120 }}><span className={`badge ${r.level === 'danger' ? 'danger' : r.level === 'warn' ? 'warn' : 'muted'}`}>{r.type}</span></td>
                        <td>{r.emp.empNo} · {r.emp.name}（{r.emp.department}）</td>
                        <td>{r.text}</td>
                        <td className="muted">{r.date ? fmtDate(r.date) : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )
        )}
      </div>
    </div>
  )
}
