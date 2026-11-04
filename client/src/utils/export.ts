export function downloadBlob(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportJSON(filename: string, data: unknown) {
  downloadBlob(filename, JSON.stringify(data, null, 2), 'application/json')
}

export function exportCSV(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) {
    downloadBlob(filename, '', 'text/csv')
    return
  }
  const keys = Object.keys(rows[0])
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [
    keys.join(','),
    ...rows.map((row) => keys.map((k) => escape(row[k])).join(',')),
  ]
  downloadBlob(filename, lines.join('\n'), 'text/csv')
}
