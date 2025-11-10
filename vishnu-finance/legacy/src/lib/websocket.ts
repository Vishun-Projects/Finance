// Real-time WebSocket system for live updates and notifications
import { WebSocket } from 'ws';

export enum MessageType {
  DASHBOARD_UPDATE = 'DASHBOARD_UPDATE',
  TRANSACTION_ADDED = 'TRANSACTION_ADDED',
  GOAL_PROGRESS = 'GOAL_PROGRESS',
  DEADLINE_REMINDER = 'DEADLINE_REMINDER',
  MARKET_UPDATE = 'MARKET_UPDATE',
  AI_INSIGHT = 'AI_INSIGHT',
  SYSTEM_NOTIFICATION = 'SYSTEM_NOTIFICATION',
  PING = 'PING',
  PONG = 'PONG'
}

export interface WebSocketMessage {
  type: MessageType;
  userId?: string;
  data: any;
  timestamp: number;
  id: string;
}

export interface ClientConnection {
  id: string;
  userId: string;
  socket: WebSocket;
  lastPing: number;
  subscriptions: Set<string>;
  isAlive: boolean;
}

export class WebSocketManager {
  private clients = new Map<string, ClientConnection>();
  private userConnections = new Map<string, Set<string>>();
  private messageQueue = new Map<string, WebSocketMessage[]>();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startHeartbeat();
    this.startCleanup();
  }

  // Add new client connection
  addClient(connectionId: string, userId: string, socket: WebSocket): void {
    const connection: ClientConnection = {
      id: connectionId,
      userId,
      socket,
      lastPing: Date.now(),
      subscriptions: new Set(),
      isAlive: true
    };

    this.clients.set(connectionId, connection);

    // Add to user connections
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }
    this.userConnections.get(userId)!.add(connectionId);

    // Set up socket event handlers
    socket.on('message', (data) => this.handleMessage(connectionId, data));
    socket.on('close', () => this.removeClient(connectionId));
    socket.on('error', (error) => this.handleError(connectionId, error));
    socket.on('pong', () => this.handlePong(connectionId));

    // Send queued messages if any
    this.sendQueuedMessages(userId);

    console.log(`Client ${connectionId} connected for user ${userId}`);
  }

  // Remove client connection
  removeClient(connectionId: string): void {
    const connection = this.clients.get(connectionId);
    if (!connection) return;

    // Remove from user connections
    const userConnections = this.userConnections.get(connection.userId);
    if (userConnections) {
      userConnections.delete(connectionId);
      if (userConnections.size === 0) {
        this.userConnections.delete(connection.userId);
      }
    }

    this.clients.delete(connectionId);
    console.log(`Client ${connectionId} disconnected`);
  }

  // Send message to specific user
  sendToUser(userId: string, message: WebSocketMessage): void {
    const userConnections = this.userConnections.get(userId);
    if (!userConnections || userConnections.size === 0) {
      // Queue message for when user comes online
      this.queueMessage(userId, message);
      return;
    }

    const messageStr = JSON.stringify(message);
    let sent = false;

    for (const connectionId of userConnections) {
      const connection = this.clients.get(connectionId);
      if (connection && connection.isAlive) {
        try {
          connection.socket.send(messageStr);
          sent = true;
        } catch (error) {
          console.error(`Failed to send message to ${connectionId}:`, error);
          connection.isAlive = false;
        }
      }
    }

    if (!sent) {
      this.queueMessage(userId, message);
    }
  }

  // Send message to all connected clients
  broadcast(message: WebSocketMessage): void {
    const messageStr = JSON.stringify(message);
    
    for (const [connectionId, connection] of this.clients.entries()) {
      if (connection.isAlive) {
        try {
          connection.socket.send(messageStr);
        } catch (error) {
          console.error(`Failed to broadcast to ${connectionId}:`, error);
          connection.isAlive = false;
        }
      }
    }
  }

  // Send message to clients with specific subscription
  sendToSubscribers(subscription: string, message: WebSocketMessage): void {
    const messageStr = JSON.stringify(message);
    
    for (const [connectionId, connection] of this.clients.entries()) {
      if (connection.isAlive && connection.subscriptions.has(subscription)) {
        try {
          connection.socket.send(messageStr);
        } catch (error) {
          console.error(`Failed to send to subscriber ${connectionId}:`, error);
          connection.isAlive = false;
        }
      }
    }
  }

  // Handle incoming messages
  private handleMessage(connectionId: string, data: Buffer): void {
    try {
      const message: WebSocketMessage = JSON.parse(data.toString());
      const connection = this.clients.get(connectionId);
      
      if (!connection) return;

      switch (message.type) {
        case MessageType.PING:
          this.handlePing(connectionId);
          break;
        case MessageType.DASHBOARD_UPDATE:
          this.handleSubscription(connectionId, 'dashboard');
          break;
        case MessageType.MARKET_UPDATE:
          this.handleSubscription(connectionId, 'market');
          break;
        default:
          console.log(`Received message type ${message.type} from ${connectionId}`);
      }
    } catch (error) {
      console.error(`Failed to parse message from ${connectionId}:`, error);
    }
  }

  // Handle ping messages
  private handlePing(connectionId: string): void {
    const connection = this.clients.get(connectionId);
    if (!connection) return;

    connection.lastPing = Date.now();
    connection.isAlive = true;

    const pongMessage: WebSocketMessage = {
      type: MessageType.PONG,
      data: { timestamp: Date.now() },
      timestamp: Date.now(),
      id: this.generateMessageId()
    };

    try {
      connection.socket.send(JSON.stringify(pongMessage));
    } catch (error) {
      console.error(`Failed to send pong to ${connectionId}:`, error);
    }
  }

  // Handle pong responses
  private handlePong(connectionId: string): void {
    const connection = this.clients.get(connectionId);
    if (connection) {
      connection.isAlive = true;
      connection.lastPing = Date.now();
    }
  }

  // Handle subscription requests
  private handleSubscription(connectionId: string, subscription: string): void {
    const connection = this.clients.get(connectionId);
    if (connection) {
      connection.subscriptions.add(subscription);
    }
  }

  // Handle socket errors
  private handleError(connectionId: string, error: Error): void {
    console.error(`WebSocket error for ${connectionId}:`, error);
    const connection = this.clients.get(connectionId);
    if (connection) {
      connection.isAlive = false;
    }
  }

  // Queue message for offline users
  private queueMessage(userId: string, message: WebSocketMessage): void {
    if (!this.messageQueue.has(userId)) {
      this.messageQueue.set(userId, []);
    }
    
    const queue = this.messageQueue.get(userId)!;
    queue.push(message);
    
    // Keep only last 50 messages per user
    if (queue.length > 50) {
      queue.splice(0, queue.length - 50);
    }
  }

  // Send queued messages when user comes online
  private sendQueuedMessages(userId: string): void {
    const queue = this.messageQueue.get(userId);
    if (!queue || queue.length === 0) return;

    const userConnections = this.userConnections.get(userId);
    if (!userConnections || userConnections.size === 0) return;

    // Send all queued messages
    for (const message of queue) {
      this.sendToUser(userId, message);
    }

    // Clear the queue
    this.messageQueue.delete(userId);
  }

  // Start heartbeat to keep connections alive
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      for (const [connectionId, connection] of this.clients.entries()) {
        if (!connection.isAlive) {
          connection.socket.terminate();
          this.removeClient(connectionId);
          continue;
        }

        try {
          connection.socket.ping();
        } catch (error) {
          console.error(`Failed to ping ${connectionId}:`, error);
          connection.isAlive = false;
        }
      }
    }, 30000); // Ping every 30 seconds
  }

  // Start cleanup of dead connections
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const timeout = 60000; // 1 minute timeout

      for (const [connectionId, connection] of this.clients.entries()) {
        if (now - connection.lastPing > timeout) {
          console.log(`Cleaning up dead connection ${connectionId}`);
          connection.socket.terminate();
          this.removeClient(connectionId);
        }
      }
    }, 10000); // Cleanup every 10 seconds
  }

  // Generate unique message ID
  private generateMessageId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get connection statistics
  getStats() {
    return {
      totalConnections: this.clients.size,
      totalUsers: this.userConnections.size,
      queuedMessages: Array.from(this.messageQueue.values()).reduce((sum, queue) => sum + queue.length, 0),
      averageConnectionsPerUser: this.userConnections.size > 0 
        ? this.clients.size / this.userConnections.size 
        : 0
    };
  }

  // Cleanup resources
  destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Close all connections
    for (const connection of this.clients.values()) {
      connection.socket.close();
    }

    this.clients.clear();
    this.userConnections.clear();
    this.messageQueue.clear();
  }
}

// Global WebSocket manager instance
export const wsManager = new WebSocketManager();

// Message factory for common message types
export class MessageFactory {
  static createDashboardUpdate(userId: string, data: any): WebSocketMessage {
    return {
      type: MessageType.DASHBOARD_UPDATE,
      userId,
      data,
      timestamp: Date.now(),
      id: this.generateId()
    };
  }

  static createTransactionAdded(userId: string, transaction: any): WebSocketMessage {
    return {
      type: MessageType.TRANSACTION_ADDED,
      userId,
      data: { transaction },
      timestamp: Date.now(),
      id: this.generateId()
    };
  }

  static createGoalProgress(userId: string, goal: any): WebSocketMessage {
    return {
      type: MessageType.GOAL_PROGRESS,
      userId,
      data: { goal },
      timestamp: Date.now(),
      id: this.generateId()
    };
  }

  static createDeadlineReminder(userId: string, deadline: any): WebSocketMessage {
    return {
      type: MessageType.DEADLINE_REMINDER,
      userId,
      data: { deadline },
      timestamp: Date.now(),
      id: this.generateId()
    };
  }

  static createMarketUpdate(data: any): WebSocketMessage {
    return {
      type: MessageType.MARKET_UPDATE,
      data,
      timestamp: Date.now(),
      id: this.generateId()
    };
  }

  static createAIInsight(userId: string, insight: any): WebSocketMessage {
    return {
      type: MessageType.AI_INSIGHT,
      userId,
      data: { insight },
      timestamp: Date.now(),
      id: this.generateId()
    };
  }

  static createSystemNotification(userId: string, notification: any): WebSocketMessage {
    return {
      type: MessageType.SYSTEM_NOTIFICATION,
      userId,
      data: { notification },
      timestamp: Date.now(),
      id: this.generateId()
    };
  }

  private static generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Real-time event handlers
export class RealtimeEvents {
  // Notify dashboard update
  static notifyDashboardUpdate(userId: string, dashboardData: any): void {
    const message = MessageFactory.createDashboardUpdate(userId, dashboardData);
    wsManager.sendToUser(userId, message);
  }

  // Notify new transaction
  static notifyTransactionAdded(userId: string, transaction: any): void {
    const message = MessageFactory.createTransactionAdded(userId, transaction);
    wsManager.sendToUser(userId, message);
  }

  // Notify goal progress
  static notifyGoalProgress(userId: string, goal: any): void {
    const message = MessageFactory.createGoalProgress(userId, goal);
    wsManager.sendToUser(userId, message);
  }

  // Notify deadline reminder
  static notifyDeadlineReminder(userId: string, deadline: any): void {
    const message = MessageFactory.createDeadlineReminder(userId, deadline);
    wsManager.sendToUser(userId, message);
  }

  // Broadcast market update
  static broadcastMarketUpdate(marketData: any): void {
    const message = MessageFactory.createMarketUpdate(marketData);
    wsManager.broadcast(message);
  }

  // Notify AI insight
  static notifyAIInsight(userId: string, insight: any): void {
    const message = MessageFactory.createAIInsight(userId, insight);
    wsManager.sendToUser(userId, message);
  }

  // Notify system notification
  static notifySystemNotification(userId: string, notification: any): void {
    const message = MessageFactory.createSystemNotification(userId, notification);
    wsManager.sendToUser(userId, message);
  }
}
