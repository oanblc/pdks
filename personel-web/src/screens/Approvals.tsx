// Approvals.tsx — C7 Talep Onayları (gerçek API + filtreleme)
import { useEffect, useState } from 'react'
import { Icon } from '../icons'
import { api } from '../api'
import { PageHead, SearchInput, Table, Row, Avatar, StatusChip, type Tone } from '../ui'

type Req = { id: number; name: string; branch?: string | null; kind: string; type: string; detail?: string; leaveStart?: string | null; leaveEnd?: string | null; leave?: { entitlement: number; used: number; pending: number; remaining: number } | null; status: string; stage: string; escalated?: boolean; managerRec?: string | null; managerNote?: string | null; createdAt: string }
const fmtDate = (s: string) => { const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? `${m[3]}.${m[2]}.${m[1]}` : s }

export function Approvals() {
  const [reqs, setReqs] = useState<Req[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<number | null>(null)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('all')
  const [kind, setKind] = useState('all')
  const [sel, setSel] = useState<Set<number>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)

  const load = () => api.requests().then((r: any) => { setReqs(r); setLoading(false); setSel(new Set()) }).catch(() => setLoading(false))
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
  // Toplu işlem yalnız admin kademesindeki bekleyen talepler için
  const isSelectable = (r: Req) => r.stage === 'admin' && r.status === 'pending'
  const selectableRows = rows.filter(isSelectable)
  const allSelected = selectableRows.length > 0 && selectableRows.every(r => sel.has(r.id))
  const toggle = (id: number) => setSel(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll = () => setSel(allSelected ? new Set() : new Set(selectableRows.map(r => r.id)))
  const bulkDecide = async (decision: 'approve' | 'reject') => {
    const ids = [...sel]
    if (!ids.length) return
    if (decision === 'reject' && !confirm(`${ids.length} talep reddedilsin mi?`)) return
    setBulkBusy(true)
    try { await api.bulkDecideRequests(ids, decision); await load() }
    catch (e: any) { alert(e.message) } finally { setBulkBusy(false) }
  }

  return (
    <div>
      <PageHead title="Talep Onayları" subtitle={`${reqs.length} talep · ${pending} bekliyor`} />

      {!loading && reqs.length > 0 && (
        <div className="rowx gap12" style={{ marginBottom: 13 }}>
          <SearchInput placeholder="İsim, tür veya detay ara…" width="100%" value={q} onChange={setQ} />
          <select className="input" value={kind} onChange={e => setKind(e.target.value)} style={{ width: 150, flex: 'none' }}>
            <option value="all">Tüm türler</option>
            <option value="leave">İzin</option>
            <option value="fix">Düzeltme</option>
          </select>
          <select className="input" value={status} onChange={e => setStatus(e.target.value)} style={{ width: 160, flex: 'none' }}>
            <option value="all">Tüm durumlar</option>
            <option value="pending">Bekliyor</option>
            <option value="approved">Onaylandı</option>
            <option value="rejected">Reddedildi</option>
          </select>
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
            {/* Toplu işlem çubuğu — yalnız seçim varken belirginleşir */}
            {selectableRows.length > 0 && (
              <div className="rowx between" style={{ marginBottom: 12, padding: '9px 14px', borderRadius: 'var(--r-sm)', background: sel.size > 0 ? 'var(--brand-50)' : 'transparent', border: '1px solid ' + (sel.size > 0 ? 'var(--brand-ring)' : 'var(--border)'), flexWrap: 'wrap', gap: 10 }}>
                <label className="rowx gap8" style={{ alignItems: 'center', cursor: 'pointer' }}>
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ width: 17, height: 17, accentColor: 'var(--brand-600)' }} />
                  <span className="t-sm ink-2">{sel.size > 0 ? `${sel.size} talep seçili` : `Tümünü seç · ${selectableRows.length} admin onayı`}</span>
                </label>
                {sel.size > 0 && (
                  <div className="rowx gap8">
                    <button className="btn" disabled={bulkBusy} onClick={() => bulkDecide('approve')} style={{ height: 32, padding: '0 14px', borderRadius: 8, background: 'var(--ok-bg)', color: 'var(--ok-ink)', border: '1px solid var(--ok-ring)', fontSize: 12.5, opacity: bulkBusy ? 0.6 : 1 }}>{bulkBusy ? 'İşleniyor…' : `Onayla (${sel.size})`}</button>
                    <button className="btn" disabled={bulkBusy} onClick={() => bulkDecide('reject')} style={{ height: 32, padding: '0 14px', borderRadius: 8, background: 'transparent', color: 'var(--err)', border: '1px solid var(--err-ring)', fontSize: 12.5, opacity: bulkBusy ? 0.6 : 1 }}>Reddet</button>
                    <button className="btn" disabled={bulkBusy} onClick={() => setSel(new Set())} style={{ height: 32, padding: '0 12px', fontSize: 12.5, color: 'var(--ink-3)', background: 'transparent' }}>Temizle</button>
                  </div>
                )}
              </div>
            )}
            <Table cols={[{ label: '', w: 38 }, { label: 'Çalışan', flex: 1.7 }, { label: 'Tür', flex: 1.2 }, { label: 'Detay', flex: 2.2 }, { label: 'Durum', w: 130 }, { label: '', w: 170, align: 'right' }]}>
              {rows.map((r, i) => {
                const atAdmin = r.stage === 'admin' && r.status === 'pending'
                // Tek aşama-duyarlı çip: KADEME + DURUM birleştirildi
                const chip: [Tone, string] = r.status === 'approved' ? ['ok', 'Onaylandı']
                  : r.status === 'rejected' ? ['err', 'Reddedildi']
                  : r.stage === 'done' ? ['neu', 'Tamamlandı']
                  : r.escalated ? ['err', 'Eskale']
                  : r.stage === 'admin' ? ['brand', "Admin'de"]
                  : ['warn', 'Müdürde']
                const dateLine = r.kind === 'leave' && r.leaveStart && r.leaveEnd
                  ? (r.leaveStart === r.leaveEnd ? fmtDate(r.leaveStart) : `${fmtDate(r.leaveStart)} – ${fmtDate(r.leaveEnd)}`)
                  : (r.detail || '—')
                return (
                  <Row key={r.id} i={i} cells={[
                    { w: 38, node: atAdmin ? <input type="checkbox" checked={sel.has(r.id)} onChange={() => toggle(r.id)} onClick={ev => ev.stopPropagation()} style={{ width: 17, height: 17, accentColor: 'var(--brand-600)', cursor: 'pointer' }} /> : <span /> },
                    { flex: 1.7, node: <div className="rowx gap12"><Avatar name={r.name} size={36} /><div style={{ minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{r.name}</div>{r.branch && <div className="t-cap ink-4">{r.branch}</div>}</div></div> },
                    { flex: 1.2, node: <div className="rowx gap8"><Icon name={r.kind === 'fix' ? 'edit' : 'calendar'} size={16} color="var(--ink-3)" /><span className="t-body ink-2">{r.type}</span></div> },
                    { flex: 2.2, node: <div style={{ minWidth: 0 }}>
                      <div className="t-sm" style={{ fontWeight: 600, color: 'var(--ink)' }}>{dateLine}</div>
                      {r.kind === 'leave' && r.detail && <div className="t-cap ink-4" style={{ marginTop: 2 }}>{r.detail}</div>}
                      {r.leave && <div className="t-cap ink-4" style={{ marginTop: 2 }}>İzin bakiyesi {r.leave.remaining}/{r.leave.entitlement} gün{r.leave.pending > 0 ? ` · ${r.leave.pending} bekleyen` : ''}</div>}
                      {r.managerRec && <div className="t-cap" style={{ marginTop: 3, color: r.managerRec === 'approve' ? 'var(--ok-ink)' : 'var(--err-ink)' }}>Müdür {r.managerRec === 'approve' ? 'uygun buldu' : 'uygun bulmadı'}{r.managerNote ? ` · ${r.managerNote}` : ''}</div>}
                    </div> },
                    { w: 130, node: <StatusChip status={chip[0]}>{chip[1]}</StatusChip> },
                    { w: 170, align: 'right', node: atAdmin ? (
                      <div className="rowx gap6" style={{ justifyContent: 'flex-end' }}>
                        <button className="btn" disabled={busy === r.id} onClick={() => decide(r.id, true)} style={{ height: 32, padding: '0 14px', borderRadius: 8, background: 'var(--ok-bg)', color: 'var(--ok-ink)', border: '1px solid var(--ok-ring)', fontSize: 12.5 }}>Onayla</button>
                        <button className="btn" disabled={busy === r.id} onClick={() => decide(r.id, false)} style={{ height: 32, padding: '0 12px', borderRadius: 8, background: 'transparent', color: 'var(--err)', border: '1px solid var(--err-ring)', fontSize: 12.5 }}>Reddet</button>
                      </div>
                    ) : r.status !== 'pending' ? <span className="t-cap ink-4">işlendi</span> : <span /> },
                  ]} />
                )
              })}
            </Table>
            <div className="t-cap ink-4" style={{ marginTop: 13 }}>{rows.length} / {reqs.length} talep gösteriliyor</div>
          </>
        )}
    </div>
  )
}
