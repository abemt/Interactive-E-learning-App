module.exports = {
  async up(queryInterface, Sequelize) {
    // Badge Definitions - Templates for badges that can be auto-generated per course
    await queryInterface.createTable("BadgeDefinitions", {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      moduleId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "ContentModules",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      badgeType: {
        type: Sequelize.ENUM("Completion", "Mastery", "Streak", "Special"),
        allowNull: false,
        defaultValue: "Completion"
      },
      title: {
        type: Sequelize.STRING(120),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      iconUrl: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      criteria: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: "JSON storing requirements like {minScore: 80, minCompletions: 5}"
      },
      xpReward: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 100
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
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

    // User Progress - Track XP and level per user per module
    await queryInterface.createTable("UserProgress", {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Users",
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
      currentXP: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      currentLevel: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      completionPercentage: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      lastActivityAt: {
        type: Sequelize.DATE,
        allowNull: true
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

    // XP Transactions - Log of all XP earned
    await queryInterface.createTable("XPTransactions", {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "Users",
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
      contentItemId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "ContentItems",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      xpAmount: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      reason: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: "e.g., 'Quiz Completion', 'Perfect Score', 'Daily Login'"
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: "Additional context like score, time taken, etc."
      },
      earnedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
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

    // Level Definitions - XP thresholds for each level
    await queryInterface.createTable("LevelDefinitions", {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      moduleId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "ContentModules",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        comment: "If null, applies globally across all modules"
      },
      level: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      xpThreshold: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: "Minimum XP required to reach this level"
      },
      title: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: "e.g., 'Beginner', 'Intermediate', 'Expert'"
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

    // User Badge Awards - Actual badges earned by users (update existing Badges table structure)
    await queryInterface.addColumn("Badges", "badgeDefinitionId", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: "BadgeDefinitions",
        key: "id"
      },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    });

    // Add indexes for performance
    await queryInterface.addIndex("BadgeDefinitions", ["moduleId"], {
      name: "badge_definitions_module_idx"
    });

    await queryInterface.addIndex("UserProgress", ["userId", "moduleId"], {
      unique: true,
      name: "user_progress_unique_idx"
    });

    await queryInterface.addIndex("XPTransactions", ["userId", "moduleId"], {
      name: "xp_transactions_lookup_idx"
    });

    await queryInterface.addIndex("LevelDefinitions", ["moduleId", "level"], {
      unique: true,
      name: "level_definitions_unique_idx"
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("Badges", "badgeDefinitionId");
    await queryInterface.dropTable("LevelDefinitions");
    await queryInterface.dropTable("XPTransactions");
    await queryInterface.dropTable("UserProgress");
    await queryInterface.dropTable("BadgeDefinitions");
  }
};
