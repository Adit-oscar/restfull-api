const express = require("express");
const { verifyToken } = require("../middleware/auth.js");
const router = express.Router();

const {
  createTransaction,
  getUserTransactions,
} = require("../controllers/transaction.js");

router.post("/", verifyToken, createTransaction);
router.get("/", verifyToken, getUserTransactions);

module.exports = router;
