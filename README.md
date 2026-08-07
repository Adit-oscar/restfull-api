# 🚀 RESTful API Backend dengan Node.js dan Express

Proyek ini adalah backend REST API berbasis Node.js, Express, dan MySQL yang mendukung:
- autentikasi pengguna dengan JWT
- role-based access control (ADMIN / USER)
- manajemen user
- CRUD produk
- upload gambar produk
- pencarian dan pagination produk
- transaksi pembelian sederhana

## ✨ Fitur utama
- Registrasi dan login pengguna
- Login dengan username atau email
- Enkripsi password menggunakan bcrypt
- Proteksi endpoint dengan JWT
- Otorisasi akses berdasarkan role
- Upload gambar profil dan gambar produk
- Pagination dan pencarian produk untuk performa frontend yang lebih baik
- Transaksi yang mengurangi stok produk otomatis

## 🛠️ Teknologi yang digunakan
- Node.js
- Express.js
- MySQL (mysql2)
- JWT (jsonwebtoken)
- bcrypt
- multer untuk upload file
- CORS
- dotenv

## 📁 Struktur folder proyek
```text
src/
  app.js
  config/
    database.js
    oauth2.js
  controllers/
    auth.js
    product.js
    transaction.js
    user.js
  database/
    init.js
    seeders/
      productSeeder.js
  middleware/
    auth.js
    productUpload.js
    upload.js
  models/
    auth.js
    product.js
    transaction.js
    user.js
  routes/
    auth.js
    product.js
    transaction.js
    user.js
public/
  uploads/
    profiles/
    products/
```

## ⚙️ Persiapan environment
Buat file .env di root project dengan isi berikut:
```env
PORT=8000
HOST=localhost
USER=root
PASSWORD=
DATABASE=restfull-api
JWT_SECRET=your_secret_key_here
```

> Pastikan MySQL sudah berjalan dan database yang disebutkan tersedia.

## ▶️ Cara menjalankan proyek
1. Install dependency
```bash
npm install
```

2. Jalankan inisialisasi database
```bash
npm run db:init
```

3. Jalankan seed produk awal (20 produk sample)
```bash
node src/database/seeders/productSeeder.js
```

4. Jalankan server
```bash
npm run dev
```

Server akan berjalan di:
```text
http://localhost:8000
```

## 🗄️ Struktur database
Beberapa tabel yang dibuat secara otomatis oleh script inisialisasi:
- users
- products
- transactions
- transaction_items

### Tabel users
- id
- name
- username
- email
- password
- role
- profile_picture
- auth_provider
- createdAt
- updatedAt

### Tabel products
- id
- name
- description
- price
- stock
- image
- createdAt
- updatedAt

### Tabel transactions
- id
- user_id
- total_amount
- status
- createdAt
- updatedAt

### Tabel transaction_items
- id
- transaction_id
- product_id
- quantity
- price
- createdAt

## 🔐 Autentikasi
Semua endpoint yang membutuhkan akses pribadi menggunakan header berikut:
```http
Authorization: Bearer <token>
```

Token didapatkan dari endpoint login atau register.

## 📚 Daftar endpoint

### 1. Auth

| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| GET | /auth/google | Publik | Redirect ke OAuth Google |
| GET | /auth/google/callback | Publik | Callback OAuth Google |
| POST | /auth/register | Publik | Registrasi user baru |
| POST | /auth/login | Publik | Login user dan dapatkan JWT |

#### Contoh request register
```json
{
  "name": "Budi",
  "username": "budi123",
  "email": "budi@example.com",
  "password": "rahasia123"
}
```

#### Contoh request login
```json
{
  "identifier": "budi123",
  "password": "rahasia123"
}
```

---

### 2. User

| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| GET | /users | ADMIN | Ambil semua user |
| GET | /users/:id | ADMIN / USER | Ambil detail user |
| POST | /users | ADMIN | Buat user baru |
| PATCH | /users/:id | ADMIN | Update data user |
| DELETE | /users/:id | ADMIN | Hapus user |

#### Upload foto profil
Untuk route POST/PATCH /users, gunakan form-data dengan field:
- profile_picture

Contoh form-data:
- field: profile_picture
- value: file gambar

---

### 3. Product

| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| GET | /products | Publik | Ambil list produk dengan pagination dan search |
| GET | /products/:id | Publik | Ambil detail produk |
| POST | /products | ADMIN | Tambah produk baru |
| PATCH | /products/:id | ADMIN | Update produk |
| DELETE | /products/:id | ADMIN | Hapus produk |

#### Query parameter untuk GET /products
- search: kata kunci pencarian (nama/deskripsi)
- page: nomor halaman
- limit: jumlah data per halaman

Contoh:
```text
GET /products?search=laptop&page=1&limit=10
```

#### Contoh request create product
Gunakan form-data:
- name
- description
- price
- stock
- image

Contoh body JSON untuk API client yang mendukung multipart:
```text
name: Laptop Acer
description: Laptop ringan untuk kerja
price: 7990000
stock: 10
image: file gambar
```

---

### 4. Transaction

| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| POST | /transactions | USER / ADMIN | Buat transaksi pembelian |
| GET | /transactions | USER / ADMIN | Ambil riwayat transaksi user login |

#### Contoh request create transaction
```json
{
  "items": [
    {
      "productId": 1,
      "quantity": 2
    },
    {
      "productId": 3,
      "quantity": 1
    }
  ]
}
```

#### Aturan transaksi
- stok akan dicek sebelum transaksi diproses
- jika stok tidak mencukupi, transaksi ditolak
- stok produk akan dikurangi otomatis saat transaksi berhasil

---

## 📦 Response format
Secara umum, response API mengikuti format berikut:

### Success
```json
{
  "success": true,
  "message": "Operasi berhasil",
  "data": {}
}
```

### Error
```json
{
  "success": false,
  "message": "Pesan error"
}
```

## ✅ Notes penting
- Endpoint GET /products sudah dilengkapi dengan pagination dan search, sehingga frontend tidak perlu mengambil semua data sekaligus.
- Upload file disimpan di folder public/uploads.
- Gambar produk akan tersimpan di public/uploads/products.
- Gambar profil user akan tersimpan di public/uploads/profiles.

## 🧪 Contoh test cepat
### Login
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"admin","password":"password"}'
```

### Ambil produk
```bash
curl http://localhost:8000/products?page=1&limit=10
```

### Buat transaksi
```bash
curl -X POST http://localhost:8000/transactions \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"items":[{"productId":1,"quantity":1}]}'
```

