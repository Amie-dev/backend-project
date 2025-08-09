import { v2 as cloudinary } from "cloudinary";
import dotenv from 'dotenv'
import fs from "fs";

dotenv.config()
// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET, // Click 'View API Keys' above to copy your API secret
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    //upload file
    const uploadResult = await cloudinary.uploader.upload(
      localFilePath,
      {
        resource_type: "auto",
      }
    );

    console.log(uploadResult);
    console.log("File Uploaded Succesfully \n");
    console.log(uploadResult.url);
        fs.unlinkSync(localFilePath)// after fails upload operations this time remove locally saved temp file

    return uploadResult
    
  } catch (error) {
    fs.unlinkSync(localFilePath)// after fails upload operations this time remove locally saved temp file
    console.log(error);
    return null
    
  }
};

export {uploadOnCloudinary}
// Upload an image


