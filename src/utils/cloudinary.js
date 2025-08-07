import { v2 as cloudinary } from "cloudinary";
import { log } from "console";
import fs from "fs";

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
    return uploadResult
    
  } catch (error) {
    fs.unlinkSync(localFilePath)// after fails upload operations this time remove locally saved temp file
    console.log(error);
    return null
    
  }
};

export {uploadOnCloudinary}
// Upload an image


