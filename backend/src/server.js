const app = require("./app");
const { runMigrations } = require("./database/migrate");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await runMigrations();
    app.listen(PORT, () => {
      console.log(`Backend running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start backend:", error);
    process.exit(1);
  }
};

startServer();
