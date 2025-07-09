const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");

const { connectDB } = require("./ConnectDataBase.js");
const { userRouter } = require("./Booking/routes/authRoutes");
const { productRouter } = require("./Booking/routes/productRoutes");
// const { organizationRouter } = require("./Booking/routes/organizationRoutes");
const { orderRouter } = require("./Booking/routes/orderRoutes");
const {
  organizationRouter,
} = require("./Booking/routes/organizationRoutes.js");
const { notificationRouter } = require("./Booking/routes/notificationRoutes.js");

const app = express();

app.use(cookieParser());

app.use(express.json({ limit: "125mb" }));
app.use(express.urlencoded({ limit: "125mb", extended: true }));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cors());

dotenv.config();

connectDB();

app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ limit: "30mb", extended: true }));

app.use("/api/order", orderRouter);
app.use("/api/auth", userRouter);
app.use("/api/product", productRouter);
app.use("/api/organization", organizationRouter);
app.use("/api/notification", notificationRouter);

app.use("/", (req, res) =>
  res.json({ message: "Server is running... on V 0.1" })
);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
