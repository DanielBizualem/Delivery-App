import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import connectDB from "./config/db.js";


const app = express();

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(cookieParser());

connectDB();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
})