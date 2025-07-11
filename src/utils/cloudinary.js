import dotenv from "dotenv";
dotenv.config();

import { v2 as cloudinary} from "cloudinary";
import fs from "fs"

cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_API_SECRET 

    })
    

 const ulpoadOnCloudinary = async (localFilePath) => {

    try {
        if(!localFilePath) return null

        const response = await cloudinary.uploader.upload(localFilePath, 
            {
                resource_type: "auto"
            })
       //  console.log("File is uploaded on cloudinary!", response.url);
         fs.unlinkSync(localFilePath)
         return response;
    } catch (error) {
    
        console.error("Cloudinary upload error:", error);
        fs.unlinkSync(localFilePath);
    return null;
}
}

function getPublicIdFromUrl(url) {
  
  url = url.split('?')[0];
  
  const parts = url.split('/upload/');
  if (parts.length < 2) return null;
  // Remove file extension
  const publicIdWithExt = parts[1];
  const lastDot = publicIdWithExt.lastIndexOf('.');
  return lastDot === -1 ? publicIdWithExt : publicIdWithExt.substring(0, lastDot);
}


const deleteImageByUrl = async (imageUrl) => {
  const publicId = getPublicIdFromUrl(imageUrl);
  if (!publicId) {
    console.error("Invalid Cloudinary URL");
    return;
  }
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error("Error deleting image:", error);
    throw error;
  }
};

 export {ulpoadOnCloudinary, deleteImageByUrl}