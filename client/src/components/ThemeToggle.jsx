import { Sun, Moon } from 'lucide-react';
import '../styles/ThemeToggle.css';

const ThemeToggle = ({ theme, onThemeChange }) => {
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    onThemeChange(newTheme);
  };

  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle-btn"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
    >
      <div className="theme-toggle-track">
        <div className={`theme-toggle-thumb ${theme === 'dark' ? 'active' : ''}`}>
          {theme === 'light' ? (
            <Sun size={14} className="theme-icon" />
          ) : (
            <Moon size={14} className="theme-icon" />
          )}
        </div>
      </div>
    </button>
  );
};

// Alternative simple version for smaller spaces
export const SimpleThemeToggle = ({ theme, onThemeChange }) => {
  return (
    <button
      onClick={() => onThemeChange(theme === 'light' ? 'dark' : 'light')}
      className="theme-toggle-simple"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
    >
      {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  );
};

export default ThemeToggle;