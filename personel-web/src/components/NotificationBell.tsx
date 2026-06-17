// NotificationBell.tsx — topbar bildirim merkezi (çan + dropdown, okundu takipli, polling)
import { useEffect, useRef, useState } from 'react'
import { Icon } from '../icons'
import { api, type NotifItem } from '../api'
import { goto } from '../nav'

const toneColor: Record<string, string> = { ok: 'var(--ok-ink)', warn: 'var(--warn-ink)', err: 'var(--err-ink)', brand: 'var(--brand-700)', neu: 'var(--ink-2)' }
const toneBg: Record<string, string> = { ok: 'var(--ok-bg)', warn: 'var(--warn-bg)', err: 'var(--err-bg)', brand: 'var(--brand-50)', neu: 'var(--surface-2)' }

function relTime(iso: string) {
  const diff = Date.now() - +new Date(iso)
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'şimdi'
  if (m < 60) return `${m}d`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}s`
  return `${Math.floor(h / 24)}g`
}

export function NotificationBell() {
  const [items, setItems] = useState<NotifItem[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)
  const mounted = useRef(true)

  const load = () => api.adminNotifications().then(d => { if (!mounted.current) return; setItems(d.items); setUnread(d.unreadCount) }).catch(() => {})

  useEffect(() => {
    mounted.current = true
    load()
    const t = setInterval(load, 45000)
    return () => { mounted.current = false; clearInterval(t) }
  }, [])

  const openPanel = () => {
    setOpen(true)
    if (unread > 0) { setUnread(0); api.markNotificationsSeen().catch(() => {}) }
  }

  const onItem = (it: NotifItem) => { setOpen(false); goto(it.route) }

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => (open ? setOpen(false) : openPanel())} className="tb-icon" title="Bildirimler">
        <Icon name="bell" size={18} color="var(--ink-3)" strokeWidth={1.8} />
        {unread > 0 && (
          <span style={{ position: 'absolute', top: -5, right: -5, minWidth: 17, height: 17, padding: '0 4px', borderRadius: 9, background: 'var(--err)', color: '#fff', fontSize: 10.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--surface)' }}>{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
          <div className="card anim-pop" style={{ position: 'absolute', top: 48, right: 0, width: 360, maxHeight: 460, overflow: 'auto', zIndex: 91, boxShadow: 'var(--sh-lg, 0 12px 32px rgba(15,23,32,0.16))', padding: 0 }}>
            <div className="rowx between" style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--surface)' }}>
              <span className="t-bodys" style={{ fontSize: 15 }}>Bildirimler</span>
              <span className="t-cap ink-3">{items.length} öğe</span>
            </div>
            {items.length === 0 ? (
              <div className="col center" style={{ padding: 36, gap: 8 }}>
                <Icon name="check" size={28} color="var(--ok-ink)" />
                <span className="t-sm ink-2">Bekleyen bildirim yok</span>
              </div>
            ) : items.map(it => (
              <button key={it.id} onClick={() => onItem(it)} className="btn notif-item"
                style={{ width: '100%', textAlign: 'left', padding: '12px 16px', borderTop: '1px solid var(--border)', borderRadius: 0, background: 'transparent', alignItems: 'flex-start', gap: 12 }}>
                <span style={{ width: 32, height: 32, flex: 'none', borderRadius: 9, background: toneBg[it.tone], display: 'grid', placeItems: 'center' }}>
                  <Icon name={it.icon} size={17} color={toneColor[it.tone]} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="rowx between" style={{ gap: 8 }}>
                    <span className="t-sm" style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.title}</span>
                    <span className="t-cap ink-3" style={{ flex: 'none' }}>{relTime(it.time)}</span>
                  </span>
                  <span className="t-cap ink-2" style={{ display: 'block', marginTop: 3, lineHeight: 1.45, whiteSpace: 'normal', wordBreak: 'break-word' }}>{it.body}</span>
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
