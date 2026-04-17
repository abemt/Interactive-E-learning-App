const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const User = sequelize.define(
  "User",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    fullName: { type: DataTypes.STRING(120), allowNull: false },
    username: { type: DataTypes.STRING(160), allowNull: false, unique: true },
    email: { type: DataTypes.STRING(160), allowNull: false, unique: true },
    passwordHash: { type: DataTypes.STRING(255), allowNull: false },
    classId: { type: DataTypes.INTEGER, allowNull: true },
    totalXP: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    familyLinkCode: {
      type: DataTypes.STRING(6),
      allowNull: true,
      unique: true,
      field: "family_link_code"
    },
    needsPasswordChange: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "needs_password_change"
    },
    role: {
      type: DataTypes.ENUM("Admin", "Teacher", "Student", "Parent"),
      allowNull: false,
      defaultValue: "Student"
    }
  },
  { tableName: "Users" }
);

const Class = sequelize.define(
  "Class",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(120), allowNull: false },
    gradeLevel: { type: DataTypes.STRING(20), allowNull: true }
  },
  { tableName: "Classes" }
);

const ContentModule = sequelize.define(
  "ContentModule",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    title: { type: DataTypes.STRING(160), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    isLocked: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "is_locked"
    }
  },
  { tableName: "ContentModules" }
);

const ContentItem = sequelize.define(
  "ContentItem",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    title: { type: DataTypes.STRING(180), allowNull: false },
    prerequisiteLessonId: { type: DataTypes.INTEGER, allowNull: true },
    quizType: {
      type: DataTypes.STRING(40),
      allowNull: true,
      field: "quiz_type"
    },
    itemType: {
      type: DataTypes.ENUM("Video", "Article", "Quiz", "Assignment", "Lesson"),
      allowNull: false,
      defaultValue: "Article"
    },
    contentBody: { type: DataTypes.TEXT("long"), allowNull: true },
    contentUrl: { type: DataTypes.STRING(255), allowNull: true },
    sequenceOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    isLocked: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "is_locked"
    }
  },
  { tableName: "ContentItems" }
);

const ScoreLog = sequelize.define(
  "ScoreLog",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    score: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
    attemptedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  },
  { tableName: "ScoreLogs" }
);

const Badge = sequelize.define(
  "Badge",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    title: { type: DataTypes.STRING(120), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    awardedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  },
  { tableName: "Badges" }
);

// Gamification Models
const BadgeDefinition = sequelize.define(
  "BadgeDefinition",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    badgeType: {
      type: DataTypes.ENUM("Completion", "Mastery", "Streak", "Special"),
      allowNull: false,
      defaultValue: "Completion"
    },
    title: { type: DataTypes.STRING(120), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    iconUrl: { type: DataTypes.STRING(255), allowNull: true },
    criteria: { type: DataTypes.JSON, allowNull: true },
    xpReward: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 100 },
    isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
  },
  { tableName: "BadgeDefinitions" }
);

const UserProgress = sequelize.define(
  "UserProgress",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    currentXP: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    currentLevel: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    completionPercentage: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0.00 },
    lastActivityAt: { type: DataTypes.DATE, allowNull: true }
  },
  { tableName: "UserProgress" }
);

const XPTransaction = sequelize.define(
  "XPTransaction",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    xpAmount: { type: DataTypes.INTEGER, allowNull: false },
    reason: { type: DataTypes.STRING(255), allowNull: true },
    metadata: { type: DataTypes.JSON, allowNull: true },
    earnedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  },
  { tableName: "XPTransactions" }
);

const LevelDefinition = sequelize.define(
  "LevelDefinition",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    level: { type: DataTypes.INTEGER, allowNull: false },
    xpThreshold: { type: DataTypes.INTEGER, allowNull: false },
    title: { type: DataTypes.STRING(50), allowNull: true }
  },
  { tableName: "LevelDefinitions" }
);

const QuizQuestion = sequelize.define(
  "QuizQuestion",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    questionText: { type: DataTypes.TEXT, allowNull: false },
    questionType: {
      type: DataTypes.ENUM("MultipleChoice", "TrueFalse", "ShortAnswer"),
      allowNull: false,
      defaultValue: "MultipleChoice"
    },
    imageUrl: { type: DataTypes.STRING(500), allowNull: true },
    audioUrl: { type: DataTypes.STRING(500), allowNull: true },
    correctAnswer: { type: DataTypes.STRING(500), allowNull: false },
    distractor1: { type: DataTypes.STRING(500), allowNull: true },
    distractor2: { type: DataTypes.STRING(500), allowNull: true },
    distractor3: { type: DataTypes.STRING(500), allowNull: true },
    points: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 10 },
    sequenceOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 }
  },
  { tableName: "QuizQuestions" }
);

const StudentAnswer = sequelize.define(
  "StudentAnswer",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    answerText: { type: DataTypes.STRING(500), allowNull: false },
    isCorrect: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    pointsAwarded: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    attemptTimestamp: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
  },
  { tableName: "StudentAnswers" }
);

const ClassCourse = sequelize.define(
  "ClassCourse",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    classId: { type: DataTypes.INTEGER, allowNull: false },
    moduleId: { type: DataTypes.INTEGER, allowNull: false }
  },
  { tableName: "ClassCourses" }
);

const TeacherClass = sequelize.define(
  "TeacherClass",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    teacherId: { type: DataTypes.INTEGER, allowNull: false },
    classId: { type: DataTypes.INTEGER, allowNull: false }
  },
  { tableName: "TeacherClasses" }
);

const ParentStudentMapping = sequelize.define(
  "ParentStudentMapping",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    parentId: { type: DataTypes.INTEGER, allowNull: false, field: "parent_id" },
    studentId: { type: DataTypes.INTEGER, allowNull: false, field: "student_id" }
  },
  { tableName: "ParentStudentMappings" }
);

const LoginLog = sequelize.define(
  "LoginLog",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER, allowNull: false, field: "user_id" },
    loginAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "login_at"
    }
  },
  {
    tableName: "LoginLogs",
    createdAt: false,
    updatedAt: false
  }
);

// Existing Relations
User.hasMany(Class, { foreignKey: "teacherId", as: "teachingClasses" });
Class.belongsTo(User, { foreignKey: "teacherId", as: "teacher" });

User.belongsTo(Class, { foreignKey: "classId", as: "enrolledClass" });
Class.hasMany(User, { foreignKey: "classId", as: "students" });

Class.hasMany(ContentModule, { foreignKey: "classId", as: "modules" });
ContentModule.belongsTo(Class, { foreignKey: "classId", as: "class" });

Class.belongsToMany(ContentModule, {
  through: ClassCourse,
  foreignKey: "classId",
  otherKey: "moduleId",
  as: "assignedModules"
});
ContentModule.belongsToMany(Class, {
  through: ClassCourse,
  foreignKey: "moduleId",
  otherKey: "classId",
  as: "assignedClasses"
});

User.belongsToMany(Class, {
  through: TeacherClass,
  foreignKey: "teacherId",
  otherKey: "classId",
  as: "assignedClasses"
});
Class.belongsToMany(User, {
  through: TeacherClass,
  foreignKey: "classId",
  otherKey: "teacherId",
  as: "assignedTeachers"
});

User.hasMany(ParentStudentMapping, { foreignKey: "parentId", as: "parentLinks" });
ParentStudentMapping.belongsTo(User, { foreignKey: "parentId", as: "parent" });

User.hasMany(ParentStudentMapping, { foreignKey: "studentId", as: "studentLinks" });
ParentStudentMapping.belongsTo(User, { foreignKey: "studentId", as: "student" });

User.belongsToMany(User, {
  through: ParentStudentMapping,
  foreignKey: "parentId",
  otherKey: "studentId",
  as: "linkedStudents"
});
User.belongsToMany(User, {
  through: ParentStudentMapping,
  foreignKey: "studentId",
  otherKey: "parentId",
  as: "linkedParents"
});

User.hasMany(LoginLog, { foreignKey: "userId", as: "loginLogs" });
LoginLog.belongsTo(User, { foreignKey: "userId", as: "user" });

ContentModule.hasMany(ContentItem, { foreignKey: "moduleId", as: "items" });
ContentItem.belongsTo(ContentModule, { foreignKey: "moduleId", as: "module" });

ContentItem.belongsTo(ContentItem, {
  foreignKey: "prerequisiteLessonId",
  as: "prerequisiteLesson"
});
ContentItem.hasMany(ContentItem, {
  foreignKey: "prerequisiteLessonId",
  as: "dependentQuizzes"
});

User.hasMany(ScoreLog, { foreignKey: "userId", as: "scoreLogs" });
ScoreLog.belongsTo(User, { foreignKey: "userId", as: "user" });

Class.hasMany(ScoreLog, { foreignKey: "classId", as: "scoreLogs" });
ScoreLog.belongsTo(Class, { foreignKey: "classId", as: "class" });

ContentItem.hasMany(ScoreLog, { foreignKey: "contentItemId", as: "scoreLogs" });
ScoreLog.belongsTo(ContentItem, { foreignKey: "contentItemId", as: "contentItem" });

User.hasMany(Badge, { foreignKey: "userId", as: "badges" });
Badge.belongsTo(User, { foreignKey: "userId", as: "user" });

// Gamification Relations
ContentModule.hasMany(BadgeDefinition, { foreignKey: "moduleId", as: "badgeDefinitions" });
BadgeDefinition.belongsTo(ContentModule, { foreignKey: "moduleId", as: "module" });

User.hasMany(UserProgress, { foreignKey: "userId", as: "progress" });
UserProgress.belongsTo(User, { foreignKey: "userId", as: "user" });

ContentModule.hasMany(UserProgress, { foreignKey: "moduleId", as: "userProgress" });
UserProgress.belongsTo(ContentModule, { foreignKey: "moduleId", as: "module" });

User.hasMany(XPTransaction, { foreignKey: "userId", as: "xpTransactions" });
XPTransaction.belongsTo(User, { foreignKey: "userId", as: "user" });

ContentModule.hasMany(XPTransaction, { foreignKey: "moduleId", as: "xpTransactions" });
XPTransaction.belongsTo(ContentModule, { foreignKey: "moduleId", as: "module" });

ContentItem.hasMany(XPTransaction, { foreignKey: "contentItemId", as: "xpTransactions" });
XPTransaction.belongsTo(ContentItem, { foreignKey: "contentItemId", as: "contentItem" });

ContentModule.hasMany(LevelDefinition, { foreignKey: "moduleId", as: "levelDefinitions" });
LevelDefinition.belongsTo(ContentModule, { foreignKey: "moduleId", as: "module" });

BadgeDefinition.hasMany(Badge, { foreignKey: "badgeDefinitionId", as: "awardedBadges" });
Badge.belongsTo(BadgeDefinition, { foreignKey: "badgeDefinitionId", as: "definition" });

// Quiz Relations
ContentItem.hasMany(QuizQuestion, { foreignKey: "contentItemId", as: "questions" });
QuizQuestion.belongsTo(ContentItem, { foreignKey: "contentItemId", as: "contentItem" });

User.hasMany(StudentAnswer, { foreignKey: "userId", as: "studentAnswers" });
StudentAnswer.belongsTo(User, { foreignKey: "userId", as: "user" });

QuizQuestion.hasMany(StudentAnswer, { foreignKey: "questionId", as: "studentAnswers" });
StudentAnswer.belongsTo(QuizQuestion, { foreignKey: "questionId", as: "question" });

module.exports = {
  sequelize,
  User,
  Class,
  ContentModule,
  ContentItem,
  ScoreLog,
  Badge,
  BadgeDefinition,
  UserProgress,
  XPTransaction,
  LevelDefinition,
  QuizQuestion,
  StudentAnswer,
  ClassCourse,
  TeacherClass,
  ParentStudentMapping,
  LoginLog
};
