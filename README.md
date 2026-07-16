# 🚀 Node.js Express RESTful API - Authentication & User Management

Repositori ini berisi implementasi backend RESTful API menggunakan **Node.js** dan framework **Express**. Proyek ini dilengkapi dengan sistem autentikasi fleksibel (login menggunakan Username atau Email), enkripsi password, pengamanan endpoint menggunakan **JSON Web Token (JWT)**, serta pembatasan hak akses berbasis peran (**Role-Based Access Control / RBAC**).

---

## ✨ Fitur Utama
- **Flexible Authentication**: Registrasi akun baru dan login dinamis menggunakan `username` ATAU `email`.
- **Password Security**: Pengamanan kata sandi menggunakan hashing `bcrypt`.
- **Route Protection**: Middleware verifikasi JWT untuk melindungi endpoint privat.
- **Role-Based Authorization**: Middleware khusus untuk membatasi akses endpoint tertentu (misal: fitur hapus hanya untuk `ADMIN`).
- **Database Connection**: Integrasi database MySQL menggunakan `mysql2` dengan skema *Connection Pool* yang efisien.

---

## 📁 Struktur Direktori Proyek
```text
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
## 🛠️ Langkah Instalasi & Penggunaan
1. Kloning Repositori
```text
git clone [https://github.com/Adit-oscar/restfull-api.git](https://github.com/Adit-oscar/restfull-api.git)
cd restfull-api
```
2. Instal Dependency
```text
npm install
```
3. Konfigurasi env
   
  Buat file baru di folder root dengan nama .env, kemudian ketikan kode enviroment variabel dan sesuaikan dengan kredensial yang ada sebagai berikut :
```text
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=nama_database_kamu
JWT_SECRET=kunci_rahasia_super_aman_123!
```
