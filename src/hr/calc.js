// 人事/薪酬计算引擎：提醒、考勤汇总、BPJS、PPh21、THR、PKWT、折算、Gross-up
import { SALARY_TYPES } from './fields'

export const DAY = 86400000
export const today = () => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}
export const parseDate = (s) => {
  if (!s) return null
  const d = new Date(s)
  return isNaN(d) ? null : d
}
export const daysUntil = (dateStr) => {
  const d = parseDate(dateStr)
  if (!d) return null
  d.setHours(0, 0, 0, 0)
  return Math.round((d - today()) / DAY)
}
export const fmtDate = (s) => (s ? new Date(s).toLocaleDateString('zh-CN') : '—')

// 工龄（月）
export function serviceMonths(hireDate, refDate = new Date()) {
  const h = parseDate(hireDate)
  if (!h) return 0
  return (
    (refDate.getFullYear() - h.getFullYear()) * 12 + (refDate.getMonth() - h.getMonth())
  )
}

// 年龄
export function age(birthDate, refDate = new Date()) {
  const b = parseDate(birthDate)
  if (!b) return null
  let a = refDate.getFullYear() - b.getFullYear()
  const m = refDate.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && refDate.getDate() < b.getDate())) a--
  return a
}

/* ---------------- 自动提醒 ---------------- */
// 证件到期阈值：30/60/90 天
export function computeReminders(employees) {
  const reminders = []
  const actives = employees.filter((e) => e.status === 'active')

  const pushExpiry = (emp, key, label) => {
    const d = daysUntil(emp[key])
    if (d === null || d < 0) {
      if (d !== null && d < 0) reminders.push({ type: 'expired', level: 'danger', emp, text: `${label}已过期`, date: emp[key] })
      return
    }
    if (d <= 30) reminders.push({ type: label, level: 'danger', emp, text: `${label} ${d} 天后到期`, date: emp[key], days: d })
    else if (d <= 60) reminders.push({ type: label, level: 'warn', emp, text: `${label} ${d} 天后到期`, date: emp[key], days: d })
    else if (d <= 90) reminders.push({ type: label, level: 'info', emp, text: `${label} ${d} 天后到期`, date: emp[key], days: d })
  }

  for (const e of actives) {
    // 生日（未来 7 天内）
    if (e.birthDate) {
      const b = parseDate(e.birthDate)
      const next = new Date(today().getFullYear(), b.getMonth(), b.getDate())
      if (next < today()) next.setFullYear(next.getFullYear() + 1)
      const d = Math.round((next - today()) / DAY)
      if (d <= 7) reminders.push({ type: '生日', level: 'info', emp: e, text: d === 0 ? '今天生日 🎂' : `${d} 天后生日`, date: next.toISOString() })
    }
    // 退休（默认 60 岁，提前一年提醒）
    const a = age(e.birthDate)
    if (a !== null && a >= 59) {
      reminders.push({ type: '退休', level: a >= 60 ? 'danger' : 'warn', emp: e, text: `即将/已达退休年龄（${a} 岁）` })
    }
    // 合同到期
    if (e.contractType?.startsWith('PKWT') && e.contractEnd) {
      const d = daysUntil(e.contractEnd)
      if (d !== null && d <= 90) {
        reminders.push({
          type: '合同到期',
          level: d < 0 ? 'danger' : d <= 30 ? 'danger' : d <= 60 ? 'warn' : 'info',
          emp: e,
          text: d < 0 ? '合同已到期，请处理续签/离职' : `合同 ${d} 天后到期`,
          date: e.contractEnd,
        })
      }
    }
    // 试用期结束
    if (e.probationEnd) {
      const d = daysUntil(e.probationEnd)
      if (d !== null && d >= 0 && d <= 30) {
        reminders.push({ type: '试用期', level: d <= 7 ? 'warn' : 'info', emp: e, text: `试用期 ${d} 天后结束`, date: e.probationEnd })
      }
    }
    // 证件
    pushExpiry(e, 'passportExpiry', '护照')
    pushExpiry(e, 'workVisaExpiry', '工作签证')
    pushExpiry(e, 'itasExpiry', 'ITAS')
    pushExpiry(e, 'rptkaExpiry', 'RPTKA')
    pushExpiry(e, 'skttExpiry', 'SKTT')
  }
  // 排序：danger 优先，按到期日升序
  const rank = { danger: 0, warn: 1, info: 2 }
  return reminders.sort((x, y) => rank[x.level] - rank[y.level] || (x.date || '').localeCompare(y.date || ''))
}

/* ---------------- 考勤月度汇总 ---------------- */
export function attendanceSummary(attendance, leaves, employeeId, period /* 'YYYY-MM' */, expectedDays = 22) {
  const monthRecs = attendance.filter(
    (r) => r.employeeId === employeeId && r.date?.startsWith(period)
  )
  const present = monthRecs.filter((r) => ['normal', 'late', 'early', 'overtime'].includes(r.status))
  const late = monthRecs.filter((r) => r.status === 'late').length
  const early = monthRecs.filter((r) => r.status === 'early').length
  const absent = monthRecs.filter((r) => r.status === 'absent').length
  const travel = monthRecs.filter((r) => r.status === 'travel').length
  const overtimeHours = monthRecs.reduce((s, r) => s + (Number(r.overtimeHours) || 0), 0)

  const monthLeaves = leaves.filter(
    (l) => l.employeeId === employeeId && l.status === 'approved' && overlapMonth(l.startDate, l.endDate, period)
  )
  const leaveDays = monthLeaves.reduce((s, l) => s + leaveDaysInMonth(l, period), 0)
  const unpaidLeaveDays = monthLeaves
    .filter((l) => !l.paid)
    .reduce((s, l) => s + leaveDaysInMonth(l, period), 0)

  return {
    expectedDays,
    presentDays: present.length,
    late,
    early,
    absent,
    travel,
    overtimeHours,
    leaveDays,
    unpaidLeaveDays,
  }
}

function overlapMonth(start, end, period) {
  const [y, m] = period.split('-').map(Number)
  const monthStart = new Date(y, m - 1, 1)
  const monthEnd = new Date(y, m, 0)
  const s = parseDate(start)
  const e = parseDate(end)
  return s && e && s <= monthEnd && e >= monthStart
}
function leaveDaysInMonth(leave, period) {
  const [y, m] = period.split('-').map(Number)
  const monthStart = new Date(y, m - 1, 1)
  const monthEnd = new Date(y, m, 0)
  const s = Math.max(parseDate(leave.startDate), monthStart)
  const e = Math.min(parseDate(leave.endDate), monthEnd)
  return Math.max(0, Math.round((e - s) / DAY) + 1)
}

/* ---------------- 印尼薪酬计算（IDR，月度） ---------------- */
// BPJS 比率（2024 常用标准简化版）
export const BPJS = {
  kesCompany: 0.04, // 医疗保险 公司 4%
  kesEmployee: 0.01, // 医疗保险 个人 1%
  kesCap: 12000000, // 缴费基数上限/月
  jhtCompany: 0.037, // 养老金 JHT 公司 3.7%
  jhtEmployee: 0.02, // JHT 个人 2%
  jkkCompany: 0.0054, // 工伤 JKK 公司（取中间档 0.54%）
  jkmCompany: 0.003, // 死亡 JKM 公司 0.3%
  jpCompany: 0.02, // 退休金 JP 公司 2%
  jpEmployee: 0.01, // JP 个人 1%
  jpCap: 10547400, // JP 缴费基数上限/月
}

// PPh21 年度累进税率（IDR）
export const PPH21_BRACKETS = [
  { upTo: 60000000, rate: 0.05 },
  { upTo: 250000000, rate: 0.15 },
  { upTo: 500000000, rate: 0.25 },
  { upTo: 5000000000, rate: 0.30 },
  { upTo: Infinity, rate: 0.35 },
]
export const PTKP = 54000000 // TK/0 年度免税额度
export const POSITION_ALLOWANCE_MONTHLY = 500000 // 职务补贴/月（biaya jabatan）

export function pph21Annual(taxableAnnual) {
  let tax = 0
  let prev = 0
  for (const b of PPH21_BRACKETS) {
    if (taxableAnnual > prev) {
      tax += (Math.min(taxableAnnual, b.upTo) - prev) * b.rate
      prev = b.upTo
    }
  }
  return Math.round(tax)
}

/**
 * 计算单个员工月度薪酬
 * input:
 *   emp, summary(考勤汇总), extra: { variableAllow, overtimePay, bonus, otherDeduction, thr, pkwtComp, workFactor }
 *   salaryTypeLabel: gross/net/grossup
 */
export function calcPayroll(emp, summary, extra = {}) {
  const base = Number(emp.baseSalaryIDR) || 0
  const fixedAllow = Number(emp.fixedAllowIDR) || 0
  const variableAllow = Number(extra.variableAllow) || 0
  const overtimePay = Number(extra.overtimePay) || 0
  const bonus = Number(extra.bonus) || 0
  const thr = extra.thr ? thrAmount(emp) : 0
  const pkwtComp = Number(extra.pkwtComp) || 0

  // 按比例折算因子：缺勤 + 无薪假 占应出勤天数
  const lostDays = (summary?.absent || 0) + (summary?.unpaidLeaveDays || 0)
  const factor = summary && summary.expectedDays > 0
    ? Math.max(0, (summary.expectedDays - lostDays) / summary.expectedDays)
    : 1
  // 迟到/早退扣款（每次 50,000 IDR，可在工资调整中覆盖）
  const lateDeduction = ((summary?.late || 0) + (summary?.early || 0)) * 50000
  const otherDeduction = Number(extra.otherDeduction) || 0

  const baseProrated = Math.round(base * factor)
  const fixedAllowProrated = Math.round(fixedAllow * factor)

  // 常规月薪部分（THR/PKWT 补偿不计入月度 BPJS/税基数的常规处理：此处合并计税但 BPJS 按常规月薪基数）
  const regularGross = baseProrated + fixedAllowProrated + variableAllow + overtimePay + bonus
  const bpjsBase = Math.min(regularGross, BPJS.kesCap)
  const jpBase = Math.min(regularGross, BPJS.jpCap)

  const bpjs = {
    kesCompany: Math.round(bpjsBase * BPJS.kesCompany),
    kesEmployee: Math.round(bpjsBase * BPJS.kesEmployee),
    jhtCompany: Math.round(regularGross * BPJS.jhtCompany),
    jhtEmployee: Math.round(regularGross * BPJS.jhtEmployee),
    jkkCompany: Math.round(regularGross * BPJS.jkkCompany),
    jkmCompany: Math.round(regularGross * BPJS.jkmCompany),
    jpCompany: Math.round(jpBase * BPJS.jpCompany),
    jpEmployee: Math.round(jpBase * BPJS.jpEmployee),
  }
  const bpjsCompany = bpjs.kesCompany + bpjs.jhtCompany + bpjs.jkkCompany + bpjs.jkmCompany + bpjs.jpCompany
  const bpjsEmployee = bpjs.kesEmployee + bpjs.jhtEmployee + bpjs.jpEmployee

  // 个人所得税（按常规月薪年化计算；THR 在发放月可单独计税，此处简化合并）
  const monthlyPositionAllow = Math.min(POSITION_ALLOWANCE_MONTHLY, regularGross * 0.05)
  const monthlyTaxable = regularGross - bpjsEmployee - monthlyPositionAllow
  const pph21Monthly = Math.max(0, Math.round(pph21Annual(Math.max(0, monthlyTaxable * 12 - PTKP)) / 12))

  // 目标实发（Net / Gross-up 时以约定 base+fixed 为目标净收入）
  const salaryType = (emp.salaryType || '').includes('Net') || (emp.salaryType || '').includes('税后')
    ? 'net'
    : (emp.salaryType || '').includes('Gross-up') ? 'grossup' : 'gross'

  let gross = regularGross
  let tax = pph21Monthly
  if (salaryType !== 'gross') {
    // Net / Gross-up：反推 Gross，使 实发（gross - 个人BPJS - 税）达到约定净收入
    const targetNet = base + fixedAllow + variableAllow + overtimePay + bonus
    let g = targetNet
    for (let i = 0; i < 12; i++) {
      const b = Math.min(g, BPJS.kesCap)
      const jp = Math.min(g, BPJS.jpCap)
      const eBpjs = Math.round(b * BPJS.kesEmployee) + Math.round(g * BPJS.jhtEmployee) + Math.round(jp * BPJS.jpEmployee)
      const posAllow = Math.min(POSITION_ALLOWANCE_MONTHLY, g * 0.05)
      const t = Math.max(0, Math.round(pph21Annual(Math.max(0, (g - eBpjs - posAllow) * 12 - PTKP)) / 12))
      const net = g - eBpjs - t
      if (net >= targetNet) {
        gross = g
        tax = t
        break
      }
      g += Math.max(50000, Math.round((targetNet - net) * 1.05))
    }
    // Gross-up 与 Net 数值一致；区别仅在成本口径（公司承担的税计入公司成本）
  }

  const employeeDeductions = bpjsEmployee + tax + lateDeduction + otherDeduction
  const netPay = gross + thr + pkwtComp - employeeDeductions
  const companyCost = gross + thr + pkwtComp + bpjsCompany

  // 中方 CNY 部分（信息展示，社保公积金个人部分为输入项）
  const cny = {
    base: Number(emp.baseSalaryCNY) || 0,
    fixedAllow: Number(emp.fixedAllowCNY) || 0,
    socialEmployee: Number(emp.socialCNY) || 0,
  }
  cny.net = cny.base + cny.fixedAllow - cny.socialEmployee

  return {
    factor,
    items: {
      baseProrated,
      fixedAllowProrated,
      variableAllow,
      overtimePay,
      bonus,
      thr,
      pkwtComp,
      lateDeduction,
      otherDeduction,
    },
    bpjs,
    bpjsCompany,
    bpjsEmployee,
    pph21: tax,
    gross,
    netPay,
    companyCost,
    cny,
    salaryType,
  }
}

// THR（第十三薪）：满 12 个月 = 1 个月工资；不满 12 个月按比例
export function thrAmount(emp) {
  const months = serviceMonths(emp.hireDate)
  const base = Number(emp.baseSalaryIDR) || 0
  if (months >= 12) return base
  return Math.round((base * months) / 12)
}

// PKWT 合同补偿金：每满 12 个月补偿 1 个月工资
export function pkwtCompensation(emp) {
  const months = serviceMonths(emp.hireDate)
  return Math.round(((Number(emp.baseSalaryIDR) || 0) * months) / 12)
}

export const fmtIDR = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0)
export const fmtCNY = (n) =>
  new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY', maximumFractionDigits: 2 }).format(n || 0)
export const fmtNum = (n) => new Intl.NumberFormat('id-ID').format(n || 0)

export const SALARY_TYPE_LABELS = SALARY_TYPES
