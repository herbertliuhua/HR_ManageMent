import { useState, useMemo } from 'react'
import { useHR } from '../../context/HRContext'
import Modal from '../../components/Modal'
import { fmtDate } from '../../hr/calc'
import { exportPickupStats } from '../../hr/excel'

const STAGES = [
  { key: 'ticket', label: '购票' },
  { key: 'pickup', label: '接机' },
  { key: 'hotel', label: '住宿' },
  { key: 'dropoff', label: '送机' },
]

const blank = {
  guestName: '', passportNo: '', nationality: '中国', flightNo: '',
  date: new Date().toISOString().slice(0, 10), kind: 'pickup', hotel: '', note: '', done: false,
  stages: { ticket: false, pickup: false, hotel: false, dropoff: false },
}

export default function Pickups() {
  const { pickups, savePickup, deletePickup } = useHR()
  const [editing, setEditing] = useState(null)
  const [range, setRange] = useState('month')

  const sorted = [...pickups].sort((a, b) => b.date.localeCompare(a.date))

  // 按月统计接送机人数
  const monthly = useMemo(() => {
    const map = new Map()
    for (const p of pickups) {
      const m = p.date?.slice(0, 7)
      if (!m) continue
      const cur = map.get(m) || { month: m, pickup: 0, dropoff: 0, total: 0 }
      if (p.kind === 'pickup') cur.pickup++
      else cur.dropoff++
      cur.total++
      map.set(m, cur)
    }
    return [...map.values()].sort((a, b) => b.month.localeCompare(a.month))
  }, [pickups])

  const rangeMonths = { month: 1, quarter: 3, half: 6, year: 12 }[range]
  const statsInRange = monthly.slice(0, rangeMonths)
  const sumOf = (k) => statsInRange.reduce((s, r) => s + r[k], 0)

  const toggleStage = (p, key) => {
    const stages = { ...p.stages, [key]: !p.stages[key] }
    savePickup({ ...p, stages, done: stages.dropoff })
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>接送机管理</h1>
          <p className="muted">购票 → 接机 → 住宿 → 送机 全流程跟踪，含客人护照信息</p>
        </div>
        <button className="btn primary" onClick={() => setEditing(blank)}>+ 新增接送机</button>
      </header>

      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="card stat-card"><span className="stat-label">接机总数（所选范围）</span><span className="stat-value">{sumOf('pickup')}</span><span className="stat-sub muted">人/次</span></div>
        <div className="card stat-card"><span className="stat-label">送机总数（所选范围）</span><span className="stat-value">{sumOf('dropoff')}</span><span className="stat-sub muted">人/次</span></div>
        <div className="card stat-card"><span className="stat-label">合计</span><span className="stat-value">{sumOf('total')}</span>
          <span className="stat-sub muted">
            范围：
            <select value={range} onChange={(e) => setRange(e.target.value)} style={{ marginLeft: 6 }}>
              <option value="month">本月</option><option value="quarter">季度</option>
              <option value="half">半年</option><option value="year">一年</option>
            </select>
            <button className="link-btn" style={{ marginLeft: 8 }} onClick={() => exportPickupStats(monthly, range)}>📤 导出</button>
          </span>
        </div>
      </div>

      <div className="card">
        <h2>接送机记录</h2>
        <table>
          <thead>
            <tr><th>日期</th><th>客人</th><th>护照号</th><th>航班</th><th>类型</th><th>住宿</th><th>流程进度</th><th>状态</th><th className="actions-col">操作</th></tr>
          </thead>
          <tbody>
            {sorted.map((p) => (
              <tr key={p.id}>
                <td>{fmtDate(p.date)}</td>
                <td>{p.guestName}<div className="muted" style={{ fontSize: 12 }}>{p.nationality}</div></td>
                <td className="mono">{p.passportNo}</td>
                <td>{p.flightNo}</td>
                <td><span className={`badge ${p.kind === 'pickup' ? 'ok' : 'muted'}`}>{p.kind === 'pickup' ? '接机' : '送机'}</span></td>
                <td>{p.hotel || '—'}</td>
                <td>
                  {STAGES.map((s) => (
                    <button key={s.key}
                      className={'stage-chip' + (p.stages?.[s.key] ? ' done' : '')}
                      onClick={() => toggleStage(p, s.key)}
                      title="点击切换">
                      {s.label}
                    </button>
                  ))}
                </td>
                <td><span className={`badge ${p.done ? 'ok' : 'warn'}`}>{p.done ? '已完成' : '进行中'}</span></td>
                <td className="actions-col">
                  <button className="btn small" onClick={() => setEditing(p)}>编辑</button>
                  <button className="btn small danger" onClick={() => { if (window.confirm('删除该记录？')) deletePickup(p.id) }}>删除</button>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && <tr><td colSpan="9" className="empty">暂无接送机记录</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && <PickupForm rec={editing} onClose={() => setEditing(null)} onSave={(r) => { savePickup(r); setEditing(null) }} />}
    </div>
  )
}

function PickupForm({ rec, onClose, onSave }) {
  const [form, setForm] = useState(rec)
  const set = (k, v) => setForm({ ...form, [k]: v })
  return (
    <Modal title={rec.id ? '编辑接送机' : '新增接送机'} onClose={onClose} width={560}>
      <form className="form" onSubmit={(e) => { e.preventDefault(); onSave(form) }}>
        <div className="form-row">
          <label>客人姓名 *<input required value={form.guestName} onChange={(e) => set('guestName', e.target.value)} /></label>
          <label>国籍<input value={form.nationality} onChange={(e) => set('nationality', e.target.value)} /></label>
        </div>
        <div className="form-row">
          <label>护照号 *<input required value={form.passportNo} onChange={(e) => set('passportNo', e.target.value)} /></label>
          <label>航班号<input value={form.flightNo} onChange={(e) => set('flightNo', e.target.value)} placeholder="如 GA891" /></label>
        </div>
        <div className="form-row">
          <label>日期<input type="date" required value={form.date} onChange={(e) => set('date', e.target.value)} /></label>
          <label>类型
            <select value={form.kind} onChange={(e) => set('kind', e.target.value)}>
              <option value="pickup">接机</option><option value="dropoff">送机</option>
            </select>
          </label>
        </div>
        <label>住宿酒店<input value={form.hotel} onChange={(e) => set('hotel', e.target.value)} placeholder="如 雅加达铂尔曼酒店" /></label>
        <label>备注<input value={form.note} onChange={(e) => set('note', e.target.value)} placeholder="来访目的等" /></label>
        <div>
          <span className="muted" style={{ fontSize: 13 }}>流程状态：</span>
          {STAGES.map((s) => (
            <label key={s.key} className="check" style={{ marginRight: 12 }}>
              <input type="checkbox" checked={!!form.stages?.[s.key]}
                onChange={(e) => set('stages', { ...form.stages, [s.key]: e.target.checked })} />
              {s.label}
            </label>
          ))}
        </div>
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>取消</button>
          <button type="submit" className="btn primary">保存</button>
        </div>
      </form>
    </Modal>
  )
}
