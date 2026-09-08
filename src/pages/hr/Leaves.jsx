import { useState } from 'react'
import { useHR } from '../../context/HRContext'
import Modal from '../../components/Modal'
import { fmtDate } from '../../hr/calc'

const LEAVE_TYPES = [
  { value: 'annual', label: '年假' },
  { value: 'sick', label: '病假' },
  { value: 'personal', label: '事假' },
  { value: 'maternity', label: '产假' },
  { value: 'other', label: '其他' },
]
const STATUS = { pending: { label: '待审批', cls: 'warn' }, approved: { label: '已批准', cls: 'ok' }, rejected: { label: '已驳回', cls: 'danger' } }

export default function Leaves() {
  const { employees, leaves, saveLeave, setLeaveStatus, deleteLeave } = useHR()
  const [editing, setEditing] = useState(null)
  const actives = employees.filter((e) => e.status === 'active')

  const blank = {
    employeeId: actives[0]?.id, type: 'annual', startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10), paid: true, note: '',
  }
  const empName = (id) => employees.find((e) => e.id === id)?.name || '—'

  const sorted = [...leaves].sort((a, b) => (a.status === 'pending' ? -1 : 1) || b.startDate.localeCompare(a.startDate))

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>请假管理</h1>
          <p className="muted">年假 / 病假 / 事假 / 产假 / 其他；批准后计入月度考勤与薪酬折算</p>
        </div>
        <button className="btn primary" onClick={() => setEditing(blank)}>+ 申请请假</button>
      </header>

      <div className="card">
        <table>
          <thead>
            <tr><th>员工</th><th>假别</th><th>开始</th><th>结束</th><th>天数</th><th>薪资</th><th>原因</th><th>状态</th><th className="actions-col">操作</th></tr>
          </thead>
          <tbody>
            {sorted.map((l) => (
              <tr key={l.id}>
                <td>{empName(l.employeeId)}</td>
                <td>{LEAVE_TYPES.find((t) => t.value === l.type)?.label}</td>
                <td>{fmtDate(l.startDate)}</td><td>{fmtDate(l.endDate)}</td>
                <td>{l.days}</td>
                <td><span className={`badge ${l.paid ? 'ok' : 'muted'}`}>{l.paid ? '带薪' : '无薪'}</span></td>
                <td className="muted">{l.note}</td>
                <td><span className={`badge ${STATUS[l.status].cls}`}>{STATUS[l.status].label}</span></td>
                <td className="actions-col">
                  {l.status === 'pending' && (
                    <>
                      <button className="btn small ok" onClick={() => setLeaveStatus(l.id, 'approved')}>批准</button>
                      <button className="btn small danger" onClick={() => setLeaveStatus(l.id, 'rejected')}>驳回</button>
                    </>
                  )}
                  <button className="btn small" onClick={() => setEditing(l)}>编辑</button>
                  <button className="btn small danger" onClick={() => deleteLeave(l.id)}>删除</button>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && <tr><td colSpan="9" className="empty">暂无请假记录</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <LeaveForm leave={editing} employees={actives} onClose={() => setEditing(null)}
          onSave={(l) => { saveLeave(l); setEditing(null) }} />
      )}
    </div>
  )
}

function LeaveForm({ leave, employees, onClose, onSave }) {
  const [form, setForm] = useState(leave)
  const set = (k, v) => setForm({ ...form, [k]: v })
  const days = (() => {
    const s = new Date(form.startDate), e = new Date(form.endDate)
    return Math.max(1, Math.round((e - s) / 86400000) + 1)
  })()

  return (
    <Modal title={leave.id ? '编辑请假' : '申请请假'} onClose={onClose}>
      <form className="form" onSubmit={(ev) => { ev.preventDefault(); onSave({ ...form, days }) }}>
        <label>员工
          <select value={form.employeeId} onChange={(e) => set('employeeId', Number(e.target.value))}>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.empNo} {e.name}</option>)}
          </select>
        </label>
        <div className="form-row">
          <label>假别
            <select value={form.type} onChange={(e) => set('type', e.target.value)}>
              {LEAVE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
          <label>是否带薪
            <select value={form.paid} onChange={(e) => set('paid', e.target.value === 'true')}>
              <option value="true">带薪</option>
              <option value="false">无薪（按比例扣薪）</option>
            </select>
          </label>
        </div>
        <div className="form-row">
          <label>开始日期<input type="date" required value={form.startDate} onChange={(e) => set('startDate', e.target.value)} /></label>
          <label>结束日期<input type="date" required value={form.endDate} onChange={(e) => set('endDate', e.target.value)} /></label>
        </div>
        <p className="muted">共 {days} 天</p>
        <label>原因/备注<input value={form.note || ''} onChange={(e) => set('note', e.target.value)} /></label>
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>取消</button>
          <button type="submit" className="btn primary">保存</button>
        </div>
      </form>
    </Modal>
  )
}
