// Excel 导入/导出 —— 表头与字段映射全部派生自 fields.js 元数据
import * as XLSX from 'xlsx'
import { EMPLOYEE_FIELDS, HEADER_TO_KEY, blankEmployee } from './fields'

function download(workbook, filename) {
  XLSX.writeFile(workbook, filename)
}

function sheetFromRows(rows) {
  return XLSX.utils.json_to_sheet(rows)
}

/* ---------------- 员工档案 ---------------- */
export function exportEmployees(employees, filename = '员工档案.xlsx') {
  const cols = EMPLOYEE_FIELDS.filter((f) => f.excel)
  const rows = employees.map((e) => {
    const row = {}
    cols.forEach((f) => {
      let v = e[f.key]
      if (f.type === 'ref:employee') v = employees.find((x) => x.id === e[f.key])?.name || ''
      if (f.key === 'salaryType') v = e.salaryType || ''
      row[f.excel] = v ?? ''
    })
    row['状态'] = e.status === 'resigned' ? '离职' : '在职'
    row['离职日期'] = e.resignDate || ''
    return row
  })
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, sheetFromRows(rows), '员工档案')
  download(wb, filename)
}

export function downloadEmployeeTemplate() {
  const cols = EMPLOYEE_FIELDS.filter((f) => f.excel)
  const header = cols.map((f) => f.excel)
  const sample = {}
  cols.forEach((f) => {
    sample[f.excel] = f.options ? f.options[0] : f.type === 'number' ? 0 : f.type === 'date' ? '2026-01-01' : ''
  })
  const ws = XLSX.utils.aoa_to_sheet([header, Object.values(sample)])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '导入模板')
  download(wb, '员工导入模板.xlsx')
}

// 读取 Excel 文件 -> 员工对象数组（字段校验由调用方处理）
export function importEmployeesFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })
        const list = []
        const errors = []
        rows.forEach((row, i) => {
          const emp = blankEmployee()
          let touched = false
          for (const [header, val] of Object.entries(row)) {
            const key = HEADER_TO_KEY[header]
            if (!key) continue
            touched = true
            if (val instanceof Date) {
              emp[key] = val.toISOString().slice(0, 10)
            } else if (fieldByKey(key)?.type === 'number') {
              emp[key] = Number(val) || 0
            } else {
              emp[key] = String(val).trim()
            }
          }
          if (!touched) return
          if (!emp.name) { errors.push(`第 ${i + 2} 行：姓名为空，已跳过`); return }
          if (!emp.empNo) emp.empNo = `EMP-${String(i + 1).padStart(3, '0')}`
          if (row['状态'] === '离职') { emp.status = 'resigned'; emp.resignDate = row['离职日期'] || '' }
          list.push(emp)
        })
        resolve({ list, errors })
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}
const fieldByKey = (key) => EMPLOYEE_FIELDS.find((f) => f.key === key)

/* ---------------- 通用表格导出 ---------------- */
export function exportRows(rows, sheetName, filename) {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, sheetFromRows(rows), sheetName)
  download(wb, filename)
}

// 考勤月度汇总导出
export function exportAttendanceSummary(rows, period) {
  exportRows(
    rows.map((r) => ({
      员工编号: r.empNo, 姓名: r.name, 部门: r.department,
      应出勤天数: r.summary.expectedDays, 实际出勤: r.summary.presentDays,
      迟到次数: r.summary.late, 早退次数: r.summary.early, 缺勤天数: r.summary.absent,
      出差天数: r.summary.travel, 加班时长: r.summary.overtimeHours,
      请假天数: r.summary.leaveDays, 无薪假天数: r.summary.unpaidLeaveDays,
    })),
    '考勤汇总',
    `考勤汇总_${period}.xlsx`
  )
}

// 薪酬成本汇总导出（月/季/半年/年，可按部门/人员筛选）
export function exportPayrollCost(rows, label) {
  exportRows(
    rows.map((r) => ({
      员工编号: r.empNo, 姓名: r.name, 部门: r.department, 期间: r.periods,
      '应发工资IDR': r.gross, '个人BPJS(IDR)': r.bpjsEmployee, '个人所得税PPh21(IDR)': r.pph21,
      '实发工资IDR': r.netPay, '公司BPJS(IDR)': r.bpjsCompany,
      'THR(IDR)': r.thr, 'PKWT补偿(IDR)': r.pkwtComp,
      '公司总成本IDR': r.companyCost,
      '中方工资CNY': r.cnyBase, '中方津贴CNY': r.cnyAllow, '社保公积金CNY': r.cnySocial,
    })),
    '薪酬成本',
    `薪酬成本汇总_${label}.xlsx`
  )
}

// 接送机统计导出
export function exportPickupStats(monthlyRows, label) {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(
    wb,
    sheetFromRows(monthlyRows.map((r) => ({ 月份: r.month, 接机人数: r.pickup, 送机人数: r.dropoff, 合计: r.total }))),
    '月度统计'
  )
  download(wb, `接送机汇总_${label}.xlsx`)
}
