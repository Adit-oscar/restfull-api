const dbPool = require("../config/database.js");

const getAllProducts = async ({ search = "", page = 1, limit = 10 } = {}) => {
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const keyword = `%${search}%`;

  const query = `
    SELECT id, name, description, price, stock, image, createdAt, updatedAt
    FROM products
    WHERE name LIKE ? OR description LIKE ?
    ORDER BY createdAt DESC
    LIMIT ? OFFSET ?
  `;

  const [rows] = await dbPool.execute(query, [
    keyword,
    keyword,
    parseInt(limit, 10),
    offset,
  ]);

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM products
    WHERE name LIKE ? OR description LIKE ?
  `;

  const [countRows] = await dbPool.execute(countQuery, [keyword, keyword]);

  return {
    data: rows,
    pagination: {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total: countRows[0].total,
      totalPages: Math.ceil(countRows[0].total / parseInt(limit, 10)),
    },
  };
};

const getProductById = async (id) => {
  const query =
    "SELECT id, name, description, price, stock, image, createdAt, updatedAt FROM products WHERE id = ?";
  const [rows] = await dbPool.execute(query, [id]);
  return rows;
};

const create = async (productData) => {
  const { name, description, price, stock, image } = productData;
  const query =
    "INSERT INTO products (name, description, price, stock, image) VALUES (?, ?, ?, ?, ?)";

  const [result] = await dbPool.execute(query, [
    name,
    description || null,
    price,
    stock,
    image || null,
  ]);

  return result.insertId;
};

const updateProduct = async (id, data) => {
  const fields = [];
  const values = [];
  const keys = Object.keys(data);

  for (const key of keys) {
    if (data[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(data[key]);
    }
  }

  if (fields.length === 0) return false;

  const query = "UPDATE products SET " + fields.join(", ") + " WHERE id = ?";
  const [result] = await dbPool.execute(query, [...values, id]);
  return result.affectedRows > 0;
};

const deleteProduct = async (id) => {
  const query = "DELETE FROM products WHERE id = ?";
  const [result] = await dbPool.execute(query, [id]);
  return result.affectedRows > 0;
};

module.exports = {
  getAllProducts,
  getProductById,
  create,
  updateProduct,
  deleteProduct,
};
