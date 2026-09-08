import { createContext, useContext, useEffect, useState } from 'react'
import { blankEmployee, PERMIT_STEPS } from '../hr/fields'
import { calcPayroll, attendanceSummary } from '../hr/calc'

const STORAGE_KEY = 'my-erp-hr-v1'

const seedEmployees = [
  {
    ...blankEmployee(), id: 1, empNo: 'EMP-001', name: '张伟', gender: '男', nationality: '中国',
    birthDate: '1985-03-15', idNumber: '310101198503150011', phone: '13800000001',
    department: '技术部', position: '技术总监', title: '高级工程师', hireDate: '2022-06-01',
    workLocation: '雅加达', bankAccount: 'BCA 1234567890', npwp: '12.345.678.9-012.000',
    contractType: 'PKWTT（无固定期限）', contractStart: '2022-06-01', probationEnd: '2022-09-01',
    passport: 'E12345678', passportExpiry: '2027-05-20',
    workVisaNo: 'V2024001', workVisaExpiry: '2026-12-31',
    itasNo: 'ITAS-2024-001', itasExpiry: '2026-12-31', rptkaExpiry: '2026-11-30',
    salaryType: '税前工资 Gross', baseSalaryIDR: 35000000, fixedAllowIDR: 5000000,
    baseSalaryCNY: 15000, fixedAllowCNY: 2000, socialCNY: 3500,
    permitSteps: PERMIT_STEPS.map((s, i) => ({ name: s, done: i < 6, date: i < 6 ? '2024-01-15' : '' })),
    documents: [], renewals: [],
  },
  {
    ...blankEmployee(), id: 2, empNo: 'EMP-002', name: 'Siti Rahma', gender: '女', nationality: '印尼',
    birthDate: '1992-09-25', idNumber: '320101199209250002', phone: '081200000002',
    department: '人事部', position: '人事主管', hireDate: '2023-02-10', workLocation: '雅加达',
    bankAccount: 'Mandiri 0987654321', npwp: '98.765.432.1-021.000',
    bpjsKes: 'K002', bpjsTk: 'TK002',
    contractType: 'PKWT（固定期限）', contractStart: '2025-01-01', contractEnd: '2026-12-31',
    probationEnd: '2025-04-01',
    salaryType: '税后工资 Net', baseSalaryIDR: 12000000, fixedAllowIDR: 2000000,
    permitSteps: [], documents: [], renewals: [],
  },
  {
    ...blankEmployee(), id: 3, empNo: 'EMP-003', name: 'Budi Santoso', gender: '男', nationality: '印尼',
    birthDate: '1995-10-05', idNumber: '320101199510050003', phone: '081200000003',
    department: '生产部', position: '生产主管', hireDate: '2024-08-19', workLocation: '卡拉旺',
    bankAccount: 'BNI 5555666677', bpjsKes: 'K003', bpjsTk: 'TK003',
    contractType: 'PKWT（固定期限）', contractStart: '2025-08-19', contractEnd: '2026-08-18',
    probationEnd: '2024-11-19',
    salaryType: '税前工资 Gross', baseSalaryIDR: 9000000, fixedAllowIDR: 1500000,
    permitSteps: [], documents: [], renewals: [],
  },
]

function seedAttendance() {
  const period = new Date().toISOString().slice(0, 7)
  const recs = []
  let id = 1
  for (const empId of [1, 2, 3]) {
    for (let day = 1; day <= 22; day++) {
      const date = `${period}-${String(day).padStart(2, '0')}`
      const d = new Date(date).getDay()
      if (d === 0 || d === 6) continue
      const r = Math.random()
      const status = r < 0.1 ? 'late' : r < 0.13 ? 'absent' : 'normal'
      recs.push({
        id: id++, employeeId: empId, date,
        checkIn: status === 'late' ? '09:25' : '08:55',
        checkOut: '18:05',
        status, overtimeHours: r > 0.85 ? 2 : 0, note: '',
      })
    }
  }
  return recs
}

const seedLeaves = [
  { id: 1, employeeId: 2, type: 'annual', typeLabel: '年假', startDate: new Date().toISOString().slice(0, 10), endDate: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10), days: 4, paid: true, status: 'pending', note: '家庭事务' },
]

const seedPickups = [
  { id: 1, guestName: '陈工', passportNo: 'E98765432', nationality: '中国', flightNo: 'GA891', date: new Date().toISOString().slice(0, 10), kind: 'pickup', hotel: '雅加达铂尔曼酒店', ticketDone: true, stages: { ticket: true, pickup: true, hotel: true, dropoff: false }, note: '客户验厂', done: false },
]

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* 忽略损坏数据 */ }
  return {
    employees: seedEmployees,
    attendance: seedAttendance(),
    leaves: seedLeaves,
    payrolls: [],
    pickups: seedPickups,
    role: 'admin',
    attendanceSetting: { expectedDays: 22, workStart: '09:00', workEnd: '18:00' },
  }
}

const HRContext = createContext(null)

export function HRProvider({ children }) {
  const [state, setState] = useState(load)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const nextId = (list) => (list.length ? Math.max(...list.map((x) => x.id)) + 1 : 1)
  const patch = (p) => setState((s) => ({ ...s, ...p }))

  /* ---------- 员工 ---------- */
  const saveEmployee = (data) =>
    setState((s) => {
      if (data.id) {
        return { ...s, employees: s.employees.map((e) => (e.id === data.id ? { ...e, ...data } : e)) }
      }
      return { ...s, employees: [...s.employees, { ...blankEmployee(), ...data, id: nextId(s.employees), documents: data.documents || [], renewals: data.renewals || [], permitSteps: data.permitSteps || [] }] }
    })

  const importEmployees = (list) =>
    setState((s) => ({
      ...s,
      employees: [
        ...s.employees,
        ...list.map((e, i) => ({ ...e, id: nextId(s.employees) + i })),
      ],
    }))

  const resignEmployee = (id, { resignDate, reason }) =>
    setState((s) => ({
      ...s,
      employees: s.employees.map((e) =>
        e.id === id ? { ...e, status: 'resigned', resignDate, resignReason: reason } : e
      ),
    }))

  const deleteEmployee = (id) =>
    setState((s) => ({ ...s, employees: s.employees.filter((e) => e.id !== id) }))

  const addDocument = (empId, doc) =>
    setState((s) => ({
      ...s,
      employees: s.employees.map((e) =>
        e.id === empId ? { ...e, documents: [...(e.documents || []), { ...doc, id: nextId(e.documents || []) }] } : e
      ),
    }))

  const removeDocument = (empId, docId) =>
    setState((s) => ({
      ...s,
      employees: s.employees.map((e) =>
        e.id === empId ? { ...e, documents: (e.documents || []).filter((d) => d.id !== docId) } : e
      ),
    }))

  const savePermitSteps = (empId, steps) =>
    setState((s) => ({
      ...s,
      employees: s.employees.map((e) => (e.id === empId ? { ...e, permitSteps: steps } : e)),
    }))

  /* ---------- 考勤 ---------- */
  const saveAttendance = (rec) =>
    setState((s) => ({
      ...s,
      attendance: rec.id
        ? s.attendance.map((r) => (r.id === rec.id ? { ...r, ...rec } : r))
        : [...s.attendance, { ...rec, id: nextId(s.attendance) }],
    }))
  const deleteAttendance = (id) =>
    setState((s) => ({ ...s, attendance: s.attendance.filter((r) => r.id !== id) }))

  const checkIn = (employeeId) => {
    const date = new Date().toISOString().slice(0, 10)
    const time = new Date().toTimeString().slice(0, 5)
    setState((s) => {
      const exist = s.attendance.find((r) => r.employeeId === employeeId && r.date === date)
      if (exist) return s
      const late = time > s.attendanceSetting.workStart
      return {
        ...s,
        attendance: [...s.attendance, { id: nextId(s.attendance), employeeId, date, checkIn: time, checkOut: '', status: late ? 'late' : 'normal', overtimeHours: 0, note: '' }],
      }
    })
  }
  const checkOut = (employeeId) => {
    const date = new Date().toISOString().slice(0, 10)
    const time = new Date().toTimeString().slice(0, 5)
    setState((s) => ({
      ...s,
      attendance: s.attendance.map((r) => {
        if (r.employeeId !== employeeId || r.date !== date) return r
        return { ...r, checkOut: time, status: time < s.attendanceSetting.workEnd && r.status !== 'late' ? 'early' : r.status }
      }),
    }))
  }

  /* ---------- 请假 ---------- */
  const saveLeave = (leave) =>
    setState((s) => ({
      ...s,
      leaves: leave.id
        ? s.leaves.map((l) => (l.id === leave.id ? { ...l, ...leave } : l))
        : [...s.leaves, { ...leave, id: nextId(s.leaves), status: 'pending' }],
    }))
  const setLeaveStatus = (id, status) =>
    setState((s) => ({ ...s, leaves: s.leaves.map((l) => (l.id === id ? { ...l, status } : l)) }))
  const deleteLeave = (id) =>
    setState((s) => ({ ...s, leaves: s.leaves.filter((l) => l.id !== id) }))

  /* ---------- 薪酬 ---------- */
  // 生成某月薪酬（全员）；extras: { [employeeId]: { variableAllow, overtimePay, bonus, otherDeduction, thr } }
  const runPayroll = (period, extras = {}) =>
    setState((s) => {
      const records = s.employees
        .filter((e) => e.status === 'active')
        .map((e, idx) => {
          const summary = attendanceSummary(s.attendance, s.leaves, e.id, period, s.attendanceSetting.expectedDays)
          const result = calcPayroll(e, summary, extras[e.id] || {})
          return {
            id: nextId(s.payrolls) + idx + 1,
            period, employeeId: e.id, empName: e.name, empNo: e.empNo, department: e.department,
            ...result, extra: extras[e.id] || {}, createdAt: new Date().toISOString(),
          }
        })
      const others = s.payrolls.filter((p) => p.period !== period)
      return { ...s, payrolls: [...others, ...records] }
    })

  const deletePayroll = (id) =>
    setState((s) => ({ ...s, payrolls: s.payrolls.filter((p) => p.id !== id) }))

  /* ---------- 接送机 ---------- */
  const savePickup = (rec) =>
    setState((s) => ({
      ...s,
      pickups: rec.id
        ? s.pickups.map((p) => (p.id === rec.id ? { ...p, ...rec } : p))
        : [...s.pickups, { ...rec, id: nextId(s.pickups), stages: rec.stages || { ticket: false, pickup: false, hotel: false, dropoff: false } }],
    }))
  const deletePickup = (id) =>
    setState((s) => ({ ...s, pickups: s.pickups.filter((p) => p.id !== id) }))

  const value = {
    ...state,
    setRole: (role) => patch({ role }),
    setAttendanceSetting: (attendanceSetting) => patch({ attendanceSetting }),
    saveEmployee, importEmployees, resignEmployee, deleteEmployee,
    addDocument, removeDocument, savePermitSteps,
    saveAttendance, deleteAttendance, checkIn, checkOut,
    saveLeave, setLeaveStatus, deleteLeave,
    runPayroll, deletePayroll,
    savePickup, deletePickup,
  }

  return <HRContext.Provider value={value}>{children}</HRContext.Provider>
}

export function useHR() {
  const ctx = useContext(HRContext)
  if (!ctx) throw new Error('useHR 必须在 HRProvider 内使用')
  return ctx
}
