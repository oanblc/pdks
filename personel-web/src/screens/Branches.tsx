// Branches.tsx — C4 Şube & Tablet (gerçek API: cihaz envanteri)
import { useEffect, useState } from 'react'
import { Icon } from '../icons'
import { api } from '../api'
import { consumeNavArg, goto } from '../nav'
import { PageHead, StatCard, Table, Row, StatusChip, Modal, Field, type Tone } from '../ui'

type Device = { id: number; code: string; label: string | null; branchId: number; branch: string; city: string; mode: string; status: string }
type Branch = { id: number; name: string; city?: string; lat?: number | null; lng?: number | null; radius?: number; workingDays?: number[]; kioskPin?: string | null }

const statusMap: Record<string, [Tone, string]> = {
  active: ['ok', 'Bağlı'],
  paired: ['ok', 'Bağlı'],
  online: ['ok', 'Bağlı'],
  revoked: ['err', 'İptal edildi'],
}

export function Branches() {
  const [devices, setDevices] = useState<Device[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<number | null>(null)
  const [showBranch, setShowBranch] = useState(false)
  const [assignPrompt, setAssignPrompt] = useState(false)
  const [selBranch, setSelBranch] = useState<number | null>(null)
  const [pairBranch, setPairBranch] = useState<number | null>(null) // 0 = şube seçtir, >0 = bu şubeye
  const [editLoc, setEditLoc] = useState<Branch | null>(null)
  const [editDev, setEditDev] = useState<Device | null>(null)

  const load = () => {
    api.devices().then((d: any) => { setDevices(d); setLoading(false) }).catch(() => setLoading(false))
    api.branches().then((b: any) => setBranches(b)).catch(() => {})
  }
  useEffect(() => { load() }, [])
  // Genel Bakış'tan bir şube kartına tıklanarak gelindiyse o şubeyi öne çıkar
  useEffect(() => { const a = consumeNavArg(); if (typeof a === 'number') setSelBranch(a) }, [])

  const revoke = async (id: number) => {
    if (!confirm('Cihaz eşlemesi kalıcı olarak iptal edilsin mi?')) return
    setBusy(id)
    try { await api.revokeDevice(id); await load() } catch (e: any) { alert(e.message) } finally { setBusy(null) }
  }
  const reactivate = async (id: number) => {
    setBusy(id)
    try { await api.reactivateDevice(id); await load() } catch (e: any) { alert(e.message) } finally { setBusy(null) }
  }

  const active = devices.filter(d => d.status !== 'revoked').length
  const devsOf = (bid: number) => devices.filter(d => d.branchId === bid)
  const sel = selBranch != null ? branches.find(b => b.id === selBranch) ?? null : null

  return (
    <div>
      {sel ? (
        <BranchDetailPage branch={sel} devices={devsOf(sel.id)} busy={busy} onBack={() => setSelBranch(null)} onReload={load}
          onPair={() => setPairBranch(sel.id)} onEditDevice={setEditDev} onEditLocation={() => setEditLoc(sel)} onRevoke={revoke} onReactivate={reactivate} />
      ) : (
        <>
          <PageHead title="Şube & Tablet" subtitle={`${branches.length} şube · ${devices.length} cihaz · canlı veri`}
            actions={<>
              <button className="btn btn-ghost" style={{ height: 44 }} onClick={() => setShowBranch(true)}><Icon name="building" size={18} color="var(--ink)" /> Şube ekle</button>
              <button className="btn btn-primary" style={{ height: 44 }} onClick={() => setPairBranch(0)}><Icon name="plus" size={19} color="#fff" /> Cihaz eşle</button>
            </>} />
          <div className="rowx gap14" style={{ marginBottom: 18 }}>
            <StatCard label="Şube" value={branches.length} sub="tanımlı" icon="building" />
            <StatCard label="Cihaz" value={devices.length} sub="kayıtlı" icon="qr" />
            <StatCard label="Aktif cihaz" value={active} sub="eşli kiosk" tone="ok" icon="check" />
          </div>
          {loading ? <div className="t-body ink-2">Yükleniyor…</div> : (
            <Table cols={[{ label: 'ŞUBE', flex: 1.8 }, { label: 'CİHAZ', flex: 1.2 }, { label: 'KONUM', flex: 1.2 }, { label: '', w: 110, align: 'right' }]}>
              {branches.map((b, i) => {
                const ds = devsOf(b.id)
                const act = ds.filter(d => d.status !== 'revoked').length
                const locSet = b.lat != null && b.lng != null
                return (
                  <Row key={b.id} i={i} onClick={() => setSelBranch(b.id)} cells={[
                    { flex: 1.8, node: <div className="rowx gap12"><div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--brand-50)', display: 'grid', placeItems: 'center' }}><Icon name="building" size={19} color="var(--brand-700)" /></div><div><div className="t-bodys" style={{ fontSize: 15 }}>{b.name}</div><div className="t-cap ink-3">{b.city || '—'}</div></div></div> },
                    { flex: 1.2, node: ds.length ? <span className="t-body">{ds.length} cihaz<span className="ink-3"> · {act} aktif</span></span> : <span className="t-sm ink-3">cihaz yok</span> },
                    { flex: 1.2, node: locSet ? <StatusChip status="ok">Konum sınırı · {b.radius ?? 100} m</StatusChip> : <StatusChip status="warn">Konum yok</StatusChip> },
                    { w: 110, align: 'right', node: <span className="t-sm" style={{ color: 'var(--brand-700)' }}>Yönet ›</span> },
                  ]} />
                )
              })}
            </Table>
          )}
          <div className="rowx gap8" style={{ marginTop: 14 }}>
            <Icon name="shield" size={16} color="var(--ink-3)" />
            <span className="t-cap ink-3">Şubeye tıklayıp cihazlarını, konumunu ve tatil durumlarını yönet. Bir tablette sorun olursa aynı şubeye ikinci bir cihaz eşleyin; takip kesintisiz devam eder.</span>
          </div>
        </>
      )}

      {showBranch && <AddBranchModal onClose={() => setShowBranch(false)} onDone={() => { setShowBranch(false); load(); setAssignPrompt(true) }} />}
      {assignPrompt && (
        <Modal title="Şube oluşturuldu" onClose={() => setAssignPrompt(false)}
          footer={<>
            <button className="btn btn-ghost" style={{ height: 42 }} onClick={() => setAssignPrompt(false)}>Sonra</button>
            <button className="btn btn-primary" style={{ height: 42 }} onClick={() => { setAssignPrompt(false); goto('employees') }}>Çalışanlara git</button>
          </>}>
          <div className="rowx gap12" style={{ alignItems: 'flex-start' }}>
            <div style={{ width: 40, height: 40, flex: 'none', borderRadius: 10, background: 'var(--ok-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={20} color="var(--ok-ink)" /></div>
            <div className="t-sm ink-2" style={{ lineHeight: 1.6 }}>
              Bu şube için en az bir <b>yetkili</b> atayın. Kiosk yönetici işlemlerinde her gün değişen kodu, yetkili çalışan kendi uygulamasından görür.<br />
              <span className="ink-3">Çalışanlar sayfasından bir çalışanı bu şubeye atayıp <b>"Şube yetkilisi"</b> seçeneğini işaretleyin.</span>
            </div>
          </div>
        </Modal>
      )}
      {pairBranch != null && <PairDeviceModal presetBranchId={pairBranch || undefined} onClose={() => setPairBranch(null)} onDone={() => { setPairBranch(null); load() }} />}
      {editLoc && <BranchLocationModal branch={editLoc} onClose={() => setEditLoc(null)} onDone={() => { setEditLoc(null); load() }} />}
      {editDev && <DeviceModal device={editDev} onClose={() => setEditDev(null)} onDone={() => { setEditDev(null); load() }} />}
    </div>
  )
}

type Holi = { id: number; date: string; name: string; type: 'resmi' | 'dini' | 'custom'; workingBranchIds: number[] }
const fmtDate = (s: string) => { const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? `${m[3]}.${m[2]}.${m[1]}` : s }

// Haftalık günler — getDay() sırasıyla (Paz=0..Cmt=6), ama UI Pzt başlangıçlı gösterilir
const WD_ORDER = [1, 2, 3, 4, 5, 6, 0]
const WD_LABEL: Record<number, string> = { 1: 'Pzt', 2: 'Sal', 3: 'Çar', 4: 'Per', 5: 'Cum', 6: 'Cmt', 0: 'Paz' }

function BranchDetailPage({ branch, devices, busy, onBack, onReload, onPair, onEditDevice, onEditLocation, onRevoke, onReactivate }:
  { branch: Branch; devices: Device[]; busy: number | null; onBack: () => void; onReload: () => void; onPair: () => void; onEditDevice: (d: Device) => void; onEditLocation: () => void; onRevoke: (id: number) => void; onReactivate: (id: number) => void }) {
  const locSet = branch.lat != null && branch.lng != null
  const [holidays, setHolidays] = useState<Holi[]>([])
  const [tatilOpen, setTatilOpen] = useState(false)
  const [wd, setWd] = useState<number[]>(branch.workingDays ?? [1, 2, 3, 4, 5, 6])
  const [wdSaving, setWdSaving] = useState(false)
  const [pinEdit, setPinEdit] = useState(false)
  const [pinVal, setPinVal] = useState(branch.kioskPin || '')
  const [pinSaving, setPinSaving] = useState(false)
  useEffect(() => { api.holidays().then((h: any) => setHolidays(h)).catch(() => {}) }, [])
  useEffect(() => { setWd(branch.workingDays ?? [1, 2, 3, 4, 5, 6]); setPinVal(branch.kioskPin || ''); setPinEdit(false) }, [branch.id])
  const savePin = async () => {
    if (!/^\d{4,6}$/.test(pinVal)) { alert('Kiosk PIN 4-6 haneli olmalı'); return }
    setPinSaving(true)
    try { await api.updateBranch(branch.id, { kioskPin: pinVal }); setPinEdit(false); onReload() }
    catch (e: any) { alert(e.message) } finally { setPinSaving(false) }
  }
  const today = new Date().toISOString().slice(0, 10)
  const upcoming = holidays.filter(h => h.date >= today)
  const wdDirty = JSON.stringify([...wd].sort((a, b) => a - b)) !== JSON.stringify([...(branch.workingDays ?? [1, 2, 3, 4, 5, 6])].sort((a, b) => a - b))
  const toggleWd = (n: number) => setWd(p => p.includes(n) ? p.filter(x => x !== n) : [...p, n])
  const saveWd = async () => {
    setWdSaving(true)
    try { await api.updateBranch(branch.id, { workingDays: wd }); onReload() }
    catch (e: any) { alert(e.message) } finally { setWdSaving(false) }
  }

  return (
    <div>
      <button className="btn btn-ghost" onClick={onBack} style={{ height: 34, marginBottom: 12, paddingLeft: 4 }}><Icon name="chevronL" size={18} color="var(--ink-2)" /> Şube & Tablet</button>
      <div className="rowx gap12" style={{ marginBottom: 18 }}>
        <div style={{ width: 46, height: 46, borderRadius: 12, background: 'var(--brand-50)', display: 'grid', placeItems: 'center' }}><Icon name="building" size={22} color="var(--brand-700)" /></div>
        <div><div className="t-h2">{branch.name}</div><div className="t-cap ink-3">{branch.city || '—'}</div></div>
      </div>

      {/* Konum / geofence */}
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div className="rowx between" style={{ gap: 12 }}>
          <div className="rowx gap10" style={{ minWidth: 0 }}>
            <Icon name="pin" size={18} color={locSet ? 'var(--brand-700)' : 'var(--warn-ink)'} />
            <div style={{ minWidth: 0 }}>
              <div className="t-sm">{locSet ? `Konum sınırı · ${branch.radius ?? 100} m yarıçap` : 'Konum tanımlı değil'}</div>
              <div className="t-cap ink-3 mono">{locSet ? `${branch.lat!.toFixed(5)}, ${branch.lng!.toFixed(5)}` : 'QR okutma için şube konumu gerekli'}</div>
            </div>
          </div>
          <button className="btn btn-ghost" onClick={onEditLocation} style={{ height: 36, whiteSpace: 'nowrap' }}>{locSet ? 'Düzenle' : 'Konum ayarla'}</button>
        </div>
      </div>

      {/* Kiosk yönetici PIN */}
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div className="rowx between" style={{ gap: 12 }}>
          <div className="rowx gap10" style={{ minWidth: 0 }}>
            <Icon name="lock" size={18} color="var(--brand-700)" />
            <div style={{ minWidth: 0 }}>
              <div className="t-sm">Kiosk yönetici PIN'i</div>
              {pinEdit
                ? <input className="input mono" value={pinVal} onChange={e => setPinVal(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="4-6 hane" style={{ width: 150, height: 34, marginTop: 6 }} autoFocus />
                : <div className="t-cap ink-3 mono">{branch.kioskPin ? `PIN ${branch.kioskPin}` : 'Tanımlı değil'} · inceleme moduna giriş</div>}
            </div>
          </div>
          {pinEdit
            ? <div className="rowx gap8" style={{ flex: 'none' }}>
                <button className="btn btn-ghost" style={{ height: 36 }} onClick={() => { setPinEdit(false); setPinVal(branch.kioskPin || '') }}>Vazgeç</button>
                <button className="btn btn-primary" style={{ height: 36, opacity: pinSaving ? 0.6 : 1 }} disabled={pinSaving} onClick={savePin}>{pinSaving ? '…' : 'Kaydet'}</button>
              </div>
            : <button className="btn btn-ghost" onClick={() => setPinEdit(true)} style={{ height: 36, whiteSpace: 'nowrap', flex: 'none' }}>Düzenle</button>}
        </div>
        <div className="t-cap ink-4" style={{ marginTop: 10, lineHeight: 1.5 }}>Kiosk'u <b>açma</b>, <b>"Yönetici"</b> inceleme moduna geçme ve kiosktan <b>çıkış</b> — hepsi bu PIN ile yapılır.</div>
      </div>

      {/* Cihazlar */}
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div className="rowx between" style={{ marginBottom: 12 }}>
          <span className="t-bodys" style={{ fontSize: 15 }}>Cihazlar ({devices.length})</span>
          <button className="btn btn-primary" onClick={onPair} style={{ height: 36, padding: '0 12px', fontSize: 13 }}><Icon name="plus" size={16} color="#fff" /> Cihaz eşle</button>
        </div>
        {devices.length === 0 ? (
          <div className="t-sm ink-3" style={{ padding: 8 }}>Bu şubeye henüz cihaz eşlenmedi.</div>
        ) : <div className="col" style={{ gap: 8 }}>{devices.map(d => {
          const revoked = d.status === 'revoked'
          const st = revoked ? statusMap.revoked : (statusMap[d.status] ?? ['neu', d.status])
          return (
            <div key={d.id} className="rowx between" style={{ padding: '11px 13px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', gap: 10 }}>
              <div className="rowx gap12" style={{ minWidth: 0 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--surface-2)', display: 'grid', placeItems: 'center' }}><Icon name="qr" size={17} color="var(--ink-2)" /></div>
                <div style={{ minWidth: 0 }}>
                  <div className="t-bodys mono" style={{ fontSize: 14 }}>{d.code}</div>
                  <div className="t-cap ink-3">{d.label || '— kullanım yeri belirtilmedi'}</div>
                </div>
              </div>
              <div className="rowx gap8" style={{ whiteSpace: 'nowrap' }}>
                <StatusChip status={st[0]}>{st[1]}</StatusChip>
                <button className="btn btn-ghost" onClick={() => onEditDevice(d)} style={{ height: 32, padding: '0 10px', fontSize: 13 }}>Düzenle</button>
                {revoked
                  ? <button className="btn" disabled={busy === d.id} onClick={() => onReactivate(d.id)} style={{ height: 32, padding: '0 10px', borderRadius: 'var(--r-sm)', background: 'var(--ok-bg)', color: 'var(--ok-ink)', border: '1px solid var(--ok-ink)', fontSize: 13, opacity: busy === d.id ? 0.5 : 1 }}>Etkinleştir</button>
                  : <button className="btn" disabled={busy === d.id} onClick={() => onRevoke(d.id)} style={{ height: 32, padding: '0 10px', borderRadius: 'var(--r-sm)', background: 'transparent', color: 'var(--err)', border: '1px solid var(--err-ring)', fontSize: 13, opacity: busy === d.id ? 0.45 : 1 }}>İptal</button>}
              </div>
            </div>
          )
        })}</div>}
      </div>

      {/* Çalışma günleri — bu şube */}
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div className="rowx between" style={{ marginBottom: 12, alignItems: 'flex-start' }}>
          <div><span className="t-bodys" style={{ fontSize: 15 }}>Haftalık çalışma günleri</span><span className="t-cap ink-3"> · işaretli günler açık</span></div>
          {wdDirty && <button className="btn btn-primary" disabled={wdSaving} onClick={saveWd} style={{ height: 32, padding: '0 14px', fontSize: 13, opacity: wdSaving ? 0.6 : 1 }}>{wdSaving ? 'Kaydediliyor…' : 'Kaydet'}</button>}
        </div>
        <div className="rowx gap8" style={{ flexWrap: 'wrap' }}>
          {WD_ORDER.map(n => {
            const on = wd.includes(n)
            return (
              <button key={n} onClick={() => toggleWd(n)} className="btn" style={{ height: 40, minWidth: 56, padding: '0 14px', borderRadius: 'var(--r-sm)', fontSize: 13.5, fontWeight: 600, border: `1px solid ${on ? 'var(--brand-600)' : 'var(--border)'}`, background: on ? 'var(--brand-50)' : 'transparent', color: on ? 'var(--brand-700)' : 'var(--ink-3)' }}>{WD_LABEL[n]}</button>
            )
          })}
        </div>
        <div className="t-cap ink-3" style={{ paddingTop: 10, lineHeight: 1.5 }}>Kapalı günler puantaj çizelgesinde soluk görünür (hafta sonu gibi). Örn. Cumartesi çalışıyorsanız Cmt'yi açık bırakın; AVM şubeleri Paz'ı da açabilir.</div>
      </div>

      {/* Tatiller — bu şube (katlanır, varsayılan kapalı) */}
      <div className="card" style={{ padding: 16 }}>
        <div className="rowx between" style={{ alignItems: 'center' }}>
          <button onClick={() => setTatilOpen(o => !o)} className="rowx gap10" style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, alignItems: 'center', flex: 1, textAlign: 'left' }}>
            <Icon name={tatilOpen ? 'chevronDown' : 'chevron'} size={17} color="var(--ink-3)" />
            <span className="t-bodys" style={{ fontSize: 15 }}>Tatiller</span>
            <span className="t-cap ink-3">· bu şubenin durumu</span>
            {upcoming.length > 0 && <StatusChip status="neu">{upcoming.length}</StatusChip>}
          </button>
          <button className="btn btn-ghost" onClick={() => goto('holidays')} style={{ height: 32, padding: '0 10px', fontSize: 13 }}>Tümünü yönet ›</button>
        </div>
        {tatilOpen && (
          <div style={{ marginTop: 12 }}>
            {upcoming.length === 0 ? (
              <div className="t-sm ink-3" style={{ padding: 8 }}>Yaklaşan tatil yok. Tatiller sayfasından ekleyebilirsiniz.</div>
            ) : <div className="col" style={{ gap: 6 }}>{upcoming.map(h => {
              const working = h.workingBranchIds.includes(branch.id)
              return (
                <div key={h.id} className="rowx between" style={{ padding: '10px 12px', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', gap: 10 }}>
                  <div className="rowx gap10" style={{ minWidth: 0, alignItems: 'center' }}>
                    <span className="t-sm mono ink-2" style={{ width: 78, flex: 'none' }}>{fmtDate(h.date)}</span>
                    <span className="t-sm" style={{ minWidth: 0 }}>{h.name}</span>
                    <StatusChip status={h.type === 'resmi' ? 'brand' : 'neu'}>{h.type === 'resmi' ? 'Resmi' : h.type === 'dini' ? 'Dini' : 'Diğer'}</StatusChip>
                  </div>
                  <StatusChip status={working ? 'warn' : 'ok'}>{working ? 'Çalışılıyor' : 'Kapalı'}</StatusChip>
                </div>
              )
            })}</div>}
          </div>
        )}
      </div>
    </div>
  )
}

function AddBranchModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [kioskPin, setKioskPin] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    setErr(null)
    if (!name.trim()) return setErr('Şube adı zorunludur')
    if (!username.trim()) return setErr('Kullanıcı adı zorunludur')
    if (password.length < 8) return setErr('Şifre en az 8 karakter olmalı')
    if (kioskPin && !/^\d{4,6}$/.test(kioskPin)) return setErr('Kiosk PIN 4-6 haneli olmalı')
    setSaving(true)
    try {
      await api.addBranch({ name: name.trim(), city: city.trim() || undefined, username: username.trim(), password, kioskPin: kioskPin || undefined })
      onDone()
    } catch (e: any) { setErr(e.message); setSaving(false) }
  }

  return (
    <Modal title="Şube ekle" onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" style={{ height: 42 }} onClick={onClose}>Vazgeç</button>
        <button className="btn btn-primary" style={{ height: 42, opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={submit}>{saving ? 'Kaydediliyor…' : 'Şube ekle'}</button>
      </>}>
      {err && <div className="t-sm" style={{ color: 'var(--err-ink)', background: 'var(--err-bg)', padding: '10px 12px', borderRadius: 'var(--r-sm)' }}>{err}</div>}
      <Field label="ŞUBE ADI"><input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Şube adı" /></Field>
      <Field label="ŞEHİR"><input className="input" value={city} onChange={e => setCity(e.target.value)} placeholder="Şehir" /></Field>
      <Field label="KULLANICI ADI"><input className="input" value={username} onChange={e => setUsername(e.target.value)} placeholder="Kiosk kullanıcı adı" /></Field>
      <Field label="ŞİFRE (YEDEK)"><input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Kiosk için yedek şifre" /></Field>
      <Field label="KİOSK PIN (4-6 HANE)"><input className="input mono" value={kioskPin} onChange={e => setKioskPin(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="boş bırakılırsa 1234" /></Field>
      <div className="t-cap ink-3" style={{ padding: '2px 2px 0', lineHeight: 1.5 }}>Kiosk'u <b>açma</b>, <b>yönetici inceleme moduna</b> geçme ve kiosktan <b>çıkış</b> — hepsi bu <b>PIN</b> ile yapılır (bu sayfadan görüp değiştirebilirsiniz). Şifre yalnız yedek olarak çalışır.</div>
    </Modal>
  )
}

function DeviceModal({ device, onClose, onDone }: { device: Device; onClose: () => void; onDone: () => void }) {
  const [label, setLabel] = useState(device.label || '')
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const PRESETS = ['Giriş', 'Ana giriş', 'Arka giriş', 'Fabrika', 'Depo', 'Kasa', 'Ofis']

  const save = async () => {
    setErr(null); setSaving(true)
    try { await api.updateDevice(device.id, { label: label.trim() || null }); onDone() }
    catch (e: any) { setErr(e.message); setSaving(false) }
  }

  return (
    <Modal title={`Cihaz · ${device.code}`} onClose={onClose} width={460}
      footer={<>
        <button className="btn btn-ghost" style={{ height: 42 }} onClick={onClose}>Vazgeç</button>
        <button className="btn btn-primary" style={{ height: 42, opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={save}>{saving ? 'Kaydediliyor…' : 'Kaydet'}</button>
      </>}>
      {err && <div className="t-sm" style={{ color: 'var(--err-ink)', background: 'var(--err-bg)', padding: '10px 12px', borderRadius: 'var(--r-sm)' }}>{err}</div>}
      <div className="t-cap ink-3">{device.branch} · {device.city || '—'} · {device.mode}</div>
      <Field label="KULLANIM YERİ"><input className="input" value={label} onChange={e => setLabel(e.target.value)} placeholder="Örn. Giriş, Fabrika, Kasa" maxLength={40} /></Field>
      <div className="rowx gap8" style={{ flexWrap: 'wrap' }}>
        {PRESETS.map(p => <button key={p} className="btn btn-ghost" onClick={() => setLabel(p)} style={{ height: 32, padding: '0 12px', fontSize: 13 }}>{p}</button>)}
      </div>
    </Modal>
  )
}

function BranchLocationModal({ branch, onClose, onDone }: { branch: Branch; onClose: () => void; onDone: () => void }) {
  const [lat, setLat] = useState(branch.lat != null ? String(branch.lat) : '')
  const [lng, setLng] = useState(branch.lng != null ? String(branch.lng) : '')
  const [radius, setRadius] = useState(String(branch.radius ?? 100))
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [locating, setLocating] = useState(false)
  const PRESET_R = [50, 100, 200, 500]

  // "41.0422, 29.0076" gibi tek alana yapıştırmayı da destekle
  const onPasteCombo = (v: string) => {
    const m = v.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/)
    if (m) { setLat(m[1]); setLng(m[2]) } else setLat(v)
  }

  const useBrowser = () => {
    setErr(null); setLocating(true)
    navigator.geolocation?.getCurrentPosition(
      p => { setLat(p.coords.latitude.toFixed(6)); setLng(p.coords.longitude.toFixed(6)); setLocating(false) },
      () => { setErr('Tarayıcı konumu alınamadı (izin gerekli).'); setLocating(false) },
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }

  const save = async () => {
    setErr(null)
    const la = Number(lat), ln = Number(lng), r = Number(radius)
    if (!Number.isFinite(la) || la < -90 || la > 90) return setErr('Geçerli bir enlem girin (-90 … 90)')
    if (!Number.isFinite(ln) || ln < -180 || ln > 180) return setErr('Geçerli bir boylam girin (-180 … 180)')
    if (!Number.isInteger(r) || r < 20 || r > 5000) return setErr('Konum sınırı 20 – 5000 m arasında olmalı')
    setSaving(true)
    try { await api.updateBranch(branch.id, { lat: la, lng: ln, radius: r }); onDone() }
    catch (e: any) { setErr(e.message); setSaving(false) }
  }

  return (
    <Modal title={`${branch.name} · konum`} onClose={onClose} width={480}
      footer={<>
        <button className="btn btn-ghost" style={{ height: 42 }} onClick={onClose}>Vazgeç</button>
        <button className="btn btn-primary" style={{ height: 42, opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={save}>{saving ? 'Kaydediliyor…' : 'Konumu kaydet'}</button>
      </>}>
      {err && <div className="t-sm" style={{ color: 'var(--err-ink)', background: 'var(--err-bg)', padding: '10px 12px', borderRadius: 'var(--r-sm)' }}>{err}</div>}
      <div className="t-cap ink-3" style={{ lineHeight: 1.5 }}>Google Maps'te şubeye sağ tıkla → koordinata tıkla (panoya kopyalanır) → aşağıya yapıştır. Bu nokta, konum sınırının merkezi olur.</div>
      <Field label="ENLEM, BOYLAM (yapıştır)"><input className="input" value={lat && lng ? `${lat}, ${lng}` : lat} onChange={e => onPasteCombo(e.target.value)} placeholder="41.04220, 29.00765" /></Field>
      <div className="rowx gap12">
        <Field label="ENLEM"><input className="input mono" value={lat} onChange={e => setLat(e.target.value.trim())} placeholder="41.04220" inputMode="decimal" /></Field>
        <Field label="BOYLAM"><input className="input mono" value={lng} onChange={e => setLng(e.target.value.trim())} placeholder="29.00765" inputMode="decimal" /></Field>
      </div>
      <button className="btn btn-ghost" disabled={locating} onClick={useBrowser} style={{ height: 40, justifyContent: 'flex-start', opacity: locating ? 0.6 : 1 }}>
        <Icon name="pin" size={16} color="var(--brand-700)" /> {locating ? 'Konum alınıyor…' : 'Bu tarayıcının konumunu kullan (şubedeysen)'}
      </button>
      <Field label="KONUM SINIRI (YARIÇAP)">
        <div className="rowx gap8" style={{ alignItems: 'center' }}>
          <input className="input mono" value={radius} onChange={e => setRadius(e.target.value.replace(/\D/g, ''))} placeholder="100" inputMode="numeric" style={{ width: 110 }} />
          <span className="t-sm ink-2">metre</span>
          <div className="rowx gap6" style={{ marginLeft: 'auto', flexWrap: 'wrap' }}>
            {PRESET_R.map(r => <button key={r} className="btn btn-ghost" onClick={() => setRadius(String(r))} style={{ height: 30, padding: '0 10px', fontSize: 12.5, ...(Number(radius) === r ? { background: 'var(--brand-50)', color: 'var(--brand-700)' } : {}) }}>{r} m</button>)}
          </div>
        </div>
      </Field>
      <div className="t-cap ink-3">Çalışan, şube merkezinden bu yarıçaptan uzaktaysa QR okutması reddedilir.</div>
    </Modal>
  )
}

function PairDeviceModal({ presetBranchId, onClose, onDone }: { presetBranchId?: number; onClose: () => void; onDone: () => void }) {
  const [branches, setBranches] = useState<Branch[]>([])
  const [branchId, setBranchId] = useState(presetBranchId ? String(presetBranchId) : '')
  const [label, setLabel] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const locked = !!presetBranchId

  useEffect(() => { api.branches().then((b: any) => setBranches(b)).catch(() => {}) }, [])
  const presetName = branches.find(b => b.id === presetBranchId)

  const submit = async () => {
    setErr(null)
    if (!branchId) return setErr('Lütfen bir şube seçin')
    setSaving(true)
    try { await api.pairDevice(Number(branchId), label.trim() || undefined); onDone() } catch (e: any) { setErr(e.message); setSaving(false) }
  }

  return (
    <Modal title="Cihaz eşle" onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" style={{ height: 42 }} onClick={onClose}>Vazgeç</button>
        <button className="btn btn-primary" style={{ height: 42, opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={submit}>{saving ? 'Eşleniyor…' : 'Cihaz eşle'}</button>
      </>}>
      {err && <div className="t-sm" style={{ color: 'var(--err-ink)', background: 'var(--err-bg)', padding: '10px 12px', borderRadius: 'var(--r-sm)' }}>{err}</div>}
      {locked ? (
        <Field label="ŞUBE"><div className="input" style={{ display: 'flex', alignItems: 'center', background: 'var(--surface-2)' }}>{presetName ? `${presetName.name}${presetName.city ? ` · ${presetName.city}` : ''}` : 'Seçili şube'}</div></Field>
      ) : (
        <Field label="ŞUBE">
          <select className="input" value={branchId} onChange={e => setBranchId(e.target.value)}>
            <option value="">— Şube seçin —</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}{b.city ? ` · ${b.city}` : ''}</option>)}
          </select>
        </Field>
      )}
      <Field label="KULLANIM YERİ (opsiyonel)"><input className="input" value={label} onChange={e => setLabel(e.target.value)} placeholder="Örn. Giriş, Fabrika, Kasa" maxLength={40} /></Field>
    </Modal>
  )
}
