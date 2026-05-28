import React, { useEffect, useState } from 'react';
import {
  FiUsers,
  FiBox,
  FiHeadphones,
  FiStar,
  FiTrendingUp,
  FiShield,
  FiActivity,
  FiAlertCircle,
} from 'react-icons/fi';

import {
  AdminUser,
  DashboardDemographics as DashboardDemographicsType,
  DashboardStats,
} from '../types';

import {
  fetchDashboardStats,
  fetchUserDemographics,
} from './dashboardData';

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

export default function DashboardPage({
  profile,
}: DashboardPageProps) {
  const [stats, setStats] = useState(defaultStats);

  const [demographics, setDemographics] =
    useState<DashboardDemographicsType>(
      defaultDemographics
    );

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(
    null
  );

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setError(null);

      try {
        const [dashboardStats, userDemographics] =
          await Promise.all([
            fetchDashboardStats(),
            fetchUserDemographics(),
          ]);

        setStats(dashboardStats);
        setDemographics(userDemographics);
      } catch (err: any) {
        setError(
          err?.message || 'Unable to load dashboard.'
        );
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const analyticsCards = [
    {
      label: 'Visitors',
      value: stats.totalVisitors,
      icon: <FiUsers size={18} />,
    },
    {
      label: 'Artifacts',
      value: stats.scannedArtifacts,
      icon: <FiBox size={18} />,
    },
    {
      label: 'Audio',
      value: stats.audioPlays,
      icon: <FiHeadphones size={18} />,
    },
    {
      label: 'Rating',
      value: stats.averageRating.toFixed(1),
      icon: <FiStar size={18} />,
    },
  ];

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
      />

      <div style={styles.page}>
        {/* HEADER */}
        <div style={styles.header}>
          <div>
            <div style={styles.eyebrow}>
              ETORISMO ADMIN
            </div>

            <h1 style={styles.title}>
              Dashboard
            </h1>

            <p style={styles.subtitle}>
              Welcome back{' '}
              {profile?.email ||
                'Admin'}
            </p>
          </div>

          <div
            style={{
              ...styles.liveBadge,
              background:
                stats.liveStatus === 'live'
                  ? '#DCFCE7'
                  : '#F3F4F6',
            }}
          >
            <div
              style={{
                ...styles.liveDot,
                background:
                  stats.liveStatus === 'live'
                    ? '#16A34A'
                    : '#9CA3AF',
              }}
            />

            <span style={styles.liveText}>
              {stats.liveStatus === 'live'
                ? 'Live'
                : 'Offline'}
            </span>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div style={styles.errorBox}>
            <FiAlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {/* TOP METRICS */}
        <div style={styles.metricsGrid}>
          {analyticsCards.map((card) => (
            <div
              key={card.label}
              style={styles.metricCard}
            >
              <div style={styles.metricIcon}>
                {card.icon}
              </div>

              <div>
                <div style={styles.metricLabel}>
                  {card.label}
                </div>

                <div style={styles.metricValue}>
                  {loading ? '...' : card.value}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* MAIN GRID */}
        <div style={styles.mainGrid}>
          {/* VISITOR TREND */}
          <div style={styles.panel}>
            <div style={styles.panelHeader}>
              <div>
                <div style={styles.panelEyebrow}>
                  Analytics
                </div>

                <h3 style={styles.panelTitle}>
                  Visitor Trend
                </h3>
              </div>

              <FiTrendingUp
                size={18}
                color="#16A34A"
              />
            </div>

            {loading ? (
              <div style={styles.chart}>
                {Array.from({ length: 7 }).map(
                  (_, i) => (
                    <div
                      key={i}
                      style={{
                        ...styles.chartBar,
                        height: `${
                          40 + Math.random() * 50
                        }px`,
                        opacity: 0.4,
                      }}
                    />
                  )
                )}
              </div>
            ) : (
              <div style={styles.chart}>
                {stats.visitorsTrend.map((point) => (
                  <div
                    key={point.date}
                    style={styles.chartItem}
                  >
                    <div
                      style={{
                        ...styles.chartBar,
                        height: `${Math.max(
                          16,
                          point.count * 8
                        )}px`,
                      }}
                    />

                    <span style={styles.chartLabel}>
                      {point.date.slice(5)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* QUICK SUMMARY */}
          <div style={styles.panel}>
            <div style={styles.panelHeader}>
              <div>
                <div style={styles.panelEyebrow}>
                  Overview
                </div>

                <h3 style={styles.panelTitle}>
                  Summary
                </h3>
              </div>

              <FiActivity
                size={18}
                color="#16A34A"
              />
            </div>

            <div style={styles.summaryList}>
              {[
                {
                  label: 'Artifacts',
                  value: stats.artifacts,
                  icon: <FiBox size={14} />,
                },
                {
                  label: 'Users',
                  value: stats.activeUsers,
                  icon: <FiUsers size={14} />,
                },
                {
                  label: 'Reviews',
                  value: stats.reviews,
                  icon: <FiStar size={14} />,
                },
                {
                  label: 'Blocked',
                  value: stats.blockedUsers,
                  icon: <FiShield size={14} />,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  style={styles.summaryItem}
                >
                  <div style={styles.summaryLeft}>
                    <div style={styles.summaryIcon}>
                      {item.icon}
                    </div>

                    <span style={styles.summaryLabel}>
                      {item.label}
                    </span>
                  </div>

                  <strong style={styles.summaryValue}>
                    {loading ? '...' : item.value}
                  </strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* DEMOGRAPHICS */}
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <div>
              <div style={styles.panelEyebrow}>
                Insights
              </div>

              <h3 style={styles.panelTitle}>
                Demographics
              </h3>
            </div>

            <FiUsers size={18} color="#16A34A" />
          </div>

          <div style={{ marginTop: 12 }}>
            <DashboardDemographicsSection
              demographics={demographics}
              loading={loading}
            />
          </div>
        </div>
      </div>
    </>
  );
}

const styles: Record<string, React.CSSProperties> =
  {
    page: {
      minHeight: '100vh',
      background: '#F0FDF4',
      padding: '18px',
      fontFamily: "'Poppins', sans-serif",
      overflow: 'hidden',
    },

    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },

    eyebrow: {
      fontSize: 10,
      fontWeight: 700,
      color: '#16A34A',
      letterSpacing: '1px',
      marginBottom: 4,
      textTransform: 'uppercase',
    },

    title: {
      margin: 0,
      fontSize: 24,
      fontWeight: 700,
      color: '#1F2937',
      lineHeight: 1,
    },

    subtitle: {
      marginTop: 6,
      fontSize: 12,
      color: '#6B7280',
    },

    liveBadge: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 12px',
      borderRadius: 999,
      border: '1px solid #DCFCE7',
    },

    liveDot: {
      width: 8,
      height: 8,
      borderRadius: '50%',
    },

    liveText: {
      fontSize: 12,
      fontWeight: 600,
      color: '#15803D',
    },

    errorBox: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      background: '#FEF2F2',
      color: '#DC2626',
      padding: '10px 12px',
      borderRadius: 12,
      marginBottom: 14,
      fontSize: 12,
      fontWeight: 500,
    },

    metricsGrid: {
      display: 'grid',
      gridTemplateColumns:
        'repeat(4, minmax(0, 1fr))',
      gap: 12,
      marginBottom: 14,
    },

    metricCard: {
      background: '#FFFFFF',
      border: '1px solid #DCFCE7',
      borderRadius: 18,
      padding: '14px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      boxShadow:
        '0 4px 12px rgba(22,163,74,0.05)',
    },

    metricIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      background: '#DCFCE7',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#16A34A',
      flexShrink: 0,
    },

    metricLabel: {
      fontSize: 11,
      color: '#6B7280',
      marginBottom: 2,
    },

    metricValue: {
      fontSize: 20,
      fontWeight: 700,
      color: '#15803D',
      lineHeight: 1,
    },

    mainGrid: {
      display: 'grid',
      gridTemplateColumns: '1.5fr 1fr',
      gap: 14,
      marginBottom: 14,
    },

    panel: {
      background: '#FFFFFF',
      border: '1px solid #DCFCE7',
      borderRadius: 20,
      padding: '16px',
      boxShadow:
        '0 4px 14px rgba(22,163,74,0.05)',
    },

    panelHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },

    panelEyebrow: {
      fontSize: 10,
      fontWeight: 700,
      color: '#16A34A',
      textTransform: 'uppercase',
      marginBottom: 2,
    },

    panelTitle: {
      margin: 0,
      fontSize: 16,
      fontWeight: 600,
      color: '#1F2937',
    },

    chart: {
      height: 150,
      display: 'flex',
      alignItems: 'flex-end',
      gap: 8,
    },

    chartItem: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
    },

    chartBar: {
      width: '100%',
      borderRadius: 10,
      background:
        'linear-gradient(180deg,#22C55E,#15803D)',
      minHeight: 18,
    },

    chartLabel: {
      fontSize: 10,
      color: '#6B7280',
    },

    summaryList: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    },

    summaryItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      background: '#F9FFFB',
      border: '1px solid #DCFCE7',
      borderRadius: 14,
      padding: '10px 12px',
    },

    summaryLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
    },

    summaryIcon: {
      width: 30,
      height: 30,
      borderRadius: 10,
      background: '#DCFCE7',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#16A34A',
    },

    summaryLabel: {
      fontSize: 12,
      fontWeight: 500,
      color: '#374151',
    },

    summaryValue: {
      fontSize: 15,
      fontWeight: 700,
      color: '#15803D',
    },
  };