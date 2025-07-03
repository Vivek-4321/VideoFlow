import { 
  Play, 
  Film, 
  Zap, 
  Shield, 
  Globe, 
  Layers, 
  Activity, 
  Star,
  Users,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import '../App.css';

const LandingPage = ({ onGetStarted, onSignIn, theme, onThemeChange }) => {
  return (
    <main className="landing-page">
      
      {/* Navigation */}
      <header>
        <nav className="landing-nav" aria-label="Main navigation">
          <div className="nav-container">
            <div className="nav-brand">
              <div className="brand-icon">
                <Film size={24} />
              </div>
              <span className="brand-text">VideoFlow</span>
            </div>
            
            <div className="nav-actions">
              <ThemeToggle 
                theme={theme} 
                onThemeChange={onThemeChange}
              />
              <button className="nav-link" onClick={onSignIn} aria-label="Sign In">
                Sign In
              </button>
              <button className="btn btn-primary glow-effect" onClick={onGetStarted} aria-label="Get Started">
                Get Started
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="hero-section" role="banner">
        <div className="hero-container">
          <div className="hero-badge">
            <Sparkles size={16} />
            <span>Professional Video Processing</span>
          </div>
          
          <h1 className="hero-title">
            Transform Your Videos
            <br />
            <span className="gradient-text">Instantly</span>
          </h1>
          
          <p className="hero-description">
            Professional video transcoding in the cloud. Convert, compress, and optimize 
            your videos with advanced encoding options. No software installation required.
          </p>
          
          <section className="hero-actions" aria-label="Hero Call to Actions">
            <button className="btn btn-primary btn-large glow-effect" onClick={onGetStarted} aria-label="Start Transcoding">
              <Play size={20} />
              Start Transcoding
            </button>
            <button className="btn btn-secondary btn-large" aria-label="Watch Demo">
              <Film size={20} />
              Watch Demo
            </button>
          </section>
          
          <ul className="hero-stats" aria-label="Key Statistics">
            <li className="stat-item">
              <div className="stat-number">50M+</div>
              <div className="stat-label">Videos Processed</div>
            </li>
            <li className="stat-item">
              <div className="stat-number">99.9%</div>
              <div className="stat-label">Uptime</div>
            </li>
            <li className="stat-item">
              <div className="stat-number">10x</div>
              <div className="stat-label">Faster Processing</div>
            </li>
          </ul>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section" aria-labelledby="features-heading">
        <div className="features-container">
          <div className="section-header">
            <h2 id="features-heading" className="section-title">Why Choose VideoFlow?</h2>
            <p className="section-description">
              Everything you need for professional video processing
            </p>
          </div>
          
          <div className="features-grid">
            <article className="feature-card animate-in">
              <div className="feature-icon">
                <Zap size={24} />
              </div>
              <h3 className="feature-title">Lightning Fast</h3>
              <p className="feature-description">
                Cloud-powered transcoding with GPU acceleration. Process videos 10x faster than traditional methods.
              </p>
            </article>
            
            <article className="feature-card animate-in">
              <div className="feature-icon">
                <Layers size={24} />
              </div>
              <h3 className="feature-title">Multiple Formats</h3>
              <p className="feature-description">
                Support for all major video formats including MP4, WebM, MOV, AVI, and streaming formats like HLS.
              </p>
            </article>
            
            <article className="feature-card animate-in">
              <div className="feature-icon">
                <Shield size={24} />
              </div>
              <h3 className="feature-title">Secure & Private</h3>
              <p className="feature-description">
                Your videos are encrypted during processing and automatically deleted after completion.
              </p>
            </article>
            
            <article className="feature-card animate-in">
              <div className="feature-icon">
                <Globe size={24} />
              </div>
              <h3 className="feature-title">Global CDN</h3>
              <p className="feature-description">
                Process and deliver your videos from our global network for optimal performance worldwide.
              </p>
            </article>
            
            <article className="feature-card animate-in">
              <div className="feature-icon">
                <Activity size={24} />
              </div>
              <h3 className="feature-title">Real-time Progress</h3>
              <p className="feature-description">
                Monitor your transcoding jobs in real-time with detailed progress tracking and notifications.
              </p>
            </article>
            
            <article className="feature-card animate-in">
              <div className="feature-icon">
                <TrendingUp size={24} />
              </div>
              <h3 className="feature-title">Advanced Options</h3>
              <p className="feature-description">
                Fine-tune encoding settings with professional options like CRF, bitrate control, and codec selection.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="process-section" aria-labelledby="process-heading">
        <div className="process-container">
          <div className="section-header">
            <h2 id="process-heading" className="section-title">How It Works</h2>
            <p className="section-description">
              Simple, fast, and professional video processing in three steps
            </p>
          </div>
          
          <div className="process-steps">
            <article className="process-step">
              <div className="step-number">01</div>
              <div className="step-content">
                <h3 className="step-title">Upload Your Video</h3>
                <p className="step-description">
                  Drag and drop your video file or select from your device. 
                  Support for files up to 10GB.
                </p>
              </div>
            </article>
            
            <article className="process-step">
              <div className="step-number">02</div>
              <div className="step-content">
                <h3 className="step-title">Configure Settings</h3>
                <p className="step-description">
                  Choose your output format, resolution, quality settings, 
                  and advanced encoding options.
                </p>
              </div>
            </article>
            
            <article className="process-step">
              <div className="step-number">03</div>
              <div className="step-content">
                <h3 className="step-title">Download Results</h3>
                <p className="step-description">
                  Get your processed videos with download links and 
                  optional cloud storage integration.
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials-section" aria-labelledby="testimonials-heading">
        <div className="testimonials-container">
          <div className="section-header">
            <h2 id="testimonials-heading" className="section-title">Trusted by Professionals</h2>
            <p className="section-description">
              See what our users say about VideoFlow
            </p>
          </div>
          
          <div className="testimonials-grid">
            <article className="testimonial-card">
              <div className="testimonial-stars">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} fill="currentColor" />
                ))}
              </div>
              <p className="testimonial-text">
                "VideoFlow has revolutionized our video workflow. The speed and quality 
                are unmatched, and the interface is incredibly intuitive."
              </p>
              <div className="testimonial-author">
                <div className="author-avatar">
                  <Users size={16} />
                </div>
                <div className="author-info">
                  <span className="author-name">Sarah Chen</span>
                  <span className="author-title">Video Producer</span>
                </div>
              </div>
            </article>
            
            <article className="testimonial-card">
              <div className="testimonial-stars">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} fill="currentColor" />
                ))}
              </div>
              <p className="testimonial-text">
                "The advanced encoding options give us the control we need for 
                professional projects. Highly recommended for any video team."
              </p>
              <div className="testimonial-author">
                <div className="author-avatar">
                  <Users size={16} />
                </div>
                <div className="author-info">
                  <span className="author-name">Marcus Rodriguez</span>
                  <span className="author-title">Creative Director</span>
                </div>
              </div>
            </article>
            
            <article className="testimonial-card">
              <div className="testimonial-stars">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} fill="currentColor" />
                ))}
              </div>
              <p className="testimonial-text">
                "Seamless integration with our existing workflow. The API is 
                well-documented and the support team is incredibly responsive."
              </p>
              <div className="testimonial-author">
                <div className="author-avatar">
                  <Users size={16} />
                </div>
                <div className="author-info">
                  <span className="author-name">Emily Johnson</span>
                  <span className="author-title">Lead Developer</span>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section" aria-labelledby="cta-heading">
        <div className="cta-container">
          <div className="cta-content">
            <h2 id="cta-heading" className="cta-title">Ready to Transform Your Videos?</h2>
            <p className="cta-description">
              Join thousands of professionals who trust VideoFlow for their video processing needs.
            </p>
            <div className="cta-actions">
              <button className="btn btn-primary btn-large glow-effect" onClick={onGetStarted}>
                <Play size={20} />
                Start Free Trial
              </button>
              <button className="btn btn-secondary btn-large">
                <Activity size={20} />
                View Pricing
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-content">
            <div className="footer-brand">
              <div className="brand-icon">
                <Film size={24} />
              </div>
              <span className="brand-text">VideoFlow</span>
              <p className="brand-description">
                Professional video transcoding made simple.
              </p>
            </div>
            
            <div className="footer-links">
              <div className="link-group">
                <h4>Product</h4>
                <a href="#">Features</a>
                <a href="#">Pricing</a>
                <a href="#">API</a>
                <a href="#">Documentation</a>
              </div>
              
              <div className="link-group">
                <h4>Company</h4>
                <a href="#">About</a>
                <a href="#">Blog</a>
                <a href="#">Careers</a>
                <a href="#">Contact</a>
              </div>
              
              <div className="link-group">
                <h4>Support</h4>
                <a href="#">Help Center</a>
                <a href="#">Status</a>
                <a href="#">Community</a>
                <a href="#">Security</a>
              </div>
            </div>
          </div>
          
          <div className="footer-bottom">
            <p className="copyright">
              © {new Date().getFullYear()} VideoFlow. All rights reserved.
            </p>
            <div className="footer-bottom-links">
              <a href="#">Privacy Policy</a>
              <a href="#">Terms of Service</a>
              <a href="#">Cookie Policy</a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
};

export default LandingPage;