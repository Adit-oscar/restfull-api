const env = require("dotenv");
const bcrypt = require("bcrypt");
const dbPool = require("../../config/database"); // Sesuaikan path ke file database Anda

env.config();

async function seedUsers() {
  try {
    console.log("=== Memulai Proses Seeding Data Users ===");

    // 1. Enkripsi password data dummy agar realistis
    const hashedPassword = await bcrypt.hash("password123", 10);

    // 2. Siapkan data dummy yang akan dimasukkan
    const dummyUsers = [
      ["Admin Aplikasi", "admin", "admin@mail.com", hashedPassword, "ADMIN"],
      ["Budi Santoso", "budi", "budi@mail.com", hashedPassword, "USER"],
      ["Siti Aminah", "siti", "siti@mail.com", hashedPassword, "USER"],
    ];

    // 3. Query INSERT menggunakan klausa ON DUPLICATE KEY UPDATE
    // Supaya script ini bisa dijalankan berkali-kali tanpa error 'Duplicate Entry' pada username/email
    const query = `
      INSERT INTO users (name, username, email, password, role) 
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        name = VALUES(name),
        role = VALUES(role);
    `;

    console.log("Memasukkan data dummy ke tabel users...");

    // 4. Eksekusi query secara paralel / sekuensial menggunakan Promise.all
    const promises = dummyUsers.map((user) => dbPool.execute(query, user));
    await Promise.all(promises);

    console.log(
      ` Berhasil menambahkan/memperbarui ${dummyUsers.length} user dummy.`,
    );
    console.log("=== Seeding Selesai dengan Sukses! ===");

    // 5. Bersihkan koneksi pool agar proses Node.js selesai
    await dbPool.end();
    process.exit(0);
  } catch (error) {
    console.error("Gagal melakukan seeding database:", error.message);
    await dbPool.end();
    process.exit(1);
  }
}

seedUsers();
