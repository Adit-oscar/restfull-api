const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const model = require("../models/auth");
const [google, oauth2Client] = require("../config/oauth2");

const checkAvailability = async (req, res) => {
  try {
    const { username, email } = req.body;

    if (!username && !email) {
      return res.status(400).json({
        success: false,
        available: false,
        message: "Username or email is required",
      });
    }

    const existingUsers = await model.findUserByUsernameOrEmail(
      username,
      email,
    );
    const duplicates = [];

    if (username && existingUsers.some((user) => user.username === username)) {
      duplicates.push("username");
    }

    if (email && existingUsers.some((user) => user.email === email)) {
      duplicates.push("email");
    }

    if (duplicates.length > 0) {
      const duplicateMessage =
        duplicates.length === 2
          ? "Username and email already registered"
          : duplicates[0] === "username"
            ? "Username already exists"
            : "Email already exists";

      return res.status(409).json({
        success: false,
        available: false,
        duplicates,
        message: duplicateMessage,
      });
    }

    return res.status(200).json({
      success: true,
      available: true,
      duplicates: [],
      message: "Username and email are available",
    });
  } catch (error) {
    console.error("Error checking availability:", error);
    return res.status(500).json({
      success: false,
      available: false,
      message: "Internal server error",
    });
  }
};

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
      auth_provider: "local",
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

    // Cek apakah akun ini didaftarkan via Google
    if (user[0].auth_provider === "google") {
      return res.status(400).json({
        success: false,
        message: "This account uses Google Login. Please sign in with Google.",
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
      message: `Internal server error: ${error.message}`,
    });
  }
};

const googleAuth = (req, res) => {
  const scopes = [
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/userinfo.email",
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    include_granted_scopes: true,
  });

  res.redirect(authUrl);
};

const googleCallback = async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      // Jika user membatalkan login di Google screen
      return res.redirect("http://localhost:5173/login?error=auth_cancelled");
    }

    // 1. Tukar code dari URL menjadi access token Google
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    // 2. Ambil informasi profile user dari Google API
    const oauth2 = google.oauth2({
      auth: oauth2Client,
      version: "v2",
    });

    const userInfo = await oauth2.userinfo.get();
    const { id: googleId, email, name, picture } = userInfo.data;

    // 3. Cek apakah email user sudah terdaftar di database lokal
    let userResult = await model.findUserByUsernameOrEmail(email);
    let targetUser;

    if (userResult.length === 0) {
      // Jika email belum ada, daftarkan otomatis sebagai user baru
      // Username di-generate otomatis dari bagian depan email agar unik
      const autoUsername =
        email.split("@")[0] + "_" + Math.floor(Math.random() * 1000);
      const defaultRole = "USER";

      const randomPassword = crypto.randomBytes(32).toString("hex");

      const saltRount = 10;
      const hashedPassword = await bcrypt.hash(randomPassword, saltRount);

      const newUserId = await model.create({
        name: name || autoUsername,
        username: autoUsername,
        email: email,
        password: hashedPassword,
        role: defaultRole,
        auth_provider: "google",
        profile_picture: picture,
      });

      targetUser = {
        id: newUserId,
        username: autoUsername,
        role: defaultRole,
        profile_picture: picture,
      };
    } else {
      // Jika user sudah terdaftar sebelumnya
      targetUser = userResult[0];
    }

    // 4. Buat JWT internal lokal dengan format yang persis sama seperti method login() biasa
    const token = jwt.sign(
      {
        id: targetUser.id,
        username: targetUser.username,
        role: targetUser.role,
        profile_picture: targetUser.profile_picture,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );

    // 5. Lempar token ke Frontend (Contoh alamat React Anda)

    // cara 1 redirect ke frontend
    return res.redirect(
      `http://localhost:5173/auth/oauth-success?token=${token}`,
    );

    // cara 2 kirim token sebagai JSON response
    // return res.json({
    //   success: true,
    //   message: "Google OAuth login successful",
    //   token,
    // });
  } catch (error) {
    console.error("Error during Google OAuth Callback:", error);
    // error cara 1
    return res.redirect("http://localhost:5173/auth/login?error=server_error");

    // error cara 2
    // return res.status(500).json({
    //   success: false,
    //   message: "Internal server error during Google OAuth",
    // });
  }
};

module.exports = {
  register,
  login,
  googleAuth,
  googleCallback,
  checkAvailability,
};
