const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  // 1. Jika token tidak dikirim sama sekali
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Akses ditolak. Token tidak ditemukan.",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Menyimpan payload JWT (misal: id, email, role) ke req.user
    next(); // Lanjut ke controller berikutnya
  } catch (error) {
    // 2. Tangkap error spesifik jika token Kedaluwarsa (Expired)
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message:
          "Sesi Anda telah berakhir (Token Expired). Silakan login kembali.",
      });
    }

    // 3. Tangkap error jika token Rusak / Ditembus secara ilegal (JsonWebTokenError)
    return res.status(401).json({
      success: false,
      message: "Token tidak valid.",
    });
  }
};

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    // 1. Pastikan req.user ada (artinya verifyToken harus dijalankan LEBIH DAHULU)
    if (!req.user) {
      return res.status(500).json({
        success: false,
        message:
          "Internal server error: User context not found. Ensure verifyToken is called first.",
      });
    }

    // 2. Cek apakah role milik user termasuk dalam role yang diizinkan
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Your role (${req.user.role}) does not have permission to access this resource.`,
      });
    }

    // 3. Jika cocok, silakan lanjut ke controller
    next();
  };
};

module.exports = {
  verifyToken,
  authorizeRoles,
};
