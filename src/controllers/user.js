const bcrypt = require("bcrypt");
const model = require("../middleware/models/user.js");

const getAllUsers = async (req, res) => {
  try {
    const rows = await model.getAllUsers();

    return res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await model.getUserById(parseInt(id));

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const createUser = async (req, res) => {
  try {
    const {
      name,
      username,
      email,
      password,
      role,
      profile_picture = "",
    } = req.body;

    // Validasi input
    if (!name || !username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // Cek apakah username atau email sudah ada
    const existingUsers = await model.findUserByUsernameOrEmail(
      username,
      email,
    );

    if (existingUsers.length > 0) {
      const existingUser = existingUsers[0];

      if (existingUser.username === username) {
        return res.status(409).json({
          success: false,
          message: "Username already exists",
        });
      }

      if (existingUser.email === email) {
        return res.status(409).json({
          success: false,
          message: "Email already exists",
        });
      }
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const userRole = role || "USER"; // Default role jika tidak diberikan
    const auth_provider = "local";
    const result = await model.create(
      name,
      username,
      email,
      hashedPassword,
      userRole,
      profile_picture,
    );

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      userId: result, // Mengembalikan ID pengguna yang baru dibuat
    });
  } catch (error) {
    // 2. Error detail tetap dicatat di server console (untuk debugging),
    // tetapi klien hanya menerima pesan umum "Internal server error" demi keamanan.
    console.error("Error creating user:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, username, email, password, role } = req.body;

    const dataUpdate = {};

    // 1. Validasi & Cek Duplikasi secara selektif (hanya jika dikirim dari client)
    if (username || email) {
      const existingUsers = await model.findUserByUsernameOrEmail(
        username || null,
        email || null,
      );

      if (existingUsers && existingUsers.length > 0) {
        const existingUser = existingUsers[0];

        // Pastikan datanya bukan milik user yang sedang diupdate saat ini
        if (
          username &&
          existingUser.username === username &&
          existingUser.id !== parseInt(id)
        ) {
          return res.status(409).json({
            success: false,
            message: "Username already exists",
          });
        }

        if (
          email &&
          existingUser.email === email &&
          existingUser.id !== parseInt(id)
        ) {
          return res.status(409).json({
            success: false,
            message: "Email already exists",
          });
        }
      }
    }

    // 2. Isi objek dataUpdate secara dinamis
    if (name) dataUpdate.name = name;
    if (username) dataUpdate.username = username;
    if (email) dataUpdate.email = email;
    if (role) dataUpdate.role = role;

    // 3. Tangani hashing password hanya jika ada password baru yang dikirim
    if (password) {
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      dataUpdate.password = hashedPassword;
    }

    // 4. Jika client mengirimkan body kosong
    if (Object.keys(dataUpdate).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields to update",
      });
    }

    // 5. PERBAIKAN: Panggil model update dengan mengirimkan ID dan Objek dinamisnya langsung
    const result = await model.updateUser(parseInt(id), dataUpdate);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "User not found or no changes made",
      });
    }

    return res.json({
      success: true,
      message: "User updated successfully",
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await model.deleteUser(parseInt(id));

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};
