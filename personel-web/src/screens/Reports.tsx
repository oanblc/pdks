// Reports.tsx — C12 Raporlar (gerçek API: dönem + filtre + görsel karşılaştırma)
import { useEffect, useState } from 'react'
import { Icon } from '../icons'
import { api } from '../api'
import { PageHead, StatCard, SearchInput, Table, Row, type Tone } from '../ui'

type Row0 = { name: string; sicil?: string | null; branch: string | null; dept: string | null; workedDays?: number; netHours: number; overtimeHours: number; late: number; missing: number; leaveDays?: number; holidayDays?: number }
type Data = { month: string; rows: Row0[] }
type Metric = 'netHours' | 'overtimeHours' | 'late' | 'missing'

// Yasal puantaj/bordro PDF çıktısı (yazdırılabilir)
function printPdf(title: string, header: string[], rows: (string | number | null)[][]) {
  const esc = (s: any) => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!))
  const thead = header.map(h => `<th>${esc(h)}</th>`).join('')
  const tbody = rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
    <style>body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#15201f;padding:28px}
    h1{font-size:18px;margin:0 0 4px}.sub{color:#6b7a78;font-size:12px;margin-bottom:18px}
    table{width:100%;border-collapse:collapse;font-size:11px}
    th{text-align:left;border-bottom:2px solid #0e6b6b;padding:7px 5px;color:#0e6b6b;text-transform:uppercase;font-size:9.5px}
    td{padding:6px 5px;border-bottom:1px solid #e6ece9}</style></head>
    <body><h1>${esc(title)}</h1><div class="sub">puanto · Yasal puantaj / bordro kaynağı · ${new Date().toLocaleString('tr-TR')}</div>
    <table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table>
    <script>window.onload=function(){window.print()}</script></body></html>`
  const w = window.open('', '_blank'); if (!w) { alert('PDF için açılır pencereye izin verin.'); return }
  w.document.write(html); w.document.close()
}

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
const monthLabel = (m: string) => { const [y, mo] = m.split('-').map(Number); return `${AYLAR[mo - 1]} ${y}` }
const shiftMonth = (m: string, d: number) => { const [y, mo] = m.split('-').map(Number); const x = new Date(y, mo - 1 + d, 1); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}` }
const thisMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }

const METRICS: { key: Metric; label: string; unit: string; tone: Tone }[] = [
  { key: 'netHours', label: 'Net çalışma', unit: 's', tone: 'brand' },
  { key: 'overtimeHours', label: 'Fazla mesai', unit: 's', tone: 'brand' },
  { key: 'late', label: 'Geç giriş', unit: 'gün', tone: 'warn' },
  { key: 'missing', label: 'Eksik kayıt', unit: 'gün', tone: 'err' },
]

export function Reports() {
  const [month, setMonth] = useState(thisMonth())
  const [d, setD] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [branch, setBranch] = useState('all')
  const [dept, setDept] = useState('all')
  const [metric, setMetric] = useState<Metric>('netHours')
  const isCurrent = month === thisMonth()

  useEffect(() => { setLoading(true); api.reports(month).then((r: any) => { setD(r); setLoading(false) }).catch(() => { setD({ month, rows: [] }); setLoading(false) }) }, [month])

  if (loading || !d) return <div className="t-body ink-2">Yükleniyor…</div>

  const branches = Array.from(new Set(d.rows.map(r => r.branch).filter(Boolean) as string[]))
  const depts = Array.from(new Set(d.rows.map(r => r.dept).filter(Boolean) as string[]))
  const ql = q.trim().toLowerCase()
  const rows = d.rows.filter(r =>
    (branch === 'all' || r.branch === branch) &&
    (dept === 'all' || r.dept === dept) &&
    (!ql || r.name.toLowerCase().includes(ql)))

  const totals = rows.reduce((a, r) => ({ netHours: a.netHours + r.netHours, overtimeHours: a.overtimeHours + r.overtimeHours, late: a.late + r.late, missing: a.missing + r.missing }), { netHours: 0, overtimeHours: 0, late: 0, missing: 0 })
  const sorted = [...rows].sort((a, b) => b[metric] - a[metric])
  const max = Math.max(1, ...rows.map(r => r[metric]))
  const mDef = METRICS.find(m => m.key === metric)!

  // Bordro/yasal puantaj sütunları — tam kapsam
  const repHeader = ['Sicil', 'Ad', 'Şube', 'Departman', 'Çalışılan gün', 'Net (s)', 'Fazla mesai (s)', 'İzin (gün)', 'Tatil (gün)', 'Geç (gün)', 'Eksik (gün)']
  const repRows = (): (string | number | null)[][] => sorted.map(r => [r.sicil ?? '', r.name, r.branch, r.dept, r.workedDays ?? 0, r.netHours, r.overtimeHours, r.leaveDays ?? 0, r.holidayDays ?? 0, r.late, r.missing])
  const exportCsv = () => {
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const lines = [repHeader.join(','), ...repRows().map(r => r.map(esc).join(','))]
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `bordro-puantaj-${month}.csv`; a.click(); URL.revokeObjectURL(url)
  }
  const exportPdf = () => printPdf(`Bordro / Yasal puantaj · ${monthLabel(month)}`, repHeader, repRows())

  return (
    <div>
      <PageHead title="Raporlar" subtitle={`${monthLabel(month)} · ${rows.length} çalışan`}
        actions={<>
          <div className="rowx gap6" style={{ marginRight: 6 }}>
            <button className="btn btn-ghost" onClick={() => setMonth(m => shiftMonth(m, -1))} style={{ width: 40, height: 44, padding: 0, transform: 'scaleX(-1)' }}><Icon name="chevron" size={18} color="var(--ink)" /></button>
            <div className="t-bodys" style={{ minWidth: 120, textAlign: 'center', fontSize: 14.5 }}>{monthLabel(month)}</div>
            <button className="btn btn-ghost" disabled={isCurrent} onClick={() => setMonth(m => shiftMonth(m, 1))} style={{ width: 40, height: 44, padding: 0, opacity: isCurrent ? 0.4 : 1 }}><Icon name="chevron" size={18} color="var(--ink)" /></button>
          </div>
          <button className="btn btn-ghost" style={{ height: 44 }} onClick={exportCsv}><Icon name="doc" size={18} color="var(--ink)" /> Excel</button>
          <button className="btn btn-ghost" style={{ height: 44 }} onClick={exportPdf}><Icon name="doc" size={18} color="var(--ink)" /> PDF</button>
        </>} />

      <div className="rowx gap14 stat-row" style={{ marginBottom: 18 }}>
        <StatCard label="Toplam net" value={`${totals.netHours.toFixed(0)} s`} sub="çalışılan" icon="clock" />
        <StatCard label="Fazla mesai" value={`${totals.overtimeHours.toFixed(0)} s`} sub="toplam" tone="brand" icon="calendar" />
        <StatCard label="Geç giriş" value={totals.late} sub="gün" tone="warn" icon="alert" />
        <StatCard label="Eksik kayıt" value={totals.missing} sub="gün" tone="err" icon="doc" />
      </div>

      {/* Filtreler */}
      <div className="rowx between filter-bar" style={{ marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <SearchInput placeholder="Çalışan ara…" width={260} value={q} onChange={setQ} />
        <div className="rowx gap8" style={{ flexWrap: 'wrap' }}>
          <select className="input" value={branch} onChange={e => setBranch(e.target.value)} style={{ width: 170, height: 44 }}>
            <option value="all">Tüm şubeler</option>
            {branches.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <select className="input" value={dept} onChange={e => setDept(e.target.value)} style={{ width: 170, height: 44 }}>
            <option value="all">Tüm departmanlar</option>
            {depts.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
      </div>

      {rows.length === 0 ? <div className="card" style={{ padding: 24 }}><span className="t-body ink-2">Filtreye uyan kayıt yok</span></div> : (
        <>
          {/* Görsel karşılaştırma */}
          <div className="card" style={{ padding: 20, marginBottom: 18 }}>
            <div className="rowx between" style={{ marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
              <span className="t-bodys" style={{ fontSize: 15 }}>{mDef.label} — çalışan karşılaştırma</span>
              <div className="rowx gap6" style={{ flexWrap: 'wrap' }}>
                {METRICS.map(m => (
                  <button key={m.key} onClick={() => setMetric(m.key)} className="btn" style={{ height: 32, padding: '0 12px', borderRadius: 'var(--r-full)', fontSize: 12.5, fontWeight: 600, background: metric === m.key ? 'var(--brand-600)' : 'var(--surface-2)', color: metric === m.key ? '#fff' : 'var(--ink-2)', border: '1px solid ' + (metric === m.key ? 'var(--brand-600)' : 'var(--border)') }}>{m.label}</button>
                ))}
              </div>
            </div>
            <div className="col" style={{ gap: 10 }}>
              {sorted.map((r, i) => (
                <div key={i} className="rowx gap12" style={{ alignItems: 'center' }}>
                  <span className="t-sm" style={{ width: 150, flex: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</span>
                  <div style={{ flex: 1, height: 16, background: 'var(--surface-3)', borderRadius: 8, overflow: 'hidden' }}>
                    <div style={{ width: `${(r[metric] / max) * 100}%`, height: '100%', background: `var(--${mDef.tone === 'brand' ? 'brand-500' : mDef.tone === 'warn' ? 'warn-ink' : 'err'})`, borderRadius: 8, transition: 'width .3s ease' }} />
                  </div>
                  <span className="t-sm mono tnum" style={{ width: 56, flex: 'none', textAlign: 'right' }}>{r[metric]}<span className="ink-3" style={{ fontSize: 11 }}> {mDef.unit === 's' ? 's' : ''}</span></span>
                </div>
              ))}
            </div>
          </div>

          {/* Bordro / yasal puantaj tablosu */}
          <div className="t-h3" style={{ margin: '4px 0 10px' }}>Bordro / yasal puantaj <span className="t-cap ink-3">· {monthLabel(month)} · Excel/PDF olarak dışa aktarılabilir</span></div>
          <Table cols={[{ label: 'ÇALIŞAN', flex: 1.7 }, { label: 'ŞUBE / DEPT', flex: 1.3 }, { label: 'GÜN', w: 60, align: 'right' }, { label: 'NET (s)', w: 78, align: 'right' }, { label: 'FAZLA (s)', w: 82, align: 'right' }, { label: 'İZİN', w: 60, align: 'right' }, { label: 'TATİL', w: 64, align: 'right' }, { label: 'EKSİK', w: 64, align: 'right' }]}>
            {sorted.map((r, i) => (
              <Row key={i} i={i} cells={[
                { flex: 1.7, node: <div><span className="t-bodys" style={{ fontSize: 14.5 }}>{r.name}</span><div className="t-cap ink-3 mono">SİCİL {r.sicil || '—'}</div></div> },
                { flex: 1.3, node: <span className="t-cap ink-3">{r.branch || '—'}{r.dept ? ` · ${r.dept}` : ''}</span> },
                { w: 60, align: 'right', node: <span className="t-sm mono">{r.workedDays ?? 0}</span> },
                { w: 78, align: 'right', node: <span className="t-sm mono">{r.netHours}</span> },
                { w: 82, align: 'right', node: <span className="t-sm mono" style={{ color: r.overtimeHours ? 'var(--brand-700)' : 'var(--ink-3)' }}>{r.overtimeHours}</span> },
                { w: 60, align: 'right', node: <span className="t-sm mono" style={{ color: (r.leaveDays ?? 0) ? 'var(--ink)' : 'var(--ink-3)' }}>{r.leaveDays ?? 0}</span> },
                { w: 64, align: 'right', node: <span className="t-sm mono ink-3">{r.holidayDays ?? 0}</span> },
                { w: 64, align: 'right', node: <span className="t-sm mono" style={{ color: r.missing ? 'var(--err-ink)' : 'var(--ink-3)' }}>{r.missing}</span> },
              ]} />
            ))}
          </Table>
        </>
      )}
    </div>
  )
}
