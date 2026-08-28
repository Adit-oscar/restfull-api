const dbPool = require("../config/database.js");

const createPendingTransaction = async (transactionData) => {
  const { userId, orderId, totalAmount, items, paymentExpiry } =
    transactionData;

  const connection = await dbPool.getConnection();

  try {
    await connection.beginTransaction();

    const lockedItems = [];
    const itemsByProduct = [...items].sort(
      (left, right) => left.productId - right.productId,
    );
    for (const item of itemsByProduct) {
      const [productRows] = await connection.execute(
        "SELECT id, name, price, stock, reserved_stock FROM products WHERE id = ? FOR UPDATE",
        [item.productId],
      );
      const product = productRows[0];

      if (!product || product.stock - product.reserved_stock < item.quantity) {
        const error = new Error(
          `Insufficient stock for product ${item.productId}`,
        );
        error.statusCode = 400;
        throw error;
      }
      lockedItems.push({ ...item, name: product.name });
    }

    const [transactionResult] = await connection.execute(
      `INSERT INTO transactions
        (user_id, order_id, payment_provider, total_amount, status, payment_status, payment_expiry)
       VALUES (?, ?, 'midtrans', ?, 'pending', 'pending', ?)`,
      [userId, orderId, totalAmount, paymentExpiry],
    );

    const transactionId = transactionResult.insertId;

    for (const item of lockedItems) {
      await connection.execute(
        "INSERT INTO transaction_items (transaction_id, product_id, quantity, price) VALUES (?, ?, ?, ?)",
        [transactionId, item.productId, item.quantity, item.price],
      );

      await connection.execute(
        "UPDATE products SET reserved_stock = reserved_stock + ? WHERE id = ?",
        [item.quantity, item.productId],
      );
    }

    await connection.commit();
    return transactionId;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const savePaymentToken = async (transactionId, token) => {
  await dbPool.execute(
    "UPDATE transactions SET payment_token = ? WHERE id = ? AND status = 'pending'",
    [token, transactionId],
  );
};

const cancelPendingTransaction = async (transactionId) => {
  const connection = await dbPool.getConnection();
  try {
    await connection.beginTransaction();

    // RACE-CONDITION GUARD: serialize cancellation with payment updates.
    const [transactions] = await connection.execute(
      "SELECT id, status FROM transactions WHERE id = ? FOR UPDATE",
      [transactionId],
    );
    const transaction = transactions[0];
    if (!transaction || transaction.status !== "pending") {
      await connection.commit();
      return false;
    }

    const [items] = await connection.execute(
      "SELECT product_id, quantity FROM transaction_items WHERE transaction_id = ? FOR UPDATE",
      [transactionId],
    );
    for (const item of items) {
      await connection.execute(
        "UPDATE products SET reserved_stock = GREATEST(0, reserved_stock - ?) WHERE id = ?",
        [item.quantity, item.product_id],
      );
    }
    await connection.execute(
      "UPDATE transactions SET status = 'failed', payment_status = 'failed' WHERE id = ?",
      [transactionId],
    );
    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const getTransactionByOrderId = async (orderId, userId = null) => {
  const query = `
    SELECT t.id, t.user_id, t.order_id, t.total_amount, t.status,
           t.payment_status, t.payment_token, t.payment_expiry, t.paid_at,
           t.createdAt, t.updatedAt
    FROM transactions t
    WHERE t.order_id = ? ${userId === null ? "" : "AND t.user_id = ?"}
  `;
  const [rows] = await dbPool.execute(
    query,
    userId === null ? [orderId] : [orderId, userId],
  );
  return rows[0] || null;
};

const applyPaymentStatus = async (orderId, paymentStatus) => {
  const connection = await dbPool.getConnection();
  try {
    await connection.beginTransaction();
    const [transactions] = await connection.execute(
      "SELECT id, status FROM transactions WHERE order_id = ? FOR UPDATE",
      [orderId],
    );
    const transaction = transactions[0];
    if (!transaction) {
      await connection.rollback();
      return "not_found";
    }
    if (transaction.status === "paid" && paymentStatus === "paid") {
      await connection.commit();
      return "already_processed";
    }
    if (
      ["failed", "expired", "refunded"].includes(transaction.status) &&
      !(transaction.status === "paid" && paymentStatus === "refunded")
    ) {
      await connection.commit();
      return "already_processed";
    }

    const [items] = await connection.execute(
      "SELECT product_id, quantity FROM transaction_items WHERE transaction_id = ? ORDER BY product_id",
      [transaction.id],
    );
    if (paymentStatus === "paid") {
      for (const item of items) {
        const [result] = await connection.execute(
          `UPDATE products
           SET stock = stock - ?, reserved_stock = reserved_stock - ?
           WHERE id = ? AND stock >= ? AND reserved_stock >= ?`,
          [
            item.quantity,
            item.quantity,
            item.product_id,
            item.quantity,
            item.quantity,
          ],
        );
        if (result.affectedRows !== 1) {
          throw new Error("Reserved stock is no longer available");
        }
      }
      await connection.execute(
        "UPDATE transactions SET status = 'paid', payment_status = 'paid', paid_at = COALESCE(paid_at, NOW()) WHERE id = ?",
        [transaction.id],
      );
    } else if (paymentStatus === "refunded" && transaction.status === "paid") {
      await connection.execute(
        "UPDATE transactions SET status = 'refunded', payment_status = 'refunded' WHERE id = ?",
        [transaction.id],
      );
    } else if (["failed", "expired"].includes(paymentStatus)) {
      if (transaction.status === "pending") {
        for (const item of items) {
          await connection.execute(
            "UPDATE products SET reserved_stock = GREATEST(0, reserved_stock - ?) WHERE id = ?",
            [item.quantity, item.product_id],
          );
        }
      }
      await connection.execute(
        "UPDATE transactions SET status = ?, payment_status = ? WHERE id = ? AND status = 'pending'",
        [paymentStatus, paymentStatus, transaction.id],
      );
    } else {
      await connection.execute(
        "UPDATE transactions SET payment_status = 'pending' WHERE id = ? AND status = 'pending'",
        [transaction.id],
      );
    }
    await connection.commit();
    return "processed";
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const getTransactionsByUser = async (userId) => {
  const query = `
        SELECT t.id, t.user_id, t.order_id, t.total_amount, t.status,
          t.payment_status, t.payment_token, t.payment_expiry, t.paid_at, t.createdAt,
           ti.product_id, ti.quantity, ti.price, p.name AS product_name
    FROM transactions t
    LEFT JOIN transaction_items ti ON t.id = ti.transaction_id
    LEFT JOIN products p ON ti.product_id = p.id
    WHERE t.user_id = ?
    ORDER BY t.createdAt DESC, ti.product_id ASC
  `;

  const [rows] = await dbPool.execute(query, [userId]);
  return rows;
};

module.exports = {
  createPendingTransaction,
  savePaymentToken,
  cancelPendingTransaction,
  getTransactionByOrderId,
  applyPaymentStatus,
  getTransactionsByUser,
};
