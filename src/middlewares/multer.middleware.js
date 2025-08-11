import multer from "multer";
import fs from "fs";
import { asyncHandler } from "../utils/asyncHandler.js";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    // const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    // cb(null, file.fieldname + '-' + uniqueSuffix) //update later
    cb(null, file.originalname);
  },
});

export const upload = multer({ storage: storage });

export const removeLocalFile = asyncHandler(async (filePath) => {
  try {
    if (filePath) {
      fs.unlinkSync(filePath);
      console.log(`🧹 Removed file: ${filePath}`);
    }
  } catch (error) {
    console.error(`⚠️ Failed to remove file: ${filePath}`, err.message);
  }
});
