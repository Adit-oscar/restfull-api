const transactionModel = require("../models/transaction.js");
const {
  verifyNotificationSignature,
  mapNotificationStatus,
} = require("../services/midtrans.js");

const handleMidtransNotification = async (req, res) => {
  try {
    const notification = req.body;
    if (
      !notification ||
      !notification.order_id ||
      !notification.signature_key
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid notification" });
    }

    if (!verifyNotificationSignature(notification)) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid signature" });
    }

    const transaction = await transactionModel.getTransactionByOrderId(
      notification.order_id,
    );
    if (!transaction) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found" });
    }

    if (
      Number(notification.gross_amount) !== Number(transaction.total_amount)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Amount mismatch" });
    }

    const paymentStatus = mapNotificationStatus(notification);
    if (!paymentStatus) {
      return res
        .status(400)
        .json({ success: false, message: "Unsupported payment status" });
    }

    const result = await transactionModel.applyPaymentStatus(
      notification.order_id,
      paymentStatus,
    );
    return res.json({ success: true, status: paymentStatus, result });
  } catch (error) {
    console.error("Error handling Midtrans notification:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

module.exports = { handleMidtransNotification };
