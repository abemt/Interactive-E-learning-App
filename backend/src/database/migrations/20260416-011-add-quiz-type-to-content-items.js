module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('ContentItems', 'quiz_type', {
      type: Sequelize.STRING(40),
      allowNull: true
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('ContentItems', 'quiz_type');
  }
};
