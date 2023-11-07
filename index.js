const express = require("express");
const app = express();
const port = 3000;
const UserService = require("./src/user.service");
const db = require("./models");
const operationsStatus = require("./src/operationsStatus");
const redisClient = require("./src/redis");

db.sequelize.authenticate().then(async () => {
  app.use(express.json());

  app.post("/user/:id", async (req, res) => {
    const { id } = req.params;
    const { amount } = req.body;
    let interval;

    try {
      const [bufferId, transactionId] = await UserService.setUpdateBalanceTask(
        id,
        amount
      );

      interval = setInterval(async () => {
        const result = await redisClient.hget(bufferId, transactionId);

        if (result === operationsStatus.SUCCESS) {
          clearInterval(interval);
          const user = await UserService.getUser(id);
          res.status(200).json({ balance: parseFloat(user.balance) });
        }

        if (result === operationsStatus.INSUFFICIENT_FUNDS) {
          clearInterval(interval);
          res.status(403).send("Insufficient funds");
        }
      }, 25);
    } catch (error) {
      switch (error.message) {
        case operationsStatus.INSUFFICIENT_FUNDS:
          res.status(403).send("Insufficient funds");
          break;
        default:
          res.status(400).send(error.message);
          break;
      }
    }
  });

  app.listen(port, () => {
    console.log(`App is listening on port ${port}`);
  });
});
