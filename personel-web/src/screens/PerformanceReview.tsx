// PerformanceReview.tsx — Performans · yıllık değerlendirme listesi + kriter yönetimi
import { useEffect, useState } from 'react'
import { Icon } from '../icons'
import { api, type EvalRow, type EvalCrit, type EvalCampaign } from '../api'
import { goto } from '../nav'
import { PageHead, StatCard, Table, Row, Avatar, Stars, toStars, StatusChip, scoreBand, Pill, Modal, Field, type Tone } from '../ui'

const statusChip: Record<string, [Tone, string]> = { published: ['ok', 'Yayınlandı'], draft: ['warn', 'Taslak'], none: ['neu', 'Değerlendirilmedi'] }
type Branch = { id: number; name: string }

export function PerformanceReview() {
  const thisYear = new Date().getFullYear()
  const [year, setYear] = useState(thisYear)
  const [rows, setRows] = useState<EvalRow[]>([])
  const [criteria, setCriteria] = useState<EvalCrit[]>([])
  const [loading, setLoading] = useState(true)
  const [editCriteria, setEditCriteria] = useState(false)
  const [campaigns, setCampaigns] = useState<EvalCampaign[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [newCampaign, setNewCampaign] = useState(false)

  const load = (y: number) => {
    setLoading(true)
    api.evaluations(y).then(d => { setRows(d.employees); setCriteria(d.criteria); setLoading(false) }).catch(() => setLoading(false))
  }
  const loadCampaigns = () => api.evalCampaigns().then(d => setCampaigns(d.campaigns)).catch(() => {})
  useEffect(() => { load(year) }, [year])
  useEffect(() => { loadCampaigns(); api.branches().then((b: any) => setBranches(b)).catch(() => {}) }, [])

  const closeCampaign = (id: number, status: 'active' | 'closed') => api.updateEvalCampaign(id, { status }).then(loadCampaigns)
  const removeCampaign = (id: number) => { if (confirm('Bu dönem ve girilen yönetici puanları silinsin mi? (Yayınlanan karneler etkilenmez)')) api.deleteEvalCampaign(id).then(loadCampaigns) }

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
          <button className="btn btn-primary" style={{ height: 44 }} onClick={() => setNewCampaign(true)}><Icon name="plus" size={17} color="#fff" /> Dönem oluştur</button>
        </>} />

      <div className="rowx gap10" style={{ marginBottom: 16 }}>
        <span className="t-cap ink-3" style={{ alignSelf: 'center', marginRight: 2 }}>Yıl:</span>
        {[thisYear, thisYear - 1, thisYear - 2].map(y => <Pill key={y} active={y === year} onClick={() => setYear(y)}>{y}</Pill>)}
      </div>

      <div className="rowx gap14" style={{ marginBottom: 18 }}>
        <StatCard label="Ortalama skor" value={`${toStars(avg)}`} sub={`5 üzerinden · ${scoreBand(avg).label}`} tone={scoreBand(avg).tone} icon="star" />
        <StatCard label="Değerlendirilen" value={`${evaluated} / ${total}`} sub="çalışan" icon="user" />
        <StatCard label="Yayınlanan" value={published} sub="tamamlandı" tone="ok" icon="check" />
        <StatCard label="Taslak" value={draft} sub="devam ediyor" tone="warn" icon="edit" />
      </div>

      {/* Değerlendirme dönemleri — yöneticinin kioskunda görünen, tarih aralıklı görevler */}
      {campaigns.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <div className="t-h3" style={{ marginBottom: 12 }}>Değerlendirme dönemleri <span className="t-cap ink-3">· seçili tarihlerde şube yöneticisinin kioskunda görünür</span></div>
          <div className="col" style={{ gap: 10 }}>
            {campaigns.map(c => {
              const pct = c.targetCount ? Math.round((c.submitted / c.targetCount) * 100) : 0
              return (
                <div key={c.id} className="card" style={{ padding: '14px 18px' }}>
                  <div className="rowx between" style={{ gap: 16, alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="rowx gap10" style={{ alignItems: 'center' }}>
                        <span className="t-bodys" style={{ fontSize: 15 }}>{c.name}</span>
                        {c.status === 'closed' ? <StatusChip status="neu">Kapalı</StatusChip> : c.active ? <StatusChip status="ok">Aktif</StatusChip> : <StatusChip status="warn">Beklemede</StatusChip>}
                      </div>
                      <div className="t-cap ink-3" style={{ marginTop: 4 }}>
                        {c.startDate} → {c.endDate} · {c.branches.join(', ') || '—'} · {c.criteria.length} kriter ({c.criteria.join(', ')})
                      </div>
                    </div>
                    <div className="rowx gap8" style={{ flex: 'none' }}>
                      {c.status === 'active'
                        ? <button className="btn btn-ghost" style={{ height: 36 }} onClick={() => closeCampaign(c.id, 'closed')}>Kapat</button>
                        : <button className="btn btn-ghost" style={{ height: 36 }} onClick={() => closeCampaign(c.id, 'active')}>Aç</button>}
                      <button className="btn btn-ghost" style={{ height: 36, color: 'var(--err-ink)' }} onClick={() => removeCampaign(c.id)}><Icon name="x" size={15} color="var(--err-ink)" /></button>
                    </div>
                  </div>
                  <div className="rowx gap10" style={{ alignItems: 'center', marginTop: 12 }}>
                    <div style={{ flex: 1, height: 7, borderRadius: 4, background: 'var(--surface-3)', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: 'var(--brand-600)', borderRadius: 4 }} />
                    </div>
                    <span className="t-cap mono ink-2" style={{ fontWeight: 700 }}>{c.submitted} / {c.targetCount} girildi</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {loading ? <div className="t-body ink-2">Yükleniyor…</div> : (
        <>
          <div className="t-h3" style={{ marginBottom: 12 }}>Çalışan karneleri <span className="t-cap ink-3">· satıra tıkla, değerlendirmeyi aç</span></div>
          <Table cols={[{ label: 'ÇALIŞAN', flex: 2 }, { label: 'GENEL SKOR', w: 170 }, { label: 'BAND', flex: 0.9 }, { label: 'DEVAM (OTO)', w: 110, align: 'right' }, { label: 'DURUM', flex: 1, align: 'right' }]}>
            {rows.map((e, i) => {
              const band = e.overall != null ? scoreBand(e.overall) : null
              const ch = statusChip[e.status] ?? statusChip.none
              return (
                <Row key={e.empId} i={i} onClick={() => goto('evaluationDetail', { empId: e.empId, name: e.name, year })} cells={[
                  { flex: 2, node: <div className="rowx gap12"><Avatar name={e.name} src={e.avatar || undefined} size={36} /><div><div className="t-bodys" style={{ fontSize: 14.5 }}>{e.name}</div><div className="t-cap ink-3">{e.branch || '—'}{e.dept ? ` · ${e.dept}` : ''}</div></div></div> },
                  { w: 170, node: e.overall != null ? <div className="rowx gap8" style={{ alignItems: 'center' }}><Stars value={toStars(e.overall)!} readOnly size={16} /><span className="t-cap mono ink-2" style={{ fontWeight: 700 }}>{toStars(e.overall)}</span></div> : <span className="t-sm ink-3">—</span> },
                  { flex: 0.9, node: band ? <StatusChip status={band.tone}>{band.label}</StatusChip> : <span className="t-sm ink-3">—</span> },
                  { w: 110, align: 'right', node: <span className="t-sm mono ink-2">{toStars(e.autoScore)}/5</span> },
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
      {newCampaign && <CampaignModal year={year} branches={branches} criteria={criteria.filter(c => c.kind === 'manual')} onClose={() => setNewCampaign(false)} onDone={() => { setNewCampaign(false); loadCampaigns() }} />}
    </div>
  )
}

// ── Dönem oluşturma modalı ──
function CampaignModal({ year, branches, criteria, onClose, onDone }:
  { year: number; branches: Branch[]; criteria: EvalCrit[]; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [branchIds, setBranchIds] = useState<Set<number>>(new Set())
  const [critIds, setCritIds] = useState<Set<string>>(new Set(criteria.map(c => c.id)))
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const toggle = <T,>(set: Set<T>, v: T, setter: (s: Set<T>) => void) => { const n = new Set(set); n.has(v) ? n.delete(v) : n.add(v); setter(n) }

  const submit = async () => {
    setErr(null)
    if (name.trim().length < 2) return setErr('Dönem adı girin')
    if (!startDate || !endDate) return setErr('Başlangıç ve bitiş tarihi seçin')
    if (endDate < startDate) return setErr('Bitiş tarihi başlangıçtan önce olamaz')
    if (branchIds.size === 0) return setErr('En az bir şube seçin')
    if (critIds.size === 0) return setErr('En az bir kriter seçin')
    setSaving(true)
    try { await api.createEvalCampaign({ name: name.trim(), year, startDate, endDate, branchIds: [...branchIds], criteriaIds: [...critIds] }); onDone() }
    catch (e: any) { setErr(e.message); setSaving(false) }
  }

  return (
    <Modal title="Değerlendirme dönemi oluştur" width={560} onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" style={{ height: 42 }} onClick={onClose}>Vazgeç</button>
        <button className="btn btn-primary" style={{ height: 42, opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={submit}>{saving ? 'Oluşturuluyor…' : 'Dönemi başlat'}</button>
      </>}>
      {err && <div className="t-sm" style={{ color: 'var(--err-ink)', background: 'var(--err-bg)', padding: '10px 12px', borderRadius: 'var(--r-sm)' }}>{err}</div>}
      <Field label="DÖNEM ADI"><input className="input" value={name} onChange={e => setName(e.target.value)} placeholder={`${year} 1. dönem değerlendirmesi`} /></Field>
      <div className="rowx gap12">
        <Field label="BAŞLANGIÇ"><input className="input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></Field>
        <Field label="BİTİŞ"><input className="input" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></Field>
      </div>
      <Field label="ŞUBELER (YÖNETİCİ KİOSKUNDA GÖRÜNECEK)">
        <div className="col" style={{ gap: 6 }}>
          {branches.map(b => (
            <label key={b.id} className="rowx gap10" style={{ padding: '9px 12px', borderRadius: 'var(--r-sm)', background: branchIds.has(b.id) ? 'var(--brand-50)' : 'var(--surface-2)', border: '1px solid var(--border)', cursor: 'pointer' }}>
              <input type="checkbox" checked={branchIds.has(b.id)} onChange={() => toggle(branchIds, b.id, setBranchIds)} style={{ accentColor: 'var(--brand-600)' }} />
              <span className="t-sm">{b.name}</span>
            </label>
          ))}
          {branches.length === 0 && <span className="t-cap ink-3">Şube bulunamadı</span>}
        </div>
      </Field>
      <Field label="KRİTERLER (YÖNETİCİYE GİDECEK)">
        <div className="col" style={{ gap: 6 }}>
          {criteria.map(c => (
            <label key={c.id} className="rowx gap10" style={{ padding: '9px 12px', borderRadius: 'var(--r-sm)', background: critIds.has(c.id) ? 'var(--brand-50)' : 'var(--surface-2)', border: '1px solid var(--border)', cursor: 'pointer' }}>
              <input type="checkbox" checked={critIds.has(c.id)} onChange={() => toggle(critIds, c.id, setCritIds)} style={{ accentColor: 'var(--brand-600)' }} />
              <span className="t-sm" style={{ flex: 1 }}>{c.label}</span>
              <span className="t-cap ink-4 mono">ağırlık {c.weight}</span>
            </label>
          ))}
        </div>
      </Field>
      <div className="t-cap ink-3" style={{ lineHeight: 1.5 }}>Otomatik "Devam & dakiklik" kriteri yöneticiye gönderilmez; karneye sistemden eklenir. Yöneticinin girdiği puanlar İK'ya <b>taslak</b> olarak düşer; yayınlamayı İK yapar.</div>
    </Modal>
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
