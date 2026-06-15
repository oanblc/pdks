// Audit.tsx — C10 Denetim Kaydı (gerçek API)
import { useEffect, useState } from 'react'
import { Icon } from '../icons'
import { api } from '../api'
import { PageHead, Table, Row, StatusChip, type Tone } from '../ui'

type A = { id: number; actor: string; kind: string; action: string; detail?: string; time: string }
const kindTone: Record<string, Tone> = { onay: 'ok', itiraz: 'err', manuel: 'warn', cihaz: 'neu', kvkk: 'brand' }

export function Audit() {
  const [rows, setRows] = useState<A[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { api.audit().then((a: any) => { setRows(a); setLoading(false) }).catch(() => setLoading(false)) }, [])

  const fmt = (iso: string) => new Date(iso).toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

  return (
    <div>
      <PageHead title="Denetim Kaydı" subtitle={`${rows.length} işlem · değişmez kayıt`} />
      {loading ? <div className="t-body ink-2">Yükleniyor…</div>
        : rows.length === 0 ? (
          <div className="card col center" style={{ padding: 40 }}>
            <Icon name="lock" size={34} color="var(--ink-3)" />
            <div className="t-body ink-2" style={{ marginTop: 10 }}>Henüz kayıt yok</div>
          </div>
        ) : (
          <Table cols={[{ label: 'ZAMAN', flex: 1.1 }, { label: 'AKTÖR', flex: 1.2 }, { label: 'TÜR', w: 130 }, { label: 'İŞLEM', flex: 1.6 }, { label: 'DETAY', flex: 1.8 }]}>
            {rows.map((r, i) => (
              <Row key={r.id} i={i} cells={[
                { flex: 1.1, node: <span className="t-sm mono ink-2">{fmt(r.time)}</span> },
                { flex: 1.2, node: <span className="t-body">{r.actor}</span> },
                { w: 130, node: <StatusChip status={kindTone[r.kind] ?? 'neu'}>{r.kind}</StatusChip> },
                { flex: 1.6, node: <span className="t-body ink-2">{r.action}</span> },
                { flex: 1.8, node: <span className="t-sm ink-3">{r.detail || '—'}</span> },
              ]} />
            ))}
          </Table>
        )}
      <div className="rowx gap8" style={{ marginTop: 14 }}>
        <Icon name="shield" size={16} color="var(--ink-3)" />
        <span className="t-cap ink-3">Denetim kaydı değişmezdir; tüm onay/itiraz/manuel işlemler otomatik yazılır.</span>
      </div>
    </div>
  )
}
