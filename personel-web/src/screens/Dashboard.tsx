// Dashboard.tsx — C2 Genel Bakış (gerçek API)
import { useEffect, useState } from 'react'
import { Icon } from '../icons'
import { api } from '../api'
import { goto } from '../nav'
import { PageHead, StatCard, StatusChip, SearchInput } from '../ui'

type B = { id: number; name: string; city: string; online: boolean; sync: string; today: number; flagged: number; anomaly: number }
type DashData = { stats: { branches: number; activeEmployees: number; pendingEmployees: number; todayPunches: number }; branches: B[] }

export function Dashboard() {
  const [d, setD] = useState<DashData | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [q, setQ] = useState('')
  useEffect(() => { api.dashboard().then(setD as any).catch(e => setErr(e.message)) }, [])

  if (err) return <div className="t-body" style={{ color: 'var(--err-ink)' }}>Veri alınamadı: {err}</div>
  if (!d) return <div className="t-body ink-2">Yükleniyor…</div>
  const { stats } = d
  const ql = q.trim().toLowerCase()
  const branches = ql
    ? d.branches.filter(b => `${b.name} ${b.city}`.toLowerCase().includes(ql))
    : d.branches

  return (
    <div>
      <PageHead title="Genel Bakış" subtitle="Çalışan PDKS · şirket geneli · canlı veri"
        actions={<>
          <button className="btn btn-ghost" style={{ height: 44 }} onClick={() => { setD(null); api.dashboard().then(setD as any) }}><Icon name="refresh" size={18} color="var(--ink)" /> Yenile</button>
        </>} />

      <div className="rowx gap14" style={{ marginBottom: 16 }}>
        <StatCard label="Aktif şube" value={stats.branches} sub="kayıtlı şube" icon="building" />
        <StatCard label="Bugün okutma" value={stats.todayPunches} sub="şirket geneli" tone="ok" icon="qr" />
        <StatCard label="Aktif çalışan" value={stats.activeEmployees} sub="onaylı" icon="user" />
        <StatCard label="Onay bekleyen" value={stats.pendingEmployees} sub="kayıt onayı" tone="warn" icon="alert" />
      </div>

      {stats.pendingEmployees > 0 && (
        <div className="card" style={{ padding: 0, marginBottom: 22, overflow: 'hidden' }}>
          <div className="row">
            <div style={{ width: 34, height: 34, borderRadius: 9, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--warn-bg)', color: 'var(--warn-ink)' }}><Icon name="info" size={18} /></div>
            <div className="grow"><div className="t-bodys" style={{ fontSize: 15 }}>{stats.pendingEmployees} çalışan kayıt onayı bekliyor</div><div className="t-cap ink-3" style={{ marginTop: 1 }}>Çalışanlar bölümünden inceleyip onaylayın</div></div>
            <StatusChip status="warn">İnceleme</StatusChip>
          </div>
        </div>
      )}

      <div className="rowx between" style={{ marginBottom: 14 }}>
        <div className="t-h3">Şubeler</div>
        <SearchInput placeholder="Şube ara…" width={240} value={q} onChange={setQ} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
        {branches.map(b => (
          <div key={b.id} className="card row-press" style={{ padding: 16, cursor: 'pointer' }} onClick={() => goto('branches', b.id)}>
            <div className="rowx between">
              <div style={{ minWidth: 0 }}>
                <div className="t-bodys" style={{ fontSize: 15.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.name}</div>
                <div className="t-cap ink-3" style={{ marginTop: 1 }}>{b.city}</div>
              </div>
              <StatusChip status={b.online ? 'ok' : 'warn'}>{b.online ? 'Online' : 'Çevrimdışı'}</StatusChip>
            </div>
            <div className="rowx" style={{ marginTop: 14, gap: 0 }}>
              {([['Bugün', b.today, 'ink'], ['Bayraklı', b.flagged, b.flagged ? 'warn' : 'ink'], ['Manuel', b.anomaly, b.anomaly ? 'warn' : 'ink']] as const).map(([k, v, t], i) => (
                <div key={i} style={{ flex: 1, borderLeft: i ? '1px solid var(--border)' : 'none', paddingLeft: i ? 12 : 0 }}>
                  <div className="t-h3 tnum" style={{ color: t === 'ink' ? 'var(--ink)' : `var(--${t}-ink)` }}>{v}</div>
                  <div className="t-cap ink-3" style={{ fontSize: 11 }}>{k}</div>
                </div>
              ))}
            </div>
            <div className="rowx gap6" style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
              <Icon name="refresh" size={14} color="var(--ink-3)" /><span className="t-cap ink-3" style={{ whiteSpace: 'nowrap' }}>son eşitleme {b.sync}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
