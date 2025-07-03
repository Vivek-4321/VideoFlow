import { useState, useEffect } from 'react';
import '../styles/ApiDocumentation.css';
import '../styles/Loading.css';
import { 
  Copy, 
  Key, 
  Terminal,
  Check,
  ChevronRight,
  ChevronDown,
  Search,
  Shield,
  Clock,
  Zap,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import { ApiDocumentationSkeleton } from './skeletons';

const ApiDocumentation = () => {
  const [copiedCode, setCopiedCode] = useState(null);
  const [activeEndpoint, setActiveEndpoint] = useState('create-job');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    jobs: true,
    auth: true,
    'api-keys': false,
    usage: false
  });
  const [isLoading, setIsLoading] = useState(true);

  // Simulate loading for consistency with other components
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500); // 0.5 second delay

    return () => clearTimeout(timer);
  }, []);

  const copyToClipboard = (code, id) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const CodeBlock = ({ children, language = 'bash', id, title }) => (
    <div className="code-block">
      {title && (
        <div className="code-block-title">
          {title}
        </div>
      )}
      <div className="code-block-header">
        <span className="code-block-language">
          {language}
        </span>
        <button
          onClick={() => copyToClipboard(children, id)}
          className="btn btn-sm code-block-copy"
        >
          {copiedCode === id ? <Check size={12} /> : <Copy size={12} />}
          {copiedCode === id ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <div className="code-block-content">
        <pre className="code-block-pre">
          <code>{children}</code>
        </pre>
      </div>
    </div>
  );

  const MethodBadge = ({ method }) => {
    const getMethodColor = (method) => {
      switch (method.toLowerCase()) {
        case 'get': return { bg: 'var(--success-color)', text: 'white' };
        case 'post': return { bg: 'var(--primary-color)', text: 'white' };
        case 'put': return { bg: 'var(--warning-color)', text: 'white' };
        case 'delete': return { bg: 'var(--danger-color)', text: 'white' };
        default: return { bg: 'var(--text-muted)', text: 'white' };
      }
    };
    
    const colors = getMethodColor(method);
    
    return (
      <span className="method-badge-container" style={{
        background: colors.bg,
        color: colors.text
      }}>
        {method}
      </span>
    );
  };

  const endpoints = {
    'create-job': {
      method: 'POST',
      path: '/api/v1/jobs',
      title: 'Create Transcoding Job',
      description: 'Submit a new video transcoding job',
      section: 'jobs'
    },
    'get-job': {
      method: 'GET',
      path: '/api/v1/jobs/{id}',
      title: 'Get Job Status',
      description: 'Retrieve job status and results',
      section: 'jobs'
    },
    'list-jobs': {
      method: 'GET',
      path: '/api/v1/jobs/user/{userId}',
      title: 'List User Jobs',
      description: 'Get all jobs for a specific user',
      section: 'jobs'
    },
    'cancel-job': {
      method: 'DELETE',
      path: '/api/v1/jobs/{id}',
      title: 'Cancel Job',
      description: 'Cancel a pending or processing job',
      section: 'jobs'
    },
    'authentication': {
      method: 'INFO',
      path: '/authentication',
      title: 'Authentication',
      description: 'API key authentication',
      section: 'auth'
    },
    'rate-limits': {
      method: 'INFO',
      path: '/rate-limits',
      title: 'Rate Limits',
      description: 'Usage limits and restrictions',
      section: 'auth'
    },
    'list-api-keys': {
      method: 'GET',
      path: '/api/v1/api-keys',
      title: 'List API Keys',
      description: 'Get all API keys for your account',
      section: 'api-keys'
    },
    'create-api-key': {
      method: 'POST',
      path: '/api/v1/api-keys',
      title: 'Create API Key',
      description: 'Generate a new API key',
      section: 'api-keys'
    },
    'delete-api-key': {
      method: 'DELETE',
      path: '/api/v1/api-keys/{keyId}',
      title: 'Delete API Key',
      description: 'Remove an API key',
      section: 'api-keys'
    },
    'usage-stats': {
      method: 'GET',
      path: '/api/v1/usage-stats',
      title: 'Usage Statistics',
      description: 'Get usage metrics and statistics',
      section: 'usage'
    }
  };

  const sections = {
    jobs: { title: 'Jobs', icon: Zap },
    auth: { title: 'Authentication', icon: Shield },
    'api-keys': { title: 'API Keys', icon: Key },
    usage: { title: 'Usage', icon: Clock }
  };

  const getEndpointContent = () => {
    const endpoint = endpoints[activeEndpoint];
    if (!endpoint) return null;

    const renderEndpointHeader = () => (
      <div className="endpoint-header">
        <div className="endpoint-title-row">
          <MethodBadge method={endpoint.method} />
          <h2 className="endpoint-title elegant-text-primary">
            {endpoint.title}
          </h2>
        </div>
        <code className="endpoint-path">
          {endpoint.path}
        </code>
        <p className="endpoint-description elegant-text-secondary">
          {endpoint.description}
        </p>
      </div>
    );

    const renderParameterTable = (parameters) => (
      <div className="parameter-table">
        <table>
          <thead>
            <tr>
              <th>Parameter</th>
              <th>Type</th>
              <th>Required</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {parameters.map((param, index) => (
              <tr key={index}>
                <td>
                  <code className="parameter-name">
                    {param.name}
                  </code>
                </td>
                <td>
                  {param.type}
                </td>
                <td>
                  <span className={`parameter-required ${param.required ? 'required' : 'optional'}`}>
                    {param.required ? 'Required' : 'Optional'}
                  </span>
                </td>
                <td>
                  {param.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );

    const renderResponseCode = (code, description, success = true) => (
      <div className={`response-code ${success ? 'success' : 'error'}`}>
        <span className="response-code-badge">
          {code}
        </span>
        <span className="response-code-description">{description}</span>
      </div>
    );

    switch (activeEndpoint) {
      case 'create-job':
        return (
          <section aria-labelledby="create-job-endpoint-title">
            {renderEndpointHeader()}

            <section className="api-section-margin-bottom" aria-labelledby="request-body-heading">
              <h3 id="request-body-heading" className="elegant-text-primary api-header-style">Request Body</h3>
              {renderParameterTable([
                { name: 'inputUrl', type: 'string', required: true, description: 'URL of the input video file' },
                { name: 'inputFileName', type: 'string', required: true, description: 'Name of the input file' },
                { name: 'outputFormat', type: 'string', required: true, description: 'Output format (mp4, webm, mov, etc.)' },
                { name: 'outputOptions', type: 'object', required: false, description: 'Transcoding options' }
              ])}
            </section>

            <section className="api-section-margin-bottom" aria-labelledby="example-request-heading">
              <h3 id="example-request-heading" className="elegant-text-primary api-header-style">Example Request</h3>
              <CodeBlock 
                id="create-job-request" 
                language="bash"
                title="cURL"
              >
{`curl -X POST "${window.location.origin}/api/v1/jobs" \n  -H "Authorization: Bearer ak_your_api_key_here" \n  -H "Content-Type: application/json" \n  -d '{
    "inputUrl": "https://example.com/video.mp4",
    "inputFileName": "input-video.mp4",
    "outputFormat": "mp4",
    "outputOptions": {
      "videoCodec": "h264",
      "audioBitrate": "128k",
      "videoBitrate": "1000k",
      "resolutions": [
        {
          "width": 1280,
          "height": 720,
          "label": "720p"
        }
      ]
    }
  }'`}
              </CodeBlock>

              <CodeBlock 
                id="create-job-js" 
                language="javascript"
                title="JavaScript"
              >
{`const response = await fetch('${window.location.origin}/api/v1/jobs', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ak_your_api_key_here',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    inputUrl: 'https://example.com/video.mp4',
    inputFileName: 'input-video.mp4',
    outputFormat: 'mp4',
    outputOptions: {
      videoCodec: 'h264',
      audioBitrate: '128k',
      videoBitrate: '1000k',
      resolutions: [
        { width: 1280, height: 720, label: '720p' }
      ]
    }
  })
});

const job = await response.json();`}
              </CodeBlock>
            </section>

            <section aria-labelledby="response-heading">
              <h3 id="response-heading" className="elegant-text-primary api-header-style">Response</h3>
              {renderResponseCode('201', 'Job created successfully')}
              
              <CodeBlock 
                id="create-job-response" 
                language="json"
                title="Response Body"
              >
{`{
  "success": true,
  "job": {
    "id": "job_1234567890",
    "status": "pending",
    "inputUrl": "https://example.com/video.mp4",
    "inputFileName": "input-video.mp4",
    "outputFormat": "mp4",
    "createdAt": "2024-01-15T10:30:00Z",
    "estimatedDuration": "5-10 minutes"
  }
}`}
              </CodeBlock>
            </section>
          </section>
        );

      case 'get-job':
        return (
          <section aria-labelledby="get-job-endpoint-title">
            {renderEndpointHeader()}

            <section className="api-section-margin-bottom" aria-labelledby="path-parameters-heading">
              <h3 id="path-parameters-heading" className="elegant-text-primary api-header-style">Path Parameters</h3>
              {renderParameterTable([
                { name: 'id', type: 'string', required: true, description: 'The job ID returned when creating the job' }
              ])}
            </section>

            <section className="api-section-margin-bottom" aria-labelledby="example-request-heading">
              <h3 id="example-request-heading" className="elegant-text-primary api-header-style">Example Request</h3>
              <CodeBlock 
                id="get-job-request" 
                language="bash"
              >
{`curl -X GET "${window.location.origin}/api/v1/jobs/job_1234567890" \
  -H "Authorization: Bearer ak_your_api_key_here"`}
              </CodeBlock>
            </section>

            <section aria-labelledby="response-heading">
              <h3 id="response-heading" className="elegant-text-primary api-header-style">Response</h3>
              {renderResponseCode('200', 'Job retrieved successfully')}
              <CodeBlock 
                id="get-job-response" 
                language="json"
              >
{`{
  "success": true,
  "job": {
    "id": "job_1234567890",
    "status": "completed",
    "progress": 100,
    "inputUrl": "https://example.com/video.mp4",
    "inputFileName": "input-video.mp4",
    "outputFormat": "mp4",
    "createdAt": "2024-01-15T10:30:00Z",
    "completedAt": "2024-01-15T10:35:42Z",
    "outputs": [
      {
        "resolution": "720p",
        "url": "https://output.example.com/video_720p.mp4",
        "fileSize": 15728640
      }
    ]
  }
}`}
              </CodeBlock>
            </section>
          </section>
        );

      case 'authentication':        return (          <section aria-labelledby="authentication-endpoint-title">            <div className="auth-info-section">              <div className="auth-info-header">                <div className="auth-info-icon">                  <Shield size={16} />                </div>                <h2 id="authentication-endpoint-title" className="auth-info-title elegant-text-primary">                  Authentication                </h2>              </div>              <p className="auth-info-description elegant-text-secondary">                The API uses API key authentication. Include your API key in the Authorization header.              </p>            </div>            <section className="api-section-margin-bottom" aria-labelledby="auth-header-heading">              <h3 id="auth-header-heading" className="elegant-text-primary api-header-style">Authentication Header</h3>              <CodeBlock                 id="auth-header"                 language="http"              >{
`Authorization: Bearer ak_your_api_key_here`}
              </CodeBlock>            </section>            <section className="api-section-margin-bottom" aria-labelledby="get-api-key-heading">              <h3 id="get-api-key-heading" className="elegant-text-primary api-header-style">Getting Your API Key</h3>              <div className="auth-key-management-card">                <div className="auth-key-management-header">                  <Key size={20} />                  <h4 className="auth-key-management-title elegant-text-primary">                    API Key Management                  </h4>                </div>                <div className="auth-key-management-content">                  <p className="auth-key-management-description elegant-text-secondary">                    You can create and manage API keys from your account settings. Each API key has the following properties:                  </p>                  <ul className="auth-key-management-list elegant-text-secondary">                    <li>                      Unique identifier starting with <code className="auth-key-prefix">ak_</code>                    </li>                    <li>Daily rate limit of 5 requests</li>                    <li>Can be revoked at any time</li>                    <li>Should be kept secure and never exposed in client-side code</li>                  </ul>                </div>              </div>            </section>            <section aria-labelledby="example-usage-heading">              <h3 id="example-usage-heading" className="elegant-text-primary api-header-style">Example Usage</h3>              <CodeBlock                 id="auth-example"                 language="bash"              >{
`curl -X GET "${window.location.origin}/api/v1/jobs/user/123" \
  -H "Authorization: Bearer ak_your_api_key_here"`}
              </CodeBlock>            </section>          </section>        );

      case 'rate-limits':
        return (
          <section aria-labelledby="rate-limits-endpoint-title">
            <div className="auth-info-section">
              <div className="auth-info-header">
                <div className="auth-info-icon">
                  <Clock size={16} />
                </div>
                <h2 id="rate-limits-endpoint-title" className="auth-info-title elegant-text-primary">
                  Rate Limits
                </h2>
              </div>
              <p className="auth-info-description elegant-text-secondary">
                API usage is limited to ensure fair access and service reliability.
              </p>
            </div>

            <section className="api-section-margin-bottom" aria-labelledby="current-limits-heading">
              <h3 id="current-limits-heading" className="elegant-text-primary api-header-style">Current Limits</h3>
              <div className="rate-limits-grid">
                <div className="rate-limit-card">
                  <div className="rate-limit-header">
                    <Key size={18} />
                    <h4 className="rate-limit-title elegant-text-primary">
                      API Key Usage
                    </h4>
                  </div>
                  <div className="rate-limit-value">
                    5 requests/day
                  </div>
                  <p className="rate-limit-description elegant-text-secondary">
                    Per API key across all endpoints
                  </p>
                </div>
                <div className="rate-limit-card">
                  <div className="rate-limit-header">
                    <Terminal size={18} />
                    <h4 className="rate-limit-title elegant-text-primary">
                      Web Interface
                    </h4>
                  </div>
                  <div className="rate-limit-value">
                    5 requests/day
                  </div>
                  <p className="rate-limit-description elegant-text-secondary">
                    Additional requests via web interface
                  </p>
                </div>
              </div>
            </section>

            <section className="api-section-margin-bottom" aria-labelledby="rate-limit-headers-heading">
              <h3 id="rate-limit-headers-heading" className="elegant-text-primary api-header-style">Rate Limit Headers</h3>
              <p className="elegant-text-secondary api-auth-description">Every API response includes rate limit information in the headers:</p>
              <CodeBlock 
                id="rate-headers" 
                language="http"
              >
{`X-RateLimit-Limit: 5
X-RateLimit-Remaining: 3
X-RateLimit-Reset: 2024-01-16T00:00:00Z
X-RateLimit-Type: api_key`}
              </CodeBlock>
            </section>

            <section aria-labelledby="error-response-heading">
              <h3 id="error-response-heading" className="elegant-text-primary api-header-style">Error Response</h3>
              {renderResponseCode('429', 'Too Many Requests', false)}
              <CodeBlock 
                id="rate-error" 
                language="json"
              >
{`{
  "error": "API key daily limit exceeded",
  "message": "You have exceeded your daily limit of 5 requests via API keys.",
  "limits": {
    "apiKey": { "used": 5, "limit": 5 },
    "web": { "used": 2, "limit": 5 }
  },
  "resetTime": "2024-01-16T00:00:00Z"
}`}
              </CodeBlock>
            </section>
          </section>
        );

      default:
        return (
          <section aria-labelledby="endpoint-title">
            {renderEndpointHeader()}
            <div>
              <p className="elegant-text-secondary">Documentation for this endpoint is coming soon.</p>
            </div>
          </section>
        );
    }
  };

  if (isLoading) {
    return <ApiDocumentationSkeleton />;
  }

  return (
    <main className="api-documentation-container">
      {/* Header Section */}
      <header className="section-header api-documentation-header">
        <h1 className="section-title">API Documentation</h1>
        <p className="section-description">
          Complete reference for VideoFlow API with examples and interactive guides
        </p>
        
        <div className="api-documentation-search" role="search" aria-label="API endpoint search">
          <div className="search-container">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search endpoints..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input search-input"
              aria-label="Search API endpoints"
            />
          </div>
          <a
            href="https://dashboard.videoflow.com"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
            aria-label="Go to Dashboard"
          >
            <ExternalLink size={16} />
            Dashboard
          </a>
        </div>
      </header>

      <div className="api-documentation-content">
        {/* Sidebar Navigation */}
        <nav className="api-documentation-sidebar" aria-label="API Reference Navigation">
          <div className="flowing-card api-navigation-card">
            <div className="api-navigation-header">
              <div className="api-navigation-title-row">
                <BookOpen size={20} className="api-navigation-icon" />
                <h3 className="api-navigation-title">
                  API Reference
                </h3>
              </div>
              <div className="api-navigation-version">
                v1.0
              </div>
            </div>

            <nav>
              {Object.entries(sections).map(([sectionKey, section]) => {
                const Icon = section.icon;
                const sectionEndpoints = Object.entries(endpoints).filter(([, endpoint]) => endpoint.section === sectionKey);
                
                return (
                  <section key={sectionKey} className="api-navigation-section" aria-labelledby={`section-title-${sectionKey}`}>
                    <button
                      onClick={() => toggleSection(sectionKey)}
                      className="api-navigation-section-button"
                      aria-expanded={expandedSections[sectionKey]}
                      aria-controls={`endpoints-${sectionKey}`}
                      id={`section-title-${sectionKey}`}
                    >
                      <div className="api-navigation-section-title">
                        <Icon size={16} />
                        <span>{section.title}</span>
                      </div>
                      {expandedSections[sectionKey] ? <ChevronDown size={16} aria-label="Collapse section" /> : <ChevronRight size={16} aria-label="Expand section" />}
                    </button>
                    
                    {expandedSections[sectionKey] && (
                      <div id={`endpoints-${sectionKey}`} className="api-navigation-endpoints">
                        {sectionEndpoints.map(([key, endpoint]) => (
                          <button
                            key={key}
                            onClick={() => setActiveEndpoint(key)}
                            className={`api-navigation-endpoint ${activeEndpoint === key ? 'active' : ''}`}
                            aria-current={activeEndpoint === key ? 'page' : undefined}
                            aria-label={`${endpoint.title} API endpoint`}
                          >
                            {endpoint.method !== 'INFO' && <MethodBadge method={endpoint.method} />}
                            <span className="endpoint-title-nav">{endpoint.title}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}
            </nav>
          </div>
        </nav>

        {/* Main Content */}
        <article className="api-documentation-main">
          <section className="flowing-card api-content-card">
            {getEndpointContent()}
          </section>
        </article>
      </div>

    </main>
  );
};

export default ApiDocumentation;