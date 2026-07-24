const express = require("express");
const env = require("dotenv");
const path = require("path");
const cors = require("cors");

// import routes
const authRoutes = require("./routes/auth.js");
const userRoutes = require("./routes/user.js");

const app = express();

env.config();

const PORT = process.env.PORT || 8000;

app.use(express.json());
// Ganti baris statis lama dengan ini:
app.use("/public", express.static(path.join(__dirname, "public")));
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

app.get("/", (req, res) => {
  res.json({
    success: true,
    meessage: "Express BE",
  });
});

app.use("/auth", authRoutes);
app.use("/users", userRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
