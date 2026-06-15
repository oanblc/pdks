// Stub.tsx — henüz yapılmamış modüller için "sonraki faz" yer tutucusu
import { Icon } from '../icons'
import { StatusChip } from '../ui'

export const STUBS: Record<string, [string, string, string]> = {
  shifts: ['clock', 'Vardiya Yönetimi', 'Vardiya tanımları (gece yarısını geçen dahil), atama, mola kuralları ve takvim.'],
  timesheet: ['calendar', 'Puantaj & Mesai', 'REVIEW bayraklı kayıtlar, SLA yaşlandırma, 45 saat eşiği (şubeler üstü), provisional rozetleri ve bordro kapanış hazırlığı.'],
  approvals: ['inbox', 'Talep Onayları', 'İzin ve eksik-okutma düzeltme talepleri; çoklu seçim + toplu onay.'],
  anomaly: ['shield', 'Güvenlik', 'Risk skorlu, önceliklendirilmiş inceleme kuyruğu; mükerrer okutma ve olağandışı saat tespitleri.'],
  audit: ['lock', 'Denetim Kaydı', 'Tüm onay/itiraz/manuel-okutma/cihaz işlemleri kullanıcı ve zaman damgasıyla, değişmez (immutable) kayıt.'],
  kvkk: ['shield', 'KVKK', 'Versiyonlu rıza yönetimi (kim geçti/geçmedi), DPIA notu, ilgili kişi talepleri (erişim/düzeltme/silme), saklama/offboarding.'],
  reports: ['doc', 'Raporlar', 'Devamsızlık, fazla mesai, geç giriş ve şube karşılaştırma raporları.'],
}

export function Stub({ id }: { id: string }) {
  const entry = STUBS[id] ?? ['doc', 'Modül', 'Bu modül sonraki fazda eklenecek.']
  const [ic, title, desc] = entry
  return (
    <div className="col center" style={{ minHeight: '70vh', textAlign: 'center' }}>
      <div style={{ width: 72, height: 72, borderRadius: 20, background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-700)', boxShadow: 'var(--sh-sm)' }}><Icon name={ic} size={34} /></div>
      <div className="t-h2" style={{ marginTop: 20 }}>{title}</div>
      <div className="t-body ink-2" style={{ marginTop: 8, maxWidth: 460 }}>{desc}</div>
      <StatusChip status="brand" style={{ marginTop: 18 }}>Sonraki fazda · tasarım sistemi hazır</StatusChip>
    </div>
  )
}
