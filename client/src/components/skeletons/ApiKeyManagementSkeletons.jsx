import React from 'react';
import '../../styles/Loading.css';

export const RateLimitCardSkeleton = () => (
  <article className="flowing-card rate-limit-card" aria-label="Rate Limit Card Loading">
    <div className="skeleton skeleton-avatar"></div>
    <div className="skeleton skeleton-text" style={{ width: '70%' }}></div>
    <div className="skeleton skeleton-text" style={{ width: '80%', height: '14px' }}></div>
  </article>
);

export const ApiKeyCardSkeleton = () => (
  <div className="flowing-card api-key-card">
    <div className="api-key-card-header">
      <div className="api-key-card-info">
        <div className="skeleton api-key-card-skeleton skeleton-avatar"></div>
        <div style={{ flex: 1 }}>
          <div className="skeleton api-key-card-skeleton skeleton-text-title"></div>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '4px' }}>
            <div className="skeleton api-key-card-skeleton skeleton-text-small" style={{ width: '80px' }}></div>
            <div className="skeleton api-key-card-skeleton skeleton-text-small" style={{ width: '120px' }}></div>
          </div>
        </div>
      </div>
      
      <div className="api-key-actions">
        <div className="skeleton skeleton-button" style={{ width: '100px', height: '32px' }}></div>
        <div className="skeleton skeleton-button" style={{ width: '80px', height: '32px' }}></div>
      </div>
    </div>

    <div className="api-key-display">
      <div className="api-key-display-header">
        <div className="skeleton api-key-card-skeleton skeleton-input"></div>
        
        <div className="api-key-display-actions">
          <div className="skeleton api-key-card-skeleton skeleton-button-sm"></div>
          <div className="skeleton api-key-card-skeleton skeleton-button-sm"></div>
        </div>
      </div>
      
      <div className="skeleton api-key-card-skeleton skeleton-text-small" style={{ width: '40%' }}></div>
    </div>
  </div>
);

export const ApiKeyListSkeleton = () => (
  <div>
    {/* Header Skeleton */}
    <div className="api-keys-list-header">
      <div className="skeleton skeleton-text" style={{ width: '180px', height: '24px' }}></div>
      <div className="skeleton" style={{ width: '80px', height: '28px', borderRadius: '12px' }}></div>
    </div>
    
    {/* API Key Cards Skeleton */}
    <div>
      {[...Array(3)].map((_, i) => (
        <ApiKeyCardSkeleton key={i} />
      ))}
    </div>
  </div>
);