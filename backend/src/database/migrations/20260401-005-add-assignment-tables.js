module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Users", "classId", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "Classes",
        key: "id"
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    });

    await queryInterface.createTable("ClassCourses", {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      classId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Classes",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      moduleId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "ContentModules",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
      }
    });

    await queryInterface.createTable("TeacherClasses", {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      teacherId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Users",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      classId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Classes",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP")
      }
    });

    await queryInterface.addIndex("Users", ["classId"], {
      name: "users_classid_idx"
    });

    await queryInterface.addIndex("ClassCourses", ["classId", "moduleId"], {
      unique: true,
      name: "classcourses_class_module_unique"
    });

    await queryInterface.addIndex("TeacherClasses", ["teacherId", "classId"], {
      unique: true,
      name: "teacherclasses_teacher_class_unique"
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex("TeacherClasses", "teacherclasses_teacher_class_unique");
    await queryInterface.removeIndex("ClassCourses", "classcourses_class_module_unique");
    await queryInterface.removeIndex("Users", "users_classid_idx");

    await queryInterface.dropTable("TeacherClasses");
    await queryInterface.dropTable("ClassCourses");
    await queryInterface.removeColumn("Users", "classId");
  }
};
