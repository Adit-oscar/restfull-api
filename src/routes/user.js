const express = require("express");
const multer = require("multer"); // Diperlukan untuk mengecek tipe error Multer
const { verifyToken, authorizeRoles } = require("../middleware/auth.js");
const uploadMiddleware = require("../middleware/upload.js"); // Sesuaikan path ini dengan lokasi file multer kamu
const router = express.Router();

const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} = require("../controllers/user.js");

// 1. Buat fungsi pembungkus untuk menangani error saat upload gambar
const handleUpload = (req, res, next) => {
  uploadMiddleware.single("profile_picture")(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "Ukuran berkas terlalu besar. Batas maksimal adalah 2MB.",
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
    next();
  });
};

// 2. Rute GET dan DELETE tetap sama seperti aslinya
router.get("/", verifyToken, getAllUsers);
router.get("/:id", verifyToken, getUserById);
router.delete("/:id", verifyToken, authorizeRoles("ADMIN"), deleteUser);

// 3. Sisipkan 'handleUpload' pada rute POST dan PATCH
router.post(
  "/",
  verifyToken,
  authorizeRoles("ADMIN"),
  handleUpload, // <-- Pengecekan file upload dilakukan di sini setelah user diverifikasi sbg ADMIN
  createUser,
);

router.patch(
  "/:id",
  verifyToken,
  authorizeRoles("ADMIN"),
  handleUpload, // <-- Berlaku juga untuk update data
  updateUser,
);

module.exports = router;
