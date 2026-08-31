# RESTful API Backend - Dokumentasi Proyek

Proyek ini adalah backend aplikasi e-commerce yang dibangun dengan Node.js dan Express. Fokus utama sistem ini adalah autentikasi pengguna, manajemen data produk, penyimpanan transaksi, dan integrasi pembayaran online menggunakan Midtrans.

Tujuan utama aplikasi ini adalah menyediakan layanan backend yang aman, konsisten, dan siap dipakai oleh frontend seperti React, Vue, atau mobile app.

## 1. Ringkasan proyek

Aplikasi ini memiliki beberapa fitur utama:
- Registrasi dan login pengguna
- Login lokal dengan username atau email
- Login OAuth dengan Google
- JWT untuk autentikasi dan otorisasi
- Role-based access control (USER dan ADMIN)
- CRUD users dan produk
- Upload foto profil dan gambar produk
- Pencarian dan paginasi pada data produk
- Transaksi belanja dengan pengelolaan stok
- Reservasi stok saat order dibuat
- Integrasi pembayaran Midtrans Snap
- Webhook verifikasi notifikasi pembayaran
- Uji otomatis untuk validasi fungsi utama

## 2. Teknologi yang digunakan
- Node.js
- Express.js
- MySQL dan mysql2
- JWT (jsonwebtoken)
- bcrypt
- multer
- CORS
- dotenv
- Midtrans SDK
- Google OAuth 2.0 API

## 3. Arsitektur aplikasi

Struktur inti backend terdiri dari beberapa layer:

- app.js: entry point aplikasi Express
- routes/: mendefinisikan endpoint HTTP
- controllers/: menangani request dan response
- models/: menjalankan query ke database
- middleware/: menangani autentikasi, upload file, dan otorisasi
- config/: konfigurasi database, OAuth, dan payment
- services/: layanan bisnis seperti Midtrans
- database/: inisialisasi tabel dan seed data

### Diagram alur umum

1. Client mengirim request ke endpoint tertentu
2. Router memanggil controller yang sesuai
3. Controller memvalidasi input dan memanggil model
4. Model mengakses MySQL
5. Hasil dikembalikan ke client dalam format JSON
6. Untuk pembayaran, Midtrans mengirim notifikasi webhook ke backend untuk update status transaksi

## 4. Struktur folder proyek

```text
restfull-api/
├── src/
│   ├── app.js
│   ├── config/
│   │   ├── database.js
│   │   ├── oauth2.js
│   │   ├── payment.js
│   │   └── ...
│   ├── controllers/
│   │   ├── auth.js
│   │   ├── product.js
│   │   ├── transaction.js
│   │   ├── user.js
│   │   └── payment.js
│   ├── database/
│   │   ├── init.js
│   │   └── seeders/
│   │       └── productSeeder.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── productUpload.js
│   │   └── upload.js
│   ├── models/
│   │   ├── auth.js
│   │   ├── product.js
│   │   ├── transaction.js
│   │   └── user.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── payment.js
│   │   ├── product.js
│   │   ├── transaction.js
│   │   └── user.js
│   ├── services/
│   │   └── midtrans.js
│   └── uploads/
│       ├── products/
│       └── profiles/
├── test/
│   ├── auth-availability.test.js
│   ├── midtrans.test.js
│   └── transaction-race.test.js
├── package.json
├── README.md
└── public/
```

## 5. Penjelasan komponen utama

### 5.1 Entry point aplikasi
File utama aplikasi adalah [src/app.js](src/app.js). File ini:
- membuat instance Express
- mengaktifkan JSON parser
- menyambungkan static file folder publik
- mengaktifkan CORS
- mendaftarkan semua route utama
- menjalankan server pada port yang ditentukan

Application route utama:
- /auth
- /users
- /products
- /transactions
- /payments

### 5.2 Middleware autentikasi
File [src/middleware/auth.js](src/middleware/auth.js) berisi:
- verifyToken: memeriksa keberadaan token JWT dan memvalidasinya
- authorizeRoles: mengontrol akses berdasarkan role seperti ADMIN atau USER

Semua endpoint sensitif pada user, produk admin, dan transaksi memerlukan otorisasi ini.

### 5.3 Upload file
Proyek ini menggunakan multer untuk mengelola upload file:
- [src/middleware/upload.js](src/middleware/upload.js): untuk upload foto profil
- [src/middleware/productUpload.js](src/middleware/productUpload.js): untuk upload gambar produk

File yang diupload kemudian disimpan ke folder publik dan path disimpan di database.

### 5.4 Model dan database
Model berada di [src/models](src/models). Setiap file model berisi query SQL untuk mengelola data tertentu:
- user.js: query user
- product.js: query produk
- transaction.js: query transaksi dan status pembayaran
- auth.js: query pengecekan username/email dan pendaftaran akun

Database connection dibuat di [src/config/database.js](src/config/database.js), menggunakan MySQL pool.

### 5.5 Inisialisasi database
File [src/database/init.js](src/database/init.js) berfungsi untuk:
- memastikan database utama dibuat
- membuat tabel users, products, transactions, dan transaction_items
- menambahkan kolom yang diperlukan jika belum ada
- menambahkan indeks unik pada order_id transaksi
- menghindari penghapusan data lama saat struktur tabel sudah ada

### 5.6 Seeder produk
File [src/database/seeders/productSeeder.js](src/database/seeders/productSeeder.js) digunakan untuk memasukkan data produk awal ke database.

## 6. Alur autentikasi

### Login lokal
Flow yang terjadi:
1. Client mengirim identifier dan password ke /auth/login
2. Controller mengecek apakah user ada di database
3. Password dibandingkan dengan hash bcrypt
4. Jika valid, backend menghasilkan JWT
5. Token dikirim kembali ke client

### JWT
Setelah login, client harus mengirim header seperti berikut:

```http
Authorization: Bearer <token>
```

### Google OAuth
Aplikasi juga mendukung login via Google:
- GET /auth/google -> redirect ke Google consent screen
- GET /auth/google/callback -> proses token Google dan membuat akun otomatis jika belum ada
- Token internal dibuat dan diarahkan kembali ke frontend

## 7. Endpoint API

### 7.1 Auth

#### 1) POST /auth/check-availability
Cek apakah username atau email sudah dipakai.

Request:
```json
{
  "username": "budi123",
  "email": "budi@example.com"
}
```

Response sukses:
```json
{
  "success": true,
  "available": true,
  "duplicates": [],
  "message": "Username and email are available"
}
```

#### 2) POST /auth/register
Registrasi user baru.

Request:
```json
{
  "name": "Budi",
  "username": "budi123",
  "email": "budi@example.com",
  "password": "rahasia123"
}
```

#### 3) POST /auth/login
Login user.

Request:
```json
{
  "identifier": "budi123",
  "password": "rahasia123"
}
```

Response:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "id": 1,
    "name": "Budi",
    "username": "budi123",
    "email": "budi@example.com",
    "role": "USER"
  },
  "token": "jwt-token"
}
```

#### 4) GET /auth/google
Redirect ke OAuth Google.

#### 5) GET /auth/google/callback
Callback setelah login Google berhasil.

---

### 7.2 User
Semua route user memerlukan token, dan beberapa route hanya bisa diakses ADMIN.

#### GET /users
Ambil seluruh user.
Akses: ADMIN

#### GET /users/:id
Ambil detail user berdasarkan id.
Akses: USER atau ADMIN yang memiliki token valid

#### POST /users
Membuat user baru.
Akses: ADMIN

Body form-data:
- name
- username
- email
- password
- role
- profile_picture (opsional)

#### PATCH /users/:id
Update data user.
Akses: ADMIN

Body bisa berupa JSON atau form-data jika upload foto.

#### DELETE /users/:id
Hapus user.
Akses: ADMIN

---

### 7.3 Product
Produk dapat diakses publik untuk melihat katalog, namun pembuatan, update, dan hapus hanya admin.

#### GET /products
Ambil produk dengan pencarian dan paginasi.

Query params:
- search: string pencarian nama/description
- page: nomor halaman
- limit: jumlah item per halaman

Contoh:
```http
GET /products?search=laptop&page=1&limit=10
```

#### GET /products/:id
Ambil detail produk satu item.

#### POST /products
Tambah produk baru.
Akses: ADMIN

Body form-data:
- name
- description
- price
- stock
- image (opsional)

#### PATCH /products/:id
Update produk.
Akses: ADMIN

#### DELETE /products/:id
Hapus produk.
Akses: ADMIN

---

### 7.4 Transaction
Transaksi dibuat oleh user yang sudah login. Sistem ini menambahkan reservasi stok sebelum pembayaran selesai.

#### POST /transactions
Buat pesanan baru.
Akses: USER atau ADMIN

Request:
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

Response contoh:
```json
{
  "success": true,
  "message": "Payment created successfully",
  "data": {
    "transactionId": 12,
    "orderId": "ORDER-1710000000000-ABC123",
    "totalAmount": 159000,
    "status": "pending",
    "token": "snap-token",
    "redirectUrl": "https://app.sandbox.midtrans.com/snap/v4/redirection/..."
  }
}
```

#### GET /transactions
Ambil semua transaksi milik user yang sedang login.

#### GET /transactions/:orderId
Ambil status transaksi berdasarkan orderId milik user login.

---

### 7.5 Payment Midtrans

#### POST /payments/midtrans/notification
Endpoint untuk menerima webhook dari Midtrans.

Webhook ini berperan penting karena merupakan sumber kebenaran untuk status pembayaran. Backend akan mengecek:
- order_id
- gross_amount
- signature_key
- status transaksi

Jika valid, sistem akan mengubah status transaksi dan menyesuaikan stok produk.

## 8. Mekanisme stok dan transaksi

Salah satu fitur penting dari backend ini adalah pengelolaan stok yang aman terhadap race condition.

### Flow stok
1. Saat transaksi dibuat, produk yang dibeli dicek ketersediaan dan jumlah reservasinya.
2. Sistem menambahkan nilai ke field reserved_stock.
3. Status transaksi dibuat sebagai pending.
4. Saat pembayaran menerima notifikasi berhasil, stok fisik dikurangi dan reservasi dikurangi.
5. Saat pembayaran gagal/expired, reservasi dibatalkan.

### Keuntungan pendekatan ini
- mencegah overselling saat beberapa user membeli item yang sama
- menjaga konsistensi data produk dan transaksi
- memudahkan penanganan webhook ganda

## 9. Contoh penggunaan API via cURL

### Registrasi
```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Budi",
    "username": "budi123",
    "email": "budi@example.com",
    "password": "rahasia123"
  }'
```

### Login
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "budi123",
    "password": "rahasia123"
  }'
```

### Ambil semua produk
```bash
curl http://localhost:8000/products?search=laptop&page=1&limit=10
```

### Buat transaksi
```bash
curl -X POST http://localhost:8000/transactions \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      { "productId": 1, "quantity": 2 },
      { "productId": 3, "quantity": 1 }
    ]
  }'
```

### Cek status transaksi
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/transactions/ORDER-1710000000000-ABC123
```

## 10. Cara menjalankan proyek

1. Instal dependency:
```bash
npm install
```

2. Siapkan koneksi database dan konfigurasi aplikasi sesuai kebutuhan proyek.

3. Jalankan inisialisasi database:
```bash
npm run db:init
```

4. Jalankan seeder produk awal:
```bash
node src/database/seeders/productSeeder.js
```

5. Jalankan server development:
```bash
npm run dev
```

Server biasanya berjalan pada:
```text
http://localhost:8000
```

## 11. Struktur database

Tabel utama:
- users
- products
- transactions
- transaction_items

### users
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

### products
- id
- name
- description
- price
- stock
- reserved_stock
- image
- createdAt
- updatedAt

### transactions
- id
- user_id
- order_id
- payment_provider
- total_amount
- status
- payment_status
- payment_token
- payment_expiry
- paid_at
- createdAt
- updatedAt

### transaction_items
- id
- transaction_id
- product_id
- quantity
- price
- createdAt

## 12. Catatan keamanan

Beberapa prinsip keamanan yang diterapkan:
- Password di-hash sebelum disimpan
- Token JWT dipakai untuk mengautentikasi request
- Role-based authorization membatasi akses endpoint admin
- Validasi input dilakukan di controller
- Webhook Midtrans diperiksa signature agar aman dari request palsu
- Upload file dibatasi dengan tipe dan ukuran tertentu

## 13. Testing

Proyek sudah memiliki uji otomatis di folder test/. Untuk menjalankan semua test:

```bash
npm test
```

Fitur yang diuji mencakup:
- pengecekan ketersediaan username/email
- validasi signature Midtrans
- mapping status pembayaran
- reservasi stok dan race condition
- transaksi yang gagal, sukses, dan duplikat

## 14. Kesimpulan

Backend ini merupakan aplikasi e-commerce sederhana namun solid. Sistem ini sudah mendukung kebutuhan dasar untuk produk, users, autentikasi, transaksi, dan pembayaran online. Kelebihan utamanya terletak pada pengelolaan stok yang dilakukan secara hati-hati agar tidak terjadi overselling dan memastikan konsistensi data saat proses pembayaran berjalan.

Jika Anda ingin pengembangan lanjutan, area yang bisa ditingkatkan selanjutnya adalah:
- paginasi yang lebih fleksibel
- logging dan monitoring request
- sistem refund yang lebih lengkap
- dokumentasi OpenAPI/Swagger
- unit test yang lebih luas untuk seluruh controller
- implementasi queue job untuk webhook atau notifikasi email


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

