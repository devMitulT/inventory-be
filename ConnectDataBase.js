const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGOURL, {});
    console.log(`MongoDb Connect : ${conn.connection.host}`);
    return conn;
  } catch (e) {
    console.error('Error connecting to MongoDB', e.message);
    process.exit(1);
  }
};

module.exports = { connectDB };
