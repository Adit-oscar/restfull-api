const express = require("express");
const multer = require("multer");
const { verifyToken, authorizeRoles } = require("../middleware/auth.js");
const uploadMiddleware = require("../middleware/productUpload.js");
const router = express.Router();

const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/product.js");

const handleUpload = (req, res, next) => {
  uploadMiddleware.single("image")(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "Ukuran berkas terlalu besar. Batas maksimal adalah 2MB.",
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
    next();
  });
};

router.get("/", getAllProducts);
router.get("/:id", getProductById);

router.post(
  "/",
  verifyToken,
  authorizeRoles("ADMIN"),
  handleUpload,
  createProduct,
);
router.patch(
  "/:id",
  verifyToken,
  authorizeRoles("ADMIN"),
  handleUpload,
  updateProduct,
);
router.delete("/:id", verifyToken, authorizeRoles("ADMIN"), deleteProduct);

module.exports = router;
