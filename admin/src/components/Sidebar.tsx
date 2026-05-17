import React from 'react';

type PageKey =
  | 'dashboard' | 'artifacts' | 'qr' | 'audio'
  | 'users' | 'reviews' | 'announcements'
  | 'events' | 'live' | 'settings';

type SidebarProps = {
  activePage: PageKey;
  onSelect: (page: PageKey) => void;
  email: string;
  collapsed: boolean;
  onToggle: () => void;
};

const NAV_ITEMS: Array<{ key: PageKey; label: string; icon: string; live?: boolean }> = [
  { key: 'dashboard',     label: 'Dashboard',       icon: '◈'  },
  { key: 'artifacts',     label: 'Artifacts',        icon: '⬡'  },
  { key: 'qr',            label: 'QR Codes / NFC',   icon: '▣'  },
  { key: 'audio',         label: 'Audio Guides',     icon: '◎'  },
  { key: 'users',         label: 'Users',            icon: '⊕'  },
  { key: 'reviews',       label: 'Ratings & Reviews',icon: '✦'  },
  { key: 'announcements', label: 'Announcements',    icon: '◇'  },
  { key: 'events',        label: 'Events',           icon: '⬭'  },
  { key: 'live',          label: 'Live Streaming',   icon: '⬤', live: true },
  { key: 'settings',      label: 'Settings',         icon: '⚙'  },
];

const initials = (email: string) => email[0]?.toUpperCase() ?? 'A';

export default function Sidebar({
  activePage, onSelect, email, collapsed, onToggle,
}: SidebarProps) {
  return (
    <aside style={{
      ...sb.root,
      width: collapsed ? 72 : 260,
      minWidth: collapsed ? 72 : 260,
    }}>
      {/* Grain overlay */}
      <div style={sb.grain} />

      {/* Brand */}
      <div style={sb.brandRow}>
        <div style={sb.brandMark}>
          <div style={sb.gem}>E</div>
          {!collapsed && <span style={sb.brandText}>ETorismo</span>}
        </div>
        <button style={sb.toggle} onClick={onToggle} type="button">
          {collapsed ? '▶' : '◀'}
        </button>
      </div>

      {/* User block */}
      <div style={{
        ...sb.userBlock,
        ...(collapsed ? sb.userBlockCollapsed : {}),
      }}>
        <div style={sb.avatar}>{initials(email)}</div>
        {!collapsed && (
          <div style={{ overflow: 'hidden' }}>
            <div style={sb.userLabel}>Signed in as</div>
            <div style={sb.userEmail}>{email}</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={sb.nav}>
        {NAV_ITEMS.map(item => {
          const active = item.key === activePage;
          return (
            <button
              key={item.key}
              onClick={() => onSelect(item.key)}
              style={{
                ...sb.navItem,
                ...(active ? sb.navItemActive : {}),
                ...(collapsed ? sb.navItemCollapsed : {}),
              }}
            >
              <span style={sb.navIcon}>{item.icon}</span>
              {!collapsed && <span style={sb.navLabel}>{item.label}</span>}
              {!collapsed && item.live && <span style={sb.liveDot} />}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div style={sb.footer}>
          SACRED HERITAGE COLLECTION · v2
        </div>
      )}
    </aside>
  );
}

// ─── Inline styles ──────────────────────────────────────────────────────────────
const sb: Record<string, React.CSSProperties> = {
  root: {
    background: '#1A1612',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    position: 'relative',
    transition: 'width 0.25s ease, min-width 0.25s ease',
    overflow: 'hidden',
    borderRight: '1px solid rgba(201,168,76,0.1)',
  },
  grain: {
    position: 'absolute',
    inset: 0,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
    pointerEvents: 'none',
    zIndex: 0,
  },
  brandRow: {
    position: 'relative', zIndex: 1,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '24px 18px 20px',
    borderBottom: '1px solid rgba(201,168,76,0.1)',
  },
  brandMark: { display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' },
  gem: {
    width: 32, height: 32, minWidth: 32,
    borderRadius: 10, background: '#C9A84C',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 14, fontWeight: 800, color: '#1A1612',
  },
  brandText: {
    fontFamily: 'Georgia, serif', fontSize: 17,
    fontWeight: 700, color: '#F5EDD8',
    letterSpacing: '0.02em', whiteSpace: 'nowrap',
  },
  toggle: {
    background: 'rgba(201,168,76,0.1)',
    border: '1px solid rgba(201,168,76,0.2)',
    borderRadius: 8, width: 28, height: 28, minWidth: 28,
    color: '#C9A84C', fontSize: 11,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer',
  },
  userBlock: {
    position: 'relative', zIndex: 1,
    margin: '14px 12px',
    padding: '12px 14px',
    background: 'rgba(245,237,216,0.04)',
    border: '1px solid rgba(201,168,76,0.14)',
    borderRadius: 14,
    display: 'flex', alignItems: 'center', gap: 10,
    overflow: 'hidden',
  },
  userBlockCollapsed: { justifyContent: 'center', padding: '10px' },
  avatar: {
    width: 32, height: 32, minWidth: 32, borderRadius: '50%',
    background: 'rgba(201,168,76,0.18)',
    border: '1.5px solid rgba(201,168,76,0.35)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 13, fontWeight: 700, color: '#C9A84C',
  },
  userLabel: {
    fontSize: 9, letterSpacing: '2px', color: '#C9A84C',
    fontWeight: 700, textTransform: 'uppercase', marginBottom: 3,
  },
  userEmail: {
    fontSize: 12, color: '#6B6459',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  nav: {
    position: 'relative', zIndex: 1,
    flex: 1, padding: '4px 8px',
    display: 'flex', flexDirection: 'column', gap: 2,
    overflowY: 'auto', overflowX: 'hidden',
  },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '10px 12px', borderRadius: 12,
    border: '1px solid transparent',
    background: 'transparent', color: '#4A4540',
    cursor: 'pointer', textAlign: 'left',
    whiteSpace: 'nowrap', width: '100%', overflow: 'hidden',
    fontSize: 13, fontWeight: 500, letterSpacing: '0.01em',
    transition: 'background 0.18s, color 0.18s',
  },
  navItemActive: {
    background: 'rgba(201,168,76,0.1)',
    border: '1px solid rgba(201,168,76,0.18)',
    color: '#C9A84C',
  },
  navItemCollapsed: { justifyContent: 'center', padding: '10px' },
  navIcon: { fontSize: 15, minWidth: 22, textAlign: 'center' },
  navLabel: { flex: 1 },
  liveDot: {
    width: 7, height: 7, borderRadius: '50%',
    background: '#E74C3C', marginLeft: 'auto', minWidth: 7,
  },
  footer: {
    position: 'relative', zIndex: 1,
    padding: '12px 16px 20px',
    borderTop: '1px solid rgba(201,168,76,0.08)',
    fontSize: 9, color: '#2D2922',
    letterSpacing: '0.8px', textAlign: 'center',
  },
};