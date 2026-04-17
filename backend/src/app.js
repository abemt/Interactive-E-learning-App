const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");
const healthRoute = require("./Routes/healthRoute");
const authRoute = require("./Routes/authRoute");
const adminRoute = require("./Routes/adminRoute");
const gamificationRoute = require("./Routes/gamificationRoute");
const contentRoute = require("./Routes/contentRoute");
const quizRoute = require("./Routes/quizRoute");
const scoreLogRoute = require("./Routes/scoreLogRoute");
const syncRoute = require("./Routes/syncRoute");
const parentRoute = require("./Routes/parentRoute");

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Serve static files from uploads directory
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use("/api/health", healthRoute);
app.use("/api/auth", authRoute);
app.use("/api/admin", adminRoute);
app.use("/api/gamification", gamificationRoute);
app.use("/api/content", contentRoute);
app.use("/api/quiz", quizRoute);
app.use("/api/scorelogs", scoreLogRoute);
app.use("/api/sync", syncRoute);
app.use("/api/parent", parentRoute);

module.exports = app;
