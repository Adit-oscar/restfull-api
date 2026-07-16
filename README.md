# 🚀 Node.js Express RESTful API - Authentication & User Management

Repositori ini berisi implementasi backend RESTful API menggunakan Node.js dan framework Express. Proyek ini dilengkapi dengan sistem autentikasi fleksibel (login menggunakan Username atau Email), enkripsi password, pengamanan endpoint menggunakan JSON Web Token (JWT), serta pembatasan hak akses berbasis peran (Role-Based Access Control / RBAC).

# ✨ Fitur Utama
Flexible Authentication: Registrasi akun baru dan login dinamis menggunakan username ATAU email.
Password Security: Pengamanan kata sandi menggunakan hashing bcrypt.
Route Protection: Middleware verifikasi JWT untuk melindungi endpoint privat.
Role-Based Authorization: Middleware khusus untuk membatasi akses endpoint tertentu (misal: fitur hapus hanya untuk ADMIN).
Database Connection: Integrasi database MySQL menggunakan mysql2 dengan skema Connection Pool yang efisien.

# 📁 Struktur Direktori Proyek
```
├── config/
│   └── database.js       # Konfigurasi koneksi MySQL Pool
├── controllers/
│   ├── auth.js           # Logika Register & Login (Generate JWT)
│   └── user.js           # Logika CRUD Data Pengguna
├── middleware/
│   ├── auth.js           # Middleware verifikasi token JWT
│   └── roleCheck.js      # Middleware otorisasi Role (Admin/User)
├── models/
│   ├── auth.js           # Query database untuk keperluan Autentikasi
│   └── user.js           # Query database untuk keperluan CRUD User
├── routes/
│   ├── auth.js           # Routing publik (Login & Register)
│   └── user.js           # Routing privat (Protected dengan Middleware)
├── .env.example          # Cetakan template konfigurasi environment
├── .gitignore            # Daftar file yang diabaikan oleh Git
├── index.js              # Entry point utama aplikasi Express
├── package.json          # Dependency proyek
└── README.md             # Dokumentasi proyek
```

# 🗄️ Skema Database (MySQL)
Sebelum menjalankan aplikasi, pastikan Anda telah membuat database dan tabel users berikut di MySQL Anda:
```
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('ADMIN', 'USER') DEFAULT 'USER',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

# 🛠️ Langkah Instalasi & Penggunaan
1. Kloning Repositori
```
git clone https://github.com/Adit-oscar/restfull-api.git
cd restfull-api
```

2. Instal Dependency
```
npm install
```

3. Konfigurasi Environment (.env)
Buat file baru di root folder dengan nama .env kemudian buka file .env tersebut dan sesuaikan kredensial database serta kunci rahasia JWT milik Anda:
```
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=nama_database_kamu
JWT_SECRET=kunci_rahasia_super_aman_123!
```

4. Menjalankan Aplikasi
```
npm run dev
```

Server akan aktif dan berjalan di http://localhost:port_dalam_env.

🛣️ Rincian API Endpoint (API Documentation)

🔓 Endpoint Publik (Tanpa Token)


HTTP Method
Endpoint
Fungsi
Payload (Request Body)
POST
/api/auth/register
Mendaftarkan akun user baru
{ "name", "username", "email", "password" }
POST
/api/auth/login
Masuk ke sistem (Mendapatkan JWT)
{ "identifier", "password" }

💡 Tip Login: Kolom identifier dapat diisi menggunakan username ataupun email terdaftar Anda.
🔒 Endpoint Privat (Membutuhkan Header Authorization)
Semua endpoint di bawah ini wajib melampirkan token JWT pada bagian Headers request Anda:
Key: Authorization
Value: Bearer <TOKEN_JWT_KAMU>
HTTP Method
Endpoint
Hak Akses (Role)
Fungsi
GET
/api/users
ADMIN
Mengambil seluruh daftar user
GET
/api/users/:id
ADMIN, USER
Mengambil detail profil user tertentu
PUT
/api/users/:id
ADMIN, USER
Memperbarui data pengguna
DELETE
/api/users/:id
ADMIN
Menghapus user dari sistem

🛡️ Keamanan & Penanganan Berkas
Proyek ini dikonfigurasi menggunakan .gitignore untuk memastikan berkas sensitif seperti konfigurasi .env dan folder penyimpanan node_modules tidak terunggah ke repositori publik demi menjaga keamanan data server dan efisiensi penyimpanan kode.
