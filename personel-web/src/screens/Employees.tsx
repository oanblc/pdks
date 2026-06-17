// Employees.tsx — C3 Çalışan Yönetimi (gerçek API)
import { useEffect, useState } from 'react'
import { Icon } from '../icons'
import { api } from '../api'
import { PageHead, SearchInput, Table, Row, Avatar, StatusChip, Modal, Field, type Tone } from '../ui'

type LeaveBalance = { entitlement: number; used: number; pending: number; remaining: number }
type Emp = { id: number; name: string; branch: string | null; branchId: number | null; shiftId: number | null; dept: string | null; role: string | null; status: string; sicil: string | null; startDate: string | null; exitDate: string | null; exitReason: string | null; onLeaveToday?: boolean; isManager?: boolean; annualLeaveDays?: number; leave?: LeaveBalance }
type Branch = { id: number; name: string }
type Shift = { id: number; name: string; start: string; end: string }

const stMap: Record<string, [Tone, string]> = { active: ['ok', 'Aktif'], pending: ['warn', 'Onay bekliyor'], offboarding: ['neu', 'Çıkış sürecinde'] }

export function Employees() {
  const [emps, setEmps] = useState<Emp[]>([])
  const [loading, setLoading] = useState(true)
  const [branch, setBranch] = useState('Tümü')
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState<number | null>(null)
  const [invite, setInvite] = useState(false)
  const [editing, setEditing] = useState<Emp | null>(null)

  const load = () => api.employees().then((e: any) => { setEmps(e); setLoading(false) }).catch(() => setLoading(false))
  useEffect(() => { load() }, [])

  const approve = async (id: number) => {
    setBusy(id)
    try { await api.approve(id); await load() }
    catch (e: any) { alert('Onaylanamadı: ' + (e?.message || 'bilinmeyen hata')) }
    finally { setBusy(null) }
  }

  const exportCsv = () => {
    const header = ['Ad', 'Sicil', 'Şube', 'Departman', 'Rol', 'Durum']
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const lines = [header.join(',')]
    for (const e of emps) lines.push([e.name, e.sicil, e.branch, e.dept, e.role, e.status].map(esc).join(','))
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'calisanlar.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const branches = ['Tümü', ...Array.from(new Set(emps.map(e => e.branch).filter(Boolean) as string[]))]
  const ql = q.trim().toLowerCase()
  const rows = emps.filter(e => {
    if (branch !== 'Tümü' && e.branch !== branch) return false
    if (!ql) return true
    return `${e.name} ${e.sicil || ''} ${e.dept || ''}`.toLowerCase().includes(ql)
  })
  const pending = emps.filter(e => e.status === 'pending').length

  return (
    <div>
      <PageHead title="Çalışanlar" subtitle={`${emps.length} çalışan · canlı veri`}
        actions={<>
          <button className="btn btn-ghost" style={{ height: 44 }} onClick={exportCsv}><Icon name="doc" size={18} color="var(--ink)" /> Dışa aktar</button>
          <button className="btn btn-primary" style={{ height: 44 }} onClick={() => setInvite(true)}><Icon name="plus" size={19} color="#fff" /> Çalışan davet et</button>
        </>} />

      <div className="rowx between" style={{ marginBottom: 16, gap: 12 }}>
        <SearchInput placeholder="İsim, sicil no veya departman ara…" width={340} value={q} onChange={setQ} />
        <select className="input" value={branch} onChange={e => setBranch(e.target.value)} style={{ width: 220, height: 44 }}>
          {branches.map(b => <option key={b} value={b}>{b === 'Tümü' ? 'Tüm şubeler' : b}</option>)}
        </select>
      </div>

      {pending > 0 && (
        <div className="rowx between" style={{ padding: '13px 18px', borderRadius: 'var(--r-lg)', background: 'var(--warn-bg)', border: '1px solid var(--warn-ring)', marginBottom: 14 }}>
          <div className="rowx gap10"><Icon name="info" size={20} color="var(--warn-ink)" /><span className="t-sm" style={{ color: 'var(--warn-ink)', fontWeight: 600 }}>{pending} çalışan kayıt onayı bekliyor</span></div>
          <span className="t-cap" style={{ color: 'var(--warn-ink)' }}>Aşağıdan "Kaydı onayla" ile onaylayın</span>
        </div>
      )}

      {loading ? <div className="t-body ink-2">Yükleniyor…</div> : (
        <Table cols={[{ label: 'ÇALIŞAN', flex: 2.4 }, { label: 'ŞUBE', flex: 1.4 }, { label: 'DEPARTMAN', flex: 1.2 }, { label: 'ROL', flex: 1.4 }, { label: 'DURUM', flex: 1.3 }, { label: '', w: 48, align: 'right' }]}>
          {rows.map((e, i) => (
            <Row key={e.id} i={i} onClick={() => setEditing(e)} cells={[
              { flex: 2.4, node: (
                <div className="rowx gap12">
                  <Avatar name={e.name} size={38} />
                  <div style={{ minWidth: 0 }}><div className="rowx gap6" style={{ alignItems: 'center' }}><span className="t-bodys" style={{ fontSize: 15, whiteSpace: 'nowrap' }}>{e.name}</span>{e.isManager && <StatusChip status="brand">Yetkili</StatusChip>}</div><div className="t-cap ink-3 mono" style={{ whiteSpace: 'nowrap' }}>SİCİL {e.sicil || '—'}{e.status === 'active' && e.leave ? ` · İZİN ${e.leave.remaining}/${e.leave.entitlement} GÜN` : ''}</div></div>
                </div>) },
              { flex: 1.4, node: <span className="t-body ink-2">{e.branch || '—'}</span> },
              { flex: 1.2, node: <span className="t-body ink-2">{e.dept || '—'}</span> },
              { flex: 1.4, node: <span className="t-body">{e.role || '—'}</span> },
              { flex: 1.3, node: e.status === 'pending'
                ? <button className="btn" disabled={busy === e.id} onClick={ev => { ev.stopPropagation(); approve(e.id) }} style={{ height: 34, padding: '0 12px', borderRadius: 'var(--r-sm)', background: 'var(--warn-bg)', color: 'var(--warn-ink)', border: '1px solid var(--warn-ring)', fontSize: 13, opacity: busy === e.id ? 0.6 : 1 }}>{busy === e.id ? 'Onaylanıyor…' : 'Kaydı onayla'}</button>
                : e.status === 'active' && e.onLeaveToday
                  ? <StatusChip status="neu">Bugün izinli</StatusChip>
                  : <StatusChip status={stMap[e.status]?.[0] ?? 'neu'}>{stMap[e.status]?.[1] ?? e.status}</StatusChip> },
              { w: 48, align: 'right', node: <button className="btn" onClick={ev => { ev.stopPropagation(); setEditing(e) }} title="Düzenle" style={{ width: 34, height: 34, padding: 0, borderRadius: 'var(--r-sm)', background: 'transparent' }}><Icon name="dots" size={18} color="var(--ink-3)" /></button> },
            ]} />
          ))}
        </Table>
      )}
      {!loading && <div className="rowx between" style={{ marginTop: 14 }}>
        <span className="t-cap ink-3">{rows.length} / {emps.length} çalışan gösteriliyor</span>
      </div>}

      {invite && <InviteModal onClose={() => setInvite(false)} onDone={() => { setInvite(false); load() }} />}
      {editing && <EmployeeModal emp={editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); load() }} onApprove={approve} />}
    </div>
  )
}

function EmployeeModal({ emp, onClose, onDone, onApprove }: { emp: Emp; onClose: () => void; onDone: () => void; onApprove: (id: number) => Promise<void> }) {
  const [name, setName] = useState(emp.name)
  const [dept, setDept] = useState(emp.dept || '')
  const [role, setRole] = useState(emp.role || '')
  const [branchId, setBranchId] = useState(emp.branchId ? String(emp.branchId) : '')
  const [shiftId, setShiftId] = useState(emp.shiftId ? String(emp.shiftId) : '')
  const [isManager, setIsManager] = useState(!!emp.isManager)
  const [startDate, setStartDate] = useState(emp.startDate ? emp.startDate.slice(0, 10) : '')
  const [leaveDays, setLeaveDays] = useState(String(emp.annualLeaveDays ?? 14))
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
      onDone()
    } catch (e: any) { setErr(e.message); setSaving(false) }
  }

  const approve = async () => { setActing(true); try { await onApprove(emp.id); onClose() } finally { setActing(false) } }

  const offboard = async () => {
    setErr(null)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(exitDate)) return setErr('Geçerli bir çıkış tarihi seçin')
    setActing(true)
    try { await api.offboardEmployee(emp.id, { exitDate, reason: reason.trim() || undefined }); onDone() }
    catch (e: any) { setErr(e.message); setActing(false) }
  }

  const reactivate = async () => {
    if (!confirm(`${emp.name} tekrar aktif çalışan yapılsın mı? Giriş ve okutma yetkisi geri açılır.`)) return
    setActing(true)
    try { await api.reactivateEmployee(emp.id); onDone() }
    catch (e: any) { setErr(e.message); setActing(false) }
  }

  const st = stMap[emp.status] ?? (['neu', emp.status] as [Tone, string])

  return (
    <Modal title="Çalışan kaydı" onClose={onClose} width={500}
      footer={<>
        <button className="btn btn-ghost" style={{ height: 42 }} onClick={onClose}>Kapat</button>
        <button className="btn btn-primary" style={{ height: 42, opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={save}>{saving ? 'Kaydediliyor…' : 'Değişiklikleri kaydet'}</button>
      </>}>
      {err && <div className="t-sm" style={{ color: 'var(--err-ink)', background: 'var(--err-bg)', padding: '10px 12px', borderRadius: 'var(--r-sm)' }}>{err}</div>}

      <div className="rowx gap12" style={{ alignItems: 'center', marginBottom: 4 }}>
        <Avatar name={emp.name} size={46} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="t-bodys" style={{ fontSize: 15.5 }}>{emp.name}</div>
          <div className="t-cap ink-3 mono">SİCİL {emp.sicil || '—'} · TC tanımlı</div>
        </div>
        <StatusChip status={st[0]}>{st[1]}</StatusChip>
      </div>

      <Field label="AD-SOYAD"><input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Ad Soyad" /></Field>
      <div className="rowx gap12">
        <Field label="DEPARTMAN"><input className="input" value={dept} onChange={e => setDept(e.target.value)} placeholder="Departman" /></Field>
        <Field label="ROL"><input className="input" value={role} onChange={e => setRole(e.target.value)} placeholder="Rol / unvan" /></Field>
      </div>
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
      <Field label="İŞE GİRİŞ TARİHİ"><input className="input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></Field>

      <label className="rowx between" style={{ alignItems: 'center', gap: 12, marginTop: 6, padding: '12px 14px', borderRadius: 'var(--r-sm)', background: 'var(--surface-2)', border: '1px solid var(--border)', cursor: 'pointer' }}>
        <div style={{ minWidth: 0 }}>
          <div className="t-sm" style={{ fontWeight: 600 }}>Şube yetkilisi</div>
          <div className="t-cap ink-3">Günlük kiosk kodunu kendi uygulamasından görür</div>
        </div>
        <input type="checkbox" checked={isManager} onChange={e => setIsManager(e.target.checked)} style={{ width: 20, height: 20, accentColor: 'var(--brand-600)', flex: 'none' }} />
      </label>

      {/* Yıllık izin hakkı + bakiye */}
      <div className="rowx gap12" style={{ alignItems: 'flex-end', marginTop: 6 }}>
        <Field label="YILLIK İZİN HAKKI (GÜN)"><input className="input mono" value={leaveDays} onChange={e => setLeaveDays(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="14" style={{ width: 120 }} /></Field>
        {emp.leave && (
          <div className="rowx gap8" style={{ flex: 1, flexWrap: 'wrap', paddingBottom: 4 }}>
            <span className="rowx gap6" style={{ alignItems: 'center' }}><span className="t-cap ink-3">Kullanılan</span><StatusChip status="neu">{emp.leave.used} gün</StatusChip></span>
            {emp.leave.pending > 0 && <span className="rowx gap6" style={{ alignItems: 'center' }}><span className="t-cap ink-3">Bekleyen</span><StatusChip status="warn">{emp.leave.pending} gün</StatusChip></span>}
            <span className="rowx gap6" style={{ alignItems: 'center' }}><span className="t-cap ink-3">Kalan</span><StatusChip status={emp.leave.remaining > 0 ? 'ok' : 'err'}>{emp.leave.remaining} gün</StatusChip></span>
          </div>
        )}
      </div>
      <div className="t-cap ink-3" style={{ marginTop: 2 }}>Yalnız "Yıllık izin" talepleri bakiyeden düşer; mazeret/hastalık ayrı. Bu yılın ({new Date().getFullYear()}) kullanımı gösterilir.</div>

      {emp.status === 'pending' && (
        <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 'var(--r-sm)', background: 'var(--warn-bg)', border: '1px solid var(--warn-ring)' }}>
          <div className="rowx between" style={{ gap: 12 }}>
            <span className="t-sm" style={{ color: 'var(--warn-ink)' }}>Bu çalışan kayıt onayı bekliyor. Onaylayınca sicil no atanır ve giriş yapabilir.</span>
            <button className="btn btn-primary" disabled={acting} style={{ height: 38, whiteSpace: 'nowrap', opacity: acting ? 0.6 : 1 }} onClick={approve}>{acting ? 'Onaylanıyor…' : 'Kaydı onayla'}</button>
          </div>
        </div>
      )}
      {emp.status === 'active' && !offboardMode && (
        <button className="btn btn-ghost" disabled={acting} onClick={() => setOffboardMode(true)} style={{ marginTop: 14, height: 40, color: 'var(--err-ink)', justifyContent: 'flex-start' }}>
          <Icon name="logout" size={16} color="var(--err-ink)" /> Çıkış sürecine al
        </button>
      )}
      {emp.status === 'active' && offboardMode && (
        <div style={{ marginTop: 14, padding: '14px 16px', borderRadius: 'var(--r-sm)', background: 'var(--err-bg)', border: '1px solid var(--err-ring, var(--border))' }}>
          <div className="t-bodys" style={{ fontSize: 14.5, color: 'var(--err-ink)', marginBottom: 4 }}>Çıkış sürecine al</div>
          <div className="t-cap ink-2" style={{ marginBottom: 12, lineHeight: 1.5 }}>
            Onaylayınca: mobil <b>giriş ve QR okutma yetkisi kapanır</b>, bekleyen izin/düzeltme talepleri kapatılır.
            Geçmiş puantaj ve bordro kayıtları <b>yasal saklama gereği silinmez</b>; çalışan listede "Çıkış sürecinde" görünür.
          </div>
          <div className="rowx gap12">
            <Field label="ÇIKIŞ TARİHİ"><input className="input" type="date" value={exitDate} onChange={e => setExitDate(e.target.value)} /></Field>
          </div>
          <Field label="GEREKÇE (opsiyonel)"><input className="input" value={reason} onChange={e => setReason(e.target.value)} placeholder="İstifa, dönem sonu, vb." /></Field>
          <div className="rowx gap8" style={{ marginTop: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" disabled={acting} style={{ height: 38 }} onClick={() => { setOffboardMode(false); setErr(null) }}>Vazgeç</button>
            <button className="btn" disabled={acting} onClick={offboard} style={{ height: 38, background: 'var(--err-ink)', color: '#fff', opacity: acting ? 0.6 : 1 }}>{acting ? 'İşleniyor…' : 'Çıkışı onayla'}</button>
          </div>
        </div>
      )}
      {emp.status === 'offboarding' && (
        <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 'var(--r-sm)', background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          <div className="rowx between" style={{ gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div className="t-sm" style={{ marginBottom: 2 }}>Çıkış sürecinde{emp.exitDate ? ` · ${emp.exitDate.slice(0, 10)}` : ''}</div>
              {emp.exitReason && <div className="t-cap ink-3">{emp.exitReason}</div>}
              <div className="t-cap ink-3" style={{ marginTop: 2 }}>Giriş/okutma kapalı. Kayıtlar saklanıyor.</div>
            </div>
            <button className="btn btn-ghost" disabled={acting} onClick={reactivate} style={{ height: 38, whiteSpace: 'nowrap', opacity: acting ? 0.6 : 1 }}>İşe geri al</button>
          </div>
        </div>
      )}
    </Modal>
  )
}

function InviteModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState('')
  const [tc, setTc] = useState('')
  const [dept, setDept] = useState('')
  const [role, setRole] = useState('')
  const [branchId, setBranchId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [password, setPassword] = useState('')
  const [branchList, setBranchList] = useState<Branch[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => { api.branches().then((b: any) => setBranchList(b)).catch(() => {}) }, [])

  const submit = async () => {
    setErr(null)
    if (!name.trim()) return setErr('Ad-Soyad zorunludur')
    if (!/^\d{11}$/.test(tc)) return setErr('TC kimlik no 11 haneli olmalıdır')
    if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return setErr('Geçerli bir işe giriş tarihi seçin')
    if (password.length < 8) return setErr('Şifre en az 8 karakter olmalı')
    setSaving(true)
    try {
      await api.createEmployee({
        name: name.trim(), tc, password,
        dept: dept.trim() || undefined,
        role: role.trim() || undefined,
        branchId: branchId ? Number(branchId) : undefined,
        startDate: startDate || undefined,
      })
      onDone()
    } catch (e: any) { setErr(e.message); setSaving(false) }
  }

  return (
    <Modal title="Çalışan davet et" onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" style={{ height: 42 }} onClick={onClose}>Vazgeç</button>
        <button className="btn btn-primary" style={{ height: 42, opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={submit}>{saving ? 'Kaydediliyor…' : 'Davet gönder'}</button>
      </>}>
      {err && <div className="t-sm" style={{ color: 'var(--err-ink)', background: 'var(--err-bg)', padding: '10px 12px', borderRadius: 'var(--r-sm)' }}>{err}</div>}
      <Field label="AD-SOYAD"><input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Ad Soyad" /></Field>
      <Field label="TC KİMLİK NO"><input className="input" value={tc} onChange={e => setTc(e.target.value.replace(/\D/g, '').slice(0, 11))} placeholder="11 haneli" inputMode="numeric" /></Field>
      <Field label="DEPARTMAN"><input className="input" value={dept} onChange={e => setDept(e.target.value)} placeholder="Departman" /></Field>
      <Field label="ROL"><input className="input" value={role} onChange={e => setRole(e.target.value)} placeholder="Rol / unvan" /></Field>
      <Field label="ŞUBE">
        <select className="input" value={branchId} onChange={e => setBranchId(e.target.value)}>
          <option value="">— Şube seçin —</option>
          {branchList.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </Field>
      <Field label="İŞE GİRİŞ TARİHİ"><input className="input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></Field>
      <Field label="ŞİFRE"><input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Geçici şifre" /></Field>
    </Modal>
  )
}
