const express = require("express");
const multer = require("multer");
const path = require("path");
const { protectRoute } = require("../middlewares/protectRoute");
const fs = require("fs");
const {
  createProduct,
} = require("../controller/productController/createProduct");
const { getProducts } = require("../controller/productController/getProducts");
const { getProduct } = require("../controller/productController/getProduct");
const {
  updateProduct,
} = require("../controller/productController/updateProduct");
const {
  deleteProduct,
} = require("../controller/productController/deleteProduct");
const {
  restoreProduct,
} = require("../controller/productController/restoreProduct");
const {
  createProductFromCSV,
} = require("../controller/productController/createProductFromCSV");

const router = express.Router();
const upload = multer();

const csvStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "../../../uploads"); // adjust path as needed
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

const uploadCSV = multer({
  storage: csvStorage,
  fileFilter: (req, file, cb) => {
    if (!file.originalname.match(/\.csv$/)) {
      return cb(new Error("Only .csv files are allowed"), false);
    }
    cb(null, true);
  },
  limits: {
    fileSize: 1 * 1024 * 1024, // 5MB
  },
});

router.post("/product", protectRoute, upload.none(), createProduct);
router.put("/product/:id", protectRoute, updateProduct);
router.delete("/product/:id", protectRoute, deleteProduct);
router.get("/product", protectRoute, getProducts);
router.get("/product/:id", protectRoute, getProduct);
router.put("/restore-product/:id", protectRoute, restoreProduct);
router.post(
  "/product-from-csv",
  uploadCSV.single("csv"),
  protectRoute,
  createProductFromCSV
);

module.exports = { productRouter: router };
