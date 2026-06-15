// Shifts.tsx — C5 Vardiyalar (gerçek API: ekle / düzenle / sil)
import { useEffect, useState } from 'react'
import { Icon } from '../icons'
import { api } from '../api'
import { PageHead, StatCard, Table, Row, StatusChip, Modal, Field } from '../ui'

type S = { id: number; name: string; start: string; end: string; breakMin: number; overnight: boolean; employees: number }

export function Shifts() {
  const [rows, setRows] = useState<S[]>([])
  const [loading, setLoading] = useState(true)
  const [add, setAdd] = useState(false)
  const [editing, setEditing] = useState<S | null>(null)
  const load = () => api.shifts().then((s: any) => { setRows(s); setLoading(false) }).catch(() => setLoading(false))
  useEffect(() => { load() }, [])

  return (
    <div>
      <PageHead title="Vardiyalar" subtitle={`${rows.length} vardiya tanımı · canlı veri`}
        actions={<button className="btn btn-primary" style={{ height: 44 }} onClick={() => setAdd(true)}><Icon name="plus" size={19} color="#fff" /> Vardiya ekle</button>} />
      <div className="rowx gap14" style={{ marginBottom: 18 }}>
        <StatCard label="Vardiya" value={rows.length} sub="tanımlı" icon="clock" />
        <StatCard label="Atanan çalışan" value={rows.reduce((s, r) => s + r.employees, 0)} sub="vardiyalı" tone="ok" icon="user" />
        <StatCard label="Gece vardiyası" value={rows.filter(r => r.overnight).length} sub="gece yarısını geçen" icon="clock" />
      </div>
      {loading ? <div className="t-body ink-2">Yükleniyor…</div> : (
        <Table cols={[{ label: 'VARDİYA', flex: 1.4 }, { label: 'SAATLER', flex: 1.2 }, { label: 'MOLA', flex: 1 }, { label: 'GECE', flex: 1 }, { label: 'ATANAN', w: 110, align: 'right' }, { label: '', w: 70, align: 'right' }]}>
          {rows.map((r, i) => (
            <Row key={r.id} i={i} onClick={() => setEditing(r)} cells={[
              { flex: 1.4, node: <span className="t-bodys" style={{ fontSize: 15 }}>{r.name}</span> },
              { flex: 1.2, node: <span className="t-body mono">{r.start} – {r.end}</span> },
              { flex: 1, node: <span className="t-sm ink-2">{r.breakMin} dk</span> },
              { flex: 1, node: r.overnight ? <StatusChip status="warn">Gece</StatusChip> : <span className="t-sm ink-3">—</span> },
              { w: 110, align: 'right', node: <span className="t-bodys mono">{r.employees}</span> },
              { w: 70, align: 'right', node: <span className="t-sm" style={{ color: 'var(--brand-700)' }}>Düzenle</span> },
            ]} />
          ))}
        </Table>
      )}
      {add && <ShiftModal onClose={() => setAdd(false)} onDone={() => { setAdd(false); load() }} />}
      {editing && <ShiftModal shift={editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); load() }} />}
    </div>
  )
}

function ShiftModal({ shift, onClose, onDone }: { shift?: S; onClose: () => void; onDone: () => void }) {
  const editMode = !!shift
  const [name, setName] = useState(shift?.name ?? '')
  const [start, setStart] = useState(shift?.start ?? '')
  const [end, setEnd] = useState(shift?.end ?? '')
  const [breakMin, setBreakMin] = useState(shift ? String(shift.breakMin) : '')
  const [overnight, setOvernight] = useState(shift?.overnight ?? false)
  const [err, setErr] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isTime = (v: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v)

  const submit = async () => {
    setErr(null)
    if (!name.trim()) return setErr('Vardiya adı zorunludur')
    if (!isTime(start)) return setErr('Başlangıç saati HH:MM formatında olmalıdır')
    if (!isTime(end)) return setErr('Bitiş saati HH:MM formatında olmalıdır')
    setSaving(true)
    const body = { name: name.trim(), start, end, breakMin: breakMin ? Number(breakMin) : undefined, overnight }
    try {
      if (editMode) await api.updateShift(shift!.id, body)
      else await api.addShift({ name: body.name, start, end, breakMin: body.breakMin, overnight })
      onDone()
    } catch (e: any) { setErr(e.message); setSaving(false) }
  }

  const remove = async () => {
    if (!shift) return
    if (!confirm(`"${shift.name}" vardiyası silinsin mi?`)) return
    setErr(null); setDeleting(true)
    try { await api.deleteShift(shift.id); onDone() }
    catch (e: any) { setErr(e.message); setDeleting(false) }
  }

  const busy = saving || deleting
  return (
    <Modal title={editMode ? 'Vardiya düzenle' : 'Vardiya ekle'} onClose={onClose}
      footer={<>
        {editMode && <button className="btn" disabled={busy} onClick={remove} style={{ height: 42, marginRight: 'auto', background: 'transparent', color: 'var(--err)', border: '1px solid var(--err-ring)', opacity: busy ? 0.6 : 1 }}>{deleting ? 'Siliniyor…' : 'Sil'}</button>}
        <button className="btn btn-ghost" style={{ height: 42 }} onClick={onClose}>Vazgeç</button>
        <button className="btn btn-primary" style={{ height: 42, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={submit}>{saving ? 'Kaydediliyor…' : editMode ? 'Kaydet' : 'Vardiya ekle'}</button>
      </>}>
      {err && <div className="t-sm" style={{ color: 'var(--err-ink)', background: 'var(--err-bg)', padding: '10px 12px', borderRadius: 'var(--r-sm)' }}>{err}</div>}
      {editMode && shift!.employees > 0 && (
        <div className="t-cap ink-3">Bu vardiyaya <b>{shift!.employees}</b> çalışan atanmış. Silmek için önce çalışanları başka vardiyaya almalısın.</div>
      )}
      <Field label="VARDİYA ADI"><input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Örn. Sabah" /></Field>
      <div className="rowx gap12">
        <Field label="BAŞLANGIÇ"><input className="input" value={start} onChange={e => setStart(e.target.value)} placeholder="08:00" /></Field>
        <Field label="BİTİŞ"><input className="input" value={end} onChange={e => setEnd(e.target.value)} placeholder="16:00" /></Field>
      </div>
      <Field label="MOLA (DK)"><input className="input" value={breakMin} onChange={e => setBreakMin(e.target.value.replace(/\D/g, ''))} placeholder="60" inputMode="numeric" /></Field>
      <label className="rowx gap10" style={{ cursor: 'pointer' }}>
        <input type="checkbox" checked={overnight} onChange={e => setOvernight(e.target.checked)} style={{ width: 18, height: 18 }} />
        <span className="t-sm">Gece vardiyası (gece yarısını geçer)</span>
      </label>
    </Modal>
  )
}
