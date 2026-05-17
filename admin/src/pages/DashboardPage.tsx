import React, { useEffect, useState } from 'react';
import { AdminUser, DashboardDemographics as DashboardDemographicsType, DashboardStats } from '../types';
import { fetchDashboardStats, fetchUserDemographics } from './dashboardData';
import DashboardMetricCard from '../components/DashboardMetricCard';
import DashboardDemographicsSection from '../components/DashboardDemographics';

const defaultStats: DashboardStats = {
  artifacts: 0,
  users: 0,
  activeUsers: 0,
  blockedUsers: 0,
  reviews: 0,
  liveStatus: 'offline',
  totalVisitors: 0,
  scannedArtifacts: 0,
  audioPlays: 0,
  averageRating: 0,
  visitorsTrend: [],
};

const defaultDemographics: DashboardDemographicsType = {
  gender: {
    male: 0,
    female: 0,
    other: 0,
    unknown: 0,
  },
  ageGroups: {
    '13-17': 0,
    '18-24': 0,
    '25-34': 0,
    '35-44': 0,
    '45-54': 0,
    '55-64': 0,
    '65+': 0,
    unknown: 0,
  },
  locations: {},
};

type DashboardPageProps = {
  profile: AdminUser;
};

export default function DashboardPage({ profile }: DashboardPageProps) {
  const [stats, setStats] = useState(defaultStats);
  const [demographics, setDemographics] = useState<DashboardDemographicsType>(defaultDemographics);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setError(null);

      try {
        const [dashboardStats, userDemographics] = await Promise.all([
          fetchDashboardStats(),
          fetchUserDemographics(),
        ]);
        setStats(dashboardStats);
        setDemographics(userDemographics);
      } catch (err: any) {
        setError(err?.message || 'Unable to load dashboard data.');
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const analyticsCards = [
    {
      label: 'Total Visitors',
      value: stats.totalVisitors,
      detail: 'Unique app visitors',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      label: 'Artifacts Scanned',
      value: stats.scannedArtifacts,
      detail: 'QR/NFC interactions',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
          <path d="M7 7h.01" />
          <path d="M17 7h.01" />
          <path d="M7 17h.01" />
          <path d="M17 17h.01" />
        </svg>
      ),
    },
    {
      label: 'Audio Plays',
      value: stats.audioPlays,
      detail: 'Guided tour plays',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
          <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
        </svg>
      ),
    },
    {
      label: 'Avg. Rating',
      value: stats.averageRating.toFixed(1),
      detail: 'User satisfaction',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ),
    },
  ];

  return (
    <div className="page-shell">
      {/* TOP BAR */}
      <div className="top-bar">
        <div>
          <div className="page-eyebrow">— Admin Console</div>
          <h1 className="page-title">Dashboard</h1>
          <div className="page-gold-line" />
          <p className="page-subtitle">
            Welcome back, {profile?.display_name || profile?.email || 'Admin'}. Here's your ministry overview.
          </p>
        </div>
        <div className="live-indicator">
          <span className={`live-dot ${stats.liveStatus === 'live' ? 'live-dot-active' : ''}`} />
          <span className="live-label">{stats.liveStatus === 'live' ? 'Live' : 'Offline'}</span>
        </div>
      </div>

      {/* ERROR ALERT */}
      {error && (
        <div className="alert-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* ANALYTICS CARDS */}
      <div className="metrics-grid">
        {analyticsCards.map((card) => (
          <DashboardMetricCard
            key={card.label}
            label={card.label}
            value={loading ? '' : card.value}
            detail={card.detail}
            loading={loading}
            icon={card.icon}
          />
        ))}
      </div>

      {/* CHARTS + QUICK STATS */}
      <div className="dashboard-grid">
        {/* VISITORS TREND */}
        <div className="panel">
          <div className="panel-heading">
            <div>
              <div className="panel-eyebrow">— Analytics</div>
              <h3>Visitors <span className="text-muted">Last 7 days</span></h3>
              <div className="panel-goldline" />
            </div>
          </div>
          <div className="panel-body">
            {loading ? (
              <div className="chart-skeleton">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="chart-skeleton-bar" style={{ height: `${30 + Math.random() * 60}px` }} />
                ))}
              </div>
            ) : stats.visitorsTrend.length === 0 ? (
              <div className="empty-state">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--ink-light)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
                <p>No visitor data available for the last 7 days.</p>
              </div>
            ) : (
              <div className="bar-chart">
                {stats.visitorsTrend.map((point) => (
                  <div key={point.date} className="bar-chart-item">
                    <div
                      className="bar-chart-fill"
                      style={{ height: `${Math.max(12, point.count * 12)}px` }}
                    />
                    <span className="bar-chart-label">{point.date.slice(5)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* QUICK SUMMARY */}
        <div className="panel">
          <div className="panel-heading">
            <div>
              <div className="panel-eyebrow">— Overview</div>
              <h3>Quick Summary</h3>
              <div className="panel-goldline" />
            </div>
          </div>
          <div className="panel-body">
            <div className="summary-list">
              <div className="summary-item">
                <div className="summary-item-left">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  </svg>
                  <span>Artifacts</span>
                </div>
                {loading ? (
                  <span className="skeleton skeleton-value" />
                ) : (
                  <strong>{stats.artifacts}</strong>
                )}
              </div>

              <div className="summary-item">
                <div className="summary-item-left">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                  </svg>
                  <span>Active Users</span>
                </div>
                {loading ? (
                  <span className="skeleton skeleton-value" />
                ) : (
                  <strong>{stats.activeUsers}</strong>
                )}
              </div>

              <div className="summary-item">
                <div className="summary-item-left">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                  <span>Reviews</span>
                </div>
                {loading ? (
                  <span className="skeleton skeleton-value" />
                ) : (
                  <strong>{stats.reviews}</strong>
                )}
              </div>

              <div className="summary-item">
                <div className="summary-item-left">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                    <line x1="12" y1="2" x2="12" y2="12" />
                  </svg>
                  <span>Live Status</span>
                </div>
                {loading ? (
                  <span className="skeleton skeleton-value" />
                ) : (
                  <strong className={stats.liveStatus === 'live' ? 'text-live' : 'text-offline'}>
                    {stats.liveStatus === 'live' ? 'Live' : 'Offline'}
                  </strong>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DEMOGRAPHICS */}
      <div className="panel">
        <div className="panel-heading">
          <div>
            <div className="panel-eyebrow">— Audience Insights</div>
            <h3>Demographics</h3>
            <div className="panel-goldline" />
          </div>
        </div>
        <div className="panel-body">
          <p className="page-subtitle" style={{ marginTop: 0, marginBottom: '1.5rem' }}>
            Gender, age, and location insights from your visitors.
          </p>
          <DashboardDemographicsSection demographics={demographics} loading={loading} />
        </div>
      </div>
    </div>
  );
}