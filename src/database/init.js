const mysql = require("mysql2/promise");
const env = require("dotenv");

// Load env di paling atas
env.config();

const tableExists = async (dbPool, tableName) => {
  const [rows] = await dbPool.execute(
    `SELECT COUNT(*) AS total
     FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = ?`,
    [tableName],
  );
  return rows[0].total > 0;
};

const tableHasData = async (dbPool, tableName) => {
  const [rows] = await dbPool.execute(`SELECT 1 FROM \`${tableName}\` LIMIT 1`);
  return rows.length > 0;
};

const columnExists = async (dbPool, tableName, columnName) => {
  const [rows] = await dbPool.execute(
    `SELECT COUNT(*) AS total
     FROM information_schema.columns
     WHERE table_schema = DATABASE()
        AND table_name = ?
        AND column_name = ?`,
    [tableName, columnName],
  );
  return rows[0].total > 0;
};

const addColumnIfMissing = async (
  dbPool,
  tableName,
  columnName,
  definition,
) => {
  if (!(await columnExists(dbPool, tableName, columnName))) {
    await dbPool.execute(
      `ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${definition}`,
    );
    console.log(`Kolom ${tableName}.${columnName} berhasil ditambahkan`);
  }
};

const indexExists = async (dbPool, tableName, indexName) => {
  const [rows] = await dbPool.execute(
    `SELECT COUNT(*) AS total
     FROM information_schema.statistics
     WHERE table_schema = DATABASE()
        AND table_name = ?
        AND index_name = ?`,
    [tableName, indexName],
  );
  return rows[0].total > 0;
};

const recreateEmptyTable = async (dbPool, tableName) => {
  if (await tableExists(dbPool, tableName)) {
    if (await tableHasData(dbPool, tableName)) {
      console.log(`Tabel ${tableName} memiliki data; tabel dipertahankan`);
      return;
    }

    await dbPool.execute(`DROP TABLE IF EXISTS \`${tableName}\``);
    console.log(`Tabel ${tableName} kosong; tabel dihapus untuk dibuat ulang`);
  }
};

async function initialDatabase() {
  let tempConnection;
  let dbPool;

  try {
    console.log("Memulai inisialisasi database...");

    // 1. Koneksi sementara tanpa nama database
    tempConnection = await mysql.createConnection({
      user: process.env.USER,
      host: process.env.HOST,
      password: process.env.PASSWORD,
    });

    const dbName = process.env.DATABASE;
    console.log(`Menyiapkan database: ${dbName}`);

    await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    console.log(`Database ${dbName} berhasil dipastikan ada`);

    await tempConnection.end();
    tempConnection = null;

    console.log("Menghubungkan ke database melalui dbPool...");
    dbPool = require("../config/database");

    // Matikan pengecekan Foreign Key sementara
    await dbPool.execute("SET FOREIGN_KEY_CHECKS = 0");

    // Hapus tabel kosong jika ada
    for (const tableName of [
      "transaction_items",
      "transactions",
      "products",
      "users",
    ]) {
      await recreateEmptyTable(dbPool, tableName);
    }

    // Hidupkan kembali pengecekan Foreign Key
    await dbPool.execute("SET FOREIGN_KEY_CHECKS = 1");

    // 2. Pembuatan Tabel (Schema Utama)
    console.log("Membuat tabel users...");
    await dbPool.execute(`
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
    `);

    console.log("Membuat tabel products...");
    await dbPool.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT NULL,
        price DECIMAL(10,2) NOT NULL,
        stock INT NOT NULL DEFAULT 0,
        reserved_stock INT NOT NULL DEFAULT 0,
        image TEXT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );
    `);

    console.log("Membuat tabel transactions...");
    await dbPool.execute(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        order_id VARCHAR(100) NOT NULL UNIQUE,
        payment_provider VARCHAR(30) NOT NULL DEFAULT 'midtrans',
        total_amount DECIMAL(10,2) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        payment_status VARCHAR(20) DEFAULT 'pending',
        payment_token VARCHAR(255) NULL,
        payment_expiry DATETIME NULL,
        paid_at DATETIME NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);

    console.log("Membuat tabel transaction_items...");
    await dbPool.execute(`
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
    `);

    // 3. Migrasi Kolom / Penyesuaian Struktural (Untuk Tabel Lama yang Sudah Ada Data)
    await addColumnIfMissing(
      dbPool,
      "products",
      "reserved_stock",
      "INT NOT NULL DEFAULT 0",
    );
    await addColumnIfMissing(
      dbPool,
      "transactions",
      "order_id",
      "VARCHAR(100) NULL",
    );
    await addColumnIfMissing(
      dbPool,
      "transactions",
      "payment_provider",
      "VARCHAR(30) NOT NULL DEFAULT 'midtrans'",
    );
    await addColumnIfMissing(
      dbPool,
      "transactions",
      "payment_status",
      "VARCHAR(20) NOT NULL DEFAULT 'pending'",
    );
    await addColumnIfMissing(
      dbPool,
      "transactions",
      "payment_token",
      "VARCHAR(255) NULL",
    );
    await addColumnIfMissing(
      dbPool,
      "transactions",
      "payment_expiry",
      "DATETIME NULL",
    );
    await addColumnIfMissing(
      dbPool,
      "transactions",
      "paid_at",
      "DATETIME NULL",
    );

    // Perbaikan legacy data jika ada transaksi lama tanpa order_id
    await dbPool.execute(
      "UPDATE transactions SET order_id = CONCAT('LEGACY-', id) WHERE order_id IS NULL",
    );

    if (
      !(await indexExists(dbPool, "transactions", "idx_transactions_order_id"))
    ) {
      await dbPool.execute(
        "ALTER TABLE transactions ADD UNIQUE INDEX idx_transactions_order_id (order_id)",
      );
      console.log(
        "Unique index idx_transactions_order_id berhasil ditambahkan",
      );
    }

    console.log("Inisialisasi database berhasil selesai.");

    // Tutup koneksi pool secara aman
    await dbPool.end();
    process.exit(0);
  } catch (error) {
    console.error("Gagal melakukan inisialisasi database:", {
      code: error.code,
      errno: error.errno,
      sqlMessage: error.sqlMessage,
      message: error.message,
    });

    if (tempConnection) await tempConnection.end();
    if (dbPool) await dbPool.end();

    process.exit(1);
  }
}

// Jalankan skrip
initialDatabase();
