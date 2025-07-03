import React from 'react';
import '../../styles/Loading.css';

export const ApiNavigationSkeleton = () => (
  <nav className="api-documentation-sidebar" aria-label="API Navigation Loading">
    <div className="flowing-card api-navigation-card">
      <div className="api-navigation-header">
        <div className="api-navigation-title-row">
          <div className="skeleton skeleton-avatar api-skeleton-icon"></div>
          <div className="skeleton skeleton-text api-skeleton-title"></div>
        </div>
        <div className="skeleton api-skeleton-version"></div>
      </div>

      <ul aria-label="API Sections Loading">
        {[...Array(4)].map((_, sectionIndex) => (
          <li key={sectionIndex} className="api-navigation-section">
            <div className="api-navigation-section-button">
              <div className="api-navigation-section-title">
                <div className="skeleton skeleton-avatar api-skeleton-section-icon"></div>
                <div className="skeleton skeleton-text api-skeleton-section-title"></div>
              </div>
              <div className="skeleton skeleton-avatar api-skeleton-section-icon"></div>
            </div>
            
            <ul className="api-navigation-endpoints" aria-label="API Endpoints Loading">
              {[...Array(3)].map((_, endpointIndex) => (
                <li key={endpointIndex} className="api-navigation-endpoint">
                  <div className="skeleton api-skeleton-endpoint-method"></div>
                  <div className="skeleton skeleton-text api-skeleton-endpoint-title"></div>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  </nav>
);

export const ApiContentSkeleton = () => (
  <article className="api-documentation-main" aria-label="API Content Loading">
    <div className="flowing-card api-content-card">
      {/* Endpoint Header Skeleton */}
      <header className="endpoint-header">
        <div className="endpoint-title-row">
          <div className="skeleton api-skeleton-endpoint-method"></div>
          <div className="skeleton skeleton-text api-skeleton-endpoint-header"></div>
        </div>
        <div className="skeleton api-skeleton-path"></div>
        <div className="skeleton skeleton-text api-skeleton-description"></div>
      </header>

      {/* Content Sections Skeleton */}
      <div className="api-section-content">
        {/* Request Body Section */}
        <section aria-label="Request Body Loading">
          <div className="skeleton skeleton-text api-skeleton-section-header"></div>
          <div className="skeleton api-skeleton-large-block"></div>
        </section>

        {/* Example Request Section */}
        <section aria-label="Example Request Loading">
          <div className="skeleton skeleton-text api-skeleton-section-header"></div>
          <div className="skeleton api-skeleton-example-block"></div>
          <div className="skeleton api-skeleton-response-block"></div>
        </section>

        {/* Response Section */}
        <section aria-label="Response Loading">
          <div className="skeleton skeleton-text api-skeleton-section-header"></div>
          <div className="skeleton api-skeleton-response-code"></div>
          <div className="skeleton api-skeleton-response-content"></div>
        </section>
      </div>
    </div>
  </article>
);

export const ApiDocumentationSkeleton = () => (
  <main className="api-documentation-container" aria-label="API Documentation Loading">
    {/* Header Section Skeleton */}
    <header className="section-header api-documentation-header">
      <div className="skeleton skeleton-text api-skeleton-main-title"></div>
      <div className="skeleton skeleton-text api-skeleton-main-subtitle"></div>
      
      <div className="api-documentation-search" role="search">
        <div className="search-container">
          <div className="skeleton api-skeleton-search-input"></div>
        </div>
        <div className="skeleton skeleton-button api-skeleton-search-button"></div>
      </div>
    </header>

    <div className="api-documentation-content">
      <ApiNavigationSkeleton />
      <ApiContentSkeleton />
    </div>
  </main>
);