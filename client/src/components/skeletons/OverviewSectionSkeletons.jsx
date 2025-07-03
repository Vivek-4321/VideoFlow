import React from 'react';
import '../../styles/Loading.css';

export const StatsGridSkeleton = () => (
  <section className="stats-grid" aria-label="Statistics grid loading">
    {[...Array(4)].map((_, i) => (
      <article key={i} className="stat-card" aria-label="Stat card loading">
        <div className="skeleton skeleton-avatar"></div>
        <div className="stat-content">
          <div className="skeleton skeleton-text"></div>
          <div className="skeleton skeleton-text"></div>
        </div>
      </article>
    ))}
  </section>
);

export const RecentJobsSectionSkeleton = () => (
  <section className="settings-grid" aria-label="Recent jobs list loading">
    {[...Array(6)].map((_, i) => (
      <article key={i} className="settings-card" aria-label="Job card loading">
        <div className="skeleton skeleton-card"></div>
      </article>
    ))}
  </section>
);