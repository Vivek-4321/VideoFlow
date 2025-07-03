// services/websocketService.js
import { io } from 'socket.io-client';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.eventHandlers = new Map();
  }

  connect(serverUrl, userId) {
    if (this.socket) {
      this.disconnect();
    }

    console.log('🔌 Connecting to WebSocket server:', serverUrl);

    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      reconnectionDelayMax: 5000,
    });

    this.setupEventHandlers(userId);
    return this.socket;
  }

  setupEventHandlers(userId) {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected:', this.socket.id);
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Join user-specific room for job updates
      if (userId) {
        this.socket.emit('join-user-room', userId);
        console.log('🏠 Joined user room:', userId);
      }
      
      this.emit('connected');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
      this.isConnected = false;
      this.emit('disconnected', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('🔴 WebSocket connection error:', error);
      this.reconnectAttempts++;
      this.emit('error', error);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 WebSocket reconnected after', attemptNumber, 'attempts');
      this.emit('reconnected', attemptNumber);
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('🔴 WebSocket reconnection error:', error);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('❌ WebSocket reconnection failed after maximum attempts');
      this.emit('reconnect_failed');
    });

    // Job-related events
    this.socket.on('job-created', (data) => {
      console.log('📝 Job created:', data);
      this.emit('jobCreated', data);
    });

    this.socket.on('job-started', (data) => {
      console.log('🚀 Job started:', data);
      this.emit('jobStarted', data);
    });

    this.socket.on('job-progress', (data) => {
      console.log('📊 Job progress:', data);
      this.emit('jobProgress', data);
    });

    this.socket.on('job-completed', (data) => {
      console.log('✅ Job completed:', data);
      this.emit('jobCompleted', data);
    });

    this.socket.on('job-failed', (data) => {
      console.log('❌ Job failed:', data);
      this.emit('jobFailed', data);
    });

    this.socket.on('job-cancelled', (data) => {
      console.log('🚫 Job cancelled:', data);
      this.emit('jobCancelled', data);
    });
  }

  disconnect() {
    if (this.socket) {
      console.log('🔌 Disconnecting WebSocket...');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Event emitter methods
  on(event, callback) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(callback);
  }

  off(event, callback) {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event);
      const index = handlers.indexOf(callback);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in WebSocket event handler:', error);
        }
      });
    }
  }

  // Utility methods
  isConnectedToServer() {
    return this.isConnected && this.socket && this.socket.connected;
  }

  getConnectionState() {
    return {
      connected: this.isConnected,
      socketId: this.socket?.id,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

// Create singleton instance
const websocketService = new WebSocketService();
export default websocketService;