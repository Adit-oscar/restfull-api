const mysql = require("mysql2/promise");
const env = require("dotenv");

// PENTING: Load env di paling atas
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

    await dbPool.execute(`DROP TABLE \`${tableName}\``);
    console.log(`Tabel ${tableName} kosong; tabel dihapus untuk dibuat ulang`);
  }
};

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

    // Hapus hanya tabel kosong. Data pada tabel yang sudah digunakan tidak dihapus.
    // Urutan terbalik menjaga foreign key transaction_items -> transactions/products.
    for (const tableName of [
      "transaction_items",
      "transactions",
      "products",
      "users",
    ]) {
      await recreateEmptyTable(dbPool, tableName);
    }

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
        reserved_stock INT NOT NULL DEFAULT 0,
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

    await dbPool.execute(
      "ALTER TABLE transactions MODIFY COLUMN payment_provider VARCHAR(30) NOT NULL DEFAULT 'midtrans'",
    );
    await dbPool.execute(
      "ALTER TABLE transactions MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'pending'",
    );
    await dbPool.execute(
      "ALTER TABLE transactions MODIFY COLUMN payment_status VARCHAR(20) NOT NULL DEFAULT 'pending'",
    );

    await dbPool.execute(
      "UPDATE transactions SET order_id = CONCAT('LEGACY-', id) WHERE order_id IS NULL",
    );
    await dbPool.execute(
      "ALTER TABLE transactions MODIFY COLUMN order_id VARCHAR(100) NOT NULL",
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

    // Tutup pool agar script Node.js berhenti otomatis
    await dbPool.end();

    // Perbaikan: typo 'proccess' -> 'process', dan exit code '0' untuk sukses
    process.exit(0);
  } catch (error) {
    console.error("Gagal melakukan inisialisasi database:", {
      code: error.code,
      errno: error.errno,
      sqlMessage: error.sqlMessage,
      message: error.message,
    });
    if (tempConnection) await tempConnection.end();
    process.exit(1);
  }
}

// Panggil fungsinya
initialDatabase();
