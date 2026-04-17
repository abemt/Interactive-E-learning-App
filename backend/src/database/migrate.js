const fs = require("fs");
const path = require("path");
const sequelize = require("../config/database");

const migrationsDir = path.join(__dirname, "migrations");

const ensureMetaTable = async () => {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS SequelizeMeta (
      name VARCHAR(255) NOT NULL PRIMARY KEY,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB;
  `);
};

const getExecutedMigrations = async () => {
  const [rows] = await sequelize.query("SELECT name FROM SequelizeMeta");
  return new Set(rows.map((row) => row.name));
};

const runMigrations = async () => {
  await sequelize.authenticate();
  await ensureMetaTable();

  const executed = await getExecutedMigrations();
  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".js"))
    .sort();

  for (const file of files) {
    if (executed.has(file)) {
      continue;
    }

    const migrationPath = path.join(migrationsDir, file);
    const migration = require(migrationPath);
    await migration.up(sequelize.getQueryInterface(), sequelize.constructor);
    await sequelize.query("INSERT INTO SequelizeMeta (name) VALUES (?)", {
      replacements: [file]
    });
    console.log(`Applied migration: ${file}`);
  }
};

if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log("Migrations completed successfully.");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}

module.exports = { runMigrations };
