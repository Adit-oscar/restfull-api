const dbPool = require("../config/database.js");

const createTransaction = async (transactionData) => {
  const { userId, totalAmount, items } = transactionData;

  const connection = await dbPool.getConnection();

  try {
    await connection.beginTransaction();

    const [transactionResult] = await connection.execute(
      "INSERT INTO transactions (user_id, total_amount, status) VALUES (?, ?, ?)",
      [userId, totalAmount, "completed"],
    );

    const transactionId = transactionResult.insertId;

    for (const item of items) {
      await connection.execute(
        "INSERT INTO transaction_items (transaction_id, product_id, quantity, price) VALUES (?, ?, ?, ?)",
        [transactionId, item.productId, item.quantity, item.price],
      );

      await connection.execute(
        "UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?",
        [item.quantity, item.productId, item.quantity],
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

const getTransactionsByUser = async (userId) => {
  const query = `
    SELECT t.id, t.user_id, t.total_amount, t.status, t.createdAt,
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
  createTransaction,
  getTransactionsByUser,
};
