module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("ContentItems", "prerequisiteLessonId", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "ContentItems",
        key: "id"
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    });

    await queryInterface.addIndex("ContentItems", ["prerequisiteLessonId"], {
      name: "idx_contentitems_prerequisite_lesson"
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("ContentItems", "idx_contentitems_prerequisite_lesson");
    await queryInterface.removeColumn("ContentItems", "prerequisiteLessonId");
  }
};
