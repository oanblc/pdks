// EvaluationDetail.tsx — Performans · tek çalışan yıllık karne editörü
import { useEffect, useState } from 'react'
import { Icon } from '../icons'
import { api, type EvalDetail, type EvalCrit } from '../api'
import { consumeNavArg, goto } from '../nav'
import { Avatar, Stars, StatusChip, scoreBand, toStars, Field } from '../ui'

const PAGE_MAX = 820

// Genel skor = Σ(ağırlık × puan₀₋₁₀₀) / Σağırlık (backend ile aynı formül) — yıldız canlı güncellensin
function computeOverall(scores: Record<string, number>, criteria: EvalCrit[], autoScore: number): number | null {
  let wsum = 0, vsum = 0
  for (const c of criteria) {
    let v: number | null = null
    if (c.kind === 'auto') v = autoScore
    else { const r = Number(scores[c.id]); if (r >= 1 && r <= 5) v = ((r - 1) / 4) * 100 }
    if (v == null) continue
    const w = Number(c.weight) || 0; if (w <= 0) continue
    wsum += w; vsum += w * v
  }
  return wsum > 0 ? Math.round(vsum / wsum) : null
}

const ATT_LABEL: Record<string, string> = { flagged: 'Bayraklı kayıt', missing: 'Eksik çıkış', late: 'Geç giriş', manual: 'Manuel okutma' }

export function EvaluationDetail() {
  const [arg] = useState<{ empId: number; name: string; year: number } | undefined>(() => consumeNavArg() as any)
  const [d, setD] = useState<EvalDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [scores, setScores] = useState<Record<string, number>>({})
  const [note, setNote] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState<null | 'draft' | 'published'>(null)
  const [savedStatus, setSavedStatus] = useState<string>('none')

  const back = () => goto('performance')

  useEffect(() => {
    if (!arg) { setLoading(false); return }
    api.employeeEvaluation(arg.empId, arg.year).then(r => {
      setD(r); setScores({ ...r.scores }); setNote(r.note || ''); setSavedStatus(r.status); setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (!arg) return <div className="t-body ink-2">Çalışan seçilmedi. <button className="btn btn-quiet" onClick={back}>Listeye dön</button></div>
  if (loading) return <div className="t-body ink-2">Yükleniyor…</div>
  if (!d) return <div className="t-body ink-2">Değerlendirme alınamadı. <button className="btn btn-quiet" onClick={back}>Listeye dön</button></div>

  const manual = d.criteria.filter(c => c.kind === 'manual')
  const auto = d.criteria.find(c => c.kind === 'auto')
  const overall = computeOverall(scores, d.criteria, d.auto.score)
  const band = overall != null ? scoreBand(overall) : null
  const ch = savedStatus === 'published' ? ['ok', 'Yayınlandı'] as const : savedStatus === 'draft' ? ['warn', 'Taslak'] as const : ['neu', 'Değerlendirilmedi'] as const

  const setStar = (id: string, v: number) => setScores(s => { const n = { ...s }; if (v <= 0) delete n[id]; else n[id] = v; return n })

  const save = async (status: 'draft' | 'published') => {
    setErr(null); setSaving(status)
    try {
      await api.saveEvaluation(d.employee.id, { year: d.year, scores, note: note.trim() || null, status })
      setSavedStatus(status); setSaving(null)
    } catch (e: any) { setErr(e.message); setSaving(null) }
  }

  return (
    <div style={{ maxWidth: PAGE_MAX }}>
      <button className="btn btn-ghost" onClick={back} style={{ height: 38, padding: '0 12px', marginBottom: 14 }}><Icon name="chevronL" size={17} color="var(--ink)" /> Performans</button>

      <div className="rowx between eval-head" style={{ marginBottom: 20, gap: 16, alignItems: 'flex-start' }}>
        <div className="rowx gap14" style={{ alignItems: 'center', minWidth: 0 }}>
          <Avatar name={d.employee.name} src={d.employee.avatar || undefined} size={52} />
          <div style={{ minWidth: 0 }}>
            <div className="t-mono-label ink-3">PERFORMANS KARNESİ · {d.year}</div>
            <div className="rowx gap10" style={{ alignItems: 'center', marginTop: 2 }}>
              <span className="t-h1">{d.employee.name}</span>
              <StatusChip status={ch[0]}>{ch[1]}</StatusChip>
            </div>
            <div className="t-cap ink-3" style={{ marginTop: 3 }}>{d.employee.branch || '—'}{d.employee.dept ? ` · ${d.employee.dept}` : ''} · SİCİL {d.employee.sicil || '—'}</div>
          </div>
        </div>
        <div className="card" style={{ padding: '14px 18px', minWidth: 240, flex: 'none' }}>
          <div className="t-mono-label ink-3" style={{ marginBottom: 8 }}>GENEL SKOR</div>
          <div className="rowx gap8" style={{ alignItems: 'baseline' }}>
            <span className="tnum" style={{ fontSize: 32, fontWeight: 800, lineHeight: 1, color: band ? `var(--${band.tone})` : 'var(--ink-3)' }}>{toStars(overall) ?? '—'}</span>
            <span className="t-sm ink-3">/ 5</span>
            {band && <StatusChip status={band.tone}>{band.label}</StatusChip>}
          </div>
          {overall != null && <div style={{ marginTop: 10 }}><Stars value={toStars(overall)!} readOnly size={22} /></div>}
        </div>
      </div>

      {err && <div className="t-sm" style={{ color: 'var(--err-ink)', background: 'var(--err-bg)', padding: '10px 12px', borderRadius: 'var(--r-sm)', marginBottom: 14 }}>{err}</div>}

      {/* Öznel kriterler */}
      <div className="card col" style={{ padding: 24, gap: 4, marginBottom: 16 }}>
        <div className="t-h3" style={{ marginBottom: 8 }}>Öznel değerlendirme <span className="t-cap ink-3">· 1–5 yıldız</span></div>
        {manual.map((c, i) => (
          <div key={c.id} className="rowx between" style={{ padding: '14px 0', borderTop: i ? '1px solid var(--border)' : 'none', gap: 16 }}>
            <div style={{ minWidth: 0 }}>
              <div className="rowx gap8" style={{ alignItems: 'center' }}>
                <span className="t-bodys" style={{ fontSize: 14.5 }}>{c.label}</span>
                <span className="t-cap ink-4 mono">ağırlık {c.weight}</span>
              </div>
              {c.hint && <div className="t-cap ink-3" style={{ marginTop: 3 }}>{c.hint}</div>}
            </div>
            <div className="rowx gap10" style={{ alignItems: 'center', flex: 'none' }}>
              <Stars value={scores[c.id] || 0} onChange={v => setStar(c.id, v)} />
              <span className="t-sm mono ink-3" style={{ width: 28, textAlign: 'right' }}>{scores[c.id] ? `${scores[c.id]}/5` : '—'}</span>
            </div>
          </div>
        ))}
        {manual.length === 0 && <div className="t-body ink-3">Tanımlı öznel kriter yok. "Kriterleri düzenle" ile ekleyin.</div>}
      </div>

      {/* Otomatik devam */}
      {auto && (
        <div className="card col" style={{ padding: 24, gap: 12, marginBottom: 16 }}>
          <div className="rowx between" style={{ alignItems: 'center' }}>
            <div>
              <div className="rowx gap8" style={{ alignItems: 'center' }}>
                <span className="t-h3">{auto.label}</span>
                <span className="t-cap ink-4 mono">ağırlık {auto.weight}</span>
                <StatusChip status="brand">Otomatik</StatusChip>
              </div>
              <div className="t-cap ink-3" style={{ marginTop: 4 }}>{d.year} yılı puantajından üretildi — elle değiştirilemez.</div>
            </div>
            <div className="rowx gap10" style={{ alignItems: 'center', flex: 'none' }}>
              <Stars value={toStars(d.auto.score)!} readOnly size={22} />
              <span className="t-sm mono ink-2" style={{ width: 34, textAlign: 'right' }}>{toStars(d.auto.score)}/5</span>
            </div>
          </div>
          <div className="rowx gap8" style={{ flexWrap: 'wrap', paddingTop: 4 }}>
            {Object.entries(d.auto.breakdown).map(([k, v]) => (
              <span key={k} className="rowx gap6" style={{ padding: '6px 10px', borderRadius: 'var(--r-sm)', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                <span className="t-cap ink-3">{ATT_LABEL[k] ?? k}</span>
                <span className="t-cap mono" style={{ fontWeight: 700, color: v > 0 ? 'var(--warn-ink)' : 'var(--ink-4)' }}>{v}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Genel yorum */}
      <div className="card col" style={{ padding: 24, gap: 12, marginBottom: 16 }}>
        <Field label="GENEL YORUM (OPSİYONEL)">
          <textarea className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="Güçlü yönler, gelişim alanları, hedefler…"
            style={{ width: '100%', minHeight: 110, height: 'auto', padding: '10px 14px', lineHeight: 1.5, resize: 'vertical' }} />
        </Field>
      </div>

      <div className="rowx gap10" style={{ justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" style={{ height: 44, opacity: saving ? 0.6 : 1 }} disabled={!!saving} onClick={() => save('draft')}>{saving === 'draft' ? 'Kaydediliyor…' : 'Taslak kaydet'}</button>
        <button className="btn btn-primary" style={{ height: 44, opacity: saving ? 0.6 : 1 }} disabled={!!saving} onClick={() => save('published')}>{saving === 'published' ? 'Yayınlanıyor…' : 'Yayınla'}</button>
      </div>
    </div>
  )
}
