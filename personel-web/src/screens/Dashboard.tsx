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
      <PageHead title="Genel Bakış"
        subtitle={<span className="rowx gap8" style={{ flexWrap: 'wrap' }}><span>Çalışan PDKS</span><span style={{ color: '#c2cdde' }}>·</span><span>şirket geneli</span><span style={{ color: '#c2cdde' }}>·</span><span className="rowx gap6"><span className="live-dot" />canlı veri</span></span>}
        actions={<>
          <button className="btn btn-ghost" onClick={() => { setD(null); api.dashboard().then(setD as any) }}><Icon name="refresh" size={16} /> Yenile</button>
        </>} />

      <div className="rowx gap12" style={{ marginBottom: 14, alignItems: 'stretch' }}>
        <StatCard label="Aktif şube" value={stats.branches} sub="kayıtlı şube" icon="building" />
        <StatCard label="Bugün okutma" value={stats.todayPunches} sub="şirket geneli" tone="ok" icon="qr" />
        <StatCard label="Aktif çalışan" value={stats.activeEmployees} sub="onaylı" tone="ok" icon="user" />
        <StatCard label="Onay bekleyen" value={stats.pendingEmployees} sub="kayıt onayı" tone="warn" icon="alert" />
      </div>

      {stats.pendingEmployees > 0 && (
        <div className="rowx gap12" style={{ background: 'var(--warn-bg)', border: '1px solid var(--warn-ring)', borderRadius: 13, padding: '12px 14px', marginBottom: 16 }}>
          <span style={{ width: 34, height: 34, flex: 'none', borderRadius: 9, background: 'var(--warn-bg2)', color: 'var(--warn)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="info" size={18} /></span>
          <div className="grow" style={{ minWidth: 0, lineHeight: 1.3 }}>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--warn-ink)' }}>{stats.pendingEmployees} çalışan kayıt onayı bekliyor</div>
            <div className="t-cap" style={{ color: '#9c7a3a' }}>Çalışanlar bölümünden inceleyip onaylayın.</div>
          </div>
          <button className="btn" onClick={() => goto('employees')} style={{ height: 34, padding: '0 14px', background: 'var(--warn)', color: '#fff', fontSize: 12.5 }}>İncele <Icon name="chevron" size={14} strokeWidth={2} /></button>
        </div>
      )}

      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="rowx between" style={{ gap: 12, padding: '15px 16px 13px', borderBottom: '1px solid #EEF2F8' }}>
          <div className="rowx gap8" style={{ alignItems: 'baseline' }}>
            <span className="t-h3" style={{ fontSize: 15.5 }}>Şubeler</span>
            <span className="t-cap ink-4">{d.branches.length} kayıtlı</span>
          </div>
          <SearchInput placeholder="Şube ara…" width={240} value={q} onChange={setQ} />
        </div>
        {branches.map(b => (
          <div key={b.id} className="rowx gap14 row-click" style={{ padding: '14px 16px', borderTop: '1px solid #F1F4F9', cursor: 'pointer' }} onClick={() => goto('branches', b.id)}>
            <span style={{ width: 42, height: 42, flex: 'none', borderRadius: 11, background: '#EEF2F9', color: 'var(--ink-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="building" size={20} strokeWidth={1.7} /></span>
            <div style={{ minWidth: 150 }}>
              <div className="rowx gap8">
                <span style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--ink)' }}>{b.name}</span>
                <StatusChip status={b.online ? 'ok' : 'neu'}>{b.online ? 'Online' : 'Çevrimdışı'}</StatusChip>
              </div>
              <div className="t-cap ink-4" style={{ marginTop: 2 }}>{b.city}</div>
            </div>
            <div className="rowx" style={{ marginLeft: 24 }}>
              {([['Bugün', b.today], ['Bayraklı', b.flagged], ['Manuel', b.anomaly]] as const).map(([k, v], i) => (
                <div key={i} className="rowx">
                  {i > 0 && <div style={{ width: 1, height: 30, background: '#EAEFF6' }} />}
                  <div style={{ textAlign: 'center', padding: '0 18px' }}>
                    <div className="tnum" style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)' }}>{v}</div>
                    <div className="t-mono-label" style={{ fontSize: 10, marginTop: 2, color: 'var(--ink-4)' }}>{k}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="rowx gap16" style={{ marginLeft: 'auto' }}>
              <span className="rowx gap6 t-cap ink-4" style={{ whiteSpace: 'nowrap' }}><Icon name="refresh" size={13} strokeWidth={2} />son eşitleme {b.sync}</span>
              <span className="rowx gap4" style={{ fontSize: 13, fontWeight: 600, color: 'var(--brand-600)', whiteSpace: 'nowrap' }}>Yönet <Icon name="chevron" size={14} strokeWidth={2.1} /></span>
            </div>
          </div>
        ))}
        {branches.length === 0 && <div style={{ padding: '34px 16px', textAlign: 'center' }} className="t-sm ink-4">"{q}" ile eşleşen şube yok.</div>}
      </div>
    </div>
  )
}
