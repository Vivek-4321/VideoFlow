import { useState, useEffect } from 'react';
import {
  Settings,
  User,
  Package,
  LogOut,
  Sun,
  Moon,
  Shield,
  Bell,
  HelpCircle
} from 'lucide-react';
import '../styles/Loading.css';
import '../styles/SettingsSection.css';
import { 
  GeneralSettingsSkeleton, 
  AccountInformationSkeleton, 
  DefaultEncodingSettingsSkeleton, 
  AccountActionsSkeleton 
} from './skeletons';

const GeneralSettings = ({ theme, setTheme }) => {
  return (
    <section className="flowing-card compact-card" aria-labelledby="general-settings-title">
      <header className="card-header-minimal">
        <div className="card-icon-wrapper">
          <Settings size={20} />
        </div>
        <div>
          <h3 id="general-settings-title" className="card-title-minimal">General Settings</h3>
          <p className="card-description-minimal">Choose your preferred theme</p>
        </div>
      </header>
      <div className="card-content-flowing">
        <fieldset className="theme-selector">
          <legend className="visually-hidden">Theme Selection</legend>
          <div className="theme-options">
            <label className="theme-option">
              <input
                type="radio"
                name="theme"
                checked={theme === 'light'}
                onChange={() => setTheme('light')}
                className="theme-radio"
                aria-label="Light theme"
              />
              <div className="theme-card">
                <Sun size={18} />
                <span>Light</span>
              </div>
            </label>
            <label className="theme-option">
              <input
                type="radio"
                name="theme"
                checked={theme === 'dark'}
                onChange={() => setTheme('dark')}
                className="theme-radio"
                aria-label="Dark theme"
              />
              <div className="theme-card">
                <Moon size={18} />
                <span>Dark</span>
              </div>
            </label>
          </div>
        </fieldset>
      </div>
    </section>
  );
};

const AccountInformation = ({ user }) => {
  return (
    <section className="flowing-card profile-card" aria-labelledby="account-information-title">
      <header className="profile-header">
        <div className="profile-avatar">
          <User size={24} />
        </div>
        <div className="profile-info">
          <h3 id="account-information-title" className="profile-name">{user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user?.email || 'User'}</h3>
          <p className="profile-email">{user?.email}</p>
          <div className="profile-badges">
            <span className={`status-badge ${user?.verified ? 'verified' : 'unverified'}`}>
              <Shield size={12} />
              {user?.verified ? 'Verified' : 'Unverified'}
            </span>
            <span className="plan-badge">Free Tier</span>
          </div>
        </div>
      </header>
      
      <div className="profile-details">
        <div className="detail-row">
          <span className="detail-label">Member since</span>
          <span className="detail-value">
            {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
          </span>
        </div>
      </div>
    </section>
  );
};

const DefaultEncodingSettings = ({ transcodingOptions, setTranscodingOptions }) => {
  return (
    <section className="flowing-card settings-card-large" aria-labelledby="encoding-defaults-title">
      <header className="card-header-minimal">
        <div className="card-icon-wrapper">
          <Package size={20} />
        </div>
        <div>
          <h3 id="encoding-defaults-title" className="card-title-minimal">Encoding Defaults</h3>
          <p className="card-description-minimal">Your preferred encoding settings</p>
        </div>
      </header>
      
      <div className="card-content-flowing">
        <form className="settings-flow" aria-label="Default Encoding Settings">
          <fieldset className="setting-group">
            <legend className="setting-group-title">Video Settings</legend>
            <div className="setting-row">
              <div className="setting-item">
                <label className="setting-label" htmlFor="videoCodec">Codec</label>
                <select
                  id="videoCodec"
                  value={transcodingOptions.videoCodec}
                  onChange={(e) =>
                    setTranscodingOptions({
                      ...transcodingOptions,
                      videoCodec: e.target.value,
                    })
                  }
                  className="setting-select"
                  aria-label="Video Codec"
                >
                  <option value="h264">H.264</option>
                  <option value="h265">H.265</option>
                  <option value="vp9">VP9</option>
                </select>
              </div>
              <div className="setting-item">
                <label className="setting-label" htmlFor="videoQuality">Quality</label>
                <select
                  id="videoQuality"
                  value={transcodingOptions.videoBitrate}
                  onChange={(e) =>
                    setTranscodingOptions({
                      ...transcodingOptions,
                      videoBitrate: e.target.value,
                    })
                  }
                  className="setting-select"
                  aria-label="Video Quality (Bitrate)"
                >
                  <option value="8000k">High (8 Mbps)</option>
                  <option value="5000k">Medium (5 Mbps)</option>
                  <option value="2500k">Low (2.5 Mbps)</option>
                </select>
              </div>
            </div>
          </fieldset>

          <fieldset className="setting-group">
            <legend className="setting-group-title">Audio Settings</legend>
            <div className="setting-row">
              <div className="setting-item">
                <label className="setting-label" htmlFor="audioCodec">Codec</label>
                <select
                  id="audioCodec"
                  value={transcodingOptions.audioCodec}
                  onChange={(e) =>
                    setTranscodingOptions({
                      ...transcodingOptions,
                      audioCodec: e.target.value,
                    })
                  }
                  className="setting-select"
                  aria-label="Audio Codec"
                >
                  <option value="aac">AAC</option>
                  <option value="mp3">MP3</option>
                  <option value="opus">Opus</option>
                </select>
              </div>
            </div>
          </fieldset>

          <fieldset className="setting-group">
            <legend className="setting-group-title">Advanced</legend>
            <div className="setting-row">
              <div className="setting-item">
                <label className="setting-label" htmlFor="crf">CRF</label>
                <input
                  type="number"
                  id="crf"
                  min="0"
                  max="51"
                  value={transcodingOptions.crf}
                  onChange={(e) =>
                    setTranscodingOptions({
                      ...transcodingOptions,
                      crf: e.target.value,
                    })
                  }
                  className="setting-input"
                  aria-label="Constant Rate Factor (CRF)"
                />
              </div>
              <div className="setting-item">
                <label className="setting-label" htmlFor="preset">Preset</label>
                <select
                  id="preset"
                  value={transcodingOptions.preset}
                  onChange={(e) =>
                    setTranscodingOptions({
                      ...transcodingOptions,
                      preset: e.target.value,
                    })
                  }
                  className="setting-select"
                  aria-label="Encoding Preset"
                >
                  <option value="ultrafast">Ultrafast</option>
                  <option value="fast">Fast</option>
                  <option value="medium">Medium</option>
                  <option value="slow">Slow</option>
                </select>
              </div>
            </div>
          </fieldset>
        </form>

        <div className="setting-info" role="note">
          <div className="info-icon">
            <HelpCircle size={16} />
          </div>
          <p>These settings apply to new jobs by default. You can override them per job.</p>
        </div>
      </div>
    </section>
  );
};

const AccountActions = ({ handleLogout }) => {
  return (
    <section className="flowing-card action-card" aria-labelledby="account-actions-title">
      <header className="card-header-minimal">
        <div className="card-icon-wrapper">
          <LogOut size={20} />
        </div>
        <div>
          <h3 id="account-actions-title" className="card-title-minimal">Account Actions</h3>
          <p className="card-description-minimal">Manage your account</p>
        </div>
      </header>
      
      <div className="card-content-flowing">
        <div className="action-buttons">
          <button onClick={handleLogout} className="action-btn danger" aria-label="Sign Out of Account">
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
        
        <div className="help-section">
          <div className="help-header">
            <Bell size={16} />
            <span>Need Help?</span>
          </div>
          <div className="help-actions">
            <button className="help-btn" aria-label="Contact Support">Contact Support</button>
            <button className="help-btn" aria-label="View Documentation">View Docs</button>
          </div>
        </div>
      </div>
    </section>
  );
};

const SettingsSection = ({ 
  user, 
  theme, 
  setTheme, 
  transcodingOptions, 
  setTranscodingOptions, 
  handleLogout 
}) => {
  const [isLoading, setIsLoading] = useState(true);

  // Simulate loading settings data
  useEffect(() => {
    const loadSettings = async () => {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      setIsLoading(false);
    };

    loadSettings();
  }, []);

  // Mock data for demonstration
  const mockUser = user || {
    email: 'user@example.com',
    firstName: 'John',
    lastName: 'Doe',
    verified: true,
    createdAt: new Date('2024-01-15')
  };

  const mockTranscodingOptions = transcodingOptions || {
    videoCodec: 'h264',
    audioCodec: 'aac',
    videoBitrate: '5000k',
    crf: '23',
    preset: 'medium',
    profile: 'high'
  };

  if (isLoading) {
    return (
      <div className="settings-section">
        <div className="section-header">
          <div className="skeleton skeleton-text skeleton-text-large"></div>
          <div className="skeleton skeleton-text skeleton-text-medium"></div>
        </div>

        <div className="settings-flow-layout">
          <div className="settings-sidebar">
            <GeneralSettingsSkeleton />
            <AccountActionsSkeleton />
          </div>
          
          <div className="settings-main">
            <AccountInformationSkeleton />
            <DefaultEncodingSettingsSkeleton />
          </div>
        </div>

      </div>
    );
  }

  return (
    <main className="settings-section">
      <header className="section-header">
        <h1 className="section-title">Settings</h1>
        <p className="section-description">
          Configure your transcoding preferences and application settings
        </p>
      </header>

      <div className="settings-flow-layout">
        <div className="settings-sidebar">
          <GeneralSettings 
            theme={theme || 'dark'}
            setTheme={setTheme || (() => {})}
          />
          
          <AccountActions 
            handleLogout={handleLogout || (() => {})}
          />
        </div>
        
        <div className="settings-main">
          <AccountInformation 
            user={mockUser}
          />
          
          <DefaultEncodingSettings 
            transcodingOptions={mockTranscodingOptions}
            setTranscodingOptions={setTranscodingOptions || (() => {})}
          />
        </div>
      </div>

    </main>
  );
};

export default SettingsSection;