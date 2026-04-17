module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("ParentStudentMappings", {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      parent_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Users",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      student_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Users",
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

    await queryInterface.addIndex("ParentStudentMappings", ["parent_id", "student_id"], {
      unique: true,
      name: "parent_student_unique"
    });
    await queryInterface.addIndex("ParentStudentMappings", ["parent_id"], {
      name: "parent_student_parent_idx"
    });
    await queryInterface.addIndex("ParentStudentMappings", ["student_id"], {
      name: "parent_student_student_idx"
    });

    await queryInterface.createTable("LoginLogs", {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Users",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      login_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
      }
    });

    await queryInterface.addIndex("LoginLogs", ["user_id", "login_at"], {
      name: "loginlogs_user_time_idx"
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("LoginLogs");
    await queryInterface.dropTable("ParentStudentMappings");
  }
};