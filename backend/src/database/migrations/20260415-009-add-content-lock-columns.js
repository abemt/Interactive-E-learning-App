module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('ContentModules', 'is_locked', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    await queryInterface.addColumn('ContentItems', 'is_locked', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    await queryInterface.addIndex('ContentModules', ['is_locked'], {
      name: 'idx_contentmodules_is_locked'
    });

    await queryInterface.addIndex('ContentItems', ['is_locked'], {
      name: 'idx_contentitems_is_locked'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('ContentItems', 'idx_contentitems_is_locked');
    await queryInterface.removeIndex('ContentModules', 'idx_contentmodules_is_locked');

    await queryInterface.removeColumn('ContentItems', 'is_locked');
    await queryInterface.removeColumn('ContentModules', 'is_locked');
  }
};
