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

export function PageHead({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="rowx between" style={{ marginBottom: 22, gap: 16 }}>
      <div>
        <div className="t-h1" style={{ fontSize: 26 }}>{title}</div>
        {subtitle && <div className="t-body ink-2" style={{ marginTop: 4 }}>{subtitle}</div>}
      </div>
      {actions && <div className="rowx gap10">{actions}</div>}
    </div>
  )
}

export function StatCard({ label, value, sub, tone = 'ink', icon }:
  { label: string; value: React.ReactNode; sub?: string; tone?: string; icon?: string }) {
  return (
    <div className="card" style={{ flex: 1, padding: 18 }}>
      <div className="rowx between" style={{ alignItems: 'flex-start' }}>
        <div className="t-sm ink-2">{label}</div>
        {icon && <div style={{ width: 34, height: 34, borderRadius: 10, background: `var(--${tone === 'ink' ? 'surface-2' : tone + '-bg'})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: tone === 'ink' ? 'var(--ink-2)' : `var(--${tone}-ink)` }}><Icon name={icon} size={19} /></div>}
      </div>
      <div className="t-h1 tnum" style={{ fontSize: 32, marginTop: 8, color: tone === 'ink' ? 'var(--ink)' : `var(--${tone}-ink)` }}>{value}</div>
      {sub && <div className="t-cap ink-3" style={{ marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

export function SearchInput({ placeholder = 'Ara…', width = 280, value, onChange }:
  { placeholder?: string; width?: number; value?: string; onChange?: (v: string) => void }) {
  return (
    <div className="input rowx gap10" style={{ width, height: 44, background: 'var(--surface)' }}>
      <Icon name="search" size={18} color="var(--ink-3)" strokeWidth={2} />
      <input
        className="t-sm"
        value={value ?? ''}
        onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder}
        style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', color: 'var(--ink)' }}
      />
    </div>
  )
}

export function Modal({ title, onClose, footer, children, width = 460 }:
  { title: string; onClose: () => void; footer?: React.ReactNode; children: React.ReactNode; width?: number }) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(15,23,32,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <div
        className="card"
        onClick={e => e.stopPropagation()}
        style={{ width, maxWidth: '100%', maxHeight: '90vh', overflow: 'auto', padding: 0, display: 'flex', flexDirection: 'column' }}
      >
        <div className="rowx between" style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)' }}>
          <div className="t-h3" style={{ fontSize: 17 }}>{title}</div>
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
      <div className="rowx" style={{ padding: '12px 18px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
        {cols.map((c, i) => <span key={i} className="t-mono-label ink-3" style={{ flex: c.flex || (c.w ? 'none' : 1), width: c.w, textAlign: c.align || 'left' }}>{c.label}</span>)}
      </div>
      {children}
    </div>
  )
}

export function Row({ cells, i, bg, onClick }: { cells: Cell[]; i: number; bg?: string; onClick?: () => void }) {
  return (
    <div className={'rowx' + (onClick ? ' row-click' : '')} onClick={onClick}
      style={{ padding: '13px 18px', borderTop: i ? '1px solid var(--border)' : 'none', background: bg || 'transparent', cursor: onClick ? 'pointer' : undefined }}>
      {cells.map((c, j) => <div key={j} style={{ flex: c.flex || (c.w ? 'none' : 1), width: c.w, textAlign: c.align || 'left', minWidth: 0 }}>{c.node}</div>)}
    </div>
  )
}
