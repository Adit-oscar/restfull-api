const express = require("express");
const { verifyToken } = require("../middleware/auth.js");
const router = express.Router();

const {
  createTransaction,
  getUserTransactions,
  getTransactionStatus,
} = require("../controllers/transaction.js");

router.post("/", verifyToken, createTransaction);
router.get("/", verifyToken, getUserTransactions);
router.get("/:orderId", verifyToken, getTransactionStatus);

module.exports = router;
