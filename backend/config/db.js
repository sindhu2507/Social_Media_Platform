import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectDB = async () => {
  try {
    const dbURI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/social_media";
    const conn = await mongoose.connect(dbURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}, DB Name: ${conn.connection.name}`);
  } catch (error) {
    console.error(" MongoDB Connection Error:", error.message);
    process.exit(1);
  }
};

export default connectDB;
