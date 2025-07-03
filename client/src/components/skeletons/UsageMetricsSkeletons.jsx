import React from 'react';
import '../../styles/Loading.css';

export const UsageCardSkeleton = () => (
  <article className="flowing-card usage-card" aria-label="Usage card loading">
    <header className="usage-card-header">
      <div className="skeleton skeleton-avatar-large"></div>
      <div className="usage-card-content">
        <div className="skeleton skeleton-text-title"></div>
        <div className="skeleton skeleton-text-subtitle"></div>
      </div>
    </header>
    
    <div className="usage-card-metrics">
      <div className="usage-card-numbers">
        <div className="skeleton skeleton-metric-number"></div>
        <div className="skeleton skeleton-metric-limit"></div>
      </div>
      
      <div className="usage-card-progress-bar">
        <div className="skeleton skeleton-progress-bar"></div>
      </div>
      
      <div className="skeleton skeleton-progress-text"></div>
    </div>
  </article>
);

export const ChartCardSkeleton = ({ height = '300px' }) => (
  <article className="flowing-card chart-card" aria-label="Chart card loading">
    <header className="chart-card-header">
      <div className="skeleton skeleton-text-title"></div>
      <div className="skeleton skeleton-text-subtitle"></div>
    </header>
    <div className="skeleton skeleton-chart" style={{ height }}></div>
  </article>
);

export const PeriodSelectorSkeleton = () => (
  <section className="usage-metrics-period-selector" aria-label="Period selector loading">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="skeleton skeleton-period-button"></div>
    ))}
  </section>
);