import { useState } from 'react';
import {  
  TrendingUp, 
  Globe, 
  Key, 
  XCircle,
  RefreshCw,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import apiService from '../services/apiService';
import '../styles/UsageMetrics.css';
import '../styles/Loading.css';
import { UsageCardSkeleton, ChartCardSkeleton, PeriodSelectorSkeleton } from './skeletons';

const UsageMetrics = () => {
  const [selectedPeriod, setSelectedPeriod] = useState(30);

  // Fetch usage statistics - now focused on JOB CREATION metrics only
  const { data: usageStats, isLoading, error, refetch } = useQuery({
    queryKey: ['usageStats', selectedPeriod],
    queryFn: async () => {
      if (!apiService || typeof apiService.getUsageStats !== 'function') {
        throw new Error('API service not properly initialized');
      }
      return apiService.getUsageStats(selectedPeriod);
    },
    refetchInterval: 60000, // Refetch every minute
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const periods = [
    { label: '7 Days', value: 7 },
    { label: '30 Days', value: 30 },
    { label: '90 Days', value: 90 },
  ];

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (error) {
    return (
      <div className="empty-state">
        <div className="empty-icon">
          <XCircle size={48} />
        </div>
        <h3 className="empty-title">Error Loading Metrics</h3>
        <p className="empty-description">
          {error.message || 'Failed to load usage metrics. Please try again.'}
        </p>
        <button className="btn btn-primary" onClick={refetch}>
          <RefreshCw size={16} />
          Try Again
        </button>
      </div>
    );
  }

  // Updated to show JOB counts instead of total API calls
  const chartData = usageStats?.usage.chartData?.map(item => ({
    date: formatDate(item.date),
    fullDate: item.date,
    'API Keys': item.apiKey.count,
    'Web Interface': item.web.count,
    'Total': item.total,
    'API Success Rate': item.apiKey.successRate,
    'Web Success Rate': item.web.successRate,
    'API Avg Response Time': item.apiKey.avgResponseTime,
    'Web Avg Response Time': item.web.avgResponseTime,
  })) || [];

  const endpointData = usageStats?.usage.endpoints?.map(endpoint => ({
    name: `${endpoint._id.method} ${endpoint._id.endpoint}`,
    method: endpoint._id.method,
    endpoint: endpoint._id.endpoint,
    count: endpoint.count,
    avgResponseTime: endpoint.avgResponseTime,
    successRate: (endpoint.successRate * 100).toFixed(1),
  })) || [];

  const today = usageStats?.usage.today;
  const successRateData = today ? [
    { name: 'Used', value: today.total, fill: '#ffffff' },
    { name: 'Remaining', value: today.limits.total - today.total, fill: '#333333' },
  ] : [];

  const colors = {
    apiKey: '#ffffff',
    web: '#cccccc',
    grid: '#1f1f1f',
    text: '#ffffff'
  };

  const UsageCard = ({ icon: Icon, title, current, limit }) => {
    const percentage = (current / limit) * 100;
    const getStatusColor = () => {
      if (percentage >= 90) return 'var(--danger-color)';
      if (percentage >= 70) return 'var(--warning-color)';
      return 'var(--success-color)';
    };

    return (
      <div className="flowing-card usage-card">
        <div className="usage-card-header">
          <div className="usage-card-icon">
            <Icon size={24} />
          </div>
          <div className="usage-card-content">
            <h4 className="usage-card-title">
              {title}
            </h4>
            <p className="usage-card-subtitle">
              Daily job tracking
            </p>
          </div>
        </div>
        
        <div className="usage-card-metrics">
          <div className="usage-card-numbers">
            <span className="usage-card-current">
              {current}
            </span>
            <span className="usage-card-limit">
              / {limit}
            </span>
          </div>
          
          <div className="usage-card-progress-bar">
            <div 
              className="usage-card-progress-fill"
              style={{ 
                width: `${percentage}%`, 
                background: getStatusColor()
              }} 
            />
          </div>
          
          <div 
            className="usage-card-percentage"
            style={{ color: getStatusColor() }}
          >
            {Math.round(percentage)}% used
          </div>
        </div>
      </div>
    );
  };

  const ChartCard = ({ title, children, subtitle }) => (
    <div className="flowing-card chart-card">
      <div className="chart-card-header">
        <h3 className="chart-card-title">
          {title}
        </h3>
        {subtitle && (
          <p className="chart-card-subtitle">
            {subtitle}
          </p>
        )}
      </div>
      {children}
    </div>
  );

  if (isLoading) {
    return (
      <div className="usage-metrics-main-container">
        {/* Header Section */}
        <div className="section-header usage-metrics-section-header">
          <h1 className="section-title">Usage Metrics</h1>
          <p className="section-description">
            Monitor your API usage, job submissions, and track your daily quotas and limits
          </p>
        </div>

        <div className="usage-metrics-container">
          {/* Period Selector Skeleton */}
          <PeriodSelectorSkeleton />
          
          {/* Today's Usage Overview Skeleton */}
          <div>
            <div className="skeleton skeleton-section-title"></div>
            <div className="usage-metrics-cards-grid">
              <UsageCardSkeleton />
              <UsageCardSkeleton />
              <UsageCardSkeleton />
            </div>
          </div>

          {/* Charts Section Skeleton */}
          <div className="charts-grid">
            <ChartCardSkeleton height="300px" />
            <ChartCardSkeleton height="200px" />
          </div>

          {/* Endpoint Performance Skeleton */}
          <div className="endpoints-grid">
            <ChartCardSkeleton height="300px" />
            <ChartCardSkeleton height="300px" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="usage-metrics-main-container">
      {/* Header Section */}
      <header className="section-header usage-metrics-section-header">
        <h1 className="section-title">Usage Metrics</h1>
        <p className="section-description">
          Monitor your API usage, job submissions, and track your daily quotas and limits
        </p>
      </header>

      <div className="usage-metrics-container">
        {/* Period Selector */}
        <div className="usage-metrics-period-selector" role="group" aria-label="Select usage data period">
        {periods.map(period => (
          <button
            key={period.value}
            onClick={() => setSelectedPeriod(period.value)}
            className={`usage-metrics-period-button ${selectedPeriod === period.value ? 'active' : ''}`}
            aria-pressed={selectedPeriod === period.value}
            aria-label={`View data for ${period.label}`}
          >
            {period.label}
          </button>
        ))}
      </div>
      
      {/* Today's Usage Overview */}
      {today && (
        <section aria-labelledby="today-usage-title">
          <h2 id="today-usage-title" className="usage-metrics-section-title">
            Today's Job Usage
          </h2>
          <div className="usage-metrics-cards-grid">
            <UsageCard
              icon={Key}
              title="API Keys"
              current={today.apiKey}
              limit={today.limits.apiKey}
            />
            <UsageCard
              icon={Globe}
              title="Web Interface"
              current={today.web}
              limit={today.limits.web}
            />
            <UsageCard
              icon={TrendingUp}
              title="Total Jobs"
              current={today.total}
              limit={today.limits.total}
            />
          </div>
        </section>
      )}

      {/* Charts Section */}
      <section className="charts-grid" aria-labelledby="charts-section-title">
        <h2 id="charts-section-title" className="visually-hidden">Usage Charts</h2>
        
        {/* Usage Over Time */}
        {chartData.length > 0 && (
          <ChartCard 
            title="Job Submission Trends" 
            subtitle="Job volume over the selected period"
          >
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                  <XAxis 
                    dataKey="date" 
                    stroke={colors.text}
                    fontSize={12}
                  />
                  <YAxis 
                    stroke={colors.text}
                    fontSize={12}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: '#000000', 
                      border: '1px solid #1f1f1f',
                      borderRadius: '8px',
                      color: '#ffffff'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="API Keys" 
                    stroke={colors.apiKey}
                    strokeWidth={3}
                    dot={{ r: 5, fill: colors.apiKey }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="Web Interface" 
                    stroke={colors.web}
                    strokeWidth={3}
                    dot={{ r: 5, fill: colors.web }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        )}

        {/* Daily Quota Visualization */}
        {today && (
          <ChartCard 
            title="Daily Job Quota" 
            subtitle="Current job usage vs available quota"
          >
            <div className="quota-chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={successRateData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {successRateData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      background: '#000000', 
                      border: '1px solid #1f1f1f',
                      borderRadius: '8px',
                      color: '#ffffff'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="quota-summary">
              <div className="quota-numbers">
                {today.total}/{today.limits.total}
              </div>
              <div className="quota-label">
                Jobs submitted today
              </div>
            </div>
          </ChartCard>
        )}

      </section>

      {/* Endpoint Performance */}
      {endpointData.length > 0 && (
        <section className="endpoints-grid" aria-labelledby="endpoint-performance-section-title">
          <h2 id="endpoint-performance-section-title" className="visually-hidden">Endpoint Performance</h2>
          
          {/* Endpoint Usage Chart */}
          <ChartCard 
            title="Popular Endpoints" 
            subtitle="Most frequently accessed API endpoints"
          >
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={endpointData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                  <XAxis 
                    dataKey="endpoint" 
                    angle={-45} 
                    textAnchor="end" 
                    height={80}
                    stroke={colors.text}
                    fontSize={11}
                  />
                  <YAxis 
                    stroke={colors.text}
                    fontSize={12}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      background: '#000000', 
                      border: '1px solid #1f1f1f',
                      borderRadius: '8px',
                      color: '#ffffff'
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill={colors.apiKey}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Performance Table */}
          <ChartCard 
            title="Endpoint Performance" 
            subtitle="Success rates and response times"
          >
            <div className="performance-table-container">
              <table className="performance-table" aria-label="API Endpoint Performance Data">
                <thead>
                  <tr>
                    <th scope="col">
                      Endpoint
                    </th>
                    <th scope="col" className="right">
                      Count
                    </th>
                    <th scope="col" className="right">
                      Success
                    </th>
                    <th scope="col" className="right">
                      Avg Time
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {endpointData.map((endpoint, index) => (
                    <tr key={index}>
                      <td>
                        <div className="endpoint-method">
                          <span className={`method-badge ${endpoint.method.toLowerCase()}`}>
                            {endpoint.method}
                          </span>
                          <span className="endpoint-path">
                            {endpoint.endpoint}
                          </span>
                        </div>
                      </td>
                      <td className="right">
                        {endpoint.count}
                      </td>
                      <td className={`right ${
                        parseFloat(endpoint.successRate) >= 95 ? 'success-rate-high' : 
                        parseFloat(endpoint.successRate) >= 90 ? 'success-rate-medium' : 'success-rate-low'
                      }`}>
                        {endpoint.successRate}%
                      </td>
                      <td className="right response-time">
                        {endpoint.avgResponseTime}ms
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>

        </section>
      )}

      </div>
    </main>
  );
};

export default UsageMetrics;