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
  dashboard: Dashboard, employees: Employees, branches: Branches, approvals: Approvals, audit: Audit,
  shifts: Shifts, holidays: Holidays, timesheet: Timesheet, anomaly: Anomaly, risk: RiskScore, risksettings: RiskSettings, kvkk: Kvkk, reports: Reports,
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
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* ── Global hata bildirimi (toast) ── */}
      {toast && (
        <div role="alert" style={{ position: 'fixed', top: 18, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: 'var(--err-bg)', color: 'var(--err-ink)', border: '1px solid var(--err-ring)', borderRadius: 'var(--r-sm)', padding: '11px 16px', boxShadow: 'var(--sh-card)', display: 'flex', alignItems: 'center', gap: 10, maxWidth: 480 }}>
          <Icon name="alert" size={18} color="var(--err)" />
          <span className="t-sm" style={{ fontWeight: 600 }}>{toast}</span>
        </div>
      )}
      {/* ── Sol nav ── */}
      <div style={{ width: 252, flex: 'none', background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
        <div className="rowx gap12" style={{ height: 64, flex: 'none', padding: '0 18px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--brand-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--sh-brand)' }}><Icon name="check" size={21} color="#fff" strokeWidth={2.6} /></div>
          <div><div className="t-h3" style={{ fontSize: 17 }}>puanto</div><div className="t-mono-label ink-3" style={{ fontSize: 9 }}>YÖNETİCİ PANELİ</div></div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '14px 12px' }}>
          {NAV.map(g => {
            const items = g.items.filter(allowed)
            if (!items.length) return null
            return (
              <div key={g.group} style={{ marginBottom: 16 }}>
                <div className="t-mono-label ink-3" style={{ padding: '0 10px 8px', fontSize: 10 }}>{g.group.toUpperCase()}</div>
                <div className="col" style={{ gap: 2 }}>
                  {items.map(it => {
                    const on = route === it.id
                    return (
                      <button key={it.id} onClick={() => setRoute(it.id)} className="btn" style={{ justifyContent: 'flex-start', height: 40, padding: '0 10px', borderRadius: 'var(--r-sm)', gap: 11, background: on ? 'var(--brand-50)' : 'transparent', color: on ? 'var(--brand-700)' : 'var(--ink-2)' }}>
                        <Icon name={it.icon} size={19} strokeWidth={on ? 2 : 1.75} />
                        <span style={{ flex: 1, textAlign: 'left', fontSize: 14, fontWeight: on ? 600 : 500 }}>{it.label}</span>
                        {it.badge && <span className="t-cap mono" style={{ minWidth: 20, height: 20, padding: '0 6px', borderRadius: 'var(--r-full)', background: on ? 'var(--brand-600)' : 'var(--surface-3)', color: on ? '#fff' : 'var(--ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>{it.badge}</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
        <div className="rowx gap10" style={{ padding: 14, borderTop: '1px solid var(--border)' }}>
          <Avatar name={admin.name} size={38} />
          <div className="grow" style={{ minWidth: 0 }}><div className="t-sm" style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{admin.name}</div><div className="t-cap ink-3">{ROLES[role]}</div></div>
          <button onClick={logout} className="btn" style={{ width: 32, height: 32, padding: 0, borderRadius: 'var(--r-sm)' }} title="Çıkış"><Icon name="logout" size={18} color="var(--ink-3)" /></button>
        </div>
      </div>

      {/* ── Ana içerik ── */}
      <div className="col grow" style={{ minWidth: 0 }}>
        <div className="rowx between" style={{ height: 64, flex: 'none', padding: '0 26px', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
          <div />
          <div className="rowx gap12">
            <NotificationBell />
            <div className="rowx gap8" style={{ height: 40, padding: '0 14px', borderRadius: 'var(--r-full)', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
              <Icon name="shield" size={16} color="var(--ink-2)" /><span className="t-sm" style={{ fontWeight: 600 }}>{ROLES[role]}</span>
            </div>
            <Avatar name={admin.name} size={40} ring />
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', background: 'var(--bg)', padding: '26px 30px 48px' }}>
          {Screen ? <Screen /> : <Stub id={route} />}
        </div>
      </div>
    </div>
  )
}
