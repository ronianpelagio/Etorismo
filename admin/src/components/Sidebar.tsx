import React from 'react';

import {
  FiHome,
  FiFolder,
  FiUsers,
  FiStar,
  FiBell,
  FiCalendar,
  FiSettings,
  FiChevronLeft,
  FiChevronRight,
} from 'react-icons/fi';

type PageKey =
  | 'dashboard'
  | 'artifacts'
  | 'qr'
  | 'audio'
  | 'users'
  | 'reviews'
  | 'announcements'
  | 'events'
  | 'live'
  | 'settings';

type SidebarProps = {
  activePage: PageKey;
  onSelect: (page: PageKey) => void;
  email: string;
  collapsed: boolean;
  onToggle: () => void;
};

const NAV_ITEMS: Array<{
  key: PageKey;
  label: string;
  icon: React.ReactNode;
}> = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: <FiHome />,
  },
  {
    key: 'artifacts',
    label: 'Artifacts',
    icon: <FiFolder />,
  },
  {
    key: 'users',
    label: 'Users',
    icon: <FiUsers />,
  },
  {
    key: 'reviews',
    label: 'Reviews',
    icon: <FiStar />,
  },
  {
    key: 'announcements',
    label: 'Announcements',
    icon: <FiBell />,
  },
  {
    key: 'events',
    label: 'Events',
    icon: <FiCalendar />,
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: <FiSettings />,
  },
];

const initials = (email: string) =>
  email?.[0]?.toUpperCase() ?? 'A';

export default function Sidebar({
  activePage,
  onSelect,
  email,
  collapsed,
  onToggle,
}: SidebarProps) {
  return (
    <>
      {/* Poppins Font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
      />

      <aside
        style={{
          ...sb.root,
          width: collapsed ? 78 : 270,
          minWidth: collapsed ? 78 : 270,
        }}
      >
        {/* Glow Effects */}
        <div style={sb.glowTop} />
        <div style={sb.glowBottom} />

        {/* Header */}
        <div style={sb.header}>
          <div style={sb.brand}>
            <div style={sb.logo}>E</div>

            {!collapsed && (
              <div>
                <div style={sb.brandTitle}>ETorismo</div>
                <div style={sb.brandSub}>
                  Admin Dashboard
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onToggle}
            style={sb.toggle}
          >
            {collapsed ? (
              <FiChevronRight />
            ) : (
              <FiChevronLeft />
            )}
          </button>
        </div>

        {/* User Card */}
        <div
          style={{
            ...sb.userCard,
            ...(collapsed
              ? sb.userCardCollapsed
              : {}),
          }}
        >
          <div style={sb.avatar}>
            {initials(email)}
          </div>

          {!collapsed && (
            <div style={{ overflow: 'hidden' }}>
              <div style={sb.userRole}>
                Administrator
              </div>

              <div style={sb.userEmail}>
                {email}
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav style={sb.nav}>
          {NAV_ITEMS.map((item) => {
            const active =
              item.key === activePage;

            return (
              <button
                key={item.key}
                onClick={() =>
                  onSelect(item.key)
                }
                style={{
                  ...sb.navItem,
                  ...(active
                    ? sb.navItemActive
                    : {}),
                  ...(collapsed
                    ? sb.navItemCollapsed
                    : {}),
                }}
              >
                <span style={sb.icon}>
                  {item.icon}
                </span>

                {!collapsed && (
                  <>
                    <span style={sb.label}>
                      {item.label}
                    </span>

                    {active && (
                      <span
                        style={sb.activeDot}
                      />
                    )}
                  </>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        {!collapsed && (
          <div style={sb.footer}>
            ETorismo Admin v2.0
          </div>
        )}
      </aside>
    </>
  );
}

const sb: Record<
  string,
  React.CSSProperties
> = {
  root: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    background: '#FFFFFF',
    borderRight: '1px solid #DCFCE7',
    overflow: 'hidden',
    transition: 'all 0.25s ease',
    fontFamily: "'Poppins', sans-serif",
    boxShadow:
      '0 0 25px rgba(22,163,74,0.08)',
  },

  glowTop: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 220,
    height: 220,
    borderRadius: '50%',
    background:
      'rgba(22,163,74,0.15)',
    filter: 'blur(70px)',
  },

  glowBottom: {
    position: 'absolute',
    bottom: -120,
    left: -120,
    width: 240,
    height: 240,
    borderRadius: '50%',
    background:
      'rgba(21,128,61,0.12)',
    filter: 'blur(80px)',
  },

  header: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '22px 18px',
  },

  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  },

  logo: {
    width: 46,
    height: 46,
    borderRadius: 16,
    background:
      'linear-gradient(135deg, #16A34A, #15803D)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 700,
    boxShadow:
      '0 10px 25px rgba(22,163,74,0.22)',
  },

  brandTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#15803D',
    lineHeight: 1.1,
  },

  brandSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 3,
  },

  toggle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    border: '1px solid #DCFCE7',
    background: '#F0FDF4',
    color: '#15803D',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: 16,
  },

  userCard: {
    position: 'relative',
    zIndex: 2,
    margin: '0 14px 20px',
    padding: '16px',
    borderRadius: 22,
    background:
      'linear-gradient(135deg, #16A34A, #15803D)',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    boxShadow:
      '0 12px 24px rgba(22,163,74,0.16)',
  },

  userCardCollapsed: {
    justifyContent: 'center',
    padding: '14px',
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    background:
      'rgba(255,255,255,0.18)',
    border:
      '2px solid rgba(255,255,255,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#FFFFFF',
    fontWeight: 700,
    fontSize: 17,
  },

  userRole: {
    fontSize: 11,
    color: '#DCFCE7',
    marginBottom: 4,
  },

  userEmail: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: 150,
  },

  nav: {
    position: 'relative',
    zIndex: 2,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: '0 12px',
    flex: 1,
  },

  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '13px 15px',
    borderRadius: 16,
    border: 'none',
    background: 'transparent',
    color: '#374151',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
    transition: 'all 0.2s ease',
  },

  navItemActive: {
    background: '#DCFCE7',
    color: '#15803D',
    boxShadow:
      '0 4px 12px rgba(22,163,74,0.12)',
    fontWeight: 600,
  },

  navItemCollapsed: {
    justifyContent: 'center',
    padding: '14px',
  },

  icon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 18,
    minWidth: 20,
  },

  label: {
    flex: 1,
    textAlign: 'left',
  },

  activeDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#16A34A',
  },

  footer: {
    position: 'relative',
    zIndex: 2,
    padding: '18px',
    borderTop: '1px solid #DCFCE7',
    textAlign: 'center',
    fontSize: 11,
    color: '#6B7280',
    background: '#F9FFFB',
  },
};