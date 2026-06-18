// ui.tsx — paylaşılan masaüstü bileşenleri (web-data.jsx + components.jsx portu)
import React from 'react'
import { Icon } from './icons'

export type Tone = 'ok' | 'warn' | 'neu' | 'err' | 'brand'

export function StatusChip({ status = 'neu', children, style }: { status?: Tone; children: React.ReactNode; style?: React.CSSProperties }) {
  return <span className={`chip ${status}`} style={style}><span className="dot" /> {children}</span>
}

export function Avatar({ name = '', size = 44, src, ring = false, style }:
  { name?: string; size?: number; src?: string; ring?: boolean; style?: React.CSSProperties }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
  return (
    <div className="avatar" style={{
      width: size, height: size, fontSize: size * 0.38,
      boxShadow: ring ? '0 0 0 3px #fff, 0 0 0 5px var(--brand-200)' : 'none', ...style,
    }}>
      {src ? <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span>{initials}</span>}
    </div>
  )
}

export function PageHead({ title, subtitle, actions }: { title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="rowx between page-head" style={{ marginBottom: 18, gap: 16, alignItems: 'flex-start' }}>
      <div>
        <div className="t-h1">{title}</div>
        {subtitle && <div className="t-sm ink-3" style={{ marginTop: 5 }}>{subtitle}</div>}
      </div>
      {actions && <div className="rowx gap10">{actions}</div>}
    </div>
  )
}

export function StatCard({ label, value, sub, tone = 'ink', icon }:
  { label: string; value: React.ReactNode; sub?: string; tone?: string; icon?: string }) {
  const isInk = tone === 'ink'
  const iconBg = isInk ? 'var(--brand-50)' : tone === 'warn' ? 'var(--warn-bg2)' : `var(--${tone}-bg)`
  const iconColor = isInk ? 'var(--brand-600)' : `var(--${tone})`
  const valueColor = isInk ? 'var(--ink)' : `var(--${tone})`
  return (
    <div className="card" style={{ flex: 1, padding: '15px 16px', borderRadius: 'var(--r-md)' }}>
      <div className="rowx between" style={{ marginBottom: 10 }}>
        <span className="t-mono-label">{label}</span>
        {icon && <span style={{ width: 30, height: 30, borderRadius: 8, background: iconBg, color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><Icon name={icon} size={16} strokeWidth={1.8} /></span>}
      </div>
      <div className="tnum" style={{ fontSize: 29, fontWeight: 800, lineHeight: 1, letterSpacing: '-.02em', color: valueColor }}>{value}</div>
      {sub && <div className="t-cap ink-4" style={{ marginTop: 5 }}>{sub}</div>}
    </div>
  )
}

export function SearchInput({ placeholder = 'Ara…', width = 280, value, onChange }:
  { placeholder?: string; width?: number | string; value?: string; onChange?: (v: string) => void }) {
  return (
    <div className="input rowx gap8" style={{ width, height: 40 }}>
      <Icon name="search" size={16} color="var(--ink-4)" strokeWidth={1.9} />
      <input
        value={value ?? ''}
        onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder}
        style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', color: '#26344a', fontFamily: 'inherit', fontSize: 13.5 }}
      />
    </div>
  )
}

export function Modal({ title, onClose, footer, children, width = 460 }:
  { title: string; onClose: () => void; footer?: React.ReactNode; children: React.ReactNode; width?: number }) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(15,27,45,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <div
        className="card"
        onClick={e => e.stopPropagation()}
        style={{ width, maxWidth: '100%', maxHeight: '90vh', overflow: 'auto', padding: 0, display: 'flex', flexDirection: 'column', boxShadow: 'var(--sh-lg)' }}
      >
        <div className="rowx between" style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div className="t-h3">{title}</div>
          <button className="btn" onClick={onClose} style={{ width: 32, height: 32, padding: 0, borderRadius: 'var(--r-sm)', background: 'transparent' }}><Icon name="x" size={18} color="var(--ink-3)" /></button>
        </div>
        <div className="col" style={{ padding: 22, gap: 14 }}>{children}</div>
        {footer && <div className="rowx gap10" style={{ padding: '16px 22px', borderTop: '1px solid var(--border)', justifyContent: 'flex-end' }}>{footer}</div>}
      </div>
    </div>
  )
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field col" style={{ gap: 6 }}>
      <label className="field-label t-mono-label ink-3">{label}</label>
      {children}
    </div>
  )
}

export function Pill({ children, onClick, active }: { children: React.ReactNode; onClick?: () => void; active?: boolean }) {
  return (
    <button onClick={onClick} className="btn" style={{
      height: 38, padding: '0 14px', borderRadius: 'var(--r-full)', fontSize: 13.5, fontWeight: 600,
      background: active ? 'var(--brand-600)' : 'var(--surface)', color: active ? '#fff' : 'var(--ink-2)',
      border: '1px solid ' + (active ? 'var(--brand-600)' : 'var(--border)'),
    }}>{children}</button>
  )
}

// Performans skor bandı (yüksek = iyi) — RiskBadge'in tersi renk mantığı
export const scoreBand = (s: number): { tone: Tone; label: string } =>
  s >= 85 ? { tone: 'ok', label: 'Üstün' } : s >= 70 ? { tone: 'brand', label: 'İyi' } : s >= 50 ? { tone: 'warn', label: 'Orta' } : { tone: 'err', label: 'Gelişmeli' }

export function ScoreBadge({ score, width = 110 }: { score: number | null; width?: number }) {
  if (score == null) return <span className="t-cap ink-4">—</span>
  const { tone } = scoreBand(score)
  return (
    <div className="rowx gap8" style={{ minWidth: width }}>
      <div style={{ flex: 1, height: 7, borderRadius: 4, background: 'var(--surface-3)', overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', background: `var(--${tone})`, borderRadius: 4 }} />
      </div>
      <span className="t-cap mono tnum" style={{ color: `var(--${tone}-ink)`, fontWeight: 700 }}>{score}</span>
    </div>
  )
}

// 0–100 skoru 5 yıldıza çevir (tek ondalık)
export const toStars = (score: number | null): number | null => score == null ? null : Math.round((score / 20) * 10) / 10

// 1–5 yıldız. Tıklanabilir mod tam yıldız; readOnly mod kesirli (otomatik skoru göstermek için).
export function Stars({ value, onChange, size = 26, readOnly = false }:
  { value: number; onChange?: (v: number) => void; size?: number; readOnly?: boolean }) {
  if (readOnly) {
    return (
      <div className="rowx" style={{ gap: 3 }}>
        {[1, 2, 3, 4, 5].map(n => {
          const frac = Math.max(0, Math.min(1, value - (n - 1)))
          return (
            <span key={n} style={{ position: 'relative', display: 'inline-flex', lineHeight: 0, padding: 2 }}>
              <Icon name="star" size={size} strokeWidth={1.6} color="var(--border-strong)" fill="none" />
              {frac > 0 && (
                <span style={{ position: 'absolute', left: 2, top: 2, width: `${frac * 100}%`, overflow: 'hidden', display: 'inline-flex', lineHeight: 0 }}>
                  <Icon name="star" size={size} strokeWidth={1.6} color="var(--warn)" fill="var(--warn)" style={{ flexShrink: 0 }} />
                </span>
              )}
            </span>
          )
        })}
      </div>
    )
  }
  return (
    <div className="rowx" style={{ gap: 3 }}>
      {[1, 2, 3, 4, 5].map(n => {
        const on = n <= value
        return (
          <button key={n} type="button"
            onClick={() => onChange?.(n === value ? 0 : n)}
            title={`${n} / 5`}
            style={{ background: 'transparent', border: 'none', padding: 2, cursor: 'pointer', lineHeight: 0, display: 'inline-flex' }}>
            <Icon name="star" size={size} strokeWidth={1.6}
              color={on ? 'var(--warn)' : 'var(--border-strong)'}
              fill={on ? 'var(--warn)' : 'none'} />
          </button>
        )
      })}
    </div>
  )
}

export function RiskBadge({ score }: { score: number }) {
  const tone = score >= 75 ? 'err' : score >= 50 ? 'warn' : 'neu'
  return (
    <div className="rowx gap8" style={{ minWidth: 92 }}>
      <div style={{ flex: 1, height: 7, borderRadius: 4, background: 'var(--surface-3)', overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', background: `var(--${tone})`, borderRadius: 4 }} />
      </div>
      <span className="t-cap mono tnum" style={{ color: `var(--${tone}-ink)`, fontWeight: 600 }}>{score}</span>
    </div>
  )
}

type Col = { label: string; flex?: number; w?: number; align?: 'left' | 'right' | 'center' }
type Cell = { node: React.ReactNode; flex?: number; w?: number; align?: 'left' | 'right' | 'center' }

export function Table({ cols, children }: { cols: Col[]; children: React.ReactNode }) {
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div className="rowx gap14" style={{ padding: '11px 18px', background: 'var(--surface-3)', borderBottom: '1px solid #EEF2F8' }}>
        {cols.map((c, i) => <span key={i} className="t-mono-label" style={{ flex: c.flex || (c.w ? 'none' : 1), width: c.w, textAlign: c.align || 'left' }}>{c.label}</span>)}
      </div>
      {children}
    </div>
  )
}

export function Row({ cells, i, bg, onClick }: { cells: Cell[]; i: number; bg?: string; onClick?: () => void }) {
  return (
    <div className={'rowx gap14' + (onClick ? ' row-click' : '')} onClick={onClick}
      style={{ padding: '13px 18px', borderTop: i ? '1px solid #F1F4F9' : 'none', background: bg || 'transparent', cursor: onClick ? 'pointer' : undefined }}>
      {cells.map((c, j) => <div key={j} style={{ flex: c.flex || (c.w ? 'none' : 1), width: c.w, textAlign: c.align || 'left', minWidth: 0 }}>{c.node}</div>)}
    </div>
  )
}
