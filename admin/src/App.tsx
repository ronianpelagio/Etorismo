import React, { useEffect, useState } from 'react';
import { supabase } from './services/supabase';
import { AdminUser } from './types';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ArtifactsPage from './pages/ArtifactsPage';
import UsersPage from './pages/UsersPage';
import RatingsPage from './pages/RatingsPage';
import AnnouncementsPage from './pages/AnnouncementsPage';
import EventsPage from './pages/EventsPage';
import SettingsPage from './pages/SettingsPage';

const navPages = [
  'dashboard',
  'artifacts',
  'qr',
  'audio',
  'users',
  'reviews',
  'announcements',
  'events',
  'live',
  'settings',
] as const;

type PageKey = (typeof navPages)[number];

const pageTitleMap: Record<PageKey, string> = {
  dashboard: 'Dashboard',
  artifacts: 'Artifacts',
  qr: 'QR Codes / NFC',
  audio: 'Audio Guides',
  users: 'Users',
  reviews: 'Ratings & Reviews',
  announcements: 'Announcements',
  events: 'Events',
  live: 'Live Streaming',
  settings: 'Settings',
};

const pageSubtitleMap: Record<PageKey, string> = {
  dashboard: 'Overview of activity, usage, and visitor insights.',
  artifacts: 'Manage artifact inventory and display details.',
  qr: 'Generate and manage QR/NFC codes for museum artifacts.',
  audio: 'Manage audio tours and guide metadata.',
  users: 'Manage museum app user accounts and access.',
  reviews: 'Review user ratings and feedback.',
  announcements: 'Publish announcements and news items.',
  events: 'Create and manage museum events.',
  live: 'Control live streaming sessions and status.',
  settings: 'Update system preferences and application settings.',
};

export default function App() {
  const [session, setSession] = useState<any | null>(null);
  const [profile, setProfile] = useState<AdminUser | null>(null);
  const [activePage, setActivePage] = useState<PageKey>('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [search, setSearch] = useState('');
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          setSession(data.session);
          await loadProfile(data.session.user.id);
        }
      } catch (err: any) {
        setError(err?.message || 'Unable to restore session');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    restoreSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        loadProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const loadProfile = async (userId: string) => {
    const { data, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (profileError || !data) {
      setProfile(null);
      return;
    }

    setProfile(data as AdminUser);
  };

  const handleLoginSuccess = async () => {
    const { data } = await supabase.auth.getSession();
    if (data?.session) {
      setSession(data.session);
      await loadProfile(data.session.user.id);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  };

  if (loading) {
    return <div className="loading-screen">Loading admin panel…</div>;
  }

  if (!session || !profile) {
    return <LoginPage onLoggedIn={handleLoginSuccess} error={error} />;
  }

  if (profile.role !== 'admin') {
    return <div className="not-authorized">Access denied. Admins only.</div>;
  }

  return (
    <div className={sidebarCollapsed ? 'app-shell collapsed' : 'app-shell'}>
      <Sidebar
        activePage={activePage}
        onSelect={setActivePage}
        email={profile.email}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((value) => !value)}
      />
         
        <div className="page-content">
          {activePage === 'dashboard' && <DashboardPage profile={profile} />}
          {activePage === 'artifacts' && <ArtifactsPage />}
          {activePage === 'users' && <UsersPage />}
          {activePage === 'reviews' && <RatingsPage />}
          {activePage === 'announcements' && <AnnouncementsPage />}
          {activePage === 'events' && <EventsPage />}
          {activePage === 'settings' && <SettingsPage />}
        </div>
    </div>
  );
}
