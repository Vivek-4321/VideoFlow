import React from 'react';
import '../../styles/Loading.css';

export const JobCardSkeleton = () => (
  <article className="flowing-card jobs-skeleton-card" aria-hidden="true" aria-label="Loading job card">
    <div className="jobs-skeleton-header">
      {/* Status Icon Skeleton */}
      <div className="skeleton skeleton-avatar skeleton-avatar-48"></div>
      
      {/* Job Info Skeleton */}
      <div className="jobs-skeleton-content">
        <div className="skeleton skeleton-text skeleton-text-70"></div>
        <div className="jobs-skeleton-info-row">
          <div className="skeleton skeleton-badge-50"></div>
          <div className="skeleton skeleton-status-80"></div>
        </div>
        
        {/* Progress/Details Skeleton */}
        <div className="jobs-skeleton-progress">
          <div className="skeleton skeleton-progress-full"></div>
          <div className="jobs-skeleton-progress-info">
            <div className="skeleton skeleton-text skeleton-progress-left-30"></div>
            <div className="skeleton skeleton-text skeleton-progress-right-25"></div>
          </div>
        </div>
      </div>
      
      {/* Action Buttons Skeleton */}
      <div className="jobs-skeleton-actions">
        <div className="skeleton skeleton-button skeleton-button-32"></div>
        <div className="skeleton skeleton-button skeleton-button-32"></div>
      </div>
    </div>
  </article>
);

export const JobsListSkeleton = () => (
  <section aria-label="Jobs list loading">
    {/* Retention Warning Skeleton */}
    <aside className="flowing-card jobs-retention-warning-card" aria-label="Retention warning loading">
      <div className="jobs-retention-warning-content">
        <div className="skeleton skeleton-avatar skeleton-avatar-36"></div>
        <div className="jobs-retention-text">
          <div className="skeleton skeleton-text skeleton-text-80"></div>
          <div className="skeleton skeleton-text skeleton-text-60"></div>
        </div>
      </div>
    </aside>
    
    {/* Job Cards Skeleton */}
    <div className="jobs-list-container">
      {[...Array(6)].map((_, i) => (
        <JobCardSkeleton key={i} />
      ))}
    </div>
  </section>
);

export const JobDetailsSkeleton = () => (
  <article aria-label="Job details loading">
    {/* Header Skeleton */}
    <header className="jobs-list-skeleton-header-row">
      <div className="skeleton skeleton-text jobs-list-skeleton-title"></div>
      <div className="skeleton skeleton-button skeleton-button-32"></div>
    </header>

    {/* Job Details Card Skeleton */}
    <div className="flowing-card job-details-header-card">
      <div className="job-details-container">
        {/* Job Info Section */}
        <section aria-label="Job information loading">
          <div className="skeleton skeleton-text skeleton-title-30"></div>
          <div className="jobs-skeleton-progress">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="jobs-skeleton-progress-info">
                <div className="skeleton skeleton-text skeleton-text-25"></div>
                <div className="skeleton skeleton-text skeleton-text-40"></div>
              </div>
            ))}
          </div>
        </section>

        {/* Progress Section */}
        <section aria-label="Job progress loading">
          <div className="skeleton skeleton-text skeleton-title-30"></div>
          <div className="skeleton skeleton-progress-bar-full"></div>
          <div className="skeleton skeleton-text skeleton-text-20"></div>
        </section>

        {/* Output Files Section */}
        <section aria-label="Output files loading">
          <div className="skeleton skeleton-text skeleton-title-30"></div>
          <div className="skeleton skeleton-large-container"></div>
        </section>
      </div>
    </div>
  </article>
);