const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const model = require("../models/auth");

const register = async (req, res) => {
  try {
    const { name, username, email, password } = req.body;

    // 1. Validasi input dasar
    if (!name || !username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields (name, username, email, password) are required",
      });
    }

    // 2. Cek apakah username atau email sudah terdaftar
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

    // 3. Hash password sebelum disimpan ke database
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 4. Set default role (misal: "USER") dan simpan ke database
    const defaultRole = "USER";
    const userId = await model.create({
      name,
      username,
      email,
      password: hashedPassword,
      role: defaultRole,
    });

    // 5. Kembalikan respon sukses
    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        id: userId,
        name,
        username,
        email,
        role: defaultRole,
      },
    });
  } catch (error) {
    console.error("Error during registration:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // Validate input
    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: "Identifier and password are required",
      });
    }

    // Check if the user exists
    const user = await model.findUserByUsernameOrEmail(identifier);

    if (user.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid username/email or password",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user[0].password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid username/email or password",
      });
    }

    delete user[0].password; // Remove password from the user object before sending the response

    const token = jwt.sign(
      { id: user[0].id, username: user[0].username, role: user[0].role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    // If we reach here, the user is authenticated
    return res.json({
      success: true,
      message: "Login successful",
      data: user[0],
      token,
    });
  } catch (error) {
    console.error("Error during login:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = { register, login };
