// 员工字段元数据 —— 表单 / Excel 导入模板 / 导出表头的唯一数据源
// type: text | date | select | number | textarea | tel

export const FIELD_GROUPS = [
  { key: 'basic', label: '基本资料' },
  { key: 'work', label: '工作资料' },
  { key: 'permit', label: '证件与许可' },
  { key: 'payroll', label: '薪酬资料' },
]

export const GENDERS = ['男', '女']
export const NATIONALITIES = ['中国', '印尼', '其他']
export const CONTRACT_TYPES = ['PKWT（固定期限）', 'PKWTT（无固定期限）']
export const SALARY_TYPES = [
  { value: 'gross', label: '税前工资 Gross' },
  { value: 'net', label: '税后工资 Net' },
  { value: 'grossup', label: 'Gross-up（公司承担个税）' },
]
export const DEPARTMENTS = ['总经办', '人事部', '财务部', '市场部', '技术部', '生产部', '行政部']

export const EMPLOYEE_FIELDS = [
  // ---- 基本资料 ----
  { key: 'empNo', label: '员工编号', group: 'work', type: 'text', required: true, excel: '员工编号' },
  { key: 'name', label: '姓名', group: 'basic', type: 'text', required: true, excel: '姓名' },
  { key: 'gender', label: '性别', group: 'basic', type: 'select', options: GENDERS, excel: '性别' },
  { key: 'nationality', label: '国籍', group: 'basic', type: 'select', options: NATIONALITIES, excel: '国籍' },
  { key: 'birthDate', label: '出生日期', group: 'basic', type: 'date', excel: '出生日期' },
  { key: 'idNumber', label: '证件号（身份证/KTP）', group: 'basic', type: 'text', excel: '证件号' },
  { key: 'address', label: '家庭住址', group: 'basic', type: 'textarea', excel: '家庭住址' },
  { key: 'phone', label: '联系方式', group: 'basic', type: 'tel', excel: '联系方式' },
  { key: 'education', label: '学历证明', group: 'basic', type: 'text', excel: '学历' },

  // ---- 工作资料 ----
  { key: 'department', label: '部门', group: 'work', type: 'select', options: DEPARTMENTS, required: true, excel: '部门' },
  { key: 'position', label: '职位', group: 'work', type: 'text', excel: '职位' },
  { key: 'title', label: '职称', group: 'work', type: 'text', excel: '职称' },
  { key: 'hireDate', label: '入职日期', group: 'work', type: 'date', required: true, excel: '入职日期' },
  { key: 'workLocation', label: '工作地点', group: 'work', type: 'text', excel: '工作地点' },
  { key: 'managerId', label: '直属领导', group: 'work', type: 'ref:employee', excel: '直属领导' },
  { key: 'bankAccount', label: '银行账户', group: 'work', type: 'text', excel: '银行账户' },
  { key: 'npwp', label: '税卡 NPWP', group: 'work', type: 'text', excel: '税卡NPWP' },
  { key: 'bpjsKes', label: 'BPJS Kesehatan 编号', group: 'work', type: 'text', excel: 'BPJS医疗保险号' },
  { key: 'bpjsTk', label: 'BPJS Ketenagakerjaan 编号', group: 'work', type: 'text', excel: 'BPJS劳工保险号' },
  { key: 'contractType', label: '合同类型', group: 'work', type: 'select', options: CONTRACT_TYPES, excel: '合同类型' },
  { key: 'contractStart', label: '合同开始日期', group: 'work', type: 'date', excel: '合同开始' },
  { key: 'contractEnd', label: '合同结束日期', group: 'work', type: 'date', excel: '合同结束' },
  { key: 'probationEnd', label: '试用期结束日期', group: 'work', type: 'date', excel: '试用期结束' },

  // ---- 证件与许可（到期日参与自动提醒） ----
  { key: 'passport', label: '护照号', group: 'permit', type: 'text', excel: '护照号' },
  { key: 'passportExpiry', label: '护照到期日', group: 'permit', type: 'date', excel: '护照到期' },
  { key: 'rptka', label: 'RPTKA 编号', group: 'permit', type: 'text', excel: 'RPTKA编号' },
  { key: 'rptkaExpiry', label: 'RPTKA 到期日', group: 'permit', type: 'date', excel: 'RPTKA到期' },
  { key: 'workVisaNo', label: '工作签证号', group: 'permit', type: 'text', excel: '工作签证号' },
  { key: 'workVisaExpiry', label: '工作签证到期日', group: 'permit', type: 'date', excel: '工作签证到期' },
  { key: 'itasNo', label: 'ITAS 号', group: 'permit', type: 'text', excel: 'ITAS号' },
  { key: 'itasExpiry', label: 'ITAS 到期日', group: 'permit', type: 'date', excel: 'ITAS到期' },
  { key: 'skttNo', label: 'SKTT 号', group: 'permit', type: 'text', excel: 'SKTT号' },
  { key: 'skttExpiry', label: 'SKTT 到期日', group: 'permit', type: 'date', excel: 'SKTT到期' },

  // ---- 薪酬资料 ----
  { key: 'salaryType', label: '工资计税方式', group: 'payroll', type: 'select', options: SALARY_TYPES.map((s) => s.label), excel: '计税方式' },
  { key: 'baseSalaryIDR', label: '基本工资（印尼盾 IDR/月）', group: 'payroll', type: 'number', excel: '基本工资IDR' },
  { key: 'fixedAllowIDR', label: '固定津贴（IDR/月）', group: 'payroll', type: 'number', excel: '固定津贴IDR' },
  { key: 'baseSalaryCNY', label: '中方工资（人民币 CNY/月）', group: 'payroll', type: 'number', excel: '中方工资CNY' },
  { key: 'fixedAllowCNY', label: '中方固定津贴（CNY/月）', group: 'payroll', type: 'number', excel: '中方津贴CNY' },
  { key: 'socialCNY', label: '中国社保+公积金（CNY/月，个人承担）', group: 'payroll', type: 'number', excel: '社保公积金CNY' },
]

// 签证/工作许可办理流程步骤（进度跟踪）
export const PERMIT_STEPS = ['RPTKA 申请', 'RPTKA 获批', 'Vitas 签证申请', '入境接机', 'ITAS 办理', 'SKTT 办理', '全部完成']

export const fieldByKey = (key) => EMPLOYEE_FIELDS.find((f) => f.key === key)
export const fieldsOfGroup = (group) => EMPLOYEE_FIELDS.filter((f) => f.group === group)

// Excel 表头 -> 字段 key 映射（导入用）
export const HEADER_TO_KEY = Object.fromEntries(
  EMPLOYEE_FIELDS.filter((f) => f.excel).map((f) => [f.excel, f.key])
)

export const blankEmployee = () => {
  const e = { status: 'active', renewals: [], documents: [], permitSteps: [] }
  EMPLOYEE_FIELDS.forEach((f) => {
    e[f.key] = f.type === 'number' ? 0 : ''
  })
  e.salaryType = SALARY_TYPES[0].label
  e.contractType = CONTRACT_TYPES[0]
  e.nationality = '印尼'
  return e
}
