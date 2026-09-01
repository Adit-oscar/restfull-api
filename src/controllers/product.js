const fs = require("fs");
const path = require("path");
const model = require("../models/product.js");

const getAllProducts = async (req, res) => {
  try {
    const { search = "", page = 1, limit = 10 } = req.query;
    const result = await model.getAllProducts({
      search: String(search),
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 10,
    });

    return res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await model.getProductById(parseInt(id));

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    console.error("Error fetching product:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const createProduct = async (req, res) => {
  try {
    const { name, description, price, stock } = req.body;

    if (!name || !price || stock === undefined) {
      return res.status(400).json({
        success: false,
        message: "Name, price, and stock are required",
      });
    }

    if (isNaN(parseFloat(price)) || parseFloat(price) < 0) {
      return res.status(400).json({
        success: false,
        message: "Price must be a valid number",
      });
    }

    if (isNaN(parseInt(stock)) || parseInt(stock) < 0) {
      return res.status(400).json({
        success: false,
        message: "Stock must be a valid number",
      });
    }

    const productData = {
      name,
      description: description || null,
      price: parseFloat(price),
      stock: parseInt(stock, 10),
    };

    if (req.file) {
      productData.image = `/public/uploads/products/${req.file.filename}`;
    }

    const result = await model.create(productData);

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      productId: result,
    });
  } catch (error) {
    console.error("Error creating product:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, stock } = req.body;
    const dataUpdate = {};

    if (name) dataUpdate.name = name;
    if (description !== undefined) dataUpdate.description = description;
    if (price !== undefined) {
      if (isNaN(parseFloat(price)) || parseFloat(price) < 0) {
        return res.status(400).json({
          success: false,
          message: "Price must be a valid number",
        });
      }
      dataUpdate.price = parseFloat(price);
    }
    if (stock !== undefined) {
      if (isNaN(parseInt(stock)) || parseInt(stock) < 0) {
        return res.status(400).json({
          success: false,
          message: "Stock must be a valid number",
        });
      }
      dataUpdate.stock = parseInt(stock, 10);
    }

    if (req.file) {
      const productRows = await model.getProductById(parseInt(id));
      if (productRows && productRows.length > 0) {
        const currentProduct = productRows[0];
        if (currentProduct.image) {
          const fileName = path.basename(currentProduct.image);
          const oldFilePath = path.join(
            __dirname,
            "..",
            "..",
            "public",
            "uploads",
            "products",
            fileName,
          );

          if (fs.existsSync(oldFilePath)) {
            fs.unlinkSync(oldFilePath);
          }
        }
      }

      dataUpdate.image = `/public/uploads/products/${req.file.filename}`;
    }

    if (Object.keys(dataUpdate).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields to update",
      });
    }

    const result = await model.updateProduct(parseInt(id), dataUpdate);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Product not found or no changes made",
      });
    }

    return res.json({
      success: true,
      message: "Product updated successfully",
      updatedData: dataUpdate,
    });
  } catch (error) {
    console.error("Error updating product:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const productRows = await model.getProductById(parseInt(id));

    if (!productRows || productRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const currentProduct = productRows[0];

    if (currentProduct.image) {
      const fileName = path.basename(currentProduct.image);
      const filePath = path.join(
        __dirname,
        "..",
        "..",
        "public",
        "uploads",
        "products",
        fileName,
      );

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    const result = await model.deleteProduct(parseInt(id));

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};
