import dotenv from "dotenv";
dotenv.config();
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import connectDB from "./config/db.js";
import router from "./routers/auth/routes.js";


const app = express();

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', router)


connectDB();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
})