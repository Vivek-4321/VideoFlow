import { useState } from 'react';
import { 
  Key, 
  Plus, 
  Copy, 
  Trash2, 
  RefreshCw, 
  Eye, 
  EyeOff,
  Calendar,
  Activity,
  AlertCircle,
  User,
  BarChart3,
  Clock,
  Check,
  X
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToastStore } from '../store/useToastStore';
import apiService from '../services/apiService';
import '../styles/Loading.css';
import '../styles/ApiKeyManagement.css';
import { RateLimitCardSkeleton, ApiKeyListSkeleton } from './skeletons';

const ApiKeyManagement = () => {
  const [newKeyName, setNewKeyName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState(new Set());
  const [copiedKey, setCopiedKey] = useState(null);
  
  const { addToast } = useToastStore();
  const queryClient = useQueryClient();

  // Fetch API keys
  const { data: apiKeysResponse, isLoading, error } = useQuery({
    queryKey: ['apiKeys'],
    queryFn: async () => {
      if (!apiService || typeof apiService.getApiKeys !== 'function') {
        throw new Error('API service not properly initialized');
      }
      return apiService.getApiKeys();
    },
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Safely extract API keys array
  const apiKeys = Array.isArray(apiKeysResponse?.apiKeys) ? apiKeysResponse.apiKeys : 
                  Array.isArray(apiKeysResponse?.data) ? apiKeysResponse.data : 
                  Array.isArray(apiKeysResponse) ? apiKeysResponse : [];

  // Create API key mutation
  const createKeyMutation = useMutation({
    mutationFn: (data) => {
      if (!apiService || typeof apiService.createApiKey !== 'function') {
        throw new Error('API service not properly initialized');
      }
      return apiService.createApiKey(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['apiKeys']);
      setNewKeyName('');
      setShowCreateForm(false);
      addToast('API key created successfully', 'success');
      
      // Auto-copy the new key to clipboard
      navigator.clipboard.writeText(data.apiKey.key);
      setCopiedKey(data.apiKey.key);
      setTimeout(() => setCopiedKey(null), 3000);
    },
    onError: (error) => {
      addToast(error.message || 'Failed to create API key', 'error');
    },
  });

  // Delete API key mutation
  const deleteKeyMutation = useMutation({
    mutationFn: (keyId) => {
      if (!apiService || typeof apiService.deleteApiKey !== 'function') {
        throw new Error('API service not properly initialized');
      }
      return apiService.deleteApiKey(keyId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['apiKeys']);
      addToast('API key deleted successfully', 'success');
    },
    onError: (error) => {
      addToast(error.message || 'Failed to delete API key', 'error');
    },
  });

  // Regenerate API key mutation
  const regenerateKeyMutation = useMutation({
    mutationFn: (keyId) => {
      if (!apiService || typeof apiService.regenerateApiKey !== 'function') {
        throw new Error('API service not properly initialized');
      }
      return apiService.regenerateApiKey(keyId);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['apiKeys']);
      addToast('API key regenerated successfully', 'success');
      
      // Auto-copy the regenerated key to clipboard
      navigator.clipboard.writeText(data.apiKey.key);
      setCopiedKey(data.apiKey.key);
      setTimeout(() => setCopiedKey(null), 3000);
    },
    onError: (error) => {
      addToast(error.message || 'Failed to regenerate API key', 'error');
    },
  });

  const handleCreateKey = (e) => {
    e.preventDefault();
    if (!newKeyName.trim()) {
      addToast('Please enter a name for the API key', 'error');
      return;
    }
    
    console.log('Creating API key with name:', newKeyName.trim());
    addToast('Creating API key...', 'info');
    createKeyMutation.mutate({ name: newKeyName.trim() });
  };

  const handleDeleteKey = (keyId, keyName) => {
    if (window.confirm(`Are you sure you want to delete the API key "${keyName}"? This action cannot be undone.`)) {
      deleteKeyMutation.mutate(keyId);
    }
  };

  const handleRegenerateKey = (keyId, keyName) => {
    if (window.confirm(`Are you sure you want to regenerate the API key "${keyName}"? The old key will stop working immediately.`)) {
      regenerateKeyMutation.mutate(keyId);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    addToast('Copied to clipboard', 'success');
    setTimeout(() => setCopiedKey(null), 3000);
  };

  const toggleKeyVisibility = (keyId) => {
    const newVisible = new Set(visibleKeys);
    if (newVisible.has(keyId)) {
      newVisible.delete(keyId);
    } else {
      newVisible.add(keyId);
    }
    setVisibleKeys(newVisible);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const RateLimitCard = ({ icon: Icon, title, description }) => (
    <article className="flowing-card rate-limit-card">
      <div className="rate-limit-icon">
        <Icon size={24} />
      </div>
      <h4 className="rate-limit-title">
        {title}
      </h4>
      <p className="rate-limit-description">
        {description}
      </p>
    </article>
  );

  const ApiKeyCard = ({ apiKey }) => {
    const isVisible = visibleKeys.has(apiKey.id);
    const isCopied = copiedKey === apiKey.key;

    return (
      <article className="flowing-card api-key-card" aria-labelledby={`api-key-name-${apiKey.id}`}>
        <header className="api-key-card-header">
          <div className="api-key-card-info">
            <div className="api-key-icon">
              <Key size={24} />
            </div>
            <div className="api-key-details">
              <h4 id={`api-key-name-${apiKey.id}`} className="api-key-name">
                {apiKey.name}
              </h4>
              <div className="api-key-meta">
                {apiKey.usageCount > 0 && (
                  <div className="api-key-meta-item">
                    <Activity size={14} />
                    <span>{apiKey.usageCount} uses</span>
                  </div>
                )}
                <div className="api-key-meta-item">
                  <Calendar size={14} />
                  <span>Created {formatDate(apiKey.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="api-key-actions">
            <button
              onClick={() => handleRegenerateKey(apiKey.id, apiKey.name)}
              disabled={regenerateKeyMutation.isPending}
              className="btn btn-sm api-key-regenerate-btn"
              title="Regenerate key"
              aria-label={`Regenerate API key ${apiKey.name}`}
            >
              <RefreshCw size={14} className={regenerateKeyMutation.isPending ? 'animate-spin' : ''} />
              <span>Regenerate</span>
            </button>
            <button
              onClick={() => handleDeleteKey(apiKey.id, apiKey.name)}
              disabled={deleteKeyMutation.isPending}
              className="btn btn-sm btn-danger api-key-delete-btn"
              title="Delete key"
              aria-label={`Delete API key ${apiKey.name}`}
            >
              <Trash2 size={14} />
              <span>Delete</span>
            </button>
          </div>
        </header>

        <div className="api-key-display">
          <div className="api-key-display-header">
            <code className="api-key-code">
              {isVisible ? apiKey.key : `ak_****${apiKey.keyId}`}
            </code>
            
            <div className="api-key-display-actions">
              <button
                onClick={() => toggleKeyVisibility(apiKey.id)}
                className="btn btn-sm api-key-visibility-btn"
                title={isVisible ? 'Hide key' : 'Show key'}
                aria-label={isVisible ? `Hide API key ${apiKey.name}` : `Show API key ${apiKey.name}`}
              >
                {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              <button
                onClick={() => copyToClipboard(apiKey.key)}
                className={`btn btn-sm api-key-copy-btn ${isCopied ? 'copied' : ''}`}
                title="Copy to clipboard"
                aria-label={`Copy API key ${apiKey.name} to clipboard`}
              >
                {isCopied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>
          
          {apiKey.lastUsed && (
            <div className="api-key-last-used">
              <Clock size={14} />
              <span>Last used {formatDate(apiKey.lastUsed)}</span>
            </div>
          )}
        </div>
      </article>
    );
  };

  if (error) {
    return (
      <div className="empty-state">
        <div className="empty-icon">
          <AlertCircle size={48} />
        </div>
        <h3 className="empty-title">Error Loading API Keys</h3>
        <p className="empty-description">
          {error.message === 'Unauthorized: Invalid token' ? 
            'Please refresh the page and sign in again' :
            error.message || 'An error occurred while fetching your API keys'
          }
        </p>
        <button 
          onClick={() => window.location.reload()} 
          className="btn btn-primary"
        >
          <RefreshCw size={16} />
          Refresh Page
        </button>
      </div>
    );
  }

  return (
    <main className="api-key-management">
      {/* Header Section */}
      <header className="section-header api-section-header">
        <h1 className="section-title">API Key Management</h1>
        <p className="section-description">
          Create and manage API keys to access your transcoding services programmatically
        </p>
        
        <div className="api-create-button-container">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="btn btn-primary btn-large"
            aria-label="Create New API Key"
          >
            <Plus size={20} />
            <span>Create New API Key</span>
          </button>
        </div>
      </header>

      {/* Rate Limits Information */}
      <section className="rate-limits-section" aria-labelledby="rate-limits-title">
        <h2 id="rate-limits-title" className="rate-limits-title">
          Rate Limits & Usage
        </h2>
        <div className="rate-limits-grid">
          {isLoading ? (
            <>
              <RateLimitCardSkeleton />
              <RateLimitCardSkeleton />
              <RateLimitCardSkeleton />
            </>
          ) : (
            <>
              <RateLimitCard
                icon={Key}
                title="API Keys"
                description="5 requests per day per API key"
                type="api"
                aria-label="API Keys Rate Limit"
              />
              <RateLimitCard
                icon={User}
                title="Web Interface"
                description="5 additional requests per day via web"
                type="web"
                aria-label="Web Interface Rate Limit"
              />
              <RateLimitCard
                icon={BarChart3}
                title="Total Daily Limit"
                description="10 requests per account maximum"
                type="total"
                aria-label="Total Daily Rate Limit"
              />
            </>
          )}
        </div>
      </section>

      {/* Create Form */}
      {showCreateForm && (
        <section className="flowing-card create-form-card" aria-label="Create New API Key Form">
          <div className="create-form-header">
            <div className="create-form-header-info">
              <div className="create-form-icon">
                <Plus size={20} />
              </div>
              <div>
                <h3 className="create-form-title">
                  Create New API Key
                </h3>
                <p className="create-form-subtitle">
                  Generate a new API key for programmatic access
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateForm(false)}
              className="btn btn-sm create-form-close-btn"
              aria-label="Close create API key form"
            >
              <X size={16} />
            </button>
          </div>
          
          <form onSubmit={handleCreateKey}>
            <div className="create-form-input-group">
              <label className="form-label" htmlFor="keyName">
                API Key Name
              </label>
              <input
                type="text"
                id="keyName"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g., Production App, Development Environment"
                className="form-input create-form-input"
                maxLength={100}
                aria-label="API Key Name"
              />
              <p className="form-hint">
                Choose a descriptive name to help you identify this key later
              </p>
            </div>
            
            <div className="create-form-actions">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="btn btn-secondary"
                aria-label="Cancel API key creation"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createKeyMutation.isPending}
                className="btn btn-primary"
                aria-label={createKeyMutation.isPending ? "Creating API key" : "Create API Key"}
              >
                {createKeyMutation.isPending ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    <span>Create Key</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* API Keys List */}
      <section aria-labelledby="api-keys-list-title">
        {isLoading ? (
          <ApiKeyListSkeleton />
        ) : (
          <>
            <div className="api-keys-list-header">
              <h2 id="api-keys-list-title" className="api-keys-list-title">
                Your API Keys
              </h2>
              <div className="api-keys-count-badge">
                {apiKeys.length} key{apiKeys.length !== 1 ? 's' : ''}
              </div>
            </div>
            
            {apiKeys.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <Key size={48} />
                </div>
                <h3 className="empty-title">No API Keys Yet</h3>
                <p className="empty-description">
                  Create your first API key to start using our transcoding API programmatically
                </p>
                <button 
                  onClick={() => setShowCreateForm(true)}
                  className="btn btn-primary"
                  aria-label="Create First API Key"
                >
                  <Plus size={16} />
                  Create First API Key
                </button>
              </div>
            ) : (
              <div>
                {apiKeys.map((apiKey) => (
                  <ApiKeyCard key={apiKey.id} apiKey={apiKey} />
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* Copy notification */}
      {copiedKey && (
        <div className="copy-notification" role="status" aria-live="polite">
          <Check size={16} />
          <span>API key copied to clipboard!</span>
        </div>
      )}

    </main>
  );
};

export default ApiKeyManagement;