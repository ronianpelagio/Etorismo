import React from 'react';

type DashboardMetricCardProps = {
  label: string;
  value: string | number;
  detail: string;
  statusLabel?: string;
  loading: boolean;
  icon: string;
};

export default function DashboardMetricCard({ label, value, detail, statusLabel, loading, icon }: DashboardMetricCardProps) {
  return (
    <div className="metric-card">
      <div className="metric-icon">{icon}</div>
      <div>
        <p className="metric-value">{loading ? <span className="skeleton skeleton-text" /> : value}</p>
        <p className="metric-label">{label}</p>
      </div>
      <div className="metric-delta">
        {loading ? <span className="skeleton skeleton-chip" /> : statusLabel || detail}
      </div>
    </div>
  );
}
