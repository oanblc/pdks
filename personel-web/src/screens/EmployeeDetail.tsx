// EmployeeDetail.tsx — Çalışan kaydı (tam sayfa; modal yerine)
import { useEffect, useState } from 'react'
import { Icon } from '../icons'
import { api } from '../api'
import { consumeNavArg, goto } from '../nav'
import { Avatar, StatusChip, Field, type Tone } from '../ui'
import { stMap, type Emp } from './Employees'

type Branch = { id: number; name: string }
type Shift = { id: number; name: string; start: string; end: string }

const PAGE_MAX = 760

export function EmployeeDetail() {
  // Listeden geçirilen çalışan kaydını bir kez yakala
  const [emp] = useState<Emp | undefined>(() => consumeNavArg() as Emp | undefined)

  const [name, setName] = useState(emp?.name ?? '')
  const [dept, setDept] = useState(emp?.dept || '')
  const [role, setRole] = useState(emp?.role || '')
  const [branchId, setBranchId] = useState(emp?.branchId ? String(emp.branchId) : '')
  const [shiftId, setShiftId] = useState(emp?.shiftId ? String(emp.shiftId) : '')
  const [isManager, setIsManager] = useState(!!emp?.isManager)
  const [startDate, setStartDate] = useState(emp?.startDate ? emp.startDate.slice(0, 10) : '')
  const [leaveDays, setLeaveDays] = useState(String(emp?.annualLeaveDays ?? 14))
  const [branchList, setBranchList] = useState<Branch[]>([])
  const [shiftList, setShiftList] = useState<Shift[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [acting, setActing] = useState(false)
  const [offboardMode, setOffboardMode] = useState(false)
  const [exitDate, setExitDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [reason, setReason] = useState('')

  useEffect(() => {
    api.branches().then((b: any) => setBranchList(b)).catch(() => {})
    api.shifts().then((s: any) => setShiftList(s)).catch(() => {})
  }, [])

  const back = () => goto('employees')

  const BackLink = (
    <button className="btn btn-ghost" onClick={back} style={{ height: 36, padding: '0 12px 0 8px', marginBottom: 16, gap: 4, borderRadius: 'var(--r-full)' }}>
      <Icon name="chevronL" size={18} color="var(--ink-2)" /> Çalışanlar
    </button>
  )

  if (!emp) {
    return (
      <div style={{ maxWidth: PAGE_MAX }}>
        {BackLink}
        <div className="card col" style={{ padding: 24, gap: 14 }}>
          <div className="t-body ink-2">Çalışan kaydı yüklenemedi. Lütfen listeden tekrar seçin.</div>
          <button className="btn btn-primary" style={{ height: 42, alignSelf: 'flex-start' }} onClick={back}>Çalışanlara dön</button>
        </div>
      </div>
    )
  }

  const save = async () => {
    setErr(null)
    if (name.trim().length < 2) return setErr('Ad-Soyad en az 2 karakter olmalıdır')
    if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return setErr('Geçerli bir işe giriş tarihi seçin')
    setSaving(true)
    try {
      await api.updateEmployee(emp.id, {
        name: name.trim(),
        dept: dept.trim() || null,
        role: role.trim() || null,
        branchId: branchId ? Number(branchId) : null,
        shiftId: shiftId ? Number(shiftId) : null,
        isManager,
        annualLeaveDays: Math.max(0, Math.min(60, Number(leaveDays) || 0)),
        startDate: startDate || null,
      })
      back()
    } catch (e: any) { setErr(e.message); setSaving(false) }
  }

  const approve = async () => {
    setActing(true)
    try { await api.approve(emp.id); back() }
    catch (e: any) { setErr(e.message); setActing(false) }
  }

  const offboard = async () => {
    setErr(null)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(exitDate)) return setErr('Geçerli bir çıkış tarihi seçin')
    setActing(true)
    try { await api.offboardEmployee(emp.id, { exitDate, reason: reason.trim() || undefined }); back() }
    catch (e: any) { setErr(e.message); setActing(false) }
  }

  const reactivate = async () => {
    if (!confirm(`${emp.name} tekrar aktif çalışan yapılsın mı? Giriş ve okutma yetkisi geri açılır.`)) return
    setActing(true)
    try { await api.reactivateEmployee(emp.id); back() }
    catch (e: any) { setErr(e.message); setActing(false) }
  }

  const st = stMap[emp.status] ?? (['neu', emp.status] as [Tone, string])

  return (
    <div style={{ maxWidth: PAGE_MAX }}>
      {BackLink}

      {/* ── Sayfa başlığı: kimlik solda, ana aksiyonlar sağda ── */}
      <div className="rowx between" style={{ gap: 16, marginBottom: 22, alignItems: 'center' }}>
        <div className="rowx gap14" style={{ alignItems: 'center', minWidth: 0 }}>
          <Avatar name={emp.name} size={52} />
          <div style={{ minWidth: 0 }}>
            <div className="t-mono-label ink-3" style={{ fontSize: 10, marginBottom: 3 }}>ÇALIŞAN KAYDI</div>
            <div className="rowx gap10" style={{ alignItems: 'center' }}>
              <span className="t-h1" style={{ fontSize: 24, whiteSpace: 'nowrap' }}>{emp.name}</span>
              <StatusChip status={st[0]}>{st[1]}</StatusChip>
            </div>
            <div className="t-cap ink-3 mono" style={{ marginTop: 2 }}>SİCİL {emp.sicil || '—'} · TC tanımlı</div>
          </div>
        </div>
        <div className="rowx gap10" style={{ flex: 'none' }}>
          <button className="btn btn-ghost" style={{ height: 44 }} onClick={back}>Kapat</button>
          <button className="btn btn-primary" style={{ height: 44, opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={save}>{saving ? 'Kaydediliyor…' : 'Değişiklikleri kaydet'}</button>
        </div>
      </div>

      {err && <div className="t-sm" style={{ color: 'var(--err-ink)', background: 'var(--err-bg)', padding: '11px 14px', borderRadius: 'var(--r-sm)', marginBottom: 16 }}>{err}</div>}

      {/* ── Temel bilgiler ── */}
      <div className="card col" style={{ padding: 24, gap: 16 }}>
        <div className="t-h3" style={{ fontSize: 15 }}>Temel bilgiler</div>
        <Field label="AD-SOYAD"><input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Ad Soyad" /></Field>
        <div className="rowx gap12">
          <Field label="DEPARTMAN"><input className="input" value={dept} onChange={e => setDept(e.target.value)} placeholder="Departman" /></Field>
          <Field label="ROL"><input className="input" value={role} onChange={e => setRole(e.target.value)} placeholder="Rol / unvan" /></Field>
        </div>
        <div className="rowx gap12">
          <Field label="ŞUBE">
            <select className="input" value={branchId} onChange={e => setBranchId(e.target.value)}>
              <option value="">— Şube yok —</option>
              {branchList.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </Field>
          <Field label="VARDİYA">
            <select className="input" value={shiftId} onChange={e => setShiftId(e.target.value)}>
              <option value="">— Vardiya yok —</option>
              {shiftList.map(s => <option key={s.id} value={s.id}>{s.name} ({s.start}–{s.end})</option>)}
            </select>
          </Field>
        </div>
        <div className="rowx gap12">
          <Field label="İŞE GİRİŞ TARİHİ"><input className="input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></Field>
          <div style={{ flex: 1 }} />
        </div>
      </div>

      {/* ── Yetki & izin ── */}
      <div className="card col" style={{ padding: 24, gap: 16, marginTop: 16 }}>
        <div className="t-h3" style={{ fontSize: 15 }}>Yetki & izin</div>
        <label className="rowx between" style={{ alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 'var(--r-sm)', background: 'var(--surface-2)', border: '1px solid var(--border)', cursor: 'pointer' }}>
          <div style={{ minWidth: 0 }}>
            <div className="t-sm" style={{ fontWeight: 600 }}>Şube yetkilisi</div>
            <div className="t-cap ink-3">Günlük kiosk kodunu kendi uygulamasından görür</div>
          </div>
          <input type="checkbox" checked={isManager} onChange={e => setIsManager(e.target.checked)} style={{ width: 20, height: 20, accentColor: 'var(--brand-600)', flex: 'none' }} />
        </label>
        <div className="rowx gap12" style={{ alignItems: 'flex-end' }}>
          <Field label="YILLIK İZİN HAKKI (GÜN)"><input className="input mono" value={leaveDays} onChange={e => setLeaveDays(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="14" style={{ width: 140 }} /></Field>
          {emp.leave && (
            <div className="rowx gap8" style={{ flex: 1, flexWrap: 'wrap', paddingBottom: 4 }}>
              <span className="rowx gap6" style={{ alignItems: 'center' }}><span className="t-cap ink-3">Kullanılan</span><StatusChip status="neu">{emp.leave.used} gün</StatusChip></span>
              {emp.leave.pending > 0 && <span className="rowx gap6" style={{ alignItems: 'center' }}><span className="t-cap ink-3">Bekleyen</span><StatusChip status="warn">{emp.leave.pending} gün</StatusChip></span>}
              <span className="rowx gap6" style={{ alignItems: 'center' }}><span className="t-cap ink-3">Kalan</span><StatusChip status={emp.leave.remaining > 0 ? 'ok' : 'err'}>{emp.leave.remaining} gün</StatusChip></span>
            </div>
          )}
        </div>
        <div className="t-cap ink-3">Yalnız "Yıllık izin" talepleri bakiyeden düşer; mazeret/hastalık ayrı. Bu yılın ({new Date().getFullYear()}) kullanımı gösterilir.</div>
      </div>

      {/* ── Duruma özel: onay / çıkış / geri alma ── */}
      {emp.status === 'pending' && (
        <div className="card" style={{ padding: 18, marginTop: 16, background: 'var(--warn-bg)', border: '1px solid var(--warn-ring)' }}>
          <div className="rowx between" style={{ gap: 12, alignItems: 'center' }}>
            <span className="t-sm" style={{ color: 'var(--warn-ink)' }}>Bu çalışan kayıt onayı bekliyor. Onaylayınca sicil no atanır ve giriş yapabilir.</span>
            <button className="btn btn-primary" disabled={acting} style={{ height: 40, whiteSpace: 'nowrap', opacity: acting ? 0.6 : 1 }} onClick={approve}>{acting ? 'Onaylanıyor…' : 'Kaydı onayla'}</button>
          </div>
        </div>
      )}
      {emp.status === 'active' && (
        <div className="card col" style={{ padding: 24, gap: 16, marginTop: 16 }}>
          <div className="t-h3" style={{ fontSize: 15 }}>İşten çıkış</div>
          {!offboardMode ? (
            <button className="btn btn-ghost" disabled={acting} onClick={() => setOffboardMode(true)} style={{ height: 42, color: 'var(--err-ink)', justifyContent: 'flex-start', alignSelf: 'flex-start' }}>
              <Icon name="logout" size={16} color="var(--err-ink)" /> Çıkış sürecine al
            </button>
          ) : (
            <div style={{ padding: '14px 16px', borderRadius: 'var(--r-sm)', background: 'var(--err-bg)', border: '1px solid var(--err-ring, var(--border))' }}>
              <div className="t-cap ink-2" style={{ marginBottom: 12, lineHeight: 1.5 }}>
                Onaylayınca: mobil <b>giriş ve QR okutma yetkisi kapanır</b>, bekleyen izin/düzeltme talepleri kapatılır.
                Geçmiş puantaj ve bordro kayıtları <b>yasal saklama gereği silinmez</b>; çalışan listede "Çıkış sürecinde" görünür.
              </div>
              <div className="rowx gap12">
                <Field label="ÇIKIŞ TARİHİ"><input className="input" type="date" value={exitDate} onChange={e => setExitDate(e.target.value)} /></Field>
                <Field label="GEREKÇE (opsiyonel)"><input className="input" value={reason} onChange={e => setReason(e.target.value)} placeholder="İstifa, dönem sonu, vb." /></Field>
              </div>
              <div className="rowx gap8" style={{ marginTop: 12, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" disabled={acting} style={{ height: 40 }} onClick={() => { setOffboardMode(false); setErr(null) }}>Vazgeç</button>
                <button className="btn" disabled={acting} onClick={offboard} style={{ height: 40, background: 'var(--err-ink)', color: '#fff', opacity: acting ? 0.6 : 1 }}>{acting ? 'İşleniyor…' : 'Çıkışı onayla'}</button>
              </div>
            </div>
          )}
        </div>
      )}
      {emp.status === 'offboarding' && (
        <div className="card" style={{ padding: 18, marginTop: 16 }}>
          <div className="rowx between" style={{ gap: 12, alignItems: 'center' }}>
            <div style={{ minWidth: 0 }}>
              <div className="t-sm" style={{ marginBottom: 2 }}>Çıkış sürecinde{emp.exitDate ? ` · ${emp.exitDate.slice(0, 10)}` : ''}</div>
              {emp.exitReason && <div className="t-cap ink-3">{emp.exitReason}</div>}
              <div className="t-cap ink-3" style={{ marginTop: 2 }}>Giriş/okutma kapalı. Kayıtlar saklanıyor.</div>
            </div>
            <button className="btn btn-ghost" disabled={acting} onClick={reactivate} style={{ height: 40, whiteSpace: 'nowrap', opacity: acting ? 0.6 : 1 }}>İşe geri al</button>
          </div>
        </div>
      )}

      {/* ── Alt aksiyon çubuğu ── */}
      <div className="rowx gap10" style={{ marginTop: 20, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" style={{ height: 44 }} onClick={back}>Kapat</button>
        <button className="btn btn-primary" style={{ height: 44, minWidth: 180, opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={save}>{saving ? 'Kaydediliyor…' : 'Değişiklikleri kaydet'}</button>
      </div>
    </div>
  )
}
