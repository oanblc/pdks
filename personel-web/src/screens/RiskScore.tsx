// RiskScore.tsx — Güvenlik · Çalışan risk skoru (şeffaf, ağırlıklı model)
import { useEffect, useState } from 'react'
import { Icon } from '../icons'
import { api } from '../api'
import { PageHead, StatCard, Table, Row, Avatar, RiskBadge, StatusChip, type Tone } from '../ui'

type Weight = { key: string; label: string; points: number; hint: string }
type Band = { key: string; label: string; min: number; tone: string }
type Emp = { id: number; name: string; branch: string | null; dept: string | null; sicil: string | null; score: number; level: string; factors: Record<string, number> }
type Data = { month: string; weights: Weight[]; bands: Band[]; employees: Emp[] }

const levelChip: Record<string, [Tone, string]> = { high: ['err', 'Yüksek'], mid: ['warn', 'Orta'], low: ['neu', 'Düşük'], clean: ['ok', 'Temiz'] }

export function RiskScore() {
  const [d, setD] = useState<Data | null>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => { api.riskScores().then((r: any) => { setD(r); setLoading(false) }).catch(() => setLoading(false)) }, [])

  if (loading) return <div className="t-body ink-2">Yükleniyor…</div>
  if (!d) return <div className="t-body ink-2">Veri alınamadı.</div>

  const high = d.employees.filter(e => e.level === 'high').length
  const mid = d.employees.filter(e => e.level === 'mid').length
  const flagged = d.employees.filter(e => e.score > 0)
  const highMin = d.bands.find(b => b.key === 'high')?.min ?? 70
  const midMin = d.bands.find(b => b.key === 'mid')?.min ?? 40

  return (
    <div>
      <PageHead title="Risk Skoru" subtitle={`${d.month} · çalışan bazlı güvenlik risk değerlendirmesi`} />

      <div className="rowx gap14" style={{ marginBottom: 18 }}>
        <StatCard label="Yüksek risk" value={high} sub={`≥ ${highMin} skor`} tone="err" icon="alert" />
        <StatCard label="Orta risk" value={mid} sub={`${midMin} – ${highMin - 1} skor`} tone="warn" icon="shield" />
        <StatCard label="Sinyalli çalışan" value={flagged.length} sub="skor > 0" icon="user" />
      </div>

      {/* Nasıl hesaplanır */}
      <div className="card" style={{ padding: 18, marginBottom: 20 }}>
        <div className="rowx gap10" style={{ marginBottom: 6 }}>
          <Icon name="info" size={18} color="var(--brand-700)" />
          <span className="t-bodys" style={{ fontSize: 15 }}>Risk skoru nasıl hesaplanır?</span>
        </div>
        <div className="t-sm ink-2" style={{ lineHeight: 1.6, marginBottom: 14 }}>
          Skor, çalışanın bu dönemdeki gerçek basış verisinden üretilir. Aşağıdaki olayların her bir tekrarı, yanındaki puanı ekler;
          toplam <b>100 ile sınırlıdır</b>. Yüksek skor "kesin suç" değil, <b>öncelikli inceleme</b> sinyalidir.
        </div>
        <div className="col" style={{ gap: 8 }}>
          {d.weights.map(w => (
            <div key={w.key} className="rowx between" style={{ padding: '10px 12px', borderRadius: 'var(--r-sm)', background: 'var(--surface-2)', gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div className="t-sm" style={{ fontWeight: 600 }}>{w.label}</div>
                <div className="t-cap ink-3">{w.hint}</div>
              </div>
              <span className="t-bodys mono" style={{ color: 'var(--brand-700)', whiteSpace: 'nowrap' }}>+{w.points} / olay</span>
            </div>
          ))}
        </div>
        <div className="rowx gap8" style={{ marginTop: 14, flexWrap: 'wrap' }}>
          <span className="t-cap ink-3" style={{ marginRight: 4 }}>Risk bandı:</span>
          {d.bands.map(b => <StatusChip key={b.key} status={(b.tone as Tone)}>{b.label} {b.key === 'clean' ? '= 0' : `≥ ${b.min}`}</StatusChip>)}
        </div>
      </div>

      {/* Çalışan skorları */}
      <div className="t-h3" style={{ marginBottom: 12 }}>Çalışan risk skorları</div>
      <Table cols={[{ label: 'ÇALIŞAN', flex: 1.8 }, { label: 'RİSK SKORU', w: 150 }, { label: 'BAND', flex: 0.9 }, { label: 'KATKILAR', flex: 2.2, align: 'right' }]}>
        {d.employees.map((e, i) => {
          const lv = levelChip[e.level] ?? ['neu', e.level]
          const parts = d.weights.filter(w => e.factors[w.key] > 0).map(w => `${w.label.split(' ')[0]}×${e.factors[w.key]}`)
          return (
            <Row key={e.id} i={i} cells={[
              { flex: 1.8, node: <div className="rowx gap12"><Avatar name={e.name} size={36} /><div><div className="t-bodys" style={{ fontSize: 14.5 }}>{e.name}</div><div className="t-cap ink-3">{e.branch || '—'}{e.dept ? ` · ${e.dept}` : ''}</div></div></div> },
              { w: 150, node: <RiskBadge score={e.score} /> },
              { flex: 0.9, node: <StatusChip status={lv[0]}>{lv[1]}</StatusChip> },
              { flex: 2.2, align: 'right', node: parts.length ? <span className="t-sm ink-2">{parts.join(' · ')}</span> : <span className="t-sm ink-3">temiz dönem</span> },
            ]} />
          )
        })}
      </Table>
      <div className="rowx gap8" style={{ marginTop: 14 }}>
        <Icon name="shield" size={16} color="var(--ink-3)" />
        <span className="t-cap ink-3">Skorlar her dönem yeniden hesaplanır; yalnızca öncelik sıralaması içindir, tek başına yaptırım gerekçesi değildir.</span>
      </div>
    </div>
  )
}
