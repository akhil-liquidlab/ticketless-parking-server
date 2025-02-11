// In-memory queue for storing messages for disconnected sockets
const messageQueues = new Map();

// Maximum number of queued messages per socket
const MAX_QUEUED_MESSAGES = 100;

const queueMessage = (socketId, eventName, message) => {
    if (!messageQueues.has(socketId)) {
        messageQueues.set(socketId, []);
    }
    
    const queue = messageQueues.get(socketId);
    
    // Add message to queue with timestamp
    queue.push({
        eventName,
        message,
        timestamp: Date.now()
    });
    
    // Maintain queue size limit
    if (queue.length > MAX_QUEUED_MESSAGES) {
        queue.shift(); // Remove oldest message
    }
};

const getQueuedMessages = (socketId) => {
    return messageQueues.get(socketId) || [];
};

const clearQueue = (socketId) => {
    messageQueues.delete(socketId);
};

module.exports = {
    queueMessage,
    getQueuedMessages,
    clearQueue
}; 