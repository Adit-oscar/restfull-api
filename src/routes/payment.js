const express = require("express");
const { handleMidtransNotification } = require("../controllers/payment.js");

const router = express.Router();

router.post("/midtrans/notification", handleMidtransNotification);

module.exports = router;
