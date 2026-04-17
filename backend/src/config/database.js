const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
  process.env.DB_NAME || "elearning",
  process.env.DB_USER || "elearning_user",
  process.env.DB_PASSWORD || "elearning_password",
  {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    dialect: "mysql",
    logging: false
  }
);

module.exports = sequelize;
