// RiskSettings.tsx — Güvenlik · Risk skoru ağırlıkları, bantları ve anomali eşikleri (yönetici ayarlar)
import { useEffect, useState } from 'react'
import { api } from '../api'
import { PageHead, Field } from '../ui'

type Meta = { key: string; label: string; hint: string; def: number }
type Cfg = { weights: Record<string, number>; bandHigh: number; bandMid: number; lateToleranceMin: number; longShiftHours: number }
type Data = { meta: Meta[]; defaults: Cfg; config: Cfg }

export function RiskSettings() {
  const [d, setD] = useState<Data | null>(null)
  const [cfg, setCfg] = useState<Cfg | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const load = () => api.riskSettings().then((r: any) => { setD(r); setCfg(r.config) }).catch(() => {})
  useEffect(() => { load() }, [])
  if (!d || !cfg) return <div className="t-body ink-2">Yükleniyor…</div>

  const setW = (k: string, v: number) => setCfg({ ...cfg, weights: { ...cfg.weights, [k]: v } })
  const num = (v: string, max: number) => Math.max(0, Math.min(max, Number(v.replace(/\D/g, '') || 0)))

  const save = async () => {
    setErr(null); setMsg(null)
    if (cfg.bandMid >= cfg.bandHigh) return setErr('Orta band eşiği, Yüksek band eşiğinden küçük olmalı')
    setSaving(true)
    try { await api.updateRiskSettings(cfg); setMsg('Ayarlar kaydedildi. Risk skoru ve anomali sayfaları artık bu değerleri kullanır.'); }
    catch (e: any) { setErr(e.message) } finally { setSaving(false) }
  }
  const reset = () => { setCfg({ ...d.defaults, weights: { ...d.defaults.weights } }); setMsg(null); setErr(null) }

  const numInput = (val: number, on: (v: number) => void, suffix?: string, max = 100) => (
    <div className="rowx gap8" style={{ alignItems: 'center' }}>
      <input className="input mono" value={String(val)} onChange={e => on(num(e.target.value, max))} inputMode="numeric" style={{ width: 90, height: 40, textAlign: 'right' }} />
      {suffix && <span className="t-sm ink-2">{suffix}</span>}
    </div>
  )

  return (
    <div>
      <PageHead title="Güvenlik Ayarları" subtitle="Risk skoru ağırlıkları, bantları ve anomali eşikleri"
        actions={<>
          <button className="btn btn-ghost" style={{ height: 44 }} onClick={reset}>Varsayılana dön</button>
          <button className="btn btn-primary" style={{ height: 44, opacity: saving ? 0.6 : 1 }} disabled={saving} onClick={save}>{saving ? 'Kaydediliyor…' : 'Kaydet'}</button>
        </>} />

      {err && <div className="t-sm" style={{ color: 'var(--err-ink)', background: 'var(--err-bg)', padding: '12px 14px', borderRadius: 'var(--r-sm)', marginBottom: 14 }}>{err}</div>}
      {msg && <div className="t-sm" style={{ color: 'var(--ok-ink)', background: 'var(--ok-bg)', padding: '12px 14px', borderRadius: 'var(--r-sm)', marginBottom: 14 }}>{msg}</div>}

      {/* Risk ağırlıkları */}
      <div className="t-h3" style={{ marginBottom: 4 }}>Risk faktör puanları</div>
      <div className="t-cap ink-3" style={{ marginBottom: 12 }}>Her olayın tekrarı, yanındaki puanı ekler; toplam 100 ile sınırlıdır. 0 yapılan faktör skoru etkilemez.</div>
      <div className="card" style={{ padding: 8, marginBottom: 20 }}>
        {d.meta.map((m, i) => (
          <div key={m.key} className="rowx between" style={{ padding: '12px 12px', borderTop: i ? '1px solid var(--border)' : 'none', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div className="t-bodys" style={{ fontSize: 14.5 }}>{m.label}</div>
              <div className="t-cap ink-3">{m.hint} · varsayılan {m.def}</div>
            </div>
            {numInput(cfg.weights[m.key] ?? 0, v => setW(m.key, v), '/ olay')}
          </div>
        ))}
      </div>

      {/* Bantlar */}
      <div className="t-h3" style={{ marginBottom: 4 }}>Risk bantları</div>
      <div className="t-cap ink-3" style={{ marginBottom: 12 }}>Hangi skordan itibaren "Yüksek" ve "Orta" sayılsın. Düşük = 1+, Temiz = 0 sabittir.</div>
      <div className="card" style={{ padding: 16, marginBottom: 20 }}>
        <div className="rowx gap24" style={{ flexWrap: 'wrap', gap: 24 }}>
          <Field label="YÜKSEK BAND EŞİĞİ (≥)">{numInput(cfg.bandHigh, v => setCfg({ ...cfg, bandHigh: v || 1 }), 'puan')}</Field>
          <Field label="ORTA BAND EŞİĞİ (≥)">{numInput(cfg.bandMid, v => setCfg({ ...cfg, bandMid: v || 1 }), 'puan')}</Field>
        </div>
      </div>

      {/* Anomali eşikleri */}
      <div className="t-h3" style={{ marginBottom: 4 }}>Anomali eşikleri</div>
      <div className="t-cap ink-3" style={{ marginBottom: 12 }}>Geç giriş ve uzun mesai tespitleri — hem Güvenlik (anomali) sayfasını hem risk skorunun ilgili faktörlerini etkiler.</div>
      <div className="card" style={{ padding: 16 }}>
        <div className="rowx gap24" style={{ flexWrap: 'wrap', gap: 24 }}>
          <Field label="GEÇ GİRİŞ TOLERANSI">{numInput(cfg.lateToleranceMin, v => setCfg({ ...cfg, lateToleranceMin: v }), 'dk', 180)}</Field>
          <Field label="UZUN MESAİ EŞİĞİ">{numInput(cfg.longShiftHours, v => setCfg({ ...cfg, longShiftHours: v || 1 }), 'saat', 24)}</Field>
        </div>
        <div className="t-cap ink-3" style={{ marginTop: 12 }}>Vardiya başlangıcından {cfg.lateToleranceMin} dk sonrası "geç giriş"; net {cfg.longShiftHours} saati aşan gün "uzun mesai" sayılır.</div>
      </div>
    </div>
  )
}
