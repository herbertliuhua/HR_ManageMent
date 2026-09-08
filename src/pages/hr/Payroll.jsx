import { useState, useMemo } from 'react'
import { useHR } from '../../context/HRContext'
import Modal from '../../components/Modal'
import { fmtIDR, fmtCNY } from '../../hr/calc'
import { exportPayrollCost } from '../../hr/excel'

const curPeriod = () => new Date().toISOString().slice(0, 7)

export default function Payroll() {
  const { role, employees, payrolls, attendance, leaves, attendanceSetting, runPayroll, deletePayroll } = useHR()
  const [period, setPeriod] = useState(curPeriod())
  const [runOpen, setRunOpen] = useState(false)
  const [slip, setSlip] = useState(null)
  const [report, setReport] = useState({ range: 'year', dept: 'all', empId: 'all' })

  // 工资数据权限：仅管理员/财务/人事可查看
  if (!['admin', 'finance', 'hr'].includes(role)) {
    return (
      <div className="page">
        <div className="card" style={{ textAlign: 'center', padding: 60 }}>
          <p style={{ fontSize: 40, margin: 0 }}>🔒</p>
          <h2>工资数据受限</h2>
          <p className="muted">仅指定人员（管理员 / 财务 / 人事）可查看薪酬数据。</p>
        </div>
      </div>
    )
  }

  const monthRecords = payrolls.filter((p) => p.period === period)
  const actives = employees.filter((e) => e.status === 'active')

  /* ---------- 成本汇总（月/季/半年/年，按部门/人员） ---------- */
  const costRows = useMemo(() => {
    const now = new Date()
    const periods = []
    if (report.range === 'month') periods.push(period)
    else {
      const months = { quarter: 3, half: 6, year: 12 }[report.range]
      for (let i = 0; i < months; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        periods.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
      }
    }
    const rows = actives
      .filter((e) => (report.dept === 'all' || e.department === report.dept) && (report.empId === 'all' || e.id === Number(report.empId)))
      .map((e) => {
        const recs = payrolls.filter((p) => p.employeeId === e.id && periods.includes(p.period))
        const sum = (k) => recs.reduce((s, r) => s + (r[k] || 0), 0)
        return {
          empNo: e.empNo, name: e.name, department: e.department, periods: periods.join(', '),
          gross: sum('gross'), bpjsEmployee: sum('bpjsEmployee'), pph21: sum('pph21'),
          netPay: sum('netPay'), bpjsCompany: sum('bpjsCompany'),
          thr: recs.reduce((s, r) => s + (r.items?.thr || 0), 0),
          pkwtComp: recs.reduce((s, r) => s + (r.items?.pkwtComp || 0), 0),
          companyCost: sum('companyCost'),
          cnyBase: recs.reduce((s, r) => s + (r.cny?.base || 0), 0),
          cnyAllow: recs.reduce((s, r) => s + (r.cny?.fixedAllow || 0), 0),
          cnySocial: recs.reduce((s, r) => s + (r.cny?.socialEmployee || 0), 0),
        }
      })
    return rows
  }, [report, period, payrolls, actives])

  const reportTotal = (k) => costRows.reduce((s, r) => s + (r[k] || 0), 0)

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>薪酬管理</h1>
          <p className="muted">BPJS · PPh21 个税 · THR · PKWT 补偿 · Gross/Net/Gross-up · 中印双币种 · 自动算薪</p>
        </div>
        <button className="btn primary" onClick={() => setRunOpen(true)}>⚙️ 核算 {period} 工资</button>
      </header>

      <div className="card">
        <div className="card-title-row">
          <h2>月度工资表</h2>
          <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
        </div>
        <table>
          <thead>
            <tr>
              <th>工号</th><th>姓名</th><th>部门</th><th>计税方式</th><th>应发 IDR</th>
              <th>个人BPJS</th><th>PPh21</th><th>实发 IDR</th><th>公司成本 IDR</th><th>中方(CNY)</th><th className="actions-col">操作</th>
            </tr>
          </thead>
          <tbody>
            {monthRecords.map((p) => (
              <tr key={p.id}>
                <td className="mono">{p.empNo}</td><td>{p.empName}</td><td>{p.department}</td>
                <td>{p.salaryType === 'net' ? 'Net' : p.salaryType === 'grossup' ? 'Gross-up' : 'Gross'}</td>
                <td>{fmtIDR(p.gross)}</td><td>{fmtIDR(p.bpjsEmployee)}</td><td>{fmtIDR(p.pph21)}</td>
                <td><strong>{fmtIDR(p.netPay)}</strong></td><td>{fmtIDR(p.companyCost)}</td>
                <td>{p.cny?.base ? fmtCNY(p.cny.net) : '—'}</td>
                <td className="actions-col">
                  <button className="btn small" onClick={() => setSlip(p)}>工资条</button>
                  <button className="btn small danger" onClick={() => { if (window.confirm('删除该月工资记录？')) deletePayroll(p.id) }}>删除</button>
                </td>
              </tr>
            ))}
            {monthRecords.length === 0 && <tr><td colSpan="11" className="empty">该月尚未核算工资，点击右上角「核算工资」</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="card-title-row">
          <h2>人工成本汇总</h2>
          <div className="toolbar" style={{ margin: 0 }}>
            <select value={report.range} onChange={(e) => setReport({ ...report, range: e.target.value })}>
              <option value="month">本月</option><option value="quarter">季度</option>
              <option value="half">半年</option><option value="year">年度</option>
            </select>
            <select value={report.dept} onChange={(e) => setReport({ ...report, dept: e.target.value })}>
              <option value="all">全部部门</option>
              {[...new Set(actives.map((e) => e.department))].map((d) => <option key={d}>{d}</option>)}
            </select>
            <select value={report.empId} onChange={(e) => setReport({ ...report, empId: e.target.value })}>
              <option value="all">全部人员</option>
              {actives.filter((e) => report.dept === 'all' || e.department === report.dept).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <button className="btn" onClick={() => exportPayrollCost(costRows, `${report.range}_${new Date().toISOString().slice(0, 7)}`)}>📤 导出汇总表</button>
          </div>
        </div>
        <table>
          <thead>
            <tr><th>姓名</th><th>应发合计</th><th>个人BPJS</th><th>PPh21</th><th>公司BPJS</th><th>THR</th><th>公司总成本(IDR)</th><th>中方社保(CNY)</th></tr>
          </thead>
          <tbody>
            {costRows.map((r) => (
              <tr key={r.empNo}>
                <td>{r.name}</td><td>{fmtIDR(r.gross)}</td><td>{fmtIDR(r.bpjsEmployee)}</td>
                <td>{fmtIDR(r.pph21)}</td><td>{fmtIDR(r.bpjsCompany)}</td><td>{fmtIDR(r.thr)}</td>
                <td><strong>{fmtIDR(r.companyCost)}</strong></td>
                <td>{r.cnyBase ? fmtCNY(r.cnySocial) : '—'}</td>
              </tr>
            ))}
            {costRows.length === 0 && <tr><td colSpan="8" className="empty">所选范围暂无工资数据</td></tr>}
          </tbody>
          {costRows.length > 0 && (
            <tfoot>
              <tr style={{ fontWeight: 700, background: '#f8fafd' }}>
                <td>合计</td><td>{fmtIDR(reportTotal('gross'))}</td><td>{fmtIDR(reportTotal('bpjsEmployee'))}</td>
                <td>{fmtIDR(reportTotal('pph21'))}</td><td>{fmtIDR(reportTotal('bpjsCompany'))}</td>
                <td>{fmtIDR(reportTotal('thr'))}</td><td>{fmtIDR(reportTotal('companyCost'))}</td>
                <td>{fmtCNY(costRows.reduce((s, r) => s + r.cnySocial, 0))}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {runOpen && <RunPayroll period={period} onClose={() => setRunOpen(false)} onRun={(extras) => { runPayroll(period, extras); setRunOpen(false) }} />}
      {slip && <Payslip slip={slip} employees={employees} onClose={() => setSlip(null)} />}
    </div>
  )
}

function RunPayroll({ period, onClose, onRun }) {
  const { employees, attendance, leaves, attendanceSetting } = useHR()
  const actives = employees.filter((e) => e.status === 'active')
  const [extras, setExtras] = useState(() =>
    Object.fromEntries(actives.map((e) => [e.id, { variableAllow: 0, overtimePay: 0, bonus: 0, otherDeduction: 0, thr: false, pkwtComp: 0 }]))
  )
  const set = (id, k, v) => setExtras((x) => ({ ...x, [id]: { ...x[id], [k]: v } }))

  return (
    <Modal title={`核算工资 - ${period}`} onClose={onClose} width={860}>
      <p className="muted">基本工资、固定津贴、BPJS、PPh21 自动计算；以下为非固定/调整项（缺勤与无薪假已自动按比例折算）：</p>
      <table>
        <thead>
          <tr><th>员工</th><th>非固定津贴</th><th>加班费</th><th>奖金/提成</th><th>补发/调整</th><th>扣款</th><th>THR</th><th>PKWT补偿</th></tr>
        </thead>
        <tbody>
          {actives.map((e) => {
            const x = extras[e.id]
            return (
              <tr key={e.id}>
                <td>{e.name}<div className="muted" style={{ fontSize: 12 }}>
                  出勤{leaves && attendance.filter((r) => r.employeeId === e.id && r.date?.startsWith(period) && ['normal', 'late', 'early', 'overtime'].includes(r.status)).length}天
                </div></td>
                <td><input type="number" value={x.variableAllow} onChange={(ev) => set(e.id, 'variableAllow', Number(ev.target.value))} /></td>
                <td><input type="number" value={x.overtimePay} onChange={(ev) => set(e.id, 'overtimePay', Number(ev.target.value))} /></td>
                <td><input type="number" value={x.bonus} onChange={(ev) => set(e.id, 'bonus', Number(ev.target.value))} /></td>
                <td><input type="number" value={x.pkwtComp} onChange={(ev) => set(e.id, 'pkwtComp', Number(ev.target.value))} /></td>
                <td><input type="number" value={x.otherDeduction} onChange={(ev) => set(e.id, 'otherDeduction', Number(ev.target.value))} /></td>
                <td><input type="checkbox" checked={x.thr} onChange={(ev) => set(e.id, 'thr', ev.target.checked)} /></td>
                <td className="muted" style={{ fontSize: 12 }}>{e.contractType?.startsWith('PKWT') ? '合同到期月填写' : '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="form-actions" style={{ marginTop: 14 }}>
        <button className="btn" onClick={onClose}>取消</button>
        <button className="btn primary" onClick={() => onRun(extras)}>生成工资表</button>
      </div>
    </Modal>
  )
}

function Payslip({ slip, employees, onClose }) {
  const emp = employees.find((e) => e.id === slip.employeeId)
  const rows = [
    ['基本工资（折算后）', slip.items.baseProrated],
    ['固定津贴（折算后）', slip.items.fixedAllowProrated],
    ['非固定津贴', slip.items.variableAllow],
    ['加班费', slip.items.overtimePay],
    ['奖金/提成/补贴', slip.items.bonus],
    ['THR（第十三薪）', slip.items.thr],
    ['PKWT 合同补偿金', slip.items.pkwtComp],
  ].filter(([, v]) => v)
  const deducts = [
    ['BPJS 医疗保险（个人 1%）', slip.bpjs.kesEmployee],
    ['BPJS 养老金 JHT（个人 2%）', slip.bpjs.jhtEmployee],
    ['BPJS 退休金 JP（个人 1%）', slip.bpjs.jpEmployee],
    ['PPh21 个人所得税', slip.pph21],
    ['迟到/早退扣款', slip.items.lateDeduction],
    ['其他扣款', slip.items.otherDeduction],
  ].filter(([, v]) => v)

  return (
    <Modal title={`电子工资条 - ${slip.period}`} onClose={onClose} width={560}>
      <div className="payslip">
        <h3 style={{ textAlign: 'center' }}>MyHR 工资条</h3>
        <p className="muted" style={{ textAlign: 'center' }}>{slip.empNo} · {slip.empName} · {slip.department} · {slip.period}</p>
        <table>
          <tbody>
            {rows.map(([k, v]) => <tr key={k}><td>{k}</td><td style={{ textAlign: 'right' }}>{fmtIDR(v)}</td></tr>)}
            <tr style={{ fontWeight: 700 }}><td>应发合计 Gross</td><td style={{ textAlign: 'right' }}>{fmtIDR(slip.gross + (slip.items.thr || 0) + (slip.items.pkwtComp || 0))}</td></tr>
            {deducts.map(([k, v]) => <tr key={k}><td className="muted">− {k}</td><td style={{ textAlign: 'right' }} className="muted">{fmtIDR(v)}</td></tr>)}
            <tr style={{ fontWeight: 700, fontSize: 15 }}><td>实发工资 Net</td><td style={{ textAlign: 'right', color: 'var(--primary)' }}>{fmtIDR(slip.netPay)}</td></tr>
            <tr><td className="muted">公司承担 BPJS 合计</td><td style={{ textAlign: 'right' }} className="muted">{fmtIDR(slip.bpjsCompany)}</td></tr>
            <tr><td className="muted">公司总成本</td><td style={{ textAlign: 'right' }} className="muted">{fmtIDR(slip.companyCost)}</td></tr>
          </tbody>
        </table>
        {slip.cny?.base > 0 && (
          <>
            <h4 style={{ margin: '14px 0 6px' }}>中方工资（人民币部分）</h4>
            <table>
              <tbody>
                <tr><td>基本工资</td><td style={{ textAlign: 'right' }}>{fmtCNY(slip.cny.base)}</td></tr>
                <tr><td>固定津贴</td><td style={{ textAlign: 'right' }}>{fmtCNY(slip.cny.fixedAllow)}</td></tr>
                <tr><td>社保 + 公积金（个人）</td><td style={{ textAlign: 'right' }} className="muted">− {fmtCNY(slip.cny.socialEmployee)}</td></tr>
                <tr style={{ fontWeight: 700 }}><td>中方实发 CNY</td><td style={{ textAlign: 'right' }}>{fmtCNY(slip.cny.net)}</td></tr>
              </tbody>
            </table>
          </>
        )}
        <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>计税方式：{slip.salaryType === 'net' ? '税后 Net' : slip.salaryType === 'grossup' ? 'Gross-up（公司承担个税）' : '税前 Gross'} · 出勤折算因子 {(slip.factor * 100).toFixed(0)}%</p>
      </div>
      <div className="form-actions">
        <button className="btn" onClick={onClose}>关闭</button>
        <button className="btn primary" onClick={() => window.print()}>打印 / 发送</button>
      </div>
    </Modal>
  )
}
