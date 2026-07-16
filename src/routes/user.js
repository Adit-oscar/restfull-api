const express = require("express");
const { verifyToken, authorizeRoles } = require("../middleware/auth.js");
const router = express.Router();

const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} = require("../controllers/user.js");

router.get("/", verifyToken, getAllUsers);
router.get("/:id", verifyToken, getUserById);
router.post("/", verifyToken, authorizeRoles("ADMIN"), createUser);
router.patch("/:id", verifyToken, authorizeRoles("ADMIN"), updateUser);
router.delete("/:id", verifyToken, authorizeRoles("ADMIN"), deleteUser);

module.exports = router;
