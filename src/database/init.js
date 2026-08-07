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

    const queryCreateTableProducts = `
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT NULL,
        price DECIMAL(10,2) NOT NULL,
        stock INT NOT NULL DEFAULT 0,
        image TEXT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `;

    console.log("Membuat tabel products...");
    await dbPool.execute(queryCreateTableProducts);
    console.log("Tabel products berhasil dibuat/diverifikasi");

    const queryCreateTableTransactions = `
      CREATE TABLE IF NOT EXISTS transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        status VARCHAR(20) DEFAULT 'completed',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `;

    const queryCreateTableTransactionItems = `
      CREATE TABLE IF NOT EXISTS transaction_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        transaction_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (transaction_id) REFERENCES transactions(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      );
    `;

    console.log("Membuat tabel transactions...");
    await dbPool.execute(queryCreateTableTransactions);
    console.log("Tabel transactions berhasil dibuat/diverifikasi");

    console.log("Membuat tabel transaction_items...");
    await dbPool.execute(queryCreateTableTransactionItems);
    console.log("Tabel transaction_items berhasil dibuat/diverifikasi");

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
