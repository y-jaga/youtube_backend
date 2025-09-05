// require("dotenv").config({ path: "./env" });
import dotenv from "dotenv";
import connectDB from "./db/db.connect.js";
import { app } from "./app.js";

dotenv.config({
  path: "./.env",
});

const PORT = process.env.PORT || 8000;
connectDB()
  .then(() => {
    app.on("error", (error) => {
      console.log("ERROR: ", error);
    });
    app.listen(PORT, () => {
      console.log(`Server is running on port: ${PORT}`);
    });
  })
  .catch((err) => {
    console.log("MONGO db connection failed !!!", err);
  });

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
