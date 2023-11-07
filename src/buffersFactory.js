const OperationsBuffer = require("./operationsBuffer");

class BuffersFactory {
  constructor() {
    this.buffers = {}; // Keeps the last used buffer per user. !!! NOT OPTIMAL, THINK ON IMPROVEMENT
  }

  getBuffer(userId, operation) {
    const currentBuffer = this.buffers[userId];
    
    if (currentBuffer) {
      if (!currentBuffer.flushed) {
        return currentBuffer;
      }
    } 

    let bufferId = currentBuffer ? currentBuffer.bufferId + 1 : 0;
    this.buffers[userId] = new OperationsBuffer(userId, bufferId, operation);
    return this.buffers[userId];
  }
}

module.exports = new BuffersFactory();