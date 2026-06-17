// App.tsx — rol bazlı sol nav + topbar + router (gerçek admin oturumu)
import { useState, useEffect } from 'react'
import { Icon } from './icons'
import { Avatar } from './ui'
import { setNav } from './nav'
import { NotificationBell } from './components/NotificationBell'
import { setToken, type AdminInfo } from './api'
import { Login } from './screens/Login'
import { Dashboard } from './screens/Dashboard'
import { Employees } from './screens/Employees'
import { EmployeeDetail } from './screens/EmployeeDetail'
import { Branches } from './screens/Branches'
import { Approvals } from './screens/Approvals'
import { Audit } from './screens/Audit'
import { Shifts } from './screens/Shifts'
import { Holidays } from './screens/Holidays'
import { Timesheet } from './screens/Timesheet'
import { Anomaly } from './screens/Anomaly'
import { RiskScore } from './screens/RiskScore'
import { RiskSettings } from './screens/RiskSettings'
import { Kvkk } from './screens/Kvkk'
import { Reports } from './screens/Reports'
import { PerformanceReview } from './screens/PerformanceReview'
import { EvaluationDetail } from './screens/EvaluationDetail'
import { Stub } from './screens/Stub'

export type Role = 'ik' | 'mu' | 'su'
const ROLES: Record<Role, string> = { ik: 'İK-admin', mu: 'Muhasebe', su: 'Süper admin' }

type NavItem = { id: string; label: string; icon: string; roles: Role[]; badge?: number }
const NAV: { group: string; items: NavItem[] }[] = [
  { group: 'Genel', items: [{ id: 'dashboard', label: 'Genel Bakış', icon: 'home', roles: ['ik', 'mu', 'su'] }] },
  { group: 'Operasyon', items: [
    { id: 'employees', label: 'Çalışanlar', icon: 'user', roles: ['ik', 'su'] },
    { id: 'branches', label: 'Şube & Tablet', icon: 'building', roles: ['ik', 'su'] },
    { id: 'shifts', label: 'Vardiyalar', icon: 'clock', roles: ['ik', 'su'] },
    { id: 'holidays', label: 'Tatiller', icon: 'calendar', roles: ['ik', 'su'] },
  ] },
  { group: 'Puantaj', items: [
    { id: 'timesheet', label: 'Puantaj & Mesai', icon: 'calendar', roles: ['ik', 'mu', 'su'] },
    { id: 'approvals', label: 'Talep Onayları', icon: 'inbox', roles: ['ik', 'su'] },
  ] },
  { group: 'Performans', items: [
    { id: 'performance', label: 'Performans', icon: 'star', roles: ['ik', 'su'] },
  ] },
  { group: 'Güvenlik', items: [
    { id: 'anomaly', label: 'Güvenlik', icon: 'shield', roles: ['ik', 'su'] },
    { id: 'risk', label: 'Risk Skoru', icon: 'alert', roles: ['ik', 'su'] },
    { id: 'risksettings', label: 'Güvenlik Ayarları', icon: 'lock', roles: ['su'] },
    { id: 'audit', label: 'Denetim Kaydı', icon: 'lock', roles: ['ik', 'mu', 'su'] },
  ] },
  { group: 'Uyum', items: [
    { id: 'kvkk', label: 'KVKK', icon: 'shield', roles: ['ik', 'su'] },
    { id: 'reports', label: 'Raporlar', icon: 'doc', roles: ['ik', 'mu', 'su'] },
  ] },
]

const SCREENS: Record<string, () => React.ReactElement> = {
  dashboard: Dashboard, employees: Employees, employeeDetail: EmployeeDetail, branches: Branches, approvals: Approvals, audit: Audit,
  shifts: Shifts, holidays: Holidays, timesheet: Timesheet, anomaly: Anomaly, risk: RiskScore, risksettings: RiskSettings, kvkk: Kvkk, reports: Reports,
  performance: PerformanceReview, evaluationDetail: EvaluationDetail,
}

export function App() {
  const [admin, setAdmin] = useState<AdminInfo | null>(() => {
    const a = localStorage.getItem('admin')
    return a ? JSON.parse(a) : null
  })
  const [route, setRoute] = useState('dashboard')
  const [toast, setToast] = useState<string | null>(null)

  // navigasyon köprüsünü ilk render'dan önce ve effect içinde kur
  setNav(setRoute)
  useEffect(() => { setNav(setRoute) }, [])

  const login = (a: AdminInfo) => { localStorage.setItem('admin', JSON.stringify(a)); setAdmin(a) }
  const logout = () => { setToken(null); localStorage.removeItem('admin'); setAdmin(null) }

  // Global API geri bildirimleri: ağ/sunucu hatası → uyarı; 401 → otomatik çıkış
  useEffect(() => {
    const onErr = (e: Event) => { setToast((e as CustomEvent).detail || 'Bir hata oluştu'); window.setTimeout(() => setToast(null), 4000) }
    const onUnauth = () => { localStorage.removeItem('admin'); setAdmin(null) }
    window.addEventListener('api-error', onErr)
    window.addEventListener('api-unauthorized', onUnauth)
    return () => { window.removeEventListener('api-error', onErr); window.removeEventListener('api-unauthorized', onUnauth) }
  }, [])

  if (!admin) return <Login onLogin={login} />

  const role = admin.role
  const allowed = (item: NavItem) => item.roles.includes(role)
  const Screen = SCREENS[route]

  return (
    <div className="app-font" style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)', color: 'var(--ink)' }}>
      {/* ── Global hata bildirimi (toast) ── */}
      {toast && (
        <div role="alert" style={{ position: 'fixed', top: 18, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: 'var(--err-bg)', color: 'var(--err-ink)', border: '1px solid var(--err-ring)', borderRadius: 'var(--r-sm)', padding: '11px 16px', boxShadow: 'var(--sh-lg)', display: 'flex', alignItems: 'center', gap: 10, maxWidth: 480 }}>
          <Icon name="alert" size={18} color="var(--err)" />
          <span className="t-sm" style={{ fontWeight: 600 }}>{toast}</span>
        </div>
      )}
      {/* ── Sol nav (lacivert) ── */}
      <div className="sidebar">
        <div className="rowx gap10" style={{ padding: '18px 18px 16px' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--brand-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', boxShadow: '0 4px 12px rgba(43,92,230,.35)' }}><Icon name="check" size={20} color="#fff" strokeWidth={3} /></div>
          <div style={{ lineHeight: 1.1 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: '-.02em' }}>puanto</div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '.16em', color: '#6B7E9C', marginTop: 2 }}>YÖNETİCİ PANELİ</div>
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '4px 12px 12px' }}>
          {NAV.map(g => {
            const items = g.items.filter(allowed)
            if (!items.length) return null
            return (
              <div key={g.group}>
                <div className="sb-section">{g.group}</div>
                <div className="col" style={{ gap: 2 }}>
                  {items.map(it => {
                    const on = route === it.id || (it.id === 'employees' && route === 'employeeDetail') || (it.id === 'performance' && route === 'evaluationDetail')
                    return (
                      <button key={it.id} onClick={() => setRoute(it.id)} className={'sb-item' + (on ? ' active' : '')}>
                        <Icon name={it.icon} size={18} strokeWidth={1.8} />
                        <span style={{ flex: 1, textAlign: 'left' }}>{it.label}</span>
                        {it.badge && <span className="sb-badge" style={{ background: on ? 'rgba(255,255,255,.22)' : '#16263d', color: on ? '#fff' : '#9FB0C9' }}>{it.badge}</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
        <div className="rowx gap10" style={{ padding: '13px 16px', borderTop: '1px solid #16263d' }}>
          <Avatar name={admin.name} size={34} style={{ background: '#1d3a5f', color: '#9FC0F0' }} />
          <div className="grow" style={{ minWidth: 0, lineHeight: 1.2 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{admin.name}</div>
            <div style={{ fontSize: 11, color: '#6B7E9C' }}>{ROLES[role]}</div>
          </div>
          <button onClick={logout} className="sb-logout" title="Çıkış"><Icon name="logout" size={17} strokeWidth={1.8} /></button>
        </div>
      </div>

      {/* ── Ana içerik ── */}
      <div className="col grow" style={{ minWidth: 0 }}>
        <div className="rowx between" style={{ height: 58, flex: 'none', padding: '0 26px', background: 'var(--surface)', borderBottom: '1px solid var(--border-2)' }}>
          <div className="rowx gap8" style={{ fontSize: 13, color: 'var(--ink-3)' }}>
            <Icon name="building" size={16} color="#8294ad" strokeWidth={1.8} />
            <span style={{ fontWeight: 600, color: '#26344a' }}>Tüm şubeler</span>
            <span style={{ color: '#aab7cc' }}>·</span>
            <span>şirket geneli</span>
          </div>
          <div className="rowx gap12">
            <NotificationBell />
            <div className="rowx gap6" style={{ padding: '6px 12px 6px 10px', borderRadius: 9, background: 'var(--brand-50)', border: '1px solid var(--brand-ring)', fontSize: 12.5, fontWeight: 600, color: 'var(--brand-700)' }}>
              <Icon name="shield" size={15} color="var(--brand-700)" strokeWidth={1.9} />{ROLES[role]}
            </div>
            <Avatar name={admin.name} size={36} style={{ background: 'var(--brand-600)', color: '#fff' }} />
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', background: 'var(--bg)', padding: '22px 26px 32px' }}>
          {Screen ? <Screen /> : <Stub id={route} />}
        </div>
      </div>
    </div>
  )
}
