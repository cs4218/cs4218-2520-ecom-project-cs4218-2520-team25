import colors from "colors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import app from "./app.js";

// config
dotenv.config();

// connect DB
connectDB();

const PORT = process.env.PORT || 6060;

app.listen(PORT, () => {
  console.log(
    `Server running on ${process.env.DEV_MODE} mode on ${PORT}`.bgCyan.white
  );
});