module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Users", "needs_password_change", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });

    await queryInterface.sequelize.query(
      "UPDATE Users SET needs_password_change = TRUE WHERE needs_password_change IS NULL"
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("Users", "needs_password_change");
  }
};
