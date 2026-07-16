const express = require("express");
const env = require("dotenv");

// import routes
const authRoutes = require("./routes/auth.js");
const userRoutes = require("./routes/user.js");

const app = express();

env.config();

const PORT = process.env.PORT || 8000;

app.use(express.json());

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
