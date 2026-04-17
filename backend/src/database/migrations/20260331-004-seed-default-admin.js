const bcrypt = require("bcryptjs");

module.exports = {
  async up(queryInterface, Sequelize) {
    const hash = bcrypt.hashSync("admin123", 10);
    
    // Check if admin already exists
    const [existingAdmin] = await queryInterface.sequelize.query(
      `SELECT id FROM Users WHERE email = 'admin@system.local'`
    );

    if (existingAdmin.length === 0) {
      await queryInterface.bulkInsert("Users", [{
        fullName: "System Administrator",
        email: "admin@system.local",
        passwordHash: hash,
        role: "Admin",
        createdAt: new Date(),
        updatedAt: new Date()
      }]);
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete("Users", { email: "admin@system.local" }, {});
  }
};
