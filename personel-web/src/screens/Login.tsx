// Login.tsx — C1 Yönetici paneli girişi (gerçek API)
import { useState } from 'react'
import { Icon } from '../icons'
import { api, setToken, type AdminInfo } from '../api'

export function Login({ onLogin }: { onLogin: (admin: AdminInfo) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setBusy(true); setError(null)
    try {
      const { token, admin } = await api.adminLogin(email.trim(), password)
      setToken(token)
      onLogin(admin)
    } catch (e: any) {
      setError(e.message || 'Giriş başarısız')
    } finally { setBusy(false) }
  }

  return (
    <div className="col center" style={{ height: '100vh', background: 'radial-gradient(120% 80% at 50% -10%, #eef5f5, var(--bg) 55%)', padding: 24 }}>
      <div className="card" style={{ width: 420, padding: 38, boxShadow: 'var(--sh-lg)' }}>
        <div className="rowx gap12">
          <div style={{ width: 46, height: 46, borderRadius: 13, background: 'var(--brand-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--sh-brand)' }}><Icon name="check" size={25} color="#fff" strokeWidth={2.6} /></div>
          <div><div className="t-h2" style={{ fontSize: 22, letterSpacing: '-0.03em' }}>puanto</div><div className="t-mono-label ink-3" style={{ fontSize: 9.5 }}>YÖNETİCİ PANELİ</div></div>
        </div>
        <div className="t-h2" style={{ fontSize: 21, marginTop: 28 }}>Hesabınızla giriş yapın</div>
        <div className="t-sm ink-2" style={{ marginTop: 4 }}>Çalışan PDKS yönetim paneline erişin.</div>

        <div className="col" style={{ gap: 14, marginTop: 24 }}>
          <div className="field">
            <span className="field-label">E-posta</span>
            <input className="input" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} placeholder="ornek@firma.com" autoFocus />
          </div>
          <div className="field">
            <span className="field-label">Şifre</span>
            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} placeholder="••••••••" />
          </div>
        </div>

        {error && (
          <div className="rowx gap10" style={{ marginTop: 14, padding: '11px 14px', borderRadius: 'var(--r-md)', background: 'var(--err-bg)', border: '1px solid var(--err-ring)' }}>
            <Icon name="alert" size={18} color="var(--err)" /><span className="t-sm" style={{ color: 'var(--err-ink)' }}>{error}</span>
          </div>
        )}

        <button className="btn btn-primary full" style={{ height: 52, marginTop: 22, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={submit}>{busy ? 'Giriş yapılıyor…' : 'Giriş yap'}</button>
        <div className="rowx gap8 center" style={{ marginTop: 20 }}><Icon name="lock" size={14} color="var(--ink-3)" /><span className="t-cap ink-3">Tüm oturumlar denetim kaydına yazılır · KVKK uyumlu</span></div>
        <div className="t-cap ink-3 tcenter" style={{ marginTop: 10 }}>Demo: admin@firma.com · admin123</div>
      </div>
    </div>
  )
}
