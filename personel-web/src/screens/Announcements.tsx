// Announcements.tsx — Duyurular · çalışanlara bildirim (uygulama-içi + push)
import { useEffect, useState } from 'react'
import { Icon } from '../icons'
import { api, type Announcement } from '../api'
import { PageHead, Table, Row, Field, StatusChip } from '../ui'

type Branch = { id: number; name: string }

const fmtDate = (s: string) => { const d = new Date(s); return isNaN(+d) ? '—' : d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }

export function Announcements() {
  const [list, setList] = useState<Announcement[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [target, setTarget] = useState('all') // 'all' | branchId
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const load = () => api.announcements().then(d => { setList(d); setLoading(false) }).catch(() => setLoading(false))
  useEffect(() => { load(); api.branches().then((b: any) => setBranches(b)).catch(() => {}) }, [])

  const send = async () => {
    setErr(null); setOk(null)
    if (title.trim().length < 3) return setErr('Başlık en az 3 karakter olmalı')
    if (body.trim().length < 1) return setErr('Mesaj boş olamaz')
    setSending(true)
    try {
      const branchId = target === 'all' ? null : Number(target)
      const r = await api.createAnnouncement({ title: title.trim(), body: body.trim(), branchId })
      setOk(`Duyuru ${r.recipients} çalışana gönderildi${r.pushed ? ` · ${r.pushed} cihaza anlık bildirim` : ''}.`)
      setTitle(''); setBody(''); setTarget('all'); setSending(false); load()
    } catch (e: any) { setErr(e.message); setSending(false) }
  }

  const withdraw = (id: number) => { if (confirm('Bu duyuru geri çekilsin mi? (Çalışanların bildirim listesinden kalkar)')) api.deleteAnnouncement(id).then(load) }

  return (
    <div>
      <PageHead title="Duyurular" subtitle="Çalışanlara bildirim gönder — uygulama-içi + telefon bildirimi" />

      {/* Oluştur */}
      <div className="card col" style={{ padding: 24, gap: 16, marginBottom: 22 }}>
        <div className="t-h3" style={{ fontSize: 15 }}>Yeni duyuru</div>
        {err && <div className="t-sm" style={{ color: 'var(--err-ink)', background: 'var(--err-bg)', padding: '10px 12px', borderRadius: 'var(--r-sm)' }}>{err}</div>}
        {ok && <div className="t-sm" style={{ color: 'var(--ok-ink)', background: 'var(--ok-bg)', padding: '10px 12px', borderRadius: 'var(--r-sm)' }}>{ok}</div>}
        <Field label="BAŞLIK"><input className="input" value={title} maxLength={80} onChange={e => setTitle(e.target.value)} placeholder="Örn. Performans değerlendirmesi başladı" /></Field>
        <Field label="MESAJ">
          <textarea className="input" value={body} maxLength={500} onChange={e => setBody(e.target.value)} placeholder="Çalışanlara iletilecek mesaj…"
            style={{ width: '100%', minHeight: 96, height: 'auto', padding: '10px 14px', lineHeight: 1.5, resize: 'vertical' }} />
        </Field>
        <div className="rowx gap12 field-row">
          <Field label="HEDEF">
            <select className="input" value={target} onChange={e => setTarget(e.target.value)}>
              <option value="all">Tüm çalışanlar</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </Field>
          <div style={{ flex: 1 }} />
        </div>
        <div className="rowx between" style={{ flexWrap: 'wrap', gap: 10 }}>
          <span className="t-cap ink-3" style={{ flex: 1, minWidth: 200, lineHeight: 1.5 }}>Çalışan uygulamayı açtığında banner + "Bildirimler" listesinde görür; cihaz bildirimi kayıtlıysa telefonuna da düşer.</span>
          <button className="btn btn-primary" style={{ height: 44, opacity: sending ? 0.6 : 1 }} disabled={sending} onClick={send}><Icon name="bell" size={17} color="#fff" /> {sending ? 'Gönderiliyor…' : 'Gönder'}</button>
        </div>
      </div>

      {/* Geçmiş */}
      <div className="t-h3" style={{ marginBottom: 12 }}>Gönderilen duyurular</div>
      {loading ? <div className="t-body ink-2">Yükleniyor…</div> : list.length === 0 ? (
        <div className="card" style={{ padding: 24 }}><span className="t-body ink-2">Henüz duyuru gönderilmedi.</span></div>
      ) : (
        <Table cols={[{ label: 'DUYURU', flex: 2.4 }, { label: 'HEDEF', flex: 1 }, { label: 'KİŞİ', w: 70, align: 'right' }, { label: 'TARİH', flex: 1.2 }, { label: 'DURUM', w: 150, align: 'right' }]}>
          {list.map((a, i) => (
            <Row key={a.id} i={i} cells={[
              { flex: 2.4, node: <div style={{ minWidth: 0 }}><div className="t-bodys" style={{ fontSize: 14.5 }}>{a.title}</div><div className="t-cap ink-3" style={{ marginTop: 2 }}>{a.body}</div></div> },
              { flex: 1, node: <span className="t-body ink-2">{a.audience === 'all' ? 'Tüm çalışanlar' : (a.branch || '—')}</span> },
              { w: 70, align: 'right', node: <span className="t-sm mono">{a.recipients}</span> },
              { flex: 1.2, node: <span className="t-sm ink-2">{fmtDate(a.createdAt)}</span> },
              { w: 150, align: 'right', node: a.active
                ? <div className="rowx gap8" style={{ justifyContent: 'flex-end', alignItems: 'center' }}><StatusChip status="ok">Yayında</StatusChip><button className="btn btn-ghost" style={{ height: 32, padding: '0 10px', color: 'var(--err-ink)' }} onClick={() => withdraw(a.id)}>Geri çek</button></div>
                : <StatusChip status="neu">Geri çekildi</StatusChip> },
            ]} />
          ))}
        </Table>
      )}
    </div>
  )
}
