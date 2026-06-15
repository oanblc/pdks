// Approvals.tsx — C7 Talep Onayları (gerçek API + filtreleme)
import { useEffect, useState } from 'react'
import { Icon } from '../icons'
import { api } from '../api'
import { PageHead, SearchInput, Table, Row, Avatar, StatusChip, type Tone } from '../ui'

type Req = { id: number; name: string; branch?: string | null; kind: string; type: string; detail?: string; leaveStart?: string | null; leaveEnd?: string | null; status: string; stage: string; escalated?: boolean; managerRec?: string | null; managerNote?: string | null; createdAt: string }
const fmtDate = (s: string) => { const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? `${m[3]}.${m[2]}.${m[1]}` : s }
const stMap: Record<string, [Tone, string]> = { pending: ['warn', 'Bekliyor'], approved: ['ok', 'Onaylandı'], rejected: ['err', 'Reddedildi'] }

export function Approvals() {
  const [reqs, setReqs] = useState<Req[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<number | null>(null)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [kind, setKind] = useState('all')

  const load = () => api.requests().then((r: any) => { setReqs(r); setLoading(false) }).catch(() => setLoading(false))
  useEffect(() => { load() }, [])

  const decide = async (id: number, approve: boolean) => {
    setBusy(id)
    try { await (approve ? api.approveRequest(id) : api.rejectRequest(id)); await load() } finally { setBusy(null) }
  }

  const pending = reqs.filter(r => r.status === 'pending').length
  const ql = q.trim().toLowerCase()
  const rows = reqs.filter(r => {
    if (status !== 'all' && r.status !== status) return false
    if (kind !== 'all' && r.kind !== kind) return false
    if (ql && !`${r.name} ${r.type} ${r.detail || ''}`.toLowerCase().includes(ql)) return false
    return true
  })

  return (
    <div>
      <PageHead title="Talep Onayları" subtitle={`${reqs.length} talep · ${pending} bekliyor`} />

      {!loading && reqs.length > 0 && (
        <div className="rowx between" style={{ marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
          <SearchInput placeholder="İsim, tür veya detay ara…" width={320} value={q} onChange={setQ} />
          <div className="rowx gap8" style={{ flexWrap: 'wrap' }}>
            <select className="input" value={kind} onChange={e => setKind(e.target.value)} style={{ width: 160, height: 44 }}>
              <option value="all">Tüm türler</option>
              <option value="leave">İzin</option>
              <option value="fix">Düzeltme</option>
            </select>
            <select className="input" value={status} onChange={e => setStatus(e.target.value)} style={{ width: 170, height: 44 }}>
              <option value="all">Tüm durumlar</option>
              <option value="pending">Bekliyor</option>
              <option value="approved">Onaylandı</option>
              <option value="rejected">Reddedildi</option>
            </select>
          </div>
        </div>
      )}

      {loading ? <div className="t-body ink-2">Yükleniyor…</div>
        : reqs.length === 0 ? (
          <div className="card col center" style={{ padding: 40 }}>
            <Icon name="inbox" size={34} color="var(--ink-3)" />
            <div className="t-body ink-2" style={{ marginTop: 10 }}>Bekleyen talep yok</div>
          </div>
        ) : rows.length === 0 ? (
          <div className="card col center" style={{ padding: 40 }}>
            <Icon name="search" size={30} color="var(--ink-3)" />
            <div className="t-body ink-2" style={{ marginTop: 10 }}>Filtreye uyan talep yok</div>
          </div>
        ) : (
          <>
            <Table cols={[{ label: 'ÇALIŞAN', flex: 1.7 }, { label: 'TÜR', flex: 1.3 }, { label: 'DETAY · MÜDÜR GÖRÜŞÜ', flex: 2 }, { label: 'KADEME', w: 150 }, { label: 'DURUM', w: 110 }, { label: 'AKSİYON', w: 200, align: 'right' }]}>
              {rows.map((r, i) => {
                const atAdmin = r.stage === 'admin' && r.status === 'pending'
                const stageChip: [Tone, string] = r.stage === 'done' ? ['neu', 'Tamamlandı']
                  : r.escalated ? ['err', 'Eskale → Admin']
                  : r.stage === 'admin' ? ['brand', "Admin'de"]
                  : ['warn', 'Müdürde']
                return (
                  <Row key={r.id} i={i} cells={[
                    { flex: 1.7, node: <div className="rowx gap12"><Avatar name={r.name} size={36} /><div><div className="t-bodys" style={{ fontSize: 14.5 }}>{r.name}</div>{r.branch && <div className="t-cap ink-3">{r.branch}</div>}</div></div> },
                    { flex: 1.3, node: <div className="rowx gap8"><Icon name={r.kind === 'fix' ? 'edit' : 'calendar'} size={18} color="var(--brand-700)" /><span className="t-body">{r.type}</span></div> },
                    { flex: 2, node: <div style={{ minWidth: 0 }}>
                      {r.kind === 'leave' && r.leaveStart && r.leaveEnd && <div className="t-sm" style={{ fontWeight: 600 }}>{r.leaveStart === r.leaveEnd ? fmtDate(r.leaveStart) : `${fmtDate(r.leaveStart)} – ${fmtDate(r.leaveEnd)}`}</div>}
                      <div className="t-sm ink-2">{r.detail || '—'}</div>
                      {r.managerRec && <div className="t-cap" style={{ marginTop: 2, color: r.managerRec === 'approve' ? 'var(--ok-ink)' : 'var(--err-ink)' }}>Müdür: {r.managerRec === 'approve' ? 'uygundur' : 'uygun değil'}{r.managerNote ? ` · ${r.managerNote}` : ''}</div>}
                    </div> },
                    { w: 150, node: <StatusChip status={stageChip[0]}>{stageChip[1]}</StatusChip> },
                    { w: 110, node: <StatusChip status={stMap[r.status]?.[0] ?? 'neu'}>{stMap[r.status]?.[1] ?? r.status}</StatusChip> },
                    { w: 200, align: 'right', node: atAdmin ? (
                      <div className="rowx gap6" style={{ justifyContent: 'flex-end' }}>
                        <button className="btn" disabled={busy === r.id} onClick={() => decide(r.id, true)} style={{ height: 34, padding: '0 14px', borderRadius: 'var(--r-sm)', background: 'var(--ok-bg)', color: 'var(--ok-ink)', border: '1px solid var(--ok-ring)', fontSize: 13 }}>Onayla</button>
                        <button className="btn" disabled={busy === r.id} onClick={() => decide(r.id, false)} style={{ height: 34, padding: '0 12px', borderRadius: 'var(--r-sm)', background: 'transparent', color: 'var(--err)', border: '1px solid var(--err-ring)', fontSize: 13 }}>Reddet</button>
                      </div>
                    ) : r.stage === 'manager' ? <span className="t-cap ink-3">müdür kararı bekliyor</span> : <span className="t-cap ink-3">işlendi</span> },
                  ]} />
                )
              })}
            </Table>
            <div className="t-cap ink-3" style={{ marginTop: 14 }}>{rows.length} / {reqs.length} talep gösteriliyor</div>
          </>
        )}
    </div>
  )
}
