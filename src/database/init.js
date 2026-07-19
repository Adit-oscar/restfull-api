const mysql = require("mysql2/promise");
const env = require("dotenv");

// PENTING: Load env di paling atas
env.config();

async function initialDatabase() {
  let tempConnection;

  try {
    console.log("Memulai inisialisasi database...");

    // 1. Buat koneksi sementara tanpa menyertakan opsi database
    tempConnection = await mysql.createConnection({
      user: process.env.USER,
      host: process.env.HOST,
      password: process.env.PASSWORD,
    });

    const dbName = process.env.DATABASE;
    console.log(`Menyiapkan database: ${dbName}`);

    // Perbaikan: Gunakan backtick `` dan IF NOT EXISTS (pakai S)
    await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    console.log(`Database ${dbName} berhasil dipastikan ada`);

    // Tutup koneksi sementara
    await tempConnection.end();

    console.log("Menghubungkan ke database melalui dbPool...");

    // Perbaikan: Impor dbPool DI SINI (setelah database dipastikan ada)
    const dbPool = require("../config/database");

    // Perbaikan: Tambahkan koma setelah kolom createdAt dan gunakan IF NOT EXISTS
    const queryCreateTableUser = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255),
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'USER',
        profile_picture TEXT NULL,
        auth_provider VARCHAR(20) DEFAULT 'local',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `;

    console.log("Membuat tabel users...");
    await dbPool.execute(queryCreateTableUser);
    console.log("Tabel users berhasil dibuat/diverifikasi");

    // Tutup pool agar script Node.js berhenti otomatis
    await dbPool.end();

    // Perbaikan: typo 'proccess' -> 'process', dan exit code '0' untuk sukses
    process.exit(0);
  } catch (error) {
    console.log(`Gagal melakukan inisialisasi database: ${error.message}`);
    if (tempConnection) await tempConnection.end();
    process.exit(1);
  }
}

// Panggil fungsinya
initialDatabase();
