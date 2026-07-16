const dbPool = require("../config/database.js");

const getAllUsers = async () => {
  const query =
    "SELECT id, name, username, email, role, createdAt, updatedAt FROM users";

  const [rows] = await dbPool.execute(query);
  return rows;
};

const getUserById = async (id) => {
  const query =
    "SELECT id, name, username, email, role, createdAt, updatedAt FROM users WHERE id = ?";
  const [rows] = await dbPool.execute(query, [id]);
  return rows;
};

const findUserByUsernameOrEmail = async (username, email) => {
  const query =
    "SELECT username, email FROM users WHERE username = ? OR email = ?";
  const [rows] = await dbPool.execute(query, [username, email]);
  return rows;
};

const create = async (name, username, email, password, role) => {
  const query =
    "INSERT INTO users (name, username, email, password, role) VALUES (?, ?, ?, ?, ?)";

  const [result] = await dbPool.execute(query, [
    name,
    username,
    email,
    password,
    role,
  ]);

  return result.insertId;
};

const updateUser = async (id, data) => {
  const field = [];
  const values = [];

  // Menggunakan Object.keys untuk menghindari Prototype Pollution
  const keys = Object.keys(data);

  for (const key of keys) {
    // Hanya proses jika nilainya tidak undefined
    if (data[key] !== undefined) {
      field.push(`${key} = ?`);
      values.push(data[key]);
    }
  }

  // Jika tidak ada data valid yang dikirim untuk diupdate
  if (field.length === 0) return false;

  const query = "UPDATE users SET " + field.join(", ") + " WHERE id = ?";

  // Menggunakan spread operator untuk menggabungkan values dan id
  const [result] = await dbPool.execute(query, [...values, id]);

  return result.affectedRows > 0;
};

const deleteUser = async (id) => {
  const query = "DELETE FROM users WHERE id = ?";
  const [result] = await dbPool.execute(query, [id]);
  return result.affectedRows > 0;
};

module.exports = {
  getAllUsers,
  getUserById,
  findUserByUsernameOrEmail,
  create,
  updateUser,
  deleteUser,
};
