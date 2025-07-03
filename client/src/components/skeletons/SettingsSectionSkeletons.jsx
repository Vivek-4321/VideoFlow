import React from 'react';
import '../../styles/Loading.css';

export const GeneralSettingsSkeleton = () => (
  <section className="flowing-card compact-card" aria-label="General Settings Loading">
    <header className="card-header-minimal">
      <div className="skeleton skeleton-avatar"></div>
      <div className="skeleton-flex-container">
        <div className="skeleton skeleton-text skeleton-text-small"></div>
        <div className="skeleton skeleton-text skeleton-text-mini"></div>
      </div>
    </header>
    <div className="card-content-flowing">
      <fieldset className="theme-options" aria-label="Theme options loading">
        <div className="skeleton skeleton-card"></div>
        <div className="skeleton skeleton-card"></div>
      </fieldset>
    </div>
  </section>
);

export const AccountInformationSkeleton = () => (
  <section className="flowing-card profile-card" aria-label="Account Information Loading">
    <header className="profile-header">
      <div className="skeleton skeleton-avatar-large"></div>
      <div className="skeleton-flex-container">
        <div className="skeleton skeleton-text skeleton-text-small"></div>
        <div className="skeleton skeleton-text skeleton-text-mini"></div>
        <div className="skeleton-flex-gap" role="group" aria-label="Account badges loading">
          <div className="skeleton skeleton-badge"></div>
          <div className="skeleton skeleton-badge-small"></div>
        </div>
      </div>
    </header>
    <div className="skeleton skeleton-large-section" aria-label="Member since information loading"></div>
  </section>
);

export const DefaultEncodingSettingsSkeleton = () => (
  <section className="flowing-card settings-card-large" aria-label="Default Encoding Settings Loading">
    <header className="card-header-minimal">
      <div className="skeleton skeleton-avatar"></div>
      <div className="skeleton-flex-container">
        <div className="skeleton skeleton-text skeleton-text-small"></div>
        <div className="skeleton skeleton-text skeleton-text-mini"></div>
      </div>
    </header>
    <div className="card-content-flowing">
      <fieldset className="skeleton-settings-group" aria-label="Video Settings Loading">
        {/* Video Settings Group */}
        <div>
          <div className="skeleton skeleton-text skeleton-field-label-group"></div>
          <div className="skeleton-settings-grid">
            <div>
              <div className="skeleton skeleton-text skeleton-field-label"></div>
              <div className="skeleton skeleton-form"></div>
            </div>
            <div>
              <div className="skeleton skeleton-text skeleton-field-label-medium"></div>
              <div className="skeleton skeleton-form"></div>
            </div>
          </div>
        </div>
      </fieldset>
      <fieldset className="skeleton-settings-group" aria-label="Audio Settings Loading">
        {/* Audio Settings Group */}
        <div>
          <div className="skeleton skeleton-text skeleton-field-label-large"></div>
          <div className="skeleton-settings-grid">
            <div>
              <div className="skeleton skeleton-text skeleton-field-label"></div>
              <div className="skeleton skeleton-form"></div>
            </div>
          </div>
        </div>
      </fieldset>
      <fieldset className="skeleton-settings-group" aria-label="Advanced Settings Loading">
        {/* Advanced Settings Group */}
        <div>
          <div className="skeleton skeleton-text skeleton-field-label-group"></div>
          <div className="skeleton-settings-grid">
            <div>
              <div className="skeleton skeleton-text skeleton-field-label"></div>
              <div className="skeleton skeleton-form"></div>
            </div>
            <div>
              <div className="skeleton skeleton-text skeleton-field-label-medium"></div>
              <div className="skeleton skeleton-form"></div>
            </div>
          </div>
        </div>
      </fieldset>
        {/* Info Section */}
        <div className="skeleton skeleton-large-section" aria-label="Info section loading"></div>
    </div>
  </section>
);

export const AccountActionsSkeleton = () => (
  <section className="flowing-card action-card" aria-label="Account Actions Loading">
    <header className="card-header-minimal">
      <div className="skeleton skeleton-avatar"></div>
      <div className="skeleton-flex-container">
        <div className="skeleton skeleton-text skeleton-text-small"></div>
        <div className="skeleton skeleton-text skeleton-text-mini"></div>
      </div>
    </header>
    <div className="card-content-flowing">
      <div className="skeleton-field" role="group" aria-label="Sign out button loading">
        <div className="skeleton skeleton-button"></div>
      </div>
      <div className="skeleton skeleton-card" role="group" aria-label="Help section loading"></div>
    </div>
  </section>
);