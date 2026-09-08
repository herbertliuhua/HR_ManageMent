import { useState, useRef } from 'react'
import { useHR } from '../../context/HRContext'
import Modal from '../../components/Modal'
import {
  FIELD_GROUPS, fieldsOfGroup, blankEmployee, PERMIT_STEPS, SALARY_TYPES,
} from '../../hr/fields'
import { exportEmployees, importEmployeesFile, downloadEmployeeTemplate } from '../../hr/excel'
import { fmtDate, serviceMonths, daysUntil } from '../../hr/calc'

function EmployeeForm({ emp, onClose }) {
  const { saveEmployee, employees } = useHR()
  const [form, setForm] = useState(() => ({ ...blankEmployee(), ...emp }))
  const [tab, setTab] = useState('profile')
  const fileRef = useRef(null)
  const { addDocument, removeDocument, savePermitSteps } = useHR()

  const managers = employees.filter((e) => e.id !== form.id && e.status === 'active')
  const set = (key, val) => setForm({ ...form, [key]: val })

  const submit = (e) => {
    e.preventDefault()
    if (!form.name || !form.empNo || !form.department || !form.hireDate) return
    saveEmployee(form)
    onClose()
  }

  const onPickFile = async (ev) => {
    const files = Array.from(ev.target.files || [])
    for (const file of files) {
      const dataUrl = await new Promise((res) => {
        const r = new FileReader()
        r.onload = () => res(r.result)
        r.readAsDataURL(file)
      })
      const doc = { type: file.type || 'file', fileName: file.name, size: file.size, dataUrl, uploadedAt: new Date().toISOString() }
      if (form.id) addDocument(form.id, doc)
      setForm((f) => ({ ...f, documents: [...(f.documents || []), { ...doc, id: Date.now() + Math.random() }] }))
    }
    ev.target.value = ''
  }

  const toggleStep = (name) => {
    const exist = (form.permitSteps || []).find((s) => s.name === name)
    const steps = PERMIT_STEPS.map((n) => {
      if (n !== name) return (form.permitSteps || []).find((s) => s.name === n) || { name: n, done: false, date: '' }
      return exist ? { ...exist, done: !exist.done, date: !exist.done ? new Date().toISOString().slice(0, 10) : '' }
        : { name: n, done: true, date: new Date().toISOString().slice(0, 10) }
    })
    setForm({ ...form, permitSteps: steps })
    if (form.id) savePermitSteps(form.id, steps)
  }

  const addRenewal = () =>
    setForm({ ...form, renewals: [...(form.renewals || []), { start: '', end: '', note: '' }] })

  return (
    <Modal title={emp.id ? `编辑员工 - ${emp.name}` : '新增员工'} onClose={onClose} width={780}>
      <div className="tabs">
        {[['profile', '档案资料'], ['permit', '签证/许可进度'], ['docs', '证件文件'], ['renewal', '合同续签']].map(([k, label]) => (
          <button key={k} className={'tab' + (tab === k ? ' active' : '')} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>

      <form className="form" onSubmit={submit} style={{ marginTop: 14 }}>
        {tab === 'profile' && (
          <>
            {FIELD_GROUPS.map((g) => (
              <div key={g.key} className="form-section">
                <h4 className="form-section-title">{g.label}</h4>
                <div className="form-grid">
                  {fieldsOfGroup(g.key).map((f) => (
                    <label key={f.key} className={f.type === 'textarea' ? 'span-2' : ''}>
                      {f.label}{f.required && ' *'}
                      {f.type === 'select' ? (
                        <select value={form[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)}>
                          <option value="">请选择…</option>
                          {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : f.type === 'ref:employee' ? (
                        <select value={form[f.key] ?? ''} onChange={(e) => set(f.key, Number(e.target.value) || '')}>
                          <option value="">请选择…</option>
                          {managers.map((m) => <option key={m.id} value={m.id}>{m.name}（{m.department}）</option>)}
                        </select>
                      ) : f.type === 'textarea' ? (
                        <textarea rows={2} value={form[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)} />
                      ) : (
                        <input type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : f.type === 'tel' ? 'tel' : 'text'}
                          value={form[f.key] ?? ''} onChange={(e) => set(f.key, f.type === 'number' ? Number(e.target.value) : e.target.value)} />
                      )}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {tab === 'permit' && (
          <div className="permit-steps">
            <p className="muted">勾选已完成的办理节点，用于跟踪签证和工作许可办理进度：</p>
            {PERMIT_STEPS.map((name) => {
              const step = (form.permitSteps || []).find((s) => s.name === name)
              return (
                <div key={name} className="permit-step">
                  <label className="check">
                    <input type="checkbox" checked={!!step?.done} onChange={() => toggleStep(name)} />
                    <span className={step?.done ? 'done' : ''}>{name}</span>
                  </label>
                  <span className="muted">{step?.done ? `完成于 ${fmtDate(step.date)}` : '未完成'}</span>
                </div>
              )
            })}
          </div>
        )}

        {tab === 'docs' && (
          <div>
            <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.doc,.docx" onChange={onPickFile} style={{ display: 'none' }} />
            <button type="button" className="btn" onClick={() => fileRef.current?.click()}>📎 上传证件（身份证/护照/签证/批文/合同等）</button>
            <ul className="doc-list">
              {(form.documents || []).map((d) => (
                <li key={d.id}>
                  {d.type.startsWith('image/') ? '🖼️' : '📄'} {d.fileName}
                  <span className="muted">{Math.round((d.size || 0) / 1024)} KB · {fmtDate(d.uploadedAt)}</span>
                  {d.dataUrl && <a className="link" href={d.dataUrl} download={d.fileName}>下载</a>}
                  <button type="button" className="icon-btn" onClick={() => {
                    setForm({ ...form, documents: form.documents.filter((x) => x.id !== d.id) })
                    if (form.id) removeDocument(form.id, d.id)
                  }}>✕</button>
                </li>
              ))}
              {(form.documents || []).length === 0 && <p className="empty">暂无文件</p>}
            </ul>
          </div>
        )}

        {tab === 'renewal' && (
          <div>
            <button type="button" className="btn" onClick={addRenewal}>+ 添加续签记录</button>
            <table style={{ marginTop: 10 }}>
              <thead><tr><th>续签开始</th><th>续签结束</th><th>备注</th><th></th></tr></thead>
              <tbody>
                {(form.renewals || []).map((r, i) => (
                  <tr key={i}>
                    <td><input type="date" value={r.start} onChange={(e) => set('renewals', form.renewals.map((x, j) => j === i ? { ...x, start: e.target.value } : x))} /></td>
                    <td><input type="date" value={r.end} onChange={(e) => set('renewals', form.renewals.map((x, j) => j === i ? { ...x, end: e.target.value } : x))} /></td>
                    <td><input value={r.note} onChange={(e) => set('renewals', form.renewals.map((x, j) => j === i ? { ...x, note: e.target.value } : x))} /></td>
                    <td><button type="button" className="icon-btn" onClick={() => set('renewals', form.renewals.filter((_, j) => j !== i))}>✕</button></td>
                  </tr>
                ))}
                {(form.renewals || []).length === 0 && <tr><td colSpan="4" className="empty">暂无续签记录</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>取消</button>
          <button type="submit" className="btn primary">保存档案</button>
        </div>
      </form>
    </Modal>
  )
}

function ResignCert({ emp, onClose }) {
  const text = `离 职 证 明

兹证明 ${emp.name}（${emp.gender || ''}，证件号：${emp.idNumber || '—'}，护照号：${emp.passport || '—'}），
员工编号 ${emp.empNo}，自 ${fmtDate(emp.hireDate)} 起在我公司担任 ${emp.department} ${emp.position || ''} 一职。
因 ${emp.resignReason || '个人原因'}，于 ${fmtDate(emp.resignDate)} 正式离职。

离职手续已按规定办理完毕，双方劳动关系终止，无未了纠纷。
特此证明。

                          公司（盖章）
                          ${fmtDate(new Date().toISOString())}`
  return (
    <Modal title="离职证明（自动生成）" onClose={onClose} width={600}>
      <pre className="cert-text">{text}</pre>
      <div className="form-actions">
        <button className="btn" onClick={onClose}>关闭</button>
        <button className="btn primary" onClick={() => window.print()}>打印 / 另存为 PDF</button>
      </div>
    </Modal>
  )
}

export default function Employees() {
  const { employees, saveEmployee, resignEmployee, deleteEmployee, importEmployees: importBatch } = useHR()
  const [keyword, setKeyword] = useState('')
  const [dept, setDept] = useState('all')
  const [status, setStatus] = useState('all')
  const [editing, setEditing] = useState(null)
  const [certEmp, setCertEmp] = useState(null)
  const [resignTarget, setResignTarget] = useState(null)
  const [resignForm, setResignForm] = useState({ resignDate: new Date().toISOString().slice(0, 10), reason: '个人原因' })
  const [importMsg, setImportMsg] = useState('')
  const fileRef = useRef(null)

  const filtered = employees.filter((e) =>
    (status === 'all' || e.status === status) &&
    (dept === 'all' || e.department === dept) &&
    (e.name.includes(keyword) || e.empNo.toLowerCase().includes(keyword.toLowerCase()) || (e.position || '').includes(keyword))
  )

  const onImport = async (ev) => {
    const file = ev.target.files?.[0]
    if (!file) return
    try {
      const { list, errors } = await importEmployeesFile(file)
      importBatch(list)
      setImportMsg(`成功导入 ${list.length} 人${errors.length ? '；' + errors.join('；') : ''}`)
    } catch (err) {
      setImportMsg('导入失败：' + err.message)
    }
    ev.target.value = ''
  }

  const doResign = () => {
    resignEmployee(resignTarget.id, resignForm)
    setResignTarget(null)
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>员工档案</h1>
          <p className="muted">共 {employees.length} 人（在职 {employees.filter((e) => e.status === 'active').length}）</p>
        </div>
        <div className="header-actions">
          <button className="btn" onClick={downloadEmployeeTemplate}>下载导入模板</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>📥 Excel 批量导入</button>
          <button className="btn" onClick={() => exportEmployees(filtered)}>📤 导出 Excel</button>
          <button className="btn primary" onClick={() => setEditing({})}>+ 新增员工</button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={onImport} style={{ display: 'none' }} />
        </div>
      </header>

      {importMsg && <p className="import-msg">{importMsg} <button className="link-btn" onClick={() => setImportMsg('')}>✕</button></p>}

      <div className="card">
        <div className="toolbar">
          <input className="search" placeholder="搜索姓名 / 工号 / 职位…" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          <select value={dept} onChange={(e) => setDept(e.target.value)}>
            <option value="all">全部部门</option>
            {[...new Set(employees.map((e) => e.department).filter(Boolean))].map((d) => <option key={d}>{d}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">全部状态</option>
            <option value="active">在职</option>
            <option value="resigned">离职</option>
          </select>
        </div>
        <table>
          <thead>
            <tr>
              <th>工号</th><th>姓名</th><th>部门/职位</th><th>国籍</th><th>入职日期</th><th>工龄</th>
              <th>合同到期</th><th>证件预警</th><th>状态</th><th className="actions-col">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => {
              const cd = daysUntil(e.contractEnd)
              const docExpiries = [['护照', e.passportExpiry], ['工签', e.workVisaExpiry], ['ITAS', e.itasExpiry], ['RPTKA', e.rptkaExpiry]]
                .map(([label, d]) => ({ label, d: daysUntil(d) })).filter((x) => x.d !== null && x.d <= 90)
                .sort((a, b) => a.d - b.d)
              return (
                <tr key={e.id}>
                  <td className="mono">{e.empNo}</td>
                  <td>{e.name}</td>
                  <td>{e.department} / {e.position || '—'}</td>
                  <td>{e.nationality || '—'}</td>
                  <td>{fmtDate(e.hireDate)}</td>
                  <td>{serviceMonths(e.hireDate)} 个月</td>
                  <td>
                    {e.contractEnd ? <>
                      {fmtDate(e.contractEnd)}
                      {cd !== null && cd <= 90 && <span className={`badge ${cd < 0 ? 'danger' : cd <= 30 ? 'danger' : 'warn'}`} style={{ marginLeft: 6 }}>{cd < 0 ? '已到期' : `${cd}天`}</span>}
                    </> : '—'}
                  </td>
                  <td>
                    {docExpiries.length === 0 ? <span className="muted">正常</span> :
                      docExpiries.slice(0, 2).map((x) => (
                        <span key={x.label} className={`badge ${x.d < 0 ? 'danger' : x.d <= 30 ? 'danger' : 'warn'}`} style={{ marginRight: 4 }}>
                          {x.label}{x.d < 0 ? '过期' : `${x.d}天`}
                        </span>
                      ))}
                  </td>
                  <td><span className={`badge ${e.status === 'active' ? 'ok' : 'muted'}`}>{e.status === 'active' ? '在职' : '离职'}</span></td>
                  <td className="actions-col">
                    <button className="btn small" onClick={() => setEditing(e)}>编辑</button>
                    {e.status === 'active' ? (
                      <button className="btn small" onClick={() => setResignTarget(e)}>离职</button>
                    ) : (
                      <button className="btn small" onClick={() => setCertEmp(e)}>离职证明</button>
                    )}
                    <button className="btn small danger" onClick={() => { if (window.confirm(`删除员工 ${e.name}？`)) deleteEmployee(e.id) }}>删除</button>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && <tr><td colSpan="10" className="empty">没有匹配的员工</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && <EmployeeForm emp={editing} onClose={() => setEditing(null)} />}
      {certEmp && <ResignCert emp={certEmp} onClose={() => setCertEmp(null)} />}

      {resignTarget && (
        <Modal title={`办理离职 - ${resignTarget.name}`} onClose={() => setResignTarget(null)}>
          <div className="form">
            <label>离职日期<input type="date" value={resignForm.resignDate} onChange={(e) => setResignForm({ ...resignForm, resignDate: e.target.value })} /></label>
            <label>离职原因<input value={resignForm.reason} onChange={(e) => setResignForm({ ...resignForm, reason: e.target.value })} /></label>
            <p className="muted">离职后可自动生成离职证明；未结算工资可在薪酬模块做离职结算。</p>
            <div className="form-actions">
              <button className="btn" onClick={() => setResignTarget(null)}>取消</button>
              <button className="btn primary" onClick={doResign}>确认离职</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
