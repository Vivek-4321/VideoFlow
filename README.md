# VideoFlow

<div align="center">
  <h3>Video Transcoding Platform</h3>
  <p>A cloud-based video processing service with real-time monitoring, transcoding capabilities, and scalable architecture.</p>
  
  ![License](https://img.shields.io/badge/license-MIT-blue.svg)
  ![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
  ![React](https://img.shields.io/badge/react-19.x-61dafb.svg)
  ![MongoDB](https://img.shields.io/badge/MongoDB-47A248.svg?&logo=mongodb&logoColor=white)
  ![Redis](https://img.shields.io/badge/redis-%23DD0031.svg?&logo=redis&logoColor=white)
  ![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?&logo=docker&logoColor=white)
  ![FFmpeg](https://img.shields.io/badge/FFmpeg-007808.svg?&logo=ffmpeg&logoColor=white)
  
  [Features](#-features) • [Architecture](#-architecture) • [Quick Start](#-quick-start) • [API Docs](#-api-documentation) • [Deployment](#-deployment)
</div>

---

## 🚀 Features

### 🎬 **Video Processing**
- **Multi-Format Support**: MP4, WebM, MOV, AVI, MKV, HLS, DASH
- **Quality Preservation**: Smart codec selection with "preserve original" mode
- **Multi-Resolution Output**: Adaptive bitrate streaming with custom resolutions
- **Multi-Codec Support**: H.264, H.265, VP8, VP9, AV1 codecs with CRF controls
- **Video Filters**: Crop, watermark overlay with opacity control
- **Audio Extraction**: Separate audio file generation

### 🖼️ **Smart Thumbnail Generation**
- **Multi-Mode Support**: Interval-based, custom timestamps, or both
- **Sprite Sheets**: Automatic generation for video players
- **WebVTT Files**: Timeline metadata for video scrubbing
- **Custom Thumbnails**: User-specified timestamp extraction

### ⚡ **Real-Time Processing**
- **WebSocket Integration**: Live progress updates via Socket.IO
- **Queue Management**: Redis + BullMQ with retry logic and monitoring
- **Phase-Based Progress**: Dynamic progress tracking based on job complexity
- **Auto-Reconnection**: Client-side reconnection with exponential backoff

### 🔐 **Dual Authentication System**
- **Aethercure Integration**: OAuth2 flow with Google authentication
- **API Key Management**: SHA-256 hashed keys with rate limiting
- **Usage Analytics**: Comprehensive API usage tracking
- **Security Headers**: Helmet.js with CORS configuration

### 📊 **Additional Features**
- **Bull Board Integration**: Queue monitoring and management
- **Comprehensive Logging**: Winston-based structured logging
- **Health Monitoring**: System health checks for all services
- **Automatic Cleanup**: 1-hour TTL for processed files
- **Graceful Shutdown**: Proper resource cleanup on termination

---

## 🏗️ Architecture

### **System Overview**

VideoFlow employs a modern **monolithic architecture** with distributed processing capabilities, designed for high-throughput video transcoding with reliable performance.

```mermaid
graph TB
    subgraph "Client Layer"
        UI[React Frontend<br/>Vite • Socket.IO Client]
        UI -->|HTTP + WebSocket| API
    end
    
    subgraph "API Gateway"
        API[Express.js Server<br/>Port 3000]
        API --> AUTH[Dual Authentication<br/>Aethercure + API Keys]
        API --> RATE[Rate Limiting<br/>Express Rate Limit]
        API --> VAL[Input Validation<br/>Joi Schemas]
    end
    
    subgraph "Application Layer"
        CTRL[Controllers<br/>Request Handlers]
        SERV[Services<br/>Business Logic]
        QUEUE[BullMQ Queue<br/>Job Processing]
        WS[WebSocket Service<br/>Real-time Updates]
    end
    
    subgraph "Processing Layer"
        DOCKER[Docker Container<br/>FFmpeg Engine]
        THUMB[Thumbnail Service<br/>Image Generation]
        UPLOAD[Firebase Storage<br/>File Management]
    end
    
    subgraph "Data Layer"
        MONGO[(MongoDB<br/>Job & User Data)]
        REDIS[(Redis<br/>Queue Backend)]
        STORAGE[(Firebase Storage<br/>File Assets)]
    end
    
    API --> CTRL
    CTRL --> SERV
    SERV --> QUEUE
    SERV --> WS
    QUEUE --> DOCKER
    DOCKER --> THUMB
    THUMB --> UPLOAD
    SERV --> MONGO
    QUEUE --> REDIS
    UPLOAD --> STORAGE
    
    classDef clientLayer fill:#e1f5fe
    classDef apiLayer fill:#f3e5f5
    classDef appLayer fill:#e8f5e8
    classDef processLayer fill:#fff3e0
    classDef dataLayer fill:#ffebee
    
    class UI clientLayer
    class API,AUTH,RATE,VAL apiLayer
    class CTRL,SERV,QUEUE,WS appLayer
    class DOCKER,THUMB,UPLOAD processLayer
    class MONGO,REDIS,STORAGE dataLayer
```

### **Technology Stack**

| **Layer** | **Technology** | **Purpose** | **Key Features** |
|-----------|---------------|-------------|------------------|
| **Frontend** | React 19 + Vite | Modern UI with hot reload | WebSocket integration, responsive design |
| **Backend** | Node.js + Express | RESTful API server | Modular architecture, middleware pipeline |
| **Database** | MongoDB + Mongoose | Document storage & ODM | Flexible schema, built-in validation |
| **Queue** | Redis + BullMQ | Background job processing | Retry logic, job priorities, monitoring |
| **Storage** | Firebase Storage | Cloud file storage | Secure uploads, automatic cleanup |
| **Processing** | FFmpeg + Docker | Video transcoding engine | Containerized isolation, 100+ codecs |
| **Auth** | Aethercure + JWT | Authentication system | OAuth2, API keys, rate limiting |
| **Monitoring** | Winston + Bull Board | Logging & queue visualization | Structured logs, real-time monitoring |

### **Data Flow Architecture**

#### **Request Processing Pipeline**
```
Client Request → CORS & Security → Authentication → Rate Limiting → 
Input Validation → Controller Logic → Service Layer → Database/Queue
```

#### **Video Processing Pipeline**
```
File Upload → Download → Metadata Analysis → Transcoding → 
Thumbnail Generation → Storage Upload → Cleanup → WebSocket Notification
```

#### **Progress Tracking System**
```javascript
const progressPhases = {
  download: "2-5%",      // Based on file size
  metadata: "1%",        // Video analysis
  watermark: "1%",       // Conditional processing
  transcoding: "40-85%", // Complexity dependent
  thumbnails: "8-15%",   // Count dependent
  audio: "5%",           // Conditional extraction
  upload: "5-15%",       // Output size dependent
  finalization: "2%"     // Cleanup operations
}
```

### **Core Components**

#### **Job Processing Engine**
- **Worker Pool**: Configurable concurrency (default: 3 workers)
- **Retry Logic**: 3 attempts with exponential backoff
- **Job Lifecycle**: pending → processing → completed/failed
- **Cleanup**: Automatic removal of completed jobs (10 kept, 20 failed)

#### **Authentication & Security**
- **Dual Auth**: Aethercure OAuth2 + API Key system
- **Rate Limiting**: Configurable per-endpoint limits
- **Input Validation**: Joi schema validation
- **Security Headers**: Helmet.js configuration

#### **File Management**
- **Upload**: Firebase Storage with resumable uploads
- **Processing**: Local filesystem during transcoding
- **Cleanup**: Automatic removal after 1-hour TTL
- **Storage**: Permanent cloud storage for outputs

---

## 🚀 Quick Start

### **Prerequisites**
- Node.js 18+ with npm
- Docker and Docker Compose
- MongoDB instance
- Redis instance
- Firebase project with Storage enabled

### **Installation**

#### **1. Clone Repository**
```bash
git clone https://github.com/Vivek-4321/VideoFlow.git
cd VideoFlow
```

#### **2. Install Dependencies**
```bash
# Install root dependencies
npm install

# Install client dependencies
cd client && npm install && cd ..

# Install server dependencies
cd server && npm install && cd ..
```

#### **3. Environment Configuration**

**Server Environment** (`server/.env`):
```bash
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/videoflow

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
FIREBASE_STORAGE_BUCKET=your-bucket.appspot.com

# Authentication
AETHERCURE_CLIENT_ID=your-aethercure-client-id
AETHERCURE_CLIENT_SECRET=your-aethercure-client-secret
JWT_SECRET=your-jwt-secret-key

# Server Configuration
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
WORKER_CONCURRENCY=3
```

**Client Environment** (`client/.env`):
```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:3000
VITE_WEBSOCKET_URL=http://localhost:3000

# Authentication
VITE_AETHERCURE_CLIENT_ID=your-aethercure-client-id
VITE_AETHERCURE_DOMAIN=your-aethercure-domain

# Firebase Configuration
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-bucket.appspot.com
```

#### **4. Start Services**

**Option A: Development Mode**
```bash
# Start backend server
npm run dev:server

# Start frontend client (in another terminal)
npm run dev:client
```

**Option B: Docker Compose**
```bash
# Start all services
docker-compose up --build

# Access applications
# Frontend: http://localhost:5173
# Backend: http://localhost:3000
# Bull Board: http://localhost:3001
```

### **Quick Test**
```bash
# Test server health
curl http://localhost:3000/api/v1/health

# Test client access
open http://localhost:5173
```

---

## 📖 API Documentation

### **Authentication**

#### **API Key Authentication**
```bash
# Headers
Authorization: Bearer ak_your_api_key_here
Content-Type: application/json
```

#### **OAuth2 Authentication**
```bash
# Headers  
Authorization: Bearer jwt_token_here
Content-Type: application/json
```

### **Core Endpoints**

#### **📝 Job Management**

**Create Transcoding Job**
```bash
POST /api/v1/jobs
Content-Type: application/json

{
  "inputUrl": "https://example.com/video.mp4",
  "outputFormat": "mp4",
  "outputOptions": {
    "preserveOriginal": false,
    "resolutions": [
      { "width": 1920, "height": 1080, "label": "1080p" },
      { "width": 1280, "height": 720, "label": "720p" }
    ],
    "videoCodec": "h264",
    "audioCodec": "aac",
    "crop": {
      "x": 0,
      "y": 0,
      "width": 1920,
      "height": 1080
    },
    "watermark": {
      "imageUrl": "https://example.com/watermark.png",
      "position": "bottom-right",
      "opacity": 0.7,
      "scale": 0.1
    },
    "thumbnails": {
      "enabled": true,
      "mode": "both",
      "interval": 30,
      "customTimestamps": ["00:00:10", "00:01:30", "00:02:45"],
      "generateSprite": true,
      "generateVTT": true
    }
  }
}
```

**Get Job Status**
```bash
GET /api/v1/jobs/{jobId}

Response:
{
  "success": true,
  "job": {
    "id": "job_123",
    "status": "processing",
    "progress": 65,
    "inputUrl": "https://example.com/video.mp4",
    "outputUrls": [
      {
        "resolution": "1080p",
        "url": "https://storage.googleapis.com/output_1080p.mp4"
      }
    ],
    "thumbnailUrls": {
      "individual": ["https://storage.googleapis.com/thumb_1.jpg"],
      "sprite": "https://storage.googleapis.com/sprite.jpg",
      "vtt": "https://storage.googleapis.com/timeline.vtt"
    },
    "createdAt": "2024-01-15T10:30:00Z",
    "completedAt": null,
    "expiresAt": "2024-01-15T12:30:00Z"
  }
}
```

**List User Jobs**
```bash
GET /api/v1/jobs?page=1&limit=10&status=completed&sort=createdAt

Response:
{
  "success": true,
  "jobs": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "pages": 5
  }
}
```

**Cancel Job**
```bash
DELETE /api/v1/jobs/{jobId}

Response:
{
  "success": true,
  "message": "Job cancelled successfully"
}
```

#### **🔑 API Key Management**

**Create API Key**
```bash
POST /api/v1/api-keys
Content-Type: application/json

{
  "name": "My Application Key"
}

Response:
{
  "success": true,
  "apiKey": {
    "id": "ak_1234567890abcdef",
    "name": "My Application Key",
    "key": "ak_1234567890abcdef1234567890abcdef",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

**List API Keys**
```bash
GET /api/v1/api-keys

Response:
{
  "success": true,
  "apiKeys": [
    {
      "id": "ak_123",
      "name": "My Application Key",
      "lastUsed": "2024-01-15T10:30:00Z",
      "usageCount": 150,
      "isActive": true
    }
  ]
}
```

#### **📊 Usage Analytics**

**Get Usage Statistics**
```bash
GET /api/v1/usage?period=7d&groupBy=day

Response:
{
  "success": true,
  "usage": {
    "totalRequests": 1250,
    "totalJobs": 89,
    "avgResponseTime": 145,
    "successRate": 98.4,
    "breakdown": [
      {
        "date": "2024-01-15",
        "requests": 180,
        "jobs": 12,
        "avgResponseTime": 156
      }
    ]
  }
}
```

#### **🏥 Health Monitoring**

**System Health Check**
```bash
GET /api/v1/health

Response:
{
  "success": true,
  "status": "healthy",
  "checks": {
    "database": "connected",
    "redis": "connected",
    "workers": "3/3 active",
    "storage": "accessible",
    "queue": "processing"
  },
  "uptime": "2 days, 14 hours, 32 minutes"
}
```

### **WebSocket Events**

#### **Connection**
```javascript
const socket = io('http://localhost:3000');

// Join user room
socket.emit('join-room', { userId: 'user123' });
```

#### **Job Events**
```javascript
// Listen for job updates
socket.on('job-created', (data) => {
  console.log('New job created:', data.jobId);
});

socket.on('job-progress', (data) => {
  console.log(`Job ${data.jobId}: ${data.progress}%`);
});

socket.on('job-completed', (data) => {
  console.log('Job completed:', data.jobId);
  console.log('Output URLs:', data.outputUrls);
});

socket.on('job-failed', (data) => {
  console.log('Job failed:', data.jobId);
  console.log('Error:', data.error);
});
```

---

## 🚀 Deployment

### **Docker Deployment**

#### **Production Docker Compose**
```yaml
version: '3.8'

services:
  app:
    build: .
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongodb:27017/videoflow
      - REDIS_HOST=redis
    depends_on:
      - mongodb
      - redis
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs
    ports:
      - "3000:3000"

  mongodb:
    image: mongo:7
    volumes:
      - mongodb_data:/data/db
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  mongodb_data:
  redis_data:
```

#### **Build and Deploy**
```bash
# Build production image
docker build -t videoflow:latest .

# Deploy with compose
docker-compose -f docker-compose.prod.yml up -d

# Monitor logs
docker-compose logs -f app
```

### **Cloud Deployment**

#### **Environment Variables**
```bash
# Required Production Variables
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/videoflow
REDIS_HOST=redis.example.com
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=service-account@project.iam.gserviceaccount.com
FIREBASE_STORAGE_BUCKET=your-bucket.appspot.com

# Authentication
AETHERCURE_CLIENT_ID=your-client-id
AETHERCURE_CLIENT_SECRET=your-client-secret
JWT_SECRET=your-production-jwt-secret

# Performance
WORKER_CONCURRENCY=5
MAX_UPLOAD_SIZE=100mb
```

#### **Scaling Configuration**
```bash
# Horizontal scaling
WORKER_CONCURRENCY=10        # Increase worker count
REDIS_CLUSTER_MODE=true      # Enable Redis cluster
MONGODB_REPLICA_SET=rs0      # Use replica set

# Performance optimization
NODE_OPTIONS="--max-old-space-size=4096"
UV_THREADPOOL_SIZE=16
```

---

## 🛠️ Development

### **Project Structure**
```
VideoFlow/
├── client/                          # React Frontend
│   ├── src/
│   │   ├── components/              # React Components
│   │   │   ├── Auth.jsx             # Authentication
│   │   │   ├── Dashboard.jsx        # Main Dashboard
│   │   │   ├── TranscodeSection.jsx # Video Processing
│   │   │   └── skeletons/           # Loading States
│   │   ├── hooks/                   # Custom Hooks
│   │   │   ├── useApi.js            # API Hook
│   │   │   ├── useDashboard.jsx     # Dashboard Logic
│   │   │   └── useTheme.jsx         # Theme Management
│   │   ├── services/                # API Services
│   │   │   ├── apiService.js        # HTTP Client
│   │   │   ├── authService.js       # Authentication
│   │   │   ├── uploadService.js     # File Upload
│   │   │   └── websocketService.js  # WebSocket Client
│   │   ├── store/                   # State Management
│   │   │   ├── useAppStore.js       # Global State
│   │   │   └── useToastStore.js     # Toast Notifications
│   │   └── styles/                  # CSS Modules
│   └── package.json
│
├── server/                          # Node.js Backend
│   ├── config/                      # Configuration
│   │   ├── db.js                    # Database Connection
│   │   └── firebase.js              # Firebase Setup
│   ├── controllers/                 # Request Handlers
│   │   ├── jobController.js         # Job Management
│   │   ├── queueController.js       # Queue Operations
│   │   ├── apiKeyController.js      # API Key Management
│   │   └── healthController.js      # Health Checks
│   ├── middleware/                  # Express Middleware
│   │   ├── auth.js                  # Authentication
│   │   ├── rateLimiter.js           # Rate Limiting
│   │   └── validator.js             # Input Validation
│   ├── models/                      # Database Models
│   │   ├── job.js                   # Job Schema
│   │   ├── apiKey.js                # API Key Schema
│   │   └── apiUsage.js              # Usage Analytics
│   ├── routes/                      # API Routes
│   │   ├── jobRoutes.js             # Job Endpoints
│   │   ├── queueRoutes.js           # Queue Endpoints
│   │   └── apiKeyRoutes.js          # API Key Endpoints
│   ├── services/                    # Business Logic
│   │   ├── jobProcessingService.js  # Job Processing
│   │   ├── transcoder.js            # Video Transcoding
│   │   ├── thumbnailService.js      # Thumbnail Generation
│   │   ├── storage.js               # File Storage
│   │   └── websocketService.js      # WebSocket Server
│   ├── utils/                       # Utilities
│   │   ├── logger.js                # Logging
│   │   ├── ffmpeg.js                # FFmpeg Utils
│   │   └── docker.js                # Docker Utils
│   └── server.js                    # Entry Point
│
├── docker-compose.yml               # Docker Configuration
├── .gitignore                       # Git Ignore Rules
├── package.json                     # Root Dependencies
└── README.md                        # Documentation
```

### **Development Commands**
```bash
# Start development servers
npm run dev:server    # Backend with nodemon
npm run dev:client    # Frontend with hot reload
npm run dev:both      # Both servers concurrently

# Testing
npm run test:server   # Backend tests
npm run test:client   # Frontend tests
npm run test:e2e      # End-to-end tests

# Code Quality
npm run lint          # ESLint check
npm run lint:fix      # Fix linting issues
npm run format        # Prettier formatting

# Database
npm run db:migrate    # Run migrations
npm run db:seed       # Seed sample data
npm run db:reset      # Reset database
```

### **Adding New Features**

#### **Backend Controller**
```javascript
// controllers/newController.js
class NewController {
  constructor(dependencies) {
    this.service = dependencies.service;
  }

  async handleRequest(req, res) {
    try {
      const result = await this.service.process(req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = NewController;
```

#### **Frontend Component**
```jsx
// components/NewComponent.jsx
import { useState, useEffect } from 'react';
import { useApi } from '../hooks/useApi';

const NewComponent = () => {
  const [data, setData] = useState(null);
  const { request } = useApi();

  useEffect(() => {
    const fetchData = async () => {
      const result = await request('/api/v1/new-endpoint');
      setData(result);
    };
    fetchData();
  }, []);

  return (
    <div className="new-component">
      {data ? <DataDisplay data={data} /> : <LoadingSkeleton />}
    </div>
  );
};

export default NewComponent;
```

---

## 🤝 Contributing

### **Development Setup**
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Install dependencies: `npm install`
4. Start development servers: `npm run dev:both`
5. Make your changes
6. Write tests for new functionality
7. Run tests: `npm test`
8. Commit changes: `git commit -m 'Add amazing feature'`
9. Push to branch: `git push origin feature/amazing-feature`
10. Submit a Pull Request

### **Code Style**
- Follow ESLint configuration
- Use Prettier for formatting
- Write descriptive commit messages
- Add JSDoc comments for functions
- Include unit tests for new features

### **Pull Request Guidelines**
- Include description of changes
- Link to related issues
- Ensure all tests pass
- Update documentation if needed
- Add screenshots for UI changes

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [FFmpeg](https://ffmpeg.org/) - Video processing engine
- [Bull](https://github.com/OptimalBits/bull) - Redis-based queue
- [Socket.IO](https://socket.io/) - Real-time communication
- [Firebase](https://firebase.google.com/) - Authentication & Storage
- [React](https://reactjs.org/) - Frontend framework

---

<div align="center">
  <h3>🎬 VideoFlow - Video Transcoding Platform</h3>
  <p>Built with ❤️ for the developer community</p>
  
  [Website](https://videoflow.example.com) • [Documentation](https://docs.videoflow.example.com) • [Support](https://github.com/Vivek-4321/VideoFlow/issues)
</div>
