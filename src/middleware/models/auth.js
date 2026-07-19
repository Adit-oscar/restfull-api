const dbPool = require("../../config/database.js");

// Membuat user baru saat registrasi
const create = async (userData) => {
  const {
    name,
    username,
    email,
    password,
    role,
    auth_provider,
    profile_picture,
  } = userData;
  const query =
    "INSERT INTO users (name, username, email, password, role, auth_provider, profile_picture) VALUES (?, ?, ?, ?, ?, ?, ?)";

  const [result] = await dbPool.execute(query, [
    name,
    username,
    email,
    password,
    role,
    auth_provider || "local",
    profile_picture || null, // Simpan URL foto jika ada, jika tidak set null
  ]);
  return result.insertId;
};

const findUserByUsernameOrEmail = async (username, email = null) => {
  const searchEmail = email || username;

  // PERBAIKAN: Tambahkan profile_picture ke dalam SELECT
  const query =
    "SELECT id, name, username, email, password, role, auth_provider, profile_picture FROM users WHERE username = ? OR email = ?";

  const [rows] = await dbPool.execute(query, [username, searchEmail]);
  return rows;
};

module.exports = { findUserByUsernameOrEmail, create };
