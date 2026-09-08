import { useState } from 'react'
import { useHR } from '../../context/HRContext'
import { attendanceSummary } from '../../hr/calc'
import { exportAttendanceSummary } from '../../hr/excel'

const STATUS_LABELS = { normal: '正常', late: '迟到', early: '早退', absent: '缺勤', overtime: '加班', travel: '出差' }
const curPeriod = () => new Date().toISOString().slice(0, 7)

export default function Attendance() {
  const { employees, attendance, leaves, checkIn, checkOut, saveAttendance, deleteAttendance, attendanceSetting, setAttendanceSetting } = useHR()
  const [period, setPeriod] = useState(curPeriod())
  const [empId, setEmpId] = useState(employees[0]?.id || '')
  const [editing, setEditing] = useState(null)
  const actives = employees.filter((e) => e.status === 'active')

  const monthRecs = attendance
    .filter((r) => r.date?.startsWith(period))
    .sort((a, b) => b.date.localeCompare(a.date) || (b.checkIn || '').localeCompare(a.checkIn || ''))

  const summaryRows = actives.map((e) => ({
    empNo: e.empNo, name: e.name, department: e.department,
    summary: attendanceSummary(attendance, leaves, e.id, period, attendanceSetting.expectedDays),
  }))

  const todayStr = new Date().toISOString().slice(0, 10)
  const myToday = attendance.find((r) => r.employeeId === Number(empId) && r.date === todayStr)

  const blankRec = { employeeId: Number(empId) || actives[0]?.id, date: todayStr, checkIn: '', checkOut: '', status: 'normal', overtimeHours: 0, note: '' }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>考勤管理</h1>
          <p className="muted">打卡 · 迟到/早退/缺勤/加班/出差 · 月度汇总与薪酬联动</p>
        </div>
        <button className="btn primary" onClick={() => setEditing(blankRec)}>+ 手工补录</button>
      </header>

      <div className="card punch-card">
        <div className="punch-row">
          <label>员工
            <select value={empId} onChange={(e) => setEmpId(e.target.value)}>
              {actives.map((e) => <option key={e.id} value={e.id}>{e.empNo} {e.name}</option>)}
            </select>
          </label>
          <button className="btn primary" disabled={!!myToday} onClick={() => checkIn(Number(empId))}>
            {myToday ? `已签到 ${myToday.checkIn}` : '上班打卡'}
          </button>
          <button className="btn" disabled={!myToday || !!myToday.checkOut} onClick={() => checkOut(Number(empId))}>
            {myToday?.checkOut ? `已签退 ${myToday.checkOut}` : '下班打卡'}
          </button>
          <label className="muted">应出勤天数/月
            <input type="number" min="1" style={{ width: 80 }} value={attendanceSetting.expectedDays}
              onChange={(e) => setAttendanceSetting({ ...attendanceSetting, expectedDays: Number(e.target.value) || 22 })} />
          </label>
        </div>
        <p className="muted" style={{ margin: '8px 0 0' }}>
          支持指纹机/人脸识别机/手机定位数据按月导入补录；打卡时间晚于 {attendanceSetting.workStart} 记迟到，早于 {attendanceSetting.workEnd} 签退记早退。
        </p>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="card-title-row">
          <h2>月度汇总（与薪酬匹配）</h2>
          <div>
            <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
            <button className="btn" style={{ marginLeft: 8 }} onClick={() => exportAttendanceSummary(summaryRows, period)}>📤 导出汇总表</button>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>工号</th><th>姓名</th><th>部门</th><th>应出勤</th><th>实际出勤</th>
              <th>迟到</th><th>早退</th><th>缺勤</th><th>出差</th><th>加班(h)</th><th>请假</th><th>无薪假</th>
            </tr>
          </thead>
          <tbody>
            {summaryRows.map((r) => (
              <tr key={r.empNo}>
                <td className="mono">{r.empNo}</td><td>{r.name}</td><td>{r.department}</td>
                <td>{r.summary.expectedDays}</td><td>{r.summary.presentDays}</td>
                <td>{r.summary.late || '—'}</td><td>{r.summary.early || '—'}</td>
                <td>{r.summary.absent ? <span className="badge danger">{r.summary.absent}</span> : '—'}</td>
                <td>{r.summary.travel || '—'}</td><td>{r.summary.overtimeHours || '—'}</td>
                <td>{r.summary.leaveDays || '—'}</td>
                <td>{r.summary.unpaidLeaveDays ? <span className="badge warn">{r.summary.unpaidLeaveDays}</span> : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <h2>打卡明细</h2>
        <table>
          <thead>
            <tr><th>日期</th><th>员工</th><th>签到</th><th>签退</th><th>状态</th><th>加班(h)</th><th>备注</th><th className="actions-col">操作</th></tr>
          </thead>
          <tbody>
            {monthRecs.map((r) => {
              const e = employees.find((x) => x.id === r.employeeId)
              return (
                <tr key={r.id}>
                  <td>{r.date}</td><td>{e?.name}</td><td>{r.checkIn || '—'}</td><td>{r.checkOut || '—'}</td>
                  <td><span className={`badge ${r.status === 'absent' ? 'danger' : r.status === 'late' || r.status === 'early' ? 'warn' : r.status === 'travel' ? 'ok' : 'muted'}`}>{STATUS_LABELS[r.status]}</span></td>
                  <td>{r.overtimeHours || '—'}</td><td className="muted">{r.note}</td>
                  <td className="actions-col">
                    <button className="btn small" onClick={() => setEditing(r)}>编辑</button>
                    <button className="btn small danger" onClick={() => deleteAttendance(r.id)}>删除</button>
                  </td>
                </tr>
              )
            })}
            {monthRecs.length === 0 && <tr><td colSpan="8" className="empty">当月暂无考勤记录</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <AttendanceForm
          rec={editing}
          employees={actives}
          onClose={() => setEditing(null)}
          onSave={(rec) => { saveAttendance(rec); setEditing(null) }}
        />
      )}
    </div>
  )
}

function AttendanceForm({ rec, employees, onClose, onSave }) {
  const [form, setForm] = useState(rec)
  const set = (k, v) => setForm({ ...form, [k]: v })
  return (
    <Modal title="考勤记录" onClose={onClose}>
      <form className="form" onSubmit={(e) => { e.preventDefault(); onSave(form) }}>
        <div className="form-row">
          <label>员工
            <select value={form.employeeId} onChange={(e) => set('employeeId', Number(e.target.value))}>
              {employees.map((e2) => <option key={e2.id} value={e2.id}>{e2.name}</option>)}
            </select>
          </label>
          <label>日期<input type="date" required value={form.date} onChange={(e) => set('date', e.target.value)} /></label>
        </div>
        <div className="form-row">
          <label>签到<input type="time" value={form.checkIn} onChange={(e) => set('checkIn', e.target.value)} /></label>
          <label>签退<input type="time" value={form.checkOut} onChange={(e) => set('checkOut', e.target.value)} /></label>
        </div>
        <div className="form-row">
          <label>状态
            <select value={form.status} onChange={(e) => set('status', e.target.value)}>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label>加班时长(h)<input type="number" min="0" step="0.5" value={form.overtimeHours} onChange={(e) => set('overtimeHours', Number(e.target.value))} /></label>
        </div>
        <label>备注<input value={form.note || ''} onChange={(e) => set('note', e.target.value)} placeholder="如出差地点/请假关联等" /></label>
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>取消</button>
          <button type="submit" className="btn primary">保存</button>
        </div>
      </form>
    </Modal>
  )
}
