const dbPool = require("../config/database.js");

const getAllUsers = async () => {
  const query =
    "SELECT id, name, username, email, auth_provider, role, profile_picture, createdAt, updatedAt FROM users";
  const [rows] = await dbPool.execute(query);
  return rows;
};

const getUserById = async (id) => {
  // PERBAIKAN: Menambahkan profile_picture, auth_provider ke dalam SELECT
  const query =
    "SELECT id, name, username, email, role, auth_provider, profile_picture, createdAt, updatedAt FROM users WHERE id = ?";
  const [rows] = await dbPool.execute(query, [id]);
  return rows;
};

const findUserByUsernameOrEmail = async (username, email = null) => {
  const searchEmail = email || username;
  const query =
    "SELECT id, username, email FROM users WHERE username = ? OR email = ?";
  const [rows] = await dbPool.execute(query, [username, searchEmail]);
  return rows;
};

// PERBAIKAN: Mengubah struktur parameter menjadi Objek (Sama dengan model auth)
const create = async (userData) => {
  const { name, username, email, password, role, profile_picture } = userData;
  const query =
    "INSERT INTO users (name, username, email, password, auth_provider, role, profile_picture) VALUES (?, ?, ?, ?, ?, ?, ?)";

  const [result] = await dbPool.execute(query, [
    name,
    username,
    email,
    password,
    "local",
    role || "USER",
    profile_picture || null,
  ]);
  return result.insertId;
};

// Fungsi update kamu sudah sangat bagus dengan Object.keys (Aman dari prototype pollution)
const updateUser = async (id, data) => {
  const field = [];
  const values = [];
  const keys = Object.keys(data);

  for (const key of keys) {
    if (data[key] !== undefined) {
      field.push(`${key} = ?`);
      values.push(data[key]);
    }
  }

  if (field.length === 0) return false;

  const query = "UPDATE users SET " + field.join(", ") + " WHERE id = ?";
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
