const bcrypt = require("bcrypt");
const model = require("../models/user.js");
const fs = require("fs");
const path = require("path");

const getAllUsers = async (req, res) => {
  try {
    const rows = await model.getAllUsers();

    return res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await model.getUserById(parseInt(id));

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const createUser = async (req, res) => {
  try {
    const { name, username, email, password, role } = req.body;

    // Validasi input wajib teks
    if (!name || !username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    // PENERAPAN FILE UPLOAD: Cek apakah ada file gambar yang diunggah
    let profilePicturePath = null;

    if (req.file) {
      profilePicturePath = `/public/uploads/profiles/${req.file.filename}`;
    }

    // Cek apakah username atau email sudah ada
    const existingUsers = await model.findUserByUsernameOrEmail(
      username,
      email,
    );

    if (existingUsers.length > 0) {
      const existingUser = existingUsers[0];

      if (existingUser.username === username) {
        return res.status(409).json({
          success: false,
          message: "Username already exists",
        });
      }

      if (existingUser.email === email) {
        return res.status(409).json({
          success: false,
          message: "Email already exists",
        });
      }
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // SINKRONISASI MODEL: Panggil menggunakan struktur objek sesuai model baru kamu
    const result = await model.create({
      name,
      username,
      email,
      password: hashedPassword,
      role: role || "USER",
      profile_picture: profilePicturePath, // path gambar dimasukkan ke sini
    });

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      userId: result,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, username, email, password, role } = req.body;

    const dataUpdate = {};

    // 1. Validasi & Cek Duplikasi secara selektif (Sama seperti sebelumnya)
    if (username || email) {
      const existingUsers = await model.findUserByUsernameOrEmail(
        username || null,
        email || null,
      );

      if (existingUsers && existingUsers.length > 0) {
        const existingUser = existingUsers[0];

        if (
          username &&
          existingUser.username === username &&
          existingUser.id !== parseInt(id)
        ) {
          if (req.file) {
            fs.unlinkSync(req.file.path);
          }

          return res
            .status(409)
            .json({ success: false, message: "Username already exists" });
        }

        if (
          email &&
          existingUser.email === email &&
          existingUser.id !== parseInt(id)
        ) {
          if (req.file) {
            fs.unlinkSync(req.file.path);
          }

          return res
            .status(409)
            .json({ success: false, message: "Email already exists" });
        }
      }
    }

    // 2. Isi objek dataUpdate secara dinamis
    if (name) dataUpdate.name = name;
    if (username) dataUpdate.username = username;
    if (email) dataUpdate.email = email;
    if (role) dataUpdate.role = role;

    // 3. PENANGANAN PENGHAPUSAN FOTO LAMA (Logika Utama)
    if (req.file) {
      const userRows = await model.getUserById(parseInt(id));

      if (userRows && userRows.length > 0) {
        const currentUser = userRows[0];

        if (currentUser.profile_picture) {
          // 1. Ambil nama filenya saja (Misal dari '/public/uploads/profiles/profile-123.jpg' menjadi 'profile-123.jpg')
          const fileName = path.basename(currentUser.profile_picture);

          // 2. Gabungkan secara absolut dari root proyek menuju folder public/uploads/profiles
          const oldFilePath = path.join(
            __dirname,
            "..",
            "..",
            "public",
            "uploads",
            "profiles",
            fileName,
          );

          // Baris pendeteksi (Wajib pasang untuk cek di terminal console kamu)
          console.log("Mencari file lama di:", oldFilePath);

          if (fs.existsSync(oldFilePath)) {
            fs.unlink(oldFilePath, (err) => {
              if (err) console.error("Gagal menghapus foto lama:", err);
              else console.log("Foto lama berhasil dihapus dari folder.");
            });
          } else {
            console.log(
              "File tidak ditemukan secara fisik di folder, proses hapus dilewati.",
            );
          }
        }
      }

      // Tetap simpan dengan format lengkap untuk kebutuhan frontend
      dataUpdate.profile_picture = `/public/uploads/profiles/${req.file.filename}`;
    }

    // 4. Tangani hashing password hanya jika ada password baru
    if (password) {
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      dataUpdate.password = hashedPassword;
    }

    // 5. Jika tidak ada field yang diupdate
    if (Object.keys(dataUpdate).length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No fields to update" });
    }

    // 6. Eksekusi update ke database
    const result = await model.updateUser(parseInt(id), dataUpdate);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "User not found or no changes made",
      });
    }

    return res.json({
      success: true,
      message: "User updated successfully",
      updatedData: dataUpdate,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Ambil data user terlebih dahulu sebelum dihapus dari database
    const userRows = await model.getUserById(parseInt(id));

    if (!userRows || userRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const currentUser = userRows[0];

    // 2. Logika Utama: Cek jika bukan user Google (auth_provider === 'local' atau sesuaikan dengan kolom DB kamu)
    // Dan pastikan user tersebut memiliki path foto profil yang tersimpan
    if (currentUser.auth_provider !== "google" && currentUser.profile_picture) {
      // 1. Ambil nama filenya saja
      const fileName = path.basename(currentUser.profile_picture);

      // 2. Gabungkan secara absolut dari root menuju lokasi fisik berkas
      const filePath = path.join(
        __dirname,
        "..",
        "..",
        "public",
        "uploads",
        "profiles",
        fileName,
      );

      if (fs.existsSync(filePath)) {
        fs.unlink(filePath, (err) => {
          if (err) console.error("Gagal menghapus foto user saat delete:", err);
          else
            console.log(
              "Foto user berhasil dihapus dari folder karena akun dihapus.",
            );
        });
      } else {
        console.log(
          "File tidak ditemukan secara fisik di folder, database tetap dihapus.",
        );
      }
    }

    // 3. Eksekusi penghapusan data dari database
    const result = await model.deleteUser(parseInt(id));

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "User not found or already deleted",
      });
    }

    return res.json({
      success: true,
      message: "User and their profile picture deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};
