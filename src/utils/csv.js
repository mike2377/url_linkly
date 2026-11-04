// csv field escaping

function escapeField (value) {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function writeCsvHeader (res, columns, filename) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.write(columns.join(',') + '\n')
}

export function writeCsvRow (res, values) {
  res.write(values.map(escapeField).join(',') + '\n')
}
