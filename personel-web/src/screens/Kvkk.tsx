// Kvkk.tsx — C11 KVKK (rıza durumu + DSAR talepleri + detay/yanıt akışı)
import { useEffect, useState } from 'react'
import { Icon } from '../icons'
import { api } from '../api'
import { PageHead, StatCard, Table, Row, StatusChip, Avatar, Modal, type Tone } from '../ui'

type Emp = { name: string; status: 'current' | 'old' | 'none'; version: string | null; acceptedAt: string | null }
type DSAR = { id: number; name: string; type: string; status: string; createdAt: string }
type Data = { version: string; employees: Emp[]; requests: DSAR[] }
const consentMap: Record<string, [Tone, string]> = { current: ['ok', 'Güncel rıza'], old: ['warn', 'Eski sürüm'], none: ['err', 'Rıza yok'] }
const typeMap: Record<string, [string, string]> = { access: ['Erişim', 'Verilerinin bir kopyasını ister'], rectify: ['Düzeltme', 'Hatalı/eksik verinin düzeltilmesini ister'], erase: ['Silme', 'Verilerinin silinmesini ister (unutulma hakkı)'] }

// Veri dökümü için Türkçe etiketler ve çeviriler
const KIMLIK_LABEL: Record<string, string> = { ad_soyad: 'Ad Soyad', tc: 'TC Kimlik No', telefon: 'Telefon', adres: 'Adres', departman: 'Departman', gorev: 'Görev', sicil: 'Sicil No', durum: 'Çalışma durumu', ise_baslama: 'İşe başlama', sube: 'Şube', vardiya: 'Vardiya' }
const EYLEM_TR: Record<string, string> = { enter: 'Giriş', exit: 'Çıkış', 'break-out': 'Mola başlangıcı', 'break-in': 'Mola bitişi' }
const KAYNAK_TR: Record<string, string> = { qr: 'QR okutma', manual: 'Manuel (asistlı)' }
const DURUM_TR: Record<string, string> = { ok: 'Geçerli', review: 'İncelemede', confirmed: 'Onaylı' }
const STATUS_TR: Record<string, string> = { pending: 'Bekliyor', approved: 'Onaylandı', rejected: 'Reddedildi', done: 'Tamamlandı' }
const trDate = (v: any) => v ? new Date(v).toLocaleDateString('tr-TR') : '—'
const trDateTime = (v: any) => v ? new Date(v).toLocaleString('tr-TR') : '—'

function download(name: string, content: string, mime: string) {
  const blob = new Blob([mime.includes('csv') ? '﻿' + content : content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url)
}

const escHtml = (s: any) => String(s ?? '—').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!))
const csvCell = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`

export function Kvkk() {
  const [d, setD] = useState<Data | null>(null)
  const [busy, setBusy] = useState<number | null>(null)
  const [open, setOpen] = useState<DSAR | null>(null)
  const load = () => api.kvkk().then(setD as any).catch(() => {})
  useEffect(() => { load() }, [])
  if (!d) return <div className="t-body ink-2">Yükleniyor…</div>

  const done = async (id: number) => { setBusy(id); try { await api.dsarDone(id); await load() } catch (e: any) { alert(e.message) } finally { setBusy(null) } }

  const current = d.employees.filter(e => e.status === 'current').length
  const pending = d.employees.filter(e => e.status !== 'current').length

  return (
    <div>
      <PageHead title="KVKK" subtitle={`Aydınlatma sürümü ${d.version} · rıza ve ilgili kişi talepleri`} />
      <div className="rowx gap14" style={{ marginBottom: 18 }}>
        <StatCard label="Güncel rıza" value={current} sub={`${d.version} kabul`} tone="ok" icon="shield" />
        <StatCard label="Rıza eksik" value={pending} sub="eski/yok" tone="warn" icon="alert" />
        <StatCard label="İlgili kişi talebi" value={d.requests.length} sub="DSAR" icon="doc" />
      </div>

      <div className="t-h3" style={{ marginBottom: 12 }}>Rıza durumu</div>
      <Table cols={[{ label: 'ÇALIŞAN', flex: 2 }, { label: 'SÜRÜM', flex: 1 }, { label: 'DURUM', w: 160, align: 'right' }]}>
        {d.employees.map((e, i) => (
          <Row key={i} i={i} cells={[
            { flex: 2, node: <div className="rowx gap12"><Avatar name={e.name} size={34} /><span className="t-bodys" style={{ fontSize: 14.5 }}>{e.name}</span></div> },
            { flex: 1, node: <span className="t-sm mono ink-2">{e.version || '—'}</span> },
            { w: 160, align: 'right', node: <StatusChip status={consentMap[e.status][0]}>{consentMap[e.status][1]}</StatusChip> },
          ]} />
        ))}
      </Table>

      <div className="t-h3" style={{ margin: '22px 0 6px' }}>İlgili kişi talepleri (DSAR)</div>
      <div className="t-cap ink-3" style={{ marginBottom: 12 }}>Çalışanın kişisel verisine ilişkin erişim/düzeltme/silme başvuruları. Satıra tıkla, talebi incele ve yanıtla.</div>
      {d.requests.length === 0 ? <div className="card" style={{ padding: 24 }}><span className="t-body ink-2">Bekleyen talep yok</span></div> : (
        <Table cols={[{ label: 'ÇALIŞAN', flex: 2 }, { label: 'TÜR', flex: 1.4 }, { label: 'DURUM', w: 200, align: 'right' }]}>
          {d.requests.map((r, i) => (
            <Row key={r.id ?? i} i={i} onClick={() => setOpen(r)} cells={[
              { flex: 2, node: <span className="t-body">{r.name}</span> },
              { flex: 1.4, node: <div className="rowx gap8"><Icon name="shield" size={16} color="var(--brand-700)" /><span className="t-body">{typeMap[r.type]?.[0] || r.type}</span></div> },
              { w: 200, align: 'right', node: r.status === 'pending'
                ? <div className="rowx gap8" style={{ justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost" onClick={ev => { ev.stopPropagation(); setOpen(r) }} style={{ height: 34, padding: '0 12px', fontSize: 13 }}>İncele</button>
                    <button className="btn btn-primary" disabled={busy === r.id} onClick={ev => { ev.stopPropagation(); done(r.id) }} style={{ height: 34, padding: '0 14px', fontSize: 13, opacity: busy === r.id ? 0.6 : 1 }}>{busy === r.id ? 'İşleniyor…' : 'Tamamla'}</button>
                  </div>
                : <StatusChip status="ok">Tamamlandı</StatusChip> },
            ]} />
          ))}
        </Table>
      )}

      {open && <DsarModal req={open} onClose={() => setOpen(null)} onDone={() => { setOpen(null); load() }} />}
    </div>
  )
}

type Detail = { id: number; type: string; status: string; note?: string | null; createdAt: string; employee: { id: number; name: string }; package?: any }

function DsarModal({ req, onClose, onDone }: { req: DSAR; onClose: () => void; onDone: () => void }) {
  const [dt, setDt] = useState<Detail | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => { api.dsarDetail(req.id).then(setDt as any).catch(() => setDt(null)) }, [req.id])

  const complete = async () => { setBusy(true); try { await api.dsarDone(req.id); onDone() } catch (e: any) { alert(e.message); setBusy(false) } }

  const [tLabel, tDesc] = typeMap[req.type] || [req.type, '']
  const pkg = dt?.package
  const fname = `kvkk-veri-${req.name.replace(/\s+/g, '_')}`

  // Ortak bölümler (her iki çıktıda da kullanılır)
  const sections = (p: any) => ({
    kimlik: Object.entries(p.kimlik).map(([k, v]) => [KIMLIK_LABEL[k] || k, k === 'ise_baslama' ? trDate(v) : (v ?? '—')]),
    riza: p.riza_gecmisi.map((c: any) => [c.surum, trDateTime(c.kabul_tarihi)]),
    basis: p.basis_kayitlari.map((b: any) => [trDateTime(b.zaman), EYLEM_TR[b.eylem] || b.eylem, KAYNAK_TR[b.kaynak] || b.kaynak, DURUM_TR[b.durum] || b.durum, b.sube || '—']),
    talep: p.izin_duzeltme_talepleri.map((r: any) => [r.tur, r.baslik, r.detay || '—', STATUS_TR[r.durum] || r.durum, trDate(r.tarih)]),
  })

  const exportExcel = (p: any) => {
    const s = sections(p)
    const L: string[] = []
    L.push(['KVKK Kişisel Veri Dökümü'].map(csvCell).join(','))
    L.push([`Çalışan: ${req.name}`].map(csvCell).join(','))
    L.push([`Oluşturulma: ${trDateTime(p.olusturuldu)} · Aydınlatma sürümü: ${p.kvkk_surumu}`].map(csvCell).join(','))
    L.push('')
    L.push(['KİMLİK BİLGİLERİ'].map(csvCell).join(','))
    L.push(['Alan', 'Değer'].map(csvCell).join(','))
    s.kimlik.forEach((r: any) => L.push(r.map(csvCell).join(',')))
    L.push('')
    L.push([`RIZA GEÇMİŞİ (${s.riza.length})`].map(csvCell).join(','))
    L.push(['Sürüm', 'Kabul tarihi'].map(csvCell).join(','))
    s.riza.forEach((r: any) => L.push(r.map(csvCell).join(',')))
    L.push('')
    L.push([`BASIŞ KAYITLARI (${s.basis.length})`].map(csvCell).join(','))
    L.push(['Zaman', 'Eylem', 'Kaynak', 'Durum', 'Şube'].map(csvCell).join(','))
    s.basis.forEach((r: any) => L.push(r.map(csvCell).join(',')))
    L.push('')
    L.push([`İZİN / DÜZELTME TALEPLERİ (${s.talep.length})`].map(csvCell).join(','))
    L.push(['Tür', 'Başlık', 'Detay', 'Durum', 'Tarih'].map(csvCell).join(','))
    s.talep.forEach((r: any) => L.push(r.map(csvCell).join(',')))
    download(fname + '.csv', L.join('\n'), 'text/csv;charset=utf-8;')
  }

  const exportPdf = (p: any) => {
    const s = sections(p)
    const kvTable = (rows: any[][]) => `<table>${rows.map(r => `<tr><th class="k">${escHtml(r[0])}</th><td>${escHtml(r[1])}</td></tr>`).join('')}</table>`
    const dataTable = (head: string[], rows: any[][]) => `<table><thead><tr>${head.map(h => `<th>${escHtml(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c: any) => `<td>${escHtml(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>KVKK Veri Dökümü · ${escHtml(req.name)}</title>
      <style>body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#15201f;padding:30px;font-size:12px}
      h1{font-size:19px;margin:0 0 2px}h2{font-size:13px;color:#0e6b6b;text-transform:uppercase;letter-spacing:.04em;margin:22px 0 8px;border-bottom:2px solid #0e6b6b;padding-bottom:4px}
      .sub{color:#6b7a78;margin-bottom:6px}.note{background:#f1f6f4;border:1px solid #d9e6e2;border-radius:8px;padding:12px 14px;margin:14px 0;line-height:1.5;color:#3a4a47}
      table{width:100%;border-collapse:collapse;margin-top:4px}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #e6ece9;vertical-align:top}
      thead th{color:#0e6b6b;text-transform:uppercase;font-size:10px}th.k{width:200px;color:#6b7a78;font-weight:600}</style></head>
      <body>
        <h1>KVKK · Kişisel Veri Dökümü</h1>
        <div class="sub">${escHtml(req.name)} · Oluşturulma: ${escHtml(trDateTime(p.olusturuldu))} · Aydınlatma sürümü ${escHtml(p.kvkk_surumu)}</div>
        <div class="note">Bu belge, 6698 sayılı KVKK md. 11 kapsamında ilgili kişinin (çalışanın) <b>erişim talebi</b> üzerine veri sorumlusu tarafından üretilmiştir. Çalışan hakkında işlenen kişisel verilerin bir kopyasını içerir.</div>
        <h2>Kimlik bilgileri</h2>${kvTable(s.kimlik)}
        <h2>Rıza geçmişi (${s.riza.length})</h2>${s.riza.length ? dataTable(['Sürüm', 'Kabul tarihi'], s.riza) : '<div class="sub">Kayıt yok</div>'}
        <h2>Basış kayıtları (${s.basis.length})</h2>${s.basis.length ? dataTable(['Zaman', 'Eylem', 'Kaynak', 'Durum', 'Şube'], s.basis) : '<div class="sub">Kayıt yok</div>'}
        <h2>İzin / düzeltme talepleri (${s.talep.length})</h2>${s.talep.length ? dataTable(['Tür', 'Başlık', 'Detay', 'Durum', 'Tarih'], s.talep) : '<div class="sub">Kayıt yok</div>'}
        <script>window.onload=function(){window.print()}</script>
      </body></html>`
    const w = window.open('', '_blank'); if (!w) { alert('PDF için açılır pencereye izin verin.'); return }
    w.document.write(html); w.document.close()
  }

  return (
    <Modal title="İlgili kişi talebi (DSAR)" onClose={onClose} width={560}
      footer={<>
        <button className="btn btn-ghost" style={{ height: 42 }} onClick={onClose}>Kapat</button>
        {req.status === 'pending' && <button className="btn btn-primary" style={{ height: 42, opacity: busy ? 0.6 : 1 }} disabled={busy} onClick={complete}>{busy ? 'İşleniyor…' : 'Talebi tamamla'}</button>}
      </>}>
      <div className="rowx gap12" style={{ alignItems: 'center' }}>
        <Avatar name={req.name} size={44} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="t-bodys" style={{ fontSize: 15.5 }}>{req.name}</div>
          <div className="t-cap ink-3">{tLabel} talebi · {new Date(req.createdAt).toLocaleDateString('tr-TR')}</div>
        </div>
        <StatusChip status={req.status === 'pending' ? 'warn' : 'ok'}>{req.status === 'pending' ? 'Bekliyor' : 'Tamamlandı'}</StatusChip>
      </div>

      <div className="card-flat" style={{ padding: '12px 14px' }}>
        <div className="t-sm" style={{ fontWeight: 600, marginBottom: 2 }}>{tLabel} talebi — {tDesc}</div>
        <div className="t-cap ink-3" style={{ lineHeight: 1.5 }}>KVKK md. 11 kapsamında ilgili kişinin (çalışanın) yasal hakkı. Yanıt için yasal süre <b>30 gündür</b>.</div>
        <div className="t-sm ink-2" style={{ marginTop: 8 }}>{dt?.note ? <>Çalışan notu: <b>{dt.note}</b></> : 'Çalışan ek not bırakmadı.'}</div>
      </div>

      {!dt ? <div className="t-body ink-2">Yükleniyor…</div> : req.type === 'access' ? (
        pkg ? (
          <>
            <div className="t-sm ink-2" style={{ lineHeight: 1.6 }}>
              Çalışan, hakkında işlenen <b>tüm kişisel verilerinin bir kopyasını</b> istiyor. Aşağıdaki döküm bu veriyi içerir; <b>PDF</b> (yazılı teslim/imza için) veya <b>Excel</b> (CSV) olarak indirip çalışana iletin.
            </div>
            <div className="col" style={{ gap: 6 }}>
              {[['Kimlik bilgileri', Object.keys(pkg.kimlik).length + ' alan', 'Ad, TC, iletişim, görev, şube, vardiya'], ['Rıza geçmişi', pkg.riza_gecmisi.length + ' kayıt', 'Aydınlatma metni onay sürümleri'], ['Basış kayıtları', pkg.basis_kayitlari.length + ' kayıt', 'Giriş/çıkış/mola okutmaları'], ['İzin/düzeltme talepleri', pkg.izin_duzeltme_talepleri.length + ' kayıt', 'Açtığı talepler ve durumları']].map(([k, v, hint], i) => (
                <div key={i} className="rowx between" style={{ padding: '9px 12px', borderRadius: 'var(--r-sm)', background: 'var(--surface-2)', gap: 12 }}>
                  <div style={{ minWidth: 0 }}><div className="t-sm" style={{ fontWeight: 600 }}>{k}</div><div className="t-cap ink-3">{hint}</div></div>
                  <span className="t-cap mono ink-2" style={{ whiteSpace: 'nowrap' }}>{v}</span>
                </div>
              ))}
            </div>
            <div className="rowx gap8">
              <button className="btn btn-primary" style={{ height: 40 }} onClick={() => exportPdf(pkg)}><Icon name="doc" size={16} color="#fff" /> PDF indir</button>
              <button className="btn btn-ghost" style={{ height: 40 }} onClick={() => exportExcel(pkg)}><Icon name="doc" size={16} color="var(--ink)" /> Excel indir</button>
            </div>
            <div className="t-cap ink-3" style={{ lineHeight: 1.5 }}>Dökümü çalışana teslim ettikten sonra <b>"Talebi tamamla"</b> ile kapatın; işlem (kim, ne zaman) denetim kaydına yazılır.</div>
          </>
        ) : <div className="t-sm ink-3">Veri dökümü üretilemedi.</div>
      ) : (
        <div className="card" style={{ padding: 14 }}>
          <div className="t-sm" style={{ fontWeight: 600, marginBottom: 4 }}>Bu talep nasıl yanıtlanır?</div>
          <div className="t-sm ink-2" style={{ lineHeight: 1.6 }}>
            {req.type === 'rectify'
              ? <>Çalışan, hakkındaki bir bilginin <b>hatalı/eksik</b> olduğunu ve düzeltilmesini istiyor. İlgili veriyi <b>Çalışanlar</b> sayfasından düzeltin, sonra bu talebi tamamlayın. Çalışana düzeltmenin yapıldığını bildirin.</>
              : <>Çalışan, kişisel verilerinin <b>silinmesini</b> (unutulma hakkı) istiyor. Ancak İş Kanunu ve SGK mevzuatı puantaj/bordro kayıtları için <b>zorunlu saklama süreleri</b> öngörür. Saklama süresi dolan verileri imha planına alın; hemen silinemeyenleri <b>gerekçesiyle çalışana bildirin</b>, sonra talebi tamamlayın.</>}
          </div>
        </div>
      )}
    </Modal>
  )
}
