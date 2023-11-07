const db = require("../models");
const operationsStatus = require("./operationsStatus");
const redisClient = require("./redis");
const buffersFactory = require("./buffersFactory");

class UserService {
  constructor() {
    this.Users = db["Users"];
  }

  async getUser(id) {
    return this.Users.findByPk(id);
  };

  async setUpdateBalanceTask(id, amount) {
    const buffer = buffersFactory.getBuffer(id, this._updateUserBalance.bind(this));
    const transactionId = buffer.appendParam(amount);
    await redisClient.hset(id, transactionId, operationsStatus.PENDING);
    return [buffer._getQualifiedBufferId(), transactionId];
  };

  async _updateUserBalance(userId, bufferId, amounts) {
    return await db.sequelize.transaction(async (transaction) => {
      const user = await this.getUser(userId, {transaction});

      let userBalance = parseFloat(user.balance);
      let canProceed = true;

      for (const i in amounts) {
        if (!canProceed) {
          await redisClient.hset(bufferId, i, operationsStatus.INSUFFICIENT_FUNDS);
        } else {
          if (userBalance + amounts[i] < 0.0) {
            await redisClient.hset(bufferId, i, operationsStatus.INSUFFICIENT_FUNDS);
            canProceed = false;
          } else {
            await redisClient.hset(bufferId, i, operationsStatus.SUCCESS);
            userBalance += amounts[i];
          }
        }
      }

      user.balance = userBalance.toString();
      await user.save({ transaction });
    });
  };
};

module.exports = new UserService();
