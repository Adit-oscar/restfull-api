const model = require("../models/transaction.js");
const productModel = require("../models/product.js");
const userModel = require("../models/user.js");
const { createPayment } = require("../services/midtrans.js");

const createOrderId = () =>
  `ORDER-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const createTransaction = async (req, res) => {
  try {
    const { items } = req.body;
    const userId = req.user.id;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Items are required",
      });
    }

    const mergedItems = new Map();
    for (const item of items) {
      const productId = Number(item.productId);
      const quantity = Number(item.quantity);
      if (
        !Number.isInteger(productId) ||
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: `Invalid item for product ${item.productId}`,
        });
      }
      mergedItems.set(productId, (mergedItems.get(productId) || 0) + quantity);
    }

    let totalAmount = 0;
    const validatedItems = [];

    for (const [productId, quantity] of mergedItems) {
      const productRows = await productModel.getProductById(productId);

      if (productRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: `Product ${productId} not found`,
        });
      }

      const product = productRows[0];
      if (product.stock - (product.reserved_stock || 0) < quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for product ${product.name}`,
        });
      }

      totalAmount += Number(product.price) * quantity;
      validatedItems.push({
        productId: product.id,
        quantity,
        price: Number(product.price),
        name: product.name,
      });
    }

    const amount = Math.round(totalAmount);
    const orderId = createOrderId();
    const paymentExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const transactionId = await model.createPendingTransaction({
      userId,
      orderId,
      totalAmount: amount,
      items: validatedItems,
      paymentExpiry,
    });

    try {
      const userRows = await userModel.getUserById(userId);
      const customer = userRows[0] || { username: req.user.username };
      const payment = await createPayment({
        orderId,
        totalAmount: amount,
        items: validatedItems,
        customer,
      });
      await model.savePaymentToken(transactionId, payment.token);

      return res.status(201).json({
        success: true,
        message: "Payment created successfully",
        data: {
          transactionId,
          orderId,
          totalAmount: amount,
          status: "pending",
          ...payment,
        },
      });
    } catch (paymentError) {
      await model.cancelPendingTransaction(transactionId);
      throw paymentError;
    }
  } catch (error) {
    console.error("Error creating transaction:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getTransactionStatus = async (req, res) => {
  try {
    const transaction = await model.getTransactionByOrderId(
      req.params.orderId,
      req.user.id,
    );
    if (!transaction) {
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });
    }
    return res.json({ success: true, data: transaction });
  } catch (error) {
    console.error("Error fetching transaction status:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

const getUserTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    const rows = await model.getTransactionsByUser(userId);

    return res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  createTransaction,
  getUserTransactions,
  getTransactionStatus,
};
