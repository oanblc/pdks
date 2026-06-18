// Anomaly.tsx — C9 Anomali & Güvenlik (gerçek API)
import { useEffect, useState } from 'react'
import { Icon } from '../icons'
import { api } from '../api'
import { PageHead, StatCard, Table, Row, RiskBadge } from '../ui'

type A = { name: string; branch: string; type: string; ctx: string; risk: number; when: string }

export function Anomaly() {
  const [rows, setRows] = useState<A[]>([])
  const [threshold, setThreshold] = useState(70)
  const [loading, setLoading] = useState(true)
  useEffect(() => { api.anomalies().then((a: any) => { setRows(a.rows ?? a); if (typeof a.threshold === 'number') setThreshold(a.threshold); setLoading(false) }).catch(() => setLoading(false)) }, [])

  const high = rows.filter(r => r.risk >= threshold).length
  return (
    <div>
      <PageHead title="Güvenlik" subtitle={`${rows.length} sinyal · risk skorlu inceleme kuyruğu`} />
      <div className="rowx gap14 stat-row" style={{ marginBottom: 18 }}>
        <StatCard label="Toplam sinyal" value={rows.length} sub="bu dönem" icon="shield" />
        <StatCard label="Yüksek risk" value={high} sub={`≥ ${threshold} skor`} tone="err" icon="alert" />
        <StatCard label="Öncelikli" value={rows.slice(0, 5).length} sub="ilk inceleme" tone="warn" icon="clock" />
      </div>
      {loading ? <div className="t-body ink-2">Yükleniyor…</div>
        : rows.length === 0 ? <div className="card" style={{ padding: 24 }}><span className="t-body ink-2">Güvenlik sinyali bulunmuyor</span></div> : (
          <Table cols={[{ label: 'ÇALIŞAN', flex: 1.5 }, { label: 'TÜR', flex: 1.4 }, { label: 'BAĞLAM', flex: 1.8 }, { label: 'RİSK', w: 130 }, { label: 'ZAMAN', flex: 1, align: 'right' }]}>
            {rows.map((r, i) => (
              <Row key={i} i={i} cells={[
                { flex: 1.5, node: <div><span className="t-bodys" style={{ fontSize: 14.5 }}>{r.name}</span><div className="t-cap ink-3">{r.branch}</div></div> },
                { flex: 1.4, node: <div className="rowx gap8"><Icon name="alert" size={16} color={r.risk >= threshold ? 'var(--err)' : 'var(--warn-ink)'} /><span className="t-body">{r.type}</span></div> },
                { flex: 1.8, node: <span className="t-sm ink-2">{r.ctx}</span> },
                { w: 130, node: <RiskBadge score={r.risk} /> },
                { flex: 1, align: 'right', node: <span className="t-sm mono ink-3">{r.when}</span> },
              ]} />
            ))}
          </Table>
        )}
    </div>
  )
}
