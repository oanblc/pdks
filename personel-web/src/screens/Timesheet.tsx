// Timesheet.tsx — C6 Puantaj & Mesai (gerçek API: dönem seçimi, çalışan detayı, dışa aktarım)
import { useEffect, useState } from 'react'
import { Icon } from '../icons'
import { api } from '../api'
import { PageHead, StatCard, Table, Row, StatusChip, Avatar, type Tone } from '../ui'

const hhmm = (m: number) => `${Math.floor(Math.abs(m) / 60)}:${String(Math.abs(m) % 60).padStart(2, '0')}`
const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
const WD = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt']
const monthLabel = (m: string) => { const [y, mo] = m.split('-').map(Number); return `${AYLAR[mo - 1]} ${y}` }
const shiftMonth = (m: string, delta: number) => { const [y, mo] = m.split('-').map(Number); const d = new Date(y, mo - 1 + delta, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
const thisMonth = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` }
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const monthFirst = (m: string) => `${m}-01`
const monthLast = (m: string) => { const [y, mo] = m.split('-').map(Number); return `${m}-${String(new Date(y, mo, 0).getDate()).padStart(2, '0')}` }
const rangeLabel = (from: string, to: string) => from === to ? from : `${from} → ${to}`

type EmpRow = { id: number; name: string; branch: string | null; dept: string | null; sicil: string | null; present: number; netMin: number; overtimeMin: number; missing: number; flaggedCount: number }
type Flag = { empId: number; name: string; branch: string; date: string; day: number; status: string; flagged: boolean; netMin: number; diffMin: number; ageDays: number }
type Data = { month: string; employees: EmpRow[]; flagged: Flag[]; overtimeWeeks: { name: string; week: string; hours: number }[] }
const stTone: Record<string, [Tone, string]> = { missing: ['warn', 'Eksik basma'], over: ['brand', 'Fazla mesai'], short: ['warn', 'Kısa gün'], full: ['ok', 'Tam gün'], leave: ['neu', 'İzinli'], holiday: ['neu', 'Tatil (kapalı)'], 'holiday-work': ['brand', 'Bayram mesaisi'] }

// "Çözüm süresi" (eski adıyla SLA): bayraklı kayıt kaç gündür açık
const slaOf = (age: number): [Tone, string] => age <= 1 ? ['neu', '0–1 gün'] : age <= 3 ? ['warn', '2–3 gün'] : ['err', 'Gecikti']

function downloadCsv(name: string, header: string[], rows: (string | number | null)[][]) {
  const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = [header.join(','), ...rows.map(r => r.map(esc).join(','))]
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url)
}

function printPdf(title: string, header: string[], rows: (string | number | null)[][]) {
  const esc = (s: any) => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!))
  const thead = header.map(h => `<th>${esc(h)}</th>`).join('')
  const tbody = rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
    <style>body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#15201f;padding:28px}
    h1{font-size:18px;margin:0 0 4px}.sub{color:#6b7a78;font-size:12px;margin-bottom:18px}
    table{width:100%;border-collapse:collapse;font-size:12px}
    th{text-align:left;border-bottom:2px solid #0e6b6b;padding:8px 6px;color:#0e6b6b;text-transform:uppercase;font-size:10px}
    td{padding:7px 6px;border-bottom:1px solid #e6ece9}</style></head>
    <body><h1>${esc(title)}</h1><div class="sub">puanto · Yönetici paneli · ${new Date().toLocaleString('tr-TR')}</div>
    <table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table>
    <script>window.onload=function(){window.print()}</script></body></html>`
  const w = window.open('', '_blank'); if (!w) { alert('PDF için açılır pencereye izin verin.'); return }
  w.document.write(html); w.document.close()
}

export function Timesheet() {
  const [month, setMonth] = useState(thisMonth())
  const [d, setD] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  const [openEmp, setOpenEmp] = useState<EmpRow | null>(null)
  const [branchFilter, setBranchFilter] = useState<string | null>(null)
  const [flaggedOpen, setFlaggedOpen] = useState(false)
  const isCurrent = month === thisMonth()

  useEffect(() => {
    setLoading(true)
    api.timesheet(month).then((r: any) => { setD(r); setLoading(false) }).catch(() => { setD({ month, employees: [], flagged: [], overtimeWeeks: [] }); setLoading(false) })
  }, [month])

  const overdue = (d?.flagged ?? []).filter(f => f.ageDays > 3).length

  const exportRows = (): (string | number | null)[][] =>
    (d?.employees ?? []).map(e => [e.name, e.sicil, e.branch, e.dept, e.present, hhmm(e.netMin), hhmm(e.overtimeMin), e.missing, e.flaggedCount])
  const exportHeader = ['Ad', 'Sicil', 'Şube', 'Departman', 'Gün', 'Net (s:dk)', 'Fazla mesai', 'Eksik', 'Bayraklı']
  const onCsv = () => downloadCsv(`puantaj-${month}.csv`, exportHeader, exportRows())
  const onPdf = () => printPdf(`Puantaj & Mesai · ${monthLabel(month)}`, exportHeader, exportRows())

  // Şube bazlı toplam puantaj (çalışan satırlarından türetilir)
  const branchAgg = (() => {
    const m = new Map<string, { name: string; emps: number; present: number; netMin: number; overtimeMin: number; missing: number; flagged: number }>()
    for (const e of d?.employees ?? []) {
      const key = e.branch || '— Şubesiz'
      const cur = m.get(key) ?? { name: key, emps: 0, present: 0, netMin: 0, overtimeMin: 0, missing: 0, flagged: 0 }
      cur.emps++; cur.present += e.present; cur.netMin += e.netMin; cur.overtimeMin += e.overtimeMin; cur.missing += e.missing; cur.flagged += e.flaggedCount
      m.set(key, cur)
    }
    return [...m.values()].sort((a, b) => (a.name < b.name ? -1 : 1))
  })()
  const shownEmps = (d?.employees ?? []).filter(e => !branchFilter || (e.branch || '— Şubesiz') === branchFilter)

  if (openEmp) return <EmployeeSheet emp={openEmp} initialMonth={month} onBack={() => setOpenEmp(null)} />

  return (
    <div>
      <PageHead title="Puantaj & Mesai" subtitle={`${monthLabel(month)} · canlı veri`}
        actions={<>
          <div className="rowx gap6" style={{ marginRight: 6 }}>
            <button className="btn btn-ghost" onClick={() => setMonth(m => shiftMonth(m, -1))} style={{ width: 40, height: 44, padding: 0, transform: 'scaleX(-1)' }}><Icon name="chevron" size={18} color="var(--ink)" /></button>
            <div className="t-bodys" style={{ minWidth: 130, textAlign: 'center', fontSize: 14.5 }}>{monthLabel(month)}</div>
            <button className="btn btn-ghost" disabled={isCurrent} onClick={() => setMonth(m => shiftMonth(m, 1))} style={{ width: 40, height: 44, padding: 0, opacity: isCurrent ? 0.4 : 1 }}><Icon name="chevron" size={18} color="var(--ink)" /></button>
          </div>
          <button className="btn btn-ghost" style={{ height: 44 }} onClick={onCsv}><Icon name="doc" size={18} color="var(--ink)" /> Excel</button>
          <button className="btn btn-ghost" style={{ height: 44 }} onClick={onPdf}><Icon name="doc" size={18} color="var(--ink)" /> PDF</button>
        </>} />

      <div className="rowx gap14" style={{ marginBottom: 18 }}>
        <StatCard label="Çalışan" value={d?.employees.length ?? 0} sub="bu dönem" icon="user" />
        <StatCard label="Bayraklı kayıt" value={d?.flagged.length ?? 0} sub="inceleme gerekir" tone="warn" icon="alert" />
        <StatCard label="Gecikmiş çözüm" value={overdue} sub="3 günü aştı" tone="err" icon="clock" />
        <StatCard label="45s aşan hafta" value={d?.overtimeWeeks.length ?? 0} sub="fazla mesai" tone="brand" icon="calendar" />
      </div>

      {loading ? <div className="t-body ink-2">Yükleniyor…</div> : (
        <>
          {/* ── Şube puantajı (toplam) ── */}
          <div className="t-h3" style={{ marginBottom: 12 }}>Şube puantajı <span className="t-cap ink-3">· şubeye tıkla, o şubenin çalışanlarını süz</span></div>
          {branchAgg.length === 0 ? <div className="card" style={{ padding: 24 }}><span className="t-body ink-2">Bu dönemde kayıt yok</span></div> : (
            <Table cols={[{ label: 'ŞUBE', flex: 1.9 }, { label: 'ÇALIŞAN', flex: 0.8 }, { label: 'NET', flex: 1 }, { label: 'FAZLA MESAİ', flex: 1.1 }, { label: 'EKSİK', flex: 0.8 }, { label: 'BAYRAK', w: 110, align: 'right' }]}>
              {branchAgg.map((b, i) => {
                const selected = branchFilter === b.name
                return (
                  <Row key={b.name} i={i} onClick={() => setBranchFilter(selected ? null : b.name)} cells={[
                    { flex: 1.9, node: <div className="rowx gap12" style={{ alignItems: 'center' }}><div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--brand-50)', display: 'grid', placeItems: 'center' }}><Icon name="building" size={18} color="var(--brand-700)" /></div><div className="t-bodys" style={{ fontSize: 14.5 }}>{b.name}</div>{selected && <StatusChip status="brand">Süzülüyor</StatusChip>}</div> },
                    { flex: 0.8, node: <span className="t-sm mono">{b.emps}</span> },
                    { flex: 1, node: <span className="t-sm mono">{hhmm(b.netMin)}</span> },
                    { flex: 1.1, node: <span className="t-sm mono" style={{ color: 'var(--brand-700)' }}>{b.overtimeMin > 0 ? '+' + hhmm(b.overtimeMin) : '—'}</span> },
                    { flex: 0.8, node: <span className="t-sm mono" style={{ color: b.missing ? 'var(--warn-ink)' : 'var(--ink-3)' }}>{b.missing}</span> },
                    { w: 110, align: 'right', node: b.flagged > 0 ? <StatusChip status="err">{b.flagged} bayrak</StatusChip> : <span className="t-sm ink-3">—</span> },
                  ]} />
                )
              })}
            </Table>
          )}

          {/* ── Çalışan puantajı ── */}
          <div className="rowx between" style={{ margin: '24px 0 12px', alignItems: 'center' }}>
            <div className="t-h3">Çalışan puantajı {branchFilter && <span className="t-cap" style={{ color: 'var(--brand-700)' }}>· {branchFilter}</span>} <span className="t-cap ink-3">· satıra tıkla, günlük giriş-çıkış</span></div>
            {branchFilter && <button className="btn btn-ghost" style={{ height: 34, fontSize: 13 }} onClick={() => setBranchFilter(null)}>Tüm şubeler</button>}
          </div>
          {shownEmps.length === 0 ? <div className="card" style={{ padding: 24 }}><span className="t-body ink-2">Bu dönemde kayıt yok</span></div> : (
            <Table cols={[{ label: 'ÇALIŞAN', flex: 1.9 }, { label: 'GÜN', flex: 0.8 }, { label: 'NET', flex: 1 }, { label: 'FAZLA MESAİ', flex: 1.1 }, { label: 'EKSİK', flex: 0.8 }, { label: 'BAYRAK', w: 110, align: 'right' }]}>
              {shownEmps.map((e, i) => (
                <Row key={e.id} i={i} onClick={() => setOpenEmp(e)} cells={[
                  { flex: 1.9, node: <div className="rowx gap12"><Avatar name={e.name} size={36} /><div><div className="t-bodys" style={{ fontSize: 14.5 }}>{e.name}</div><div className="t-cap ink-3">{e.branch || '—'}{e.dept ? ` · ${e.dept}` : ''}</div></div></div> },
                  { flex: 0.8, node: <span className="t-sm mono">{e.present}</span> },
                  { flex: 1, node: <span className="t-sm mono">{hhmm(e.netMin)}</span> },
                  { flex: 1.1, node: <span className="t-sm mono" style={{ color: 'var(--brand-700)' }}>{e.overtimeMin > 0 ? '+' + hhmm(e.overtimeMin) : '—'}</span> },
                  { flex: 0.8, node: <span className="t-sm mono" style={{ color: e.missing ? 'var(--warn-ink)' : 'var(--ink-3)' }}>{e.missing}</span> },
                  { w: 110, align: 'right', node: e.flaggedCount > 0 ? <StatusChip status="err">{e.flaggedCount} bayrak</StatusChip> : <span className="t-sm ink-3">—</span> },
                ]} />
              ))}
            </Table>
          )}

          {/* ── Bayraklı kayıtlar (katlanır — varsayılan kapalı) ── */}
          <button className="card row-press rowx between" onClick={() => setFlaggedOpen(o => !o)}
            style={{ width: '100%', padding: '15px 18px', margin: '24px 0 0', cursor: 'pointer', border: '1px solid var(--border)', alignItems: 'center' }}>
            <div className="rowx gap10" style={{ alignItems: 'center' }}>
              <Icon name="alert" size={18} color={(d?.flagged.length ?? 0) > 0 ? 'var(--warn-ink)' : 'var(--ink-3)'} />
              <span className="t-bodys" style={{ fontSize: 15 }}>Bayraklı kayıtlar</span>
              {(d?.flagged.length ?? 0) > 0 && <StatusChip status="warn">{d!.flagged.length}</StatusChip>}
              {overdue > 0 && <StatusChip status="err">{overdue} gecikmiş</StatusChip>}
            </div>
            <Icon name={flaggedOpen ? 'chevronDown' : 'chevron'} size={18} color="var(--ink-3)" />
          </button>
          {flaggedOpen && (
            <div style={{ marginTop: 12 }}>
              <div className="t-cap ink-3" style={{ marginBottom: 12 }}>Çözüm süresi: bir bayraklı kaydın kaç gündür açık olduğunu gösterir; geciken kayıt bordroyu etkiler.</div>
              {(d?.flagged.length ?? 0) === 0 ? <div className="card" style={{ padding: 24 }}><span className="t-body ink-2">Bayraklı kayıt yok</span></div> : (
                <Table cols={[{ label: 'ÇALIŞAN', flex: 1.6 }, { label: 'GÜN', flex: 1 }, { label: 'DURUM', flex: 1.2 }, { label: 'NET', flex: 0.9 }, { label: 'FARK', flex: 0.9 }, { label: 'ÇÖZÜM SÜRESİ', w: 140, align: 'right' }]}>
                  {d!.flagged.map((f, i) => {
                    const sla = slaOf(f.ageDays)
                    return (
                      <Row key={i} i={i} cells={[
                        { flex: 1.6, node: <div><span className="t-bodys" style={{ fontSize: 14.5 }}>{f.name}</span><div className="t-cap ink-3">{f.branch}</div></div> },
                        { flex: 1, node: <span className="t-sm mono ink-2">{f.date}</span> },
                        { flex: 1.2, node: f.flagged ? <StatusChip status="err">İtirazlı / bayraklı</StatusChip> : <StatusChip status={stTone[f.status]?.[0] ?? 'neu'}>{stTone[f.status]?.[1] ?? f.status}</StatusChip> },
                        { flex: 0.9, node: <span className="t-sm mono">{hhmm(f.netMin)}</span> },
                        { flex: 0.9, node: <span className="t-sm mono" style={{ color: f.diffMin >= 0 ? 'var(--ok-ink)' : 'var(--warn-ink)' }}>{f.diffMin >= 0 ? '+' : '-'}{hhmm(f.diffMin)}</span> },
                        { w: 140, align: 'right', node: <StatusChip status={sla[0]}>{sla[1]}</StatusChip> },
                      ]} />
                    )
                  })}
                </Table>
              )}
            </div>
          )}

          {(d?.overtimeWeeks.length ?? 0) > 0 && (
            <>
              <div className="t-h3" style={{ margin: '24px 0 12px' }}>Haftalık 45 saat aşımı</div>
              <Table cols={[{ label: 'ÇALIŞAN', flex: 2 }, { label: 'HAFTA', flex: 1.5 }, { label: 'SAAT', w: 120, align: 'right' }]}>
                {d!.overtimeWeeks.map((w, i) => (
                  <Row key={i} i={i} cells={[
                    { flex: 2, node: <span className="t-body">{w.name}</span> },
                    { flex: 1.5, node: <span className="t-sm mono ink-2">{w.week}</span> },
                    { w: 120, align: 'right', node: <span className="t-bodys mono" style={{ color: 'var(--brand-700)' }}>{w.hours} s</span> },
                  ]} />
                ))}
              </Table>
            </>
          )}
        </>
      )}

    </div>
  )
}

type Day = { date: string; day: number; in: string | null; out: string | null; breakMin: number; netMin: number; diffMin: number; status: string; flagged: boolean; device?: string | null }
type Sheet = { employee: { id: number; name: string; dept: string | null; sicil: string | null } | null; month: string; days: Day[]; summary: { netMin: number; overtimeMin: number; present: number; missing: number } }

function EmployeeSheet({ emp, initialMonth, onBack }: { emp: EmpRow; initialMonth: string; onBack: () => void }) {
  const [from, setFrom] = useState(monthFirst(initialMonth))
  const [to, setTo] = useState(monthLast(initialMonth))
  const [s, setS] = useState<Sheet | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const load = (silent = false) => { if (!silent) setS(null); api.employeeTimesheet(emp.id, { from, to }).then(setS as any).catch(() => setS(null)) }
  useEffect(() => { load() }, [emp.id, from, to])

  const resolve = async (date: string, action: 'approve' | 'dispute') => {
    setBusy(date)
    try { await api.resolveFlag(emp.id, date, action); load(true) }
    catch (e: any) { alert(e.message) } finally { setBusy(null) }
  }

  const setMonthRange = (m: string) => { setFrom(monthFirst(m)); setTo(monthLast(m)) }
  const lastNDays = (n: number) => { const t = new Date(); const f = new Date(); f.setDate(f.getDate() - (n - 1)); setFrom(iso(f)); setTo(iso(t)) }
  const today = () => { const t = iso(new Date()); setFrom(t); setTo(t) }
  const label = rangeLabel(from, to)

  const wd = (date: string) => WD[new Date(date + 'T00:00:00').getDay()]
  const rows = (): (string | number | null)[][] =>
    (s?.days ?? []).map(d => [d.date, wd(d.date), d.in || '—', d.out || 'Yok', hhmm(d.breakMin), hhmm(d.netMin), (d.diffMin >= 0 ? '+' : '-') + hhmm(d.diffMin), stTone[d.status]?.[1] ?? d.status, d.flagged ? 'BAYRAKLI' : ''])
  const header = ['Tarih', 'Gün', 'Giriş', 'Çıkış', 'Mola', 'Net', 'Fark', 'Durum', 'Bayrak']
  const fileName = `puantaj-${emp.name.replace(/\s+/g, '_')}-${from}_${to}`

  return (
    <div>
      <button className="btn btn-ghost" onClick={onBack} style={{ height: 38, padding: '0 12px', marginBottom: 14 }}><Icon name="chevron" size={17} color="var(--ink)" /> Puantaja dön</button>

      <div className="rowx between" style={{ marginBottom: 16, gap: 16, alignItems: 'flex-start' }}>
        <div className="rowx gap14">
          <Avatar name={emp.name} size={52} />
          <div>
            <div className="t-h1" style={{ fontSize: 26 }}>{emp.name}</div>
            <div className="t-body ink-2" style={{ marginTop: 4 }}>SİCİL {emp.sicil || '—'} · {emp.branch || '—'}{emp.dept ? ` · ${emp.dept}` : ''}</div>
          </div>
        </div>
        <div className="rowx gap10">
          <button className="btn btn-ghost" style={{ height: 44 }} onClick={() => downloadCsv(fileName + '.csv', header, rows())}><Icon name="doc" size={18} color="var(--ink)" /> Excel</button>
          <button className="btn btn-ghost" style={{ height: 44 }} onClick={() => printPdf(`${emp.name} · ${label}`, header, rows())}><Icon name="doc" size={18} color="var(--ink)" /> PDF</button>
        </div>
      </div>

      {/* Dönem / gün aralığı seçimi */}
      <div className="card" style={{ padding: '14px 16px', marginBottom: 18 }}>
        <div className="rowx" style={{ gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="col" style={{ gap: 6 }}><label className="t-mono-label ink-3">BAŞLANGIÇ</label><input type="date" className="input mono" value={from} max={to} onChange={e => setFrom(e.target.value)} style={{ width: 170, height: 42 }} /></div>
          <div className="t-body ink-3" style={{ paddingBottom: 10 }}>→</div>
          <div className="col" style={{ gap: 6 }}><label className="t-mono-label ink-3">BİTİŞ</label><input type="date" className="input mono" value={to} min={from} max={iso(new Date())} onChange={e => setTo(e.target.value)} style={{ width: 170, height: 42 }} /></div>
          <div className="rowx gap6" style={{ marginLeft: 'auto', flexWrap: 'wrap' }}>
            <button className="btn btn-ghost" onClick={today} style={{ height: 36, padding: '0 12px', fontSize: 13 }}>Bugün</button>
            <button className="btn btn-ghost" onClick={() => lastNDays(7)} style={{ height: 36, padding: '0 12px', fontSize: 13 }}>Son 7 gün</button>
            <button className="btn btn-ghost" onClick={() => setMonthRange(shiftMonth(thisMonth(), -1))} style={{ height: 36, padding: '0 12px', fontSize: 13 }}>Geçen ay</button>
            <button className="btn btn-ghost" onClick={() => setMonthRange(thisMonth())} style={{ height: 36, padding: '0 12px', fontSize: 13 }}>Bu ay</button>
          </div>
        </div>
      </div>

      {!s ? <div className="t-body ink-2">Yükleniyor…</div> : (
        <>
          <div className="rowx gap14" style={{ marginBottom: 18 }}>
            {[['Gün', String(s.summary.present)], ['Net', hhmm(s.summary.netMin)], ['Fazla mesai', '+' + hhmm(s.summary.overtimeMin)], ['Eksik', String(s.summary.missing)]].map(([k, v], i) => (
              <div key={i} className="card" style={{ flex: 1, padding: '16px 18px' }}>
                <div className="t-cap ink-3">{k}</div>
                <div className="t-h2 mono" style={{ fontSize: 24, marginTop: 4, color: i === 1 || i === 2 ? 'var(--brand-700)' : 'var(--ink)' }}>{v}</div>
              </div>
            ))}
          </div>
          {s.days.length === 0 ? <div className="card" style={{ padding: 24, textAlign: 'center' }}><span className="t-body ink-2">Bu dönemde basış kaydı yok</span></div> : (
            <Table cols={[{ label: 'TARİH', flex: 1.1 }, { label: 'GİRİŞ', flex: 0.8 }, { label: 'ÇIKIŞ', flex: 0.8 }, { label: 'EKRAN', flex: 1.1 }, { label: 'MOLA', flex: 0.7 }, { label: 'NET', flex: 0.8 }, { label: 'FARK', flex: 0.8 }, { label: 'DURUM', w: 220, align: 'right' }]}>
              {s.days.map((day, i) => (
                <Row key={i} i={i} cells={[
                  { flex: 1.1, node: <span className="t-sm mono">{day.date.slice(8)} {wd(day.date)}</span> },
                  { flex: 0.8, node: <span className="t-sm mono">{day.in || '—'}</span> },
                  { flex: 0.8, node: <span className="t-sm mono" style={{ color: day.out ? 'var(--ink)' : 'var(--warn-ink)' }}>{day.out || 'Yok'}</span> },
                  { flex: 1.1, node: <span className="t-cap ink-2">{day.device || '—'}</span> },
                  { flex: 0.7, node: <span className="t-sm mono ink-2">{hhmm(day.breakMin)}</span> },
                  { flex: 0.8, node: <span className="t-sm mono">{hhmm(day.netMin)}</span> },
                  { flex: 0.8, node: <span className="t-sm mono" style={{ color: day.diffMin >= 0 ? 'var(--ok-ink)' : 'var(--warn-ink)' }}>{day.diffMin >= 0 ? '+' : '-'}{hhmm(day.diffMin)}</span> },
                  { w: 220, align: 'right', node: <div className="rowx gap6" style={{ justifyContent: 'flex-end', alignItems: 'center' }}>
                    {day.flagged && <>
                      <button className="btn" disabled={busy === day.date} onClick={() => resolve(day.date, 'approve')} title="Bayrağı onayla ve kaldır" style={{ height: 30, padding: '0 10px', fontSize: 12.5, borderRadius: 'var(--r-sm)', background: 'var(--ok-bg)', color: 'var(--ok-ink)', border: '1px solid var(--ok-ink)', opacity: busy === day.date ? 0.5 : 1 }}>{busy === day.date ? '…' : 'Onayla'}</button>
                      <button className="btn" disabled={busy === day.date} onClick={() => { if (confirm(`${day.date} günü itirazlı olarak işaretlensin mi? Kayıt incelemede kalır.`)) resolve(day.date, 'dispute') }} title="Bayrağı itirazlı işaretle (incelemede kalır)" style={{ height: 30, padding: '0 10px', fontSize: 12.5, borderRadius: 'var(--r-sm)', background: 'transparent', color: 'var(--err)', border: '1px solid var(--err-ring)', opacity: busy === day.date ? 0.5 : 1 }}>İtiraz</button>
                      <StatusChip status="err">Bayraklı</StatusChip>
                    </>}
                    <StatusChip status={stTone[day.status]?.[0] ?? 'neu'}>{stTone[day.status]?.[1] ?? day.status}</StatusChip>
                  </div> },
                ]} />
              ))}
            </Table>
          )}
        </>
      )}
    </div>
  )
}
