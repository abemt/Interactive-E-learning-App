module.exports = {
  async up(queryInterface, Sequelize) {
    const usersTable = await queryInterface.describeTable("Users");

    if (!usersTable.totalXP) {
      await queryInterface.addColumn("Users", "totalXP", {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      });
    }
  },

  async down(queryInterface) {
    const usersTable = await queryInterface.describeTable("Users");

    if (usersTable.totalXP) {
      await queryInterface.removeColumn("Users", "totalXP");
    }
  }
};
