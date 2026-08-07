const model = require("../models/transaction.js");
const productModel = require("../models/product.js");

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

    let totalAmount = 0;
    const validatedItems = [];

    for (const item of items) {
      const productRows = await productModel.getProductById(item.productId);

      if (productRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: `Product ${item.productId} not found`,
        });
      }

      const product = productRows[0];
      const quantity = parseInt(item.quantity, 10);

      if (isNaN(quantity) || quantity <= 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid quantity for product ${item.productId}`,
        });
      }

      if (product.stock < quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for product ${product.name}`,
        });
      }

      totalAmount += parseFloat(product.price) * quantity;
      validatedItems.push({
        productId: product.id,
        quantity,
        price: parseFloat(product.price),
      });
    }

    const transactionId = await model.createTransaction({
      userId,
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      items: validatedItems,
    });

    return res.status(201).json({
      success: true,
      message: "Transaction created successfully",
      data: {
        transactionId,
        totalAmount: parseFloat(totalAmount.toFixed(2)),
      },
    });
  } catch (error) {
    console.error("Error creating transaction:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
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
};
