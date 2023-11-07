const redisClient = require("./redis");

class OperationsBuffer {
  _FLUSH_INTERVAL = 100; // All scheduled operations will be run in 200 ms after buffer creation
  _BUFFER_TTL = 30 * 1000; // 1 minute until the redis hset be deleted

  constructor(userId, bufferId, operation) {
    this.userId = userId;
    this.bufferId = bufferId; // Sub id to handle several buffers per one user in case of multiple operations made in short time
    this.operation = operation; // function to be called on params array
    this.params = [];
    this.flushed = false;

    this.interval = setInterval(() => this._flushBuffer(), this._FLUSH_INTERVAL);
  }

  appendParam(param) {
    return this.params.push(param) - 1; // length - 1 for index
  }

  // !!! Not optimal. Run operations in separate threads.
  async _flushBuffer() {
    if (!this.flushed) {
      this.flushed = true;
      clearInterval(this.interval);

      const result = await this.operation(this.userId, this._getQualifiedBufferId(), this.params);
      const timeout = setTimeout(() => {
        redisClient.del(this._getQualifiedBufferId());
        this.params = [];

        clearTimeout(timeout);
      }, this._BUFFER_TTL)

      return result;
    }
  }

  _getQualifiedBufferId() {
    return `${this.userId}-${this.bufferId}`;
  }
}

module.exports = OperationsBuffer;
