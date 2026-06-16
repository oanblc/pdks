// Holidays.tsx — Tatiller (resmi/dini bayram takvimi): ekle / düzenle / sil + içe aktar
import { useEffect, useState } from 'react'
import { Icon } from '../icons'
import { api } from '../api'
import { PageHead, StatCard, StatusChip, Modal, Field, type Tone } from '../ui'

type H = { id: number; date: string; name: string; type: 'resmi' | 'dini' | 'custom'; workingBranchIds: number[]; workingBranchNames: string[] }
type Branch = { id: number; name: string }

const typeChip: Record<string, [Tone, string]> = { resmi: ['brand', 'Resmi'], dini: ['neu', 'Dini'], custom: ['neu', 'Diğer'] }
const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
const fmtDate = (s: string) => { const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? `${m[3]}.${m[2]}.${m[1]}` : s }

export function Holidays() {
  const [rows, setRows] = useState<H[]>([])
  const [loading, setLoading] = useState(true)
  const [add, setAdd] = useState(false)
  const [editing, setEditing] = useState<H | null>(null)
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [open, setOpen] = useState<Set<number>>(new Set())
  const [busy, setBusy] = useState(false)
  const load = () => api.holidays().then((s: any) => { setRows(s); setLoading(false) }).catch(() => setLoading(false))
  useEffect(() => { load() }, [])

  const doImport = async () => {
    setBusy(true)
    try { const r: any = await api.importHolidays(Number(year)); alert(`${r.added} tatil eklendi${r.religiousIncluded ? '' : ' (bu yıl için dini bayram tarihi yok; elle ekleyin)'}`); load() }
    catch (e: any) { alert(e.message) } finally { setBusy(false) }
  }
  const toggle = (m: number) => setOpen(s => { const n = new Set(s); n.has(m) ? n.delete(m) : n.add(m); return n })

  // Yalnız seçili yıl; aya göre grupla (varsayılan kapalı, tıklayınca açılır)
  const shown = rows.filter(r => r.date.slice(0, 4) === year).sort((a, b) => a.date < b.date ? -1 : 1)
  const closed = shown.filter(r => r.workingBranchIds.length === 0).length
  const months = Array.from(new Set(shown.map(r => Number(r.date.slice(5, 7))))).sort((a, b) => a - b)

  return (
    <div>
      <PageHead title="Tatiller" subtitle={`${year} · ${shown.length} resmi/dini tatil`}
        actions={<>
          <input className="input" value={year} onChange={e => setYear(e.target.value.replace(/\D/g, '').slice(0, 4))} style={{ width: 84, height: 44, textAlign: 'center' }} inputMode="numeric" />
          <button className="btn btn-ghost" style={{ height: 44 }} disabled={busy} onClick={doImport}><Icon name="calendar" size={18} color="var(--ink)" /> İçe aktar</button>
          <button className="btn btn-primary" style={{ height: 44 }} onClick={() => setAdd(true)}><Icon name="plus" size={19} color="#fff" /> Tatil ekle</button>
        </>} />
      <div className="rowx gap14" style={{ marginBottom: 18 }}>
        <StatCard label="Tatil" value={shown.length} sub={`${year} yılı`} icon="calendar" />
        <StatCard label="Kapalı gün" value={closed} sub="tüm şubeler kapalı" tone="ok" icon="calendar" />
        <StatCard label="Açık (çalışılan)" value={shown.length - closed} sub="en az bir şube çalışıyor" tone="warn" icon="clock" />
      </div>
      {loading ? <div className="t-body ink-2">Yükleniyor…</div> : shown.length === 0 ? (
        <div className="card" style={{ padding: 24 }}><span className="t-body ink-2">{year} için tatil yok. "İçe aktar" ile yılın resmi/dini tatillerini ekleyin.</span></div>
      ) : (
        <div className="col" style={{ gap: 10 }}>
          {months.map(m => {
            const items = shown.filter(r => Number(r.date.slice(5, 7)) === m)
            const isOpen = open.has(m)
            return (
              <div key={m} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <button className="rowx between row-press" onClick={() => toggle(m)} style={{ width: '100%', padding: '15px 18px', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                  <span className="t-bodys" style={{ fontSize: 15 }}>{AYLAR[m - 1]} {year} <span className="ink-3" style={{ fontWeight: 400 }}>· {items.length} tatil</span></span>
                  <Icon name={isOpen ? 'chevronDown' : 'chevron'} size={18} color="var(--ink-3)" />
                </button>
                {isOpen && items.map(r => (
                  <div key={r.id} className="rowx between row-press" onClick={() => setEditing(r)} style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', cursor: 'pointer', gap: 10 }}>
                    <div className="rowx gap12" style={{ minWidth: 0, alignItems: 'center' }}>
                      <span className="t-body mono ink-2" style={{ width: 80, flex: 'none' }}>{fmtDate(r.date)}</span>
                      <span className="t-bodys" style={{ fontSize: 14.5, minWidth: 0 }}>{r.name}</span>
                      <StatusChip status={typeChip[r.type]?.[0] ?? 'neu'}>{typeChip[r.type]?.[1] ?? r.type}</StatusChip>
                    </div>
                    <div className="rowx gap10" style={{ whiteSpace: 'nowrap', alignItems: 'center' }}>
                      {r.workingBranchIds.length === 0 ? <StatusChip status="ok">Kapalı</StatusChip> : <span className="t-sm ink-2">{r.workingBranchNames.length} şube çalışıyor</span>}
                      <span className="t-sm" style={{ color: 'var(--brand-700)' }}>Düzenle ›</span>
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      )}
      {add && <HolidayModal onClose={() => setAdd(false)} onDone={() => { setAdd(false); load() }} />}
      {editing && <HolidayModal holiday={editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); load() }} />}
    </div>
  )
}

function HolidayModal({ holiday, onClose, onDone }: { holiday?: H; onClose: () => void; onDone: () => void }) {
  const editMode = !!holiday
  const [date, setDate] = useState(holiday?.date ?? '')
  const [name, setName] = useState(holiday?.name ?? '')
  const [type, setType] = useState<'resmi' | 'dini' | 'custom'>(holiday?.type ?? 'resmi')
  const [working, setWorking] = useState<number[]>(holiday?.workingBranchIds ?? [])
  const [branches, setBranches] = useState<Branch[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { api.branches().then((b: any) => setBranches(b)).catch(() => {}) }, [])
  const toggle = (id: number) => setWorking(w => w.includes(id) ? w.filter(x => x !== id) : [...w, id])

  const submit = async () => {
    setErr(null)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return setErr('Tarih seçin')
    if (name.trim().length < 2) return setErr('Tatil adı zorunludur')
    setSaving(true)
    const body = { date, name: name.trim(), type, workingBranchIds: working }
    try {
      if (editMode) await api.updateHoliday(holiday!.id, body)
      else await api.addHoliday(body)
      onDone()
    } catch (e: any) { setErr(e.message); setSaving(false) }
  }

  const remove = async () => {
    if (!holiday) return
    if (!confirm(`"${holiday.name}" tatili silinsin mi?`)) return
    setErr(null); setDeleting(true)
    try { await api.deleteHoliday(holiday.id); onDone() }
    catch (e: any) { setErr(e.message); setDeleting(false) }
  }

  const busy = saving || deleting
  return (
    <Modal title={editMode ? 'Tatil düzenle' : 'Tatil ekle'} onClose={onClose}
      footer={<>
        {editMode && <button className="btn" disabled={busy} onClick={remove} style={{ height: 42, marginRight: 'auto', background: 'transparent', color: 'var(--err)', border: '1px solid var(--err-ring)', opacity: busy ? 0.6 : 1 }}>{deleting ? 'Siliniyor…' : 'Sil'}</button>}
        <button className="btn btn-ghost" style={{ height: 42 }} onClick={onClose}>Vazgeç</button>
        <button className="btn btn-primary" style={{ height: 42, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={submit}>{saving ? 'Kaydediliyor…' : editMode ? 'Kaydet' : 'Tatil ekle'}</button>
      </>}>
      {err && <div className="t-sm" style={{ color: 'var(--err-ink)', background: 'var(--err-bg)', padding: '10px 12px', borderRadius: 'var(--r-sm)' }}>{err}</div>}
      <div className="rowx gap12">
        <Field label="TARİH"><input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
        <Field label="TÜR">
          <select className="input" value={type} onChange={e => setType(e.target.value as any)}>
            <option value="resmi">Resmi</option>
            <option value="dini">Dini</option>
            <option value="custom">Diğer</option>
          </select>
        </Field>
      </div>
      <Field label="TATİL ADI"><input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Örn. Cumhuriyet Bayramı" /></Field>
      <Field label="ÇALIŞACAK ŞUBELER (işaretlenmeyen = kapalı)">
        <div className="col" style={{ gap: 6, maxHeight: 180, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: 8 }}>
          {branches.length === 0 ? <span className="t-cap ink-3">Şube yok</span> : branches.map(b => (
            <label key={b.id} className="rowx between" style={{ alignItems: 'center', gap: 10, cursor: 'pointer', padding: '4px 6px' }}>
              <span className="t-sm">{b.name}</span>
              <input type="checkbox" checked={working.includes(b.id)} onChange={() => toggle(b.id)} style={{ width: 18, height: 18, accentColor: 'var(--brand-600)' }} />
            </label>
          ))}
        </div>
      </Field>
      <div className="t-cap ink-3" style={{ paddingTop: 2 }}>Hiç şube işaretlenmezse o gün <b>tüm şubeler kapalı</b> sayılır (puantajda "Tatil"). İşaretlenen şubelerde çalışan kişinin o günü "Bayram mesaisi" görünür.</div>
    </Modal>
  )
}
