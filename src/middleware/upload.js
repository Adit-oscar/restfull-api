const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Tentukan direktori tempat menyimpan gambar profil
const targetDir = path.join(__dirname, "../../public/uploads/profiles");

// Pastikan folder penyimpanan otomatis terbuat jika belum ada saat aplikasi berjalan
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// 1. Konfigurasi Penyimpanan (Storage)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, targetDir);
  },
  filename: (req, file, cb) => {
    // Membuat nama berkas unik: timestamp + teks acak + ekstensi asli
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `profile-${uniqueSuffix}${ext}`);
  },
});

// 2. Konfigurasi Validasi Tipe Berkas (File Filter)
const fileFilter = (req, file, cb) => {
  // Hanya menerima tipe mime gambar tertentu
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/jpg",
    "image/webp",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true); // Terima berkas
  } else {
    // Tolak berkas dengan mengirimkan error teks biasa
    cb(
      new Error(
        "Format berkas tidak didukung. Hanya diperbolehkan mengunggah gambar (JPEG, JPG, PNG, WEBP)",
      ),
    );
  }
};

// 3. Inisialisasi Multer dengan Batasan Ukuran (Max 2MB)
const uploadMiddleware = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // Batasan ukuran berkas: 2 Megabita
  },
});

module.exports = uploadMiddleware;
