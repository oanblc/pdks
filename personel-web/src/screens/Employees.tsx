// Employees.tsx — C3 Çalışan Yönetimi (gerçek API)
import { useEffect, useState } from 'react'
import { Icon } from '../icons'
import { api } from '../api'
import { goto } from '../nav'
import { PageHead, SearchInput, Table, Row, Avatar, StatusChip, Modal, Field, type Tone } from '../ui'

export type LeaveBalance = { entitlement: number; used: number; pending: number; remaining: number }
export type Emp = { id: number; name: string; branch: string | null; branchId: number | null; shiftId: number | null; dept: string | null; role: string | null; status: string; sicil: string | null; startDate: string | null; exitDate: string | null; exitReason: string | null; avatar?: string | null; onLeaveToday?: boolean; isManager?: boolean; annualLeaveDays?: number; leave?: LeaveBalance }
type Branch = { id: number; name: string }

export const stMap: Record<string, [Tone, string]> = { active: ['ok', 'Aktif'], pending: ['warn', 'Onay bekliyor'], offboarding: ['neu', 'Çıkış sürecinde'] }

export function Employees() {
  const [emps, setEmps] = useState<Emp[]>([])
  const [loading, setLoading] = useState(true)
  const [branch, setBranch] = useState('Tümü')
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState<number | null>(null)
  const [invite, setInvite] = useState(false)

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
      <PageHead title="Çalışanlar"
        subtitle={<span className="rowx gap8"><span>{emps.length} çalışan</span><span style={{ color: '#c2cdde' }}>·</span><span className="rowx gap6"><span className="live-dot" />canlı veri</span></span>}
        actions={<>
          <button className="btn btn-ghost" onClick={exportCsv}><Icon name="doc" size={16} /> Dışa aktar</button>
          <button className="btn btn-primary" onClick={() => setInvite(true)}><Icon name="plus" size={16} strokeWidth={2} /> Çalışan davet et</button>
        </>} />

      <div className="rowx gap12 filter-bar" style={{ marginBottom: 13 }}>
        <SearchInput placeholder="İsim, sicil no veya departman ara…" width="100%" value={q} onChange={setQ} />
        <select className="input" value={branch} onChange={e => setBranch(e.target.value)} style={{ width: 200, flex: 'none' }}>
          {branches.map(b => <option key={b} value={b}>{b === 'Tümü' ? 'Tüm şubeler' : b}</option>)}
        </select>
      </div>

      {pending > 0 && (
        <div className="rowx gap10" style={{ padding: '10px 14px', borderRadius: 11, background: 'var(--warn-bg)', border: '1px solid var(--warn-ring)', marginBottom: 13 }}>
          <Icon name="info" size={17} color="var(--warn)" />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--warn-ink)' }}>{pending} çalışan kayıt onayı bekliyor</span>
          <span className="t-cap" style={{ color: '#a98a4d', marginLeft: 'auto' }}>Satırdaki <strong style={{ color: 'var(--warn-ink)' }}>Kaydı onayla</strong> ile onaylayın</span>
        </div>
      )}

      {loading ? <div className="t-body ink-2">Yükleniyor…</div> : (
        <Table cols={[{ label: 'Çalışan', flex: 2.4 }, { label: 'Şube', flex: 1.4 }, { label: 'Departman', flex: 1.2 }, { label: 'Rol', flex: 1.4 }, { label: 'Durum', flex: 1.3, align: 'right' }]}>
          {rows.map((e, i) => (
            <Row key={e.id} i={i} bg={e.status === 'pending' ? '#FFFCF5' : undefined} onClick={() => goto('employeeDetail', e)} cells={[
              { flex: 2.4, node: (
                <div className="rowx gap12">
                  <Avatar name={e.name} src={e.avatar || undefined} size={38} />
                  <div style={{ minWidth: 0 }}><div className="rowx gap8" style={{ alignItems: 'center' }}><span style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap' }}>{e.name}</span>{e.isManager && <StatusChip status="ok">Yetkili</StatusChip>}</div><div className="t-cap ink-4 mono" style={{ whiteSpace: 'nowrap', marginTop: 3 }}>SİCİL {e.sicil || '—'}{e.status === 'active' && e.leave ? ` · İZİN ${e.leave.remaining}/${e.leave.entitlement} GÜN` : ''}</div></div>
                </div>) },
              { flex: 1.4, node: <span className="t-body ink-2">{e.branch || '—'}</span> },
              { flex: 1.2, node: <span className="t-body" style={{ color: e.dept ? 'var(--ink-2)' : 'var(--ink-4)' }}>{e.dept || '—'}</span> },
              { flex: 1.4, node: <span className="t-body" style={{ color: e.role ? 'var(--ink-2)' : 'var(--ink-4)' }}>{e.role || '—'}</span> },
              { flex: 1.3, align: 'right', node: <div className="rowx" style={{ justifyContent: 'flex-end' }}>{e.status === 'pending'
                ? <button className="btn" disabled={busy === e.id} onClick={ev => { ev.stopPropagation(); approve(e.id) }} style={{ height: 30, padding: '0 12px', borderRadius: 8, background: 'var(--warn-bg2)', color: '#8A5E0A', border: '1px solid var(--warn-ring2)', fontSize: 12.5, gap: 6, opacity: busy === e.id ? 0.6 : 1 }}><Icon name="check" size={13} strokeWidth={2.2} />{busy === e.id ? 'Onaylanıyor…' : 'Kaydı onayla'}</button>
                : e.status === 'active' && e.onLeaveToday
                  ? <StatusChip status="neu">Bugün izinli</StatusChip>
                  : <StatusChip status={stMap[e.status]?.[0] ?? 'neu'}>{stMap[e.status]?.[1] ?? e.status}</StatusChip>}</div> },
            ]} />
          ))}
        </Table>
      )}
      {!loading && <div className="rowx between" style={{ marginTop: 13 }}>
        <span className="t-cap ink-4">{rows.length} / {emps.length} çalışan gösteriliyor</span>
      </div>}

      {invite && <InviteModal onClose={() => setInvite(false)} onDone={() => { setInvite(false); load() }} />}
    </div>
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
