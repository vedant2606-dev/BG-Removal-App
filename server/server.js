import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./configs/mongodb.js";
import userRouter from "./routes/userRoutes.js";

dotenv.config();

// App config
const PORT = process.env.PORT || 4000;
const app = express();

// initialize middleware
app.use(express.json());
app.use(cors());

// API routes
app.get("/", (req, res) => {
  res.send("API is working");
});
app.use("/api/user", userRouter);

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`App is working on PORT : ${PORT}`);
  });
});
