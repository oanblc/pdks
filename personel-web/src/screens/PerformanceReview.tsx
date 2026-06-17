// PerformanceReview.tsx — Performans · yıllık değerlendirme listesi + kriter yönetimi
import { useEffect, useState } from 'react'
import { Icon } from '../icons'
import { api, type EvalRow, type EvalCrit } from '../api'
import { goto } from '../nav'
import { PageHead, StatCard, Table, Row, Avatar, ScoreBadge, StatusChip, scoreBand, Pill, Modal, type Tone } from '../ui'

const statusChip: Record<string, [Tone, string]> = { published: ['ok', 'Yayınlandı'], draft: ['warn', 'Taslak'], none: ['neu', 'Değerlendirilmedi'] }

export function PerformanceReview() {
  const thisYear = new Date().getFullYear()
  const [year, setYear] = useState(thisYear)
  const [rows, setRows] = useState<EvalRow[]>([])
  const [criteria, setCriteria] = useState<EvalCrit[]>([])
  const [loading, setLoading] = useState(true)
  const [editCriteria, setEditCriteria] = useState(false)

  const load = (y: number) => {
    setLoading(true)
    api.evaluations(y).then(d => { setRows(d.employees); setCriteria(d.criteria); setLoading(false) }).catch(() => setLoading(false))
  }
  useEffect(() => { load(year) }, [year])

  const total = rows.length
  const evaluated = rows.filter(r => r.status !== 'none').length
  const published = rows.filter(r => r.status === 'published').length
  const draft = rows.filter(r => r.status === 'draft').length
  const avg = total ? Math.round(rows.reduce((s, r) => s + (r.overall ?? 0), 0) / total) : 0

  return (
    <div>
      <PageHead title="Performans Değerlendirmesi"
        subtitle={`${year} yılı · yıldız puanları + puantajdan otomatik devam skoru`}
        actions={<>
          <button className="btn btn-ghost" style={{ height: 44 }} onClick={() => setEditCriteria(true)}><Icon name="edit" size={17} color="var(--ink)" /> Kriterleri düzenle</button>
        </>} />

      <div className="rowx gap10" style={{ marginBottom: 16 }}>
        <span className="t-cap ink-3" style={{ alignSelf: 'center', marginRight: 2 }}>Yıl:</span>
        {[thisYear, thisYear - 1, thisYear - 2].map(y => <Pill key={y} active={y === year} onClick={() => setYear(y)}>{y}</Pill>)}
      </div>

      <div className="rowx gap14" style={{ marginBottom: 18 }}>
        <StatCard label="Ortalama skor" value={avg} sub={scoreBand(avg).label} tone={scoreBand(avg).tone} icon="star" />
        <StatCard label="Değerlendirilen" value={`${evaluated} / ${total}`} sub="çalışan" icon="user" />
        <StatCard label="Yayınlanan" value={published} sub="tamamlandı" tone="ok" icon="check" />
        <StatCard label="Taslak" value={draft} sub="devam ediyor" tone="warn" icon="edit" />
      </div>

      {loading ? <div className="t-body ink-2">Yükleniyor…</div> : (
        <>
          <div className="t-h3" style={{ marginBottom: 12 }}>Çalışan karneleri <span className="t-cap ink-3">· satıra tıkla, değerlendirmeyi aç</span></div>
          <Table cols={[{ label: 'ÇALIŞAN', flex: 2 }, { label: 'GENEL SKOR', w: 150 }, { label: 'BAND', flex: 0.9 }, { label: 'DEVAM (OTO)', w: 100, align: 'right' }, { label: 'DURUM', flex: 1, align: 'right' }]}>
            {rows.map((e, i) => {
              const band = e.overall != null ? scoreBand(e.overall) : null
              const ch = statusChip[e.status] ?? statusChip.none
              return (
                <Row key={e.empId} i={i} onClick={() => goto('evaluationDetail', { empId: e.empId, name: e.name, year })} cells={[
                  { flex: 2, node: <div className="rowx gap12"><Avatar name={e.name} src={e.avatar || undefined} size={36} /><div><div className="t-bodys" style={{ fontSize: 14.5 }}>{e.name}</div><div className="t-cap ink-3">{e.branch || '—'}{e.dept ? ` · ${e.dept}` : ''}</div></div></div> },
                  { w: 150, node: <ScoreBadge score={e.overall} /> },
                  { flex: 0.9, node: band ? <StatusChip status={band.tone}>{band.label}</StatusChip> : <span className="t-sm ink-3">—</span> },
                  { w: 100, align: 'right', node: <span className="t-sm mono ink-2">{e.autoScore}</span> },
                  { flex: 1, align: 'right', node: <StatusChip status={ch[0]}>{ch[1]}</StatusChip> },
                ]} />
              )
            })}
          </Table>
          <div className="rowx gap8" style={{ marginTop: 14 }}>
            <Icon name="info" size={16} color="var(--ink-3)" />
            <span className="t-cap ink-3">Genel skor = kriterlerin ağırlıklı ortalaması. "Devam (oto)" puantajdan otomatik üretilir; çalışana gösterilmez.</span>
          </div>
        </>
      )}

      {editCriteria && <CriteriaModal initial={criteria} onClose={() => setEditCriteria(false)} onDone={() => { setEditCriteria(false); load(year) }} />}
    </div>
  )
}

// ── Kriter düzenleme modalı ──
const slug = (s: string) => s.toLowerCase()
  .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30) || 'kriter'

function CriteriaModal({ initial, onClose, onDone }: { initial: EvalCrit[]; onClose: () => void; onDone: () => void }) {
  const [list, setList] = useState<EvalCrit[]>(initial.map(c => ({ ...c })))
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const setItem = (i: number, patch: Partial<EvalCrit>) => setList(l => l.map((c, j) => j === i ? { ...c, ...patch } : c))
  const remove = (i: number) => setList(l => l.filter((_, j) => j !== i))
  const add = () => {
    let id = 'kriter'; const used = new Set(list.map(c => c.id))
    let n = list.length + 1; while (used.has(`kriter-${n}`)) n++; id = `kriter-${n}`
    setList(l => [...l.filter(c => c.kind !== 'auto'), { id, label: '', category: '', weight: 1, kind: 'manual' }, ...l.filter(c => c.kind === 'auto')])
  }

  const submit = async () => {
    setErr(null)
    const out: EvalCrit[] = []
    const used = new Set<string>()
    for (const c of list) {
      const label = c.label.trim()
      if (!label) return setErr('Tüm kriterlerin bir adı olmalı')
      let id = c.id && /^[a-z0-9_-]+$/i.test(c.id) ? c.id : slug(label)
      while (used.has(id)) id = id + '-2'
      used.add(id)
      out.push({ id, label, hint: c.hint?.trim() || undefined, category: c.category?.trim() || undefined, weight: Number(c.weight) || 0, kind: c.kind })
    }
    if (!out.some(c => c.kind === 'auto')) return setErr('Otomatik "Devam & dakiklik" kriteri kaldırılamaz')
    setSaving(true)
    try { await api.updateEvalCriteria(out); onDone() }
    catch (e: any) { setErr(e.message); setSaving(false) }
  }

  return (
    <Modal title="Değerlendirme kriterleri" width={620} onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" style={{ height: 42 }} onClick={onClose}>Vazgeç</button>
        <button className="btn btn-primary" style={{ height: 42, opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={submit}>{saving ? 'Kaydediliyor…' : 'Kaydet'}</button>
      </>}>
      {err && <div className="t-sm" style={{ color: 'var(--err-ink)', background: 'var(--err-bg)', padding: '10px 12px', borderRadius: 'var(--r-sm)' }}>{err}</div>}
      <div className="t-cap ink-3" style={{ lineHeight: 1.5 }}>Her kritere bir <b>ağırlık</b> ver; genel skor ağırlıklı ortalamadır. "Devam & dakiklik" puantajdan otomatik hesaplanır, ağırlığı değiştirilebilir ama kaldırılamaz.</div>
      <div className="col" style={{ gap: 8 }}>
        {list.map((c, i) => (
          <div key={i} className="rowx gap8" style={{ alignItems: 'flex-start', padding: '10px 12px', borderRadius: 'var(--r-sm)', background: c.kind === 'auto' ? 'var(--brand-50)' : 'var(--surface-2)', border: '1px solid var(--border)' }}>
            <div className="col" style={{ flex: 1, gap: 6, minWidth: 0 }}>
              <input className="input" value={c.label} placeholder="Kriter adı" onChange={e => setItem(i, { label: e.target.value })} disabled={c.kind === 'auto'} />
              <input className="input" value={c.hint || ''} placeholder="Açıklama (opsiyonel)" onChange={e => setItem(i, { hint: e.target.value })} style={{ fontSize: 12.5, height: 34 }} disabled={c.kind === 'auto'} />
            </div>
            <div style={{ width: 92, flex: 'none' }}>
              <label className="field-label t-mono-label ink-3" style={{ display: 'block', marginBottom: 4 }}>AĞIRLIK</label>
              <input className="input mono" value={String(c.weight)} inputMode="numeric" onChange={e => setItem(i, { weight: Number(e.target.value.replace(/[^\d.]/g, '')) || 0 })} style={{ width: 92 }} />
            </div>
            <div style={{ width: 92, flex: 'none', alignSelf: 'center', paddingTop: 14 }}>
              {c.kind === 'auto'
                ? <StatusChip status="brand">Otomatik</StatusChip>
                : <button className="btn btn-ghost" style={{ height: 38, color: 'var(--err-ink)' }} onClick={() => remove(i)}><Icon name="x" size={15} color="var(--err-ink)" /> Sil</button>}
            </div>
          </div>
        ))}
      </div>
      <button className="btn btn-ghost" style={{ height: 40, alignSelf: 'flex-start' }} onClick={add}><Icon name="plus" size={16} color="var(--ink)" /> Kriter ekle</button>
    </Modal>
  )
}
