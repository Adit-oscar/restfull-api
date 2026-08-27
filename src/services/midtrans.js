const crypto = require("crypto");
const { createSnapClient, getPaymentConfig } = require("../config/payment.js");

const createPayment = async ({ orderId, totalAmount, items, customer }) => {
  const snap = createSnapClient();
  const config = getPaymentConfig();

  const result = await snap.createTransaction({
    transaction_details: {
      order_id: orderId,
      gross_amount: totalAmount,
    },
    item_details: items.map((item) => ({
      id: String(item.productId),
      price: item.price,
      quantity: item.quantity,
      name: item.name,
    })),
    customer_details: {
      first_name: customer.name || customer.username,
      email: customer.email,
    },
    callbacks: {
      finish: `${config.frontendUrl}/payment/finish`,
    },
  });

  return {
    token: result.token,
    redirectUrl: result.redirect_url,
  };
};

const verifyNotificationSignature = (notification) => {
  const serverKey = getPaymentConfig().serverKey;
  const input = `${notification.order_id}${notification.status_code}${notification.gross_amount}${serverKey}`;
  const expected = crypto.createHash("sha512").update(input).digest("hex");

  if (
    !notification.signature_key ||
    notification.signature_key.length !== expected.length
  ) {
    return false;
  }
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(notification.signature_key),
  );
};

const mapNotificationStatus = (notification) => {
  if (["capture", "settlement"].includes(notification.transaction_status)) {
    if (notification.fraud_status && notification.fraud_status !== "accept") {
      return "pending";
    }
    return "paid";
  }

  if (notification.transaction_status === "pending") return "pending";
  if (notification.transaction_status === "expire") return "expired";
  if (["deny", "cancel", "failure"].includes(notification.transaction_status)) {
    return "failed";
  }
  if (["refund", "partial_refund"].includes(notification.transaction_status)) {
    return "refunded";
  }

  return null;
};

module.exports = {
  createPayment,
  verifyNotificationSignature,
  mapNotificationStatus,
};
