import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    const connection = await mongoose.connect(process.env.MONGODB_URI);
    console.log("MONGODB CONNECTED SUCCESSFULLY !!");
  } catch (error) {
    console.log("MONGODB CONNECTION FAILED");
  }
};
