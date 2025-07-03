const socketIo = require("socket.io");
const logger = require("../utils/logger");

class WebSocketService {
  constructor(server) {
    // WebSocket setup with CORS
    this.io = socketIo(server, {
      cors: {
        origin: "*", // In production, specify your frontend URL
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    this.setupConnectionHandling();
  }

  // Setup WebSocket connection handling
  setupConnectionHandling() {
    this.io.on("connection", (socket) => {
      logger.info(`Client connected: ${socket.id}`);

      // Join user to their personal room for job updates
      socket.on("join-user-room", (userId) => {
        socket.join(`user:${userId}`);
        logger.info(`User ${userId} joined their room`);
      });

      // Handle client disconnect
      socket.on("disconnect", () => {
        logger.info(`Client disconnected: ${socket.id}`);
      });
    });
  }

  // Get the socket.io instance
  getIO() {
    return this.io;
  }

  // Close WebSocket server
  close(callback) {
    this.io.close(callback);
  }
}

module.exports = WebSocketService;