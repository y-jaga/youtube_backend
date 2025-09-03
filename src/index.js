// require("dotenv").config({ path: "./env" });

import express from "express";
import dotenv from "dotenv";
import connectDB from "./db/db.connect.js";

dotenv.config({
  path: "./env",
});

const app = express();

connectDB();

//DB connection
/**
(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    app.on("error", (error) => {
      console.log("ERROR: ", error);
    });
    app.listen(process.env.PORT, () => {
      console.log(`APP is listening on port ${process.env.PORT}`);
    });
  } catch (error) {
    console.error("Error: ", error);
    throw error;
  }
})();
**/
