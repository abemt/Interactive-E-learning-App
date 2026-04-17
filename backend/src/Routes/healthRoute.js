const express = require("express");
const { getHealth } = require("../Controllers/healthController");

const router = express.Router();

router.get("/", getHealth);

module.exports = router;
