module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn("ContentItems", "itemType", {
      type: Sequelize.ENUM("Video", "Article", "Quiz", "Assignment", "Lesson"),
      allowNull: false,
      defaultValue: "Article"
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn("ContentItems", "itemType", {
      type: Sequelize.ENUM("Video", "Article", "Quiz", "Assignment"),
      allowNull: false,
      defaultValue: "Article"
    });
  }
};
