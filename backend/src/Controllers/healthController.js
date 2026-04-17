const { getHealthStatus } = require("../Services/healthService");

const getHealth = (req, res) => {
  res.status(200).json(getHealthStatus());
};

module.exports = { getHealth };
