const dbPool = require("../../config/database.js");

const products = [
  {
    name: "Laptop Acer Swift",
    description: "Laptop ringan untuk kerja dan belajar",
    price: 7990000,
    stock: 12,
  },
  {
    name: "Keyboard Mechanical RGB",
    description: "Keyboard mekanis dengan switch blue",
    price: 450000,
    stock: 25,
  },
  {
    name: "Mouse Wireless Logitech",
    description: "Mouse nirkabel hemat daya",
    price: 320000,
    stock: 40,
  },
  {
    name: "Monitor 24 Inch",
    description: "Monitor LED Full HD",
    price: 1450000,
    stock: 15,
  },
  {
    name: "Headset HyperX",
    description: "Headset gaming surround sound",
    price: 650000,
    stock: 18,
  },
  {
    name: "Smartphone Samsung A54",
    description: "Smartphone android dengan kamera 50MP",
    price: 4990000,
    stock: 20,
  },
  {
    name: "Tablet Lenovo Tab M10",
    description: "Tablet 10 inci untuk hiburan",
    price: 2490000,
    stock: 10,
  },
  {
    name: "Webcam Full HD",
    description: "Webcam untuk meeting online",
    price: 380000,
    stock: 22,
  },
  {
    name: "Printer Epson L3250",
    description: "Printer multifungsi hemat tinta",
    price: 2850000,
    stock: 8,
  },
  {
    name: "Router WiFi 6",
    description: "Router internet berkecepatan tinggi",
    price: 980000,
    stock: 14,
  },
  {
    name: "SSD 1TB NVMe",
    description: "SSD cepat untuk penyimpanan",
    price: 950000,
    stock: 30,
  },
  {
    name: "RAM 16GB DDR4",
    description: "RAM performa tinggi",
    price: 620000,
    stock: 28,
  },
  {
    name: "Power Bank 20000mAh",
    description: "Power bank portabel",
    price: 320000,
    stock: 17,
  },
  {
    name: "Kamera Mirrorless",
    description: "Kamera mirrorless compact",
    price: 6990000,
    stock: 7,
  },
  {
    name: "Speaker JBL Portable",
    description: "Speaker bluetooth portabel",
    price: 760000,
    stock: 13,
  },
  {
    name: "Smartwatch Xiaomi",
    description: "Smartwatch dengan detak jantung",
    price: 890000,
    stock: 11,
  },
  {
    name: "Flashdisk 128GB",
    description: "Flashdisk USB 3.1",
    price: 180000,
    stock: 35,
  },
  {
    name: "Projector Mini",
    description: "Projector mini untuk presentasi",
    price: 2350000,
    stock: 6,
  },
  {
    name: "Lampu LED Desk",
    description: "Lampu meja hemat listrik",
    price: 160000,
    stock: 24,
  },
  {
    name: "Drone Mini",
    description: "Drone kecil untuk rekam video",
    price: 1590000,
    stock: 5,
  },
];

const seedProducts = async () => {
  try {
    for (const product of products) {
      await dbPool.execute(
        "INSERT INTO products (name, description, price, stock) VALUES (?, ?, ?, ?)",
        [product.name, product.description, product.price, product.stock],
      );
    }

    console.log("20 produk seed berhasil ditambahkan");
  } catch (error) {
    console.error("Gagal melakukan seed produk:", error.message);
  }
};

seedProducts();
