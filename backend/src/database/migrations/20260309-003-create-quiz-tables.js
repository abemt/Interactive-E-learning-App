module.exports = {
  async up(queryInterface, Sequelize) {
    // Create QuizQuestions table
    await queryInterface.createTable("QuizQuestions", {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      contentItemId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "ContentItems",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        comment: "Links question to a Quiz ContentItem"
      },
      questionText: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: "The actual question text (can be in Amharic or English)"
      },
      questionType: {
        type: Sequelize.ENUM("MultipleChoice", "TrueFalse", "ShortAnswer"),
        allowNull: false,
        defaultValue: "MultipleChoice"
      },
      imageUrl: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: "Optional image for the question"
      },
      audioUrl: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: "Optional Amharic audio file URL"
      },
      correctAnswer: {
        type: Sequelize.STRING(500),
        allowNull: false,
        comment: "The correct answer text"
      },
      distractor1: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: "First wrong answer option"
      },
      distractor2: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: "Second wrong answer option"
      },
      distractor3: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: "Third wrong answer option"
      },
      points: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 10,
        comment: "Points/XP awarded for correct answer"
      },
      sequenceOrder: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: "Display order within the quiz"
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

    // Add indexes
    await queryInterface.addIndex("QuizQuestions", ["contentItemId"], {
      name: "idx_quizquestions_contentitem"
    });

    await queryInterface.addIndex("QuizQuestions", ["sequenceOrder"], {
      name: "idx_quizquestions_sequence"
    });

    // Create StudentAnswers table to track quiz responses
    await queryInterface.createTable("StudentAnswers", {
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
      questionId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "QuizQuestions",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      answerText: {
        type: Sequelize.STRING(500),
        allowNull: false,
        comment: "Student's submitted answer"
      },
      isCorrect: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      pointsAwarded: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      attemptTimestamp: {
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

    // Add indexes for StudentAnswers
    await queryInterface.addIndex("StudentAnswers", ["userId"], {
      name: "idx_studentanswers_user"
    });

    await queryInterface.addIndex("StudentAnswers", ["questionId"], {
      name: "idx_studentanswers_question"
    });

    // Composite index for finding user's answers to specific questions
    await queryInterface.addIndex("StudentAnswers", ["userId", "questionId"], {
      name: "idx_studentanswers_user_question"
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("StudentAnswers");
    await queryInterface.dropTable("QuizQuestions");
  }
};
