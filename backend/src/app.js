const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const healthRoute = require("./Routes/healthRoute");
const authRoute = require("./Routes/authRoute");
const adminRoute = require("./Routes/adminRoute");

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.use("/api/health", healthRoute);
app.use("/api/auth", authRoute);
app.use("/api/admin", adminRoute);

module.exports = app;
