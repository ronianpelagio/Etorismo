import React from 'react';
import { DashboardDemographics } from '../types';

type DashboardDemographicsProps = {
  demographics: DashboardDemographics;
  loading: boolean;
};

const ageLabels = ['13-17', '18-24', '25-34', '35-44', '45-54', '55-64', '65+', 'unknown'];

export default function DashboardDemographicsSection({ demographics, loading }: DashboardDemographicsProps) {
  const genderTotal = Object.values(demographics.gender).reduce((sum, count) => sum + count, 0);
  const locationList = Object.entries(demographics.locations).sort((a, b) => b[1] - a[1]);

  return (
    <div className="stats-grid">
      <div className="stats-card">
        <div className="stats-card-title">Gender</div>
        {loading ? (
          <div className="empty-state">Loading gender data…</div>
        ) : genderTotal === 0 ? (
          <div className="empty-state">No gender data available</div>
        ) : (
          <>
            <div className="donut-chart">
              <div className="donut-center">{genderTotal ? `${Math.round((demographics.gender.male / genderTotal) * 100)}%` : '0%'}</div>
            </div>
            <div className="chart-legend">
              <div className="legend-item"><span className="legend-dot male" /> Male {Math.round((demographics.gender.male / Math.max(1, genderTotal)) * 100)}%</div>
              <div className="legend-item"><span className="legend-dot female" /> Female {Math.round((demographics.gender.female / Math.max(1, genderTotal)) * 100)}%</div>
              <div className="legend-item"><span className="legend-dot other" /> Other {Math.round((demographics.gender.other / Math.max(1, genderTotal)) * 100)}%</div>
              <div className="legend-item"><span className="legend-dot unknown" /> Unknown {Math.round((demographics.gender.unknown / Math.max(1, genderTotal)) * 100)}%</div>
            </div>
          </>
        )}
      </div>

      <div className="stats-card">
        <div className="stats-card-title">Age</div>
        {loading ? (
          <div className="empty-state">Loading age data…</div>
        ) : (
          <div className="bar-chart">
            {ageLabels.map((label) => {
              const value = demographics.ageGroups[label as keyof typeof demographics.ageGroups] ?? 0;
              const total = Object.values(demographics.ageGroups).reduce((sum, count) => sum + count, 0);
              const width = total ? (value / total) * 100 : 0;
              return (
                <div key={label} className="bar-row">
                  <span>{label}</span>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="stats-card">
        <div className="stats-card-title">Location</div>
        {loading ? (
          <div className="empty-state">Loading location data…</div>
        ) : locationList.length === 0 ? (
          <div className="empty-state">No location data available</div>
        ) : (
          <div className="location-list">
            {locationList.slice(0, 5).map(([location, count]) => (
              <div key={location} className="location-row"><span>{location}</span><strong>{Math.round((count / Math.max(1, Object.values(demographics.locations).reduce((sum, total) => sum + total, 0))) * 100)}%</strong></div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
