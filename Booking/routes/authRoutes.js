const express = require('express');
const { registerUser } = require('../controller/userController/registerUser');
const { loginUser } = require('../controller/userController/loginUser');
const {
  changePassword,
} = require('../controller/userController/changePassword');
const {
  createUser,
} = require('../controller/userController/createUser');
const { getUsers } = require('../controller/userController/getUsers');
const {
  toggleUserActive,
} = require('../controller/userController/toggleUserActive');
const {
  getMyProfile,
} = require('../controller/userController/getMyProfile');
const {
  updateMyProfile,
} = require('../controller/userController/updateMyProfile');
const { protectRoute } = require('../middlewares/protectRoute');
const { requireRole } = require('../middlewares/requireRole');

const router = express.Router();

router.post('/login', loginUser);
router.post('/change-password', protectRoute, changePassword);

router.get('/me', protectRoute, getMyProfile);
router.put('/me', protectRoute, updateMyProfile);

router.get(
  '/user',
  protectRoute,
  requireRole(['superAdmin']),
  getUsers
);
router.post(
  '/user',
  protectRoute,
  requireRole(['superAdmin']),
  createUser
);
router.patch(
  '/user/:id/active',
  protectRoute,
  requireRole(['superAdmin']),
  toggleUserActive
);

module.exports = { userRouter: router };
