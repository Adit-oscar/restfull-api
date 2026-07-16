const dbPool = require("../config/database.js");

// Membuat user baru saat registrasi
const create = async (userData) => {
  const { name, username, email, password, role } = userData;
  const query =
    "INSERT INTO users (name, username, email, password, role) VALUES (?, ?, ?, ?, ?)";

  const [result] = await dbPool.execute(query, [
    name,
    username,
    email,
    password,
    role,
  ]);
  return result.insertId; // Mengembalikan ID user baru
};

const findUserByUsernameOrEmail = async (username, email = null) => {
  // Jika parameter kedua tidak dikirim (seperti saat login), gunakan parameter pertama untuk kedua kolom
  const searchEmail = email || username;

  const query =
    "SELECT id, name, username, email, password, role FROM users WHERE username = ? OR email = ?";
  const [rows] = await dbPool.execute(query, [username, searchEmail]);
  return rows;
};

module.exports = { findUserByUsernameOrEmail, create };
