const midtransClient = require("midtrans-client");

const getPaymentConfig = () => {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  const clientKey = process.env.MIDTRANS_CLIENT_KEY;

  if (!serverKey || !clientKey) {
    throw new Error(
      "MIDTRANS_SERVER_KEY and MIDTRANS_CLIENT_KEY must be configured",
    );
  }

  return {
    serverKey,
    clientKey,
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
    frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  };
};

const createSnapClient = () => {
  const config = getPaymentConfig();
  return new midtransClient.Snap({
    isProduction: config.isProduction,
    serverKey: config.serverKey,
    clientKey: config.clientKey,
  });
};

module.exports = {
  getPaymentConfig,
  createSnapClient,
};
