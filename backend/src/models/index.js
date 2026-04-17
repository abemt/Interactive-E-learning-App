const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const User = sequelize.define(
  "User",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    fullName: { type: DataTypes.STRING(120), allowNull: false },
    email: { type: DataTypes.STRING(160), allowNull: false, unique: true },
    passwordHash: { type: DataTypes.STRING(255), allowNull: false },
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
    description: { type: DataTypes.TEXT, allowNull: true }
  },
  { tableName: "ContentModules" }
);

const ContentItem = sequelize.define(
  "ContentItem",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    title: { type: DataTypes.STRING(180), allowNull: false },
    itemType: {
      type: DataTypes.ENUM("Video", "Article", "Quiz", "Assignment"),
      allowNull: false,
      defaultValue: "Article"
    },
    contentBody: { type: DataTypes.TEXT("long"), allowNull: true },
    contentUrl: { type: DataTypes.STRING(255), allowNull: true },
    sequenceOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 }
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

User.hasMany(Class, { foreignKey: "teacherId", as: "teachingClasses" });
Class.belongsTo(User, { foreignKey: "teacherId", as: "teacher" });

Class.hasMany(ContentModule, { foreignKey: "classId", as: "modules" });
ContentModule.belongsTo(Class, { foreignKey: "classId", as: "class" });

ContentModule.hasMany(ContentItem, { foreignKey: "moduleId", as: "items" });
ContentItem.belongsTo(ContentModule, { foreignKey: "moduleId", as: "module" });

User.hasMany(ScoreLog, { foreignKey: "userId", as: "scoreLogs" });
ScoreLog.belongsTo(User, { foreignKey: "userId", as: "user" });

Class.hasMany(ScoreLog, { foreignKey: "classId", as: "scoreLogs" });
ScoreLog.belongsTo(Class, { foreignKey: "classId", as: "class" });

ContentItem.hasMany(ScoreLog, { foreignKey: "contentItemId", as: "scoreLogs" });
ScoreLog.belongsTo(ContentItem, { foreignKey: "contentItemId", as: "contentItem" });

User.hasMany(Badge, { foreignKey: "userId", as: "badges" });
Badge.belongsTo(User, { foreignKey: "userId", as: "user" });

module.exports = {
  sequelize,
  User,
  Class,
  ContentModule,
  ContentItem,
  ScoreLog,
  Badge
};
