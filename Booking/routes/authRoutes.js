const express = require('express');
const { registerUser } = require('../controller/userController/registerUser');
const { loginUser } = require('../controller/userController/loginUser');
const {
  changePassword,
} = require('../controller/userController/changePassword');
const { protectRoute } = require('../middlewares/protectRoute');

const router = express.Router();

router.post('/login', loginUser);
router.post('/change-password', protectRoute, changePassword);

module.exports = { userRouter: router };
