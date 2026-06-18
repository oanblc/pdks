// Holidays.tsx — Tatiller (resmi/dini bayram takvimi): ekle / düzenle / sil + içe aktar
import { useEffect, useState } from 'react'
import { Icon } from '../icons'
import { api } from '../api'
import { PageHead, StatCard, Modal, Field } from '../ui'

type H = { id: number; date: string; name: string; type: 'resmi' | 'dini' | 'custom'; workingBranchIds: number[]; workingBranchNames: string[] }
type Branch = { id: number; name: string }

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']

export function Holidays() {
  const [rows, setRows] = useState<H[]>([])
  const [editing, setEditing] = useState<H | null>(null)
  const [addDate, setAddDate] = useState<string | null>(null)
  const now = new Date()
  const [viewDate, setViewDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1))
  const [busy, setBusy] = useState(false)
  const load = () => api.holidays().then((s: any) => setRows(s)).catch(() => {})
  useEffect(() => { load() }, [])

  const y = viewDate.getFullYear(), mo = viewDate.getMonth()
  const year = String(y)
  const monthKey = `${y}-${String(mo + 1).padStart(2, '0')}`
  const yearRows = rows.filter(r => r.date.slice(0, 4) === year)
  const closed = yearRows.filter(r => r.workingBranchIds.length === 0).length

  const doImport = async () => {
    setBusy(true)
    try { const r: any = await api.importHolidays(y); alert(`${r.added} tatil eklendi${r.religiousIncluded ? '' : ' (bu yıl için dini bayram tarihi yok; elle ekleyin)'}`); load() }
    catch (e: any) { alert(e.message) } finally { setBusy(false) }
  }

  // Takvim ızgarası (Pazartesi başlangıçlı)
  const WD = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']
  const daysInMonth = new Date(y, mo + 1, 0).getDate()
  const firstDow = (new Date(y, mo, 1).getDay() + 6) % 7
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]
  const holiByDay = new Map<number, H>()
  for (const h of rows) if (h.date.startsWith(monthKey + '-')) holiByDay.set(Number(h.date.slice(8, 10)), h)
  const isToday = (d: number) => y === now.getFullYear() && mo === now.getMonth() && d === now.getDate()

  return (
    <div>
      <PageHead title="Tatiller" subtitle={`${year} · ${yearRows.length} resmi/dini tatil`}
        actions={<>
          <button className="btn btn-ghost" style={{ height: 44 }} disabled={busy} onClick={doImport}><Icon name="calendar" size={18} color="var(--ink)" /> {year} içe aktar</button>
          <button className="btn btn-primary" style={{ height: 44 }} onClick={() => setAddDate('')}><Icon name="plus" size={19} color="#fff" /> Tatil ekle</button>
        </>} />
      <div className="rowx gap14 stat-row" style={{ marginBottom: 18 }}>
        <StatCard label="Tatil" value={yearRows.length} sub={`${year} yılı`} icon="calendar" />
        <StatCard label="Kapalı gün" value={closed} sub="tüm şubeler kapalı" tone="ok" icon="calendar" />
        <StatCard label="Açık (çalışılan)" value={yearRows.length - closed} sub="en az bir şube çalışıyor" tone="warn" icon="clock" />
      </div>

      <div className="card" style={{ padding: 18 }}>
        <div className="rowx between" style={{ marginBottom: 14 }}>
          <span className="t-h3">{AYLAR[mo]} {y}</span>
          <div className="rowx gap8">
            <button className="btn btn-ghost" onClick={() => setViewDate(new Date(y, mo - 1, 1))} style={{ width: 36, height: 36, padding: 0 }}><Icon name="chevronL" size={18} color="var(--ink-2)" /></button>
            <button className="btn btn-ghost" onClick={() => setViewDate(new Date(now.getFullYear(), now.getMonth(), 1))} style={{ height: 36, fontSize: 13 }}>Bugün</button>
            <button className="btn btn-ghost" onClick={() => setViewDate(new Date(y, mo + 1, 1))} style={{ width: 36, height: 36, padding: 0 }}><Icon name="chevron" size={18} color="var(--ink-2)" /></button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6, marginBottom: 6 }}>
          {WD.map(w => <div key={w} className="t-cap ink-3" style={{ textAlign: 'center', fontWeight: 600 }}>{w}</div>)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6 }}>
          {cells.map((d, i) => {
            if (!d) return <div key={i} />
            const h = holiByDay.get(d)
            const dow = (firstDow + d - 1) % 7
            const weekend = dow >= 5
            const working = h && h.workingBranchIds.length > 0
            const dd = `${monthKey}-${String(d).padStart(2, '0')}`
            return (
              <div key={i} className="row-press" onClick={() => h ? setEditing(h) : setAddDate(dd)}
                style={{ minHeight: 80, borderRadius: 10, cursor: 'pointer', padding: 8,
                  border: isToday(d) ? '2px solid var(--brand-600)' : '1px solid var(--border)',
                  background: h ? 'var(--brand-50)' : (weekend ? 'var(--surface-2)' : 'var(--surface)') }}>
                <div className="rowx between" style={{ alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 13.5, fontWeight: h ? 700 : 500, color: h ? 'var(--brand-700)' : (weekend ? 'var(--ink-3)' : 'var(--ink)') }}>{d}</span>
                  {working && <span title="Açık (çalışılıyor)" style={{ width: 7, height: 7, borderRadius: 4, background: 'var(--warn-ink)', marginTop: 3 }} />}
                </div>
                {h && <div style={{ fontSize: 10.5, lineHeight: 1.25, color: 'var(--brand-700)', marginTop: 4, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{h.name}</div>}
              </div>
            )
          })}
        </div>
        <div className="rowx gap16" style={{ marginTop: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="rowx gap6" style={{ alignItems: 'center' }}><span style={{ width: 13, height: 13, borderRadius: 3, background: 'var(--brand-50)', border: '1px solid var(--border)' }} /><span className="t-cap ink-3">Tatil</span></span>
          <span className="rowx gap6" style={{ alignItems: 'center' }}><span style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--warn-ink)' }} /><span className="t-cap ink-3">Açık (çalışılıyor)</span></span>
          <span className="t-cap ink-3">Güne tıkla → tatil ekle / düzenle</span>
        </div>
      </div>

      {addDate !== null && <HolidayModal initialDate={addDate} onClose={() => setAddDate(null)} onDone={() => { setAddDate(null); load() }} />}
      {editing && <HolidayModal holiday={editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); load() }} />}
    </div>
  )
}

function HolidayModal({ holiday, initialDate, onClose, onDone }: { holiday?: H; initialDate?: string; onClose: () => void; onDone: () => void }) {
  const editMode = !!holiday
  const [date, setDate] = useState(holiday?.date ?? initialDate ?? '')
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
