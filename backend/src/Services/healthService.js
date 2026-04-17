const getHealthStatus = () => ({
  status: "ok",
  service: "backend",
  timestamp: new Date().toISOString()
});

module.exports = { getHealthStatus };
