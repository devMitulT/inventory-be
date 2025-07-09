const multer = require("multer");
const express = require("express");

const {
  createOrganization,
} = require("../controller/organizationController/createOrganization");
const { protectRoute } = require("../middlewares/protectRoute");
const {
  getOrganizationInfo,
} = require("../controller/organizationController/getOrganizationInfo");

const {
  editOrganization,
} = require("../controller/organizationController/editOrganization");

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
    return cb(new Error("Only jpg|jpeg|png image files are allowed!"), false);
  }
  cb(null, true);
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
});

const router = express.Router();

router.post("/organization", upload.single("image"), createOrganization);
router.get("/organization", protectRoute, getOrganizationInfo);
router.put(
  "/organization/:id",
  protectRoute,
  upload.single("image"),
  editOrganization
);

module.exports = { organizationRouter: router };
