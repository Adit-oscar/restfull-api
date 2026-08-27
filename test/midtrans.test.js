const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const test = require("node:test");

process.env.MIDTRANS_SERVER_KEY = "unit-test-server-key";
process.env.MIDTRANS_CLIENT_KEY = "unit-test-client-key";

const {
  verifyNotificationSignature,
  mapNotificationStatus,
} = require("../src/services/midtrans.js");

const signedNotification = (overrides = {}) => {
  const notification = {
    order_id: "ORDER-1",
    status_code: "200",
    gross_amount: "10000",
    transaction_status: "settlement",
    signature_key: "",
    ...overrides,
  };
  notification.signature_key = crypto
    .createHash("sha512")
    .update(
      `${notification.order_id}${notification.status_code}${notification.gross_amount}${process.env.MIDTRANS_SERVER_KEY}`,
    )
    .digest("hex");
  return notification;
};

test("accepts a valid Midtrans signature", () => {
  assert.equal(verifyNotificationSignature(signedNotification()), true);
});

test("rejects a tampered or malformed signature", () => {
  const tampered = signedNotification();
  tampered.gross_amount = "9999";
  assert.equal(verifyNotificationSignature(tampered), false);
  assert.equal(
    verifyNotificationSignature({
      ...signedNotification(),
      signature_key: "short",
    }),
    false,
  );
});

test("maps Midtrans statuses to internal payment statuses", () => {
  assert.equal(
    mapNotificationStatus({ transaction_status: "settlement" }),
    "paid",
  );
  assert.equal(
    mapNotificationStatus({ transaction_status: "pending" }),
    "pending",
  );
  assert.equal(
    mapNotificationStatus({ transaction_status: "expire" }),
    "expired",
  );
  assert.equal(mapNotificationStatus({ transaction_status: "deny" }), "failed");
  assert.equal(
    mapNotificationStatus({ transaction_status: "refund" }),
    "refunded",
  );
  assert.equal(mapNotificationStatus({ transaction_status: "unknown" }), null);
});
