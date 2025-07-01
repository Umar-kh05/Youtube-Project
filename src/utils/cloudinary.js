import { v2 as cloudinary} from "cloudinary";
import fs from "fs"

cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_CLOUD_KEY, 
        api_secret: process.env.CLOUDINARY_CLOUD_SECRET 

    })

 const ulpoadOnCloudinary = async (localFilePath) => {

    try {
        if(!localFilePath) return null

        const response = await cloudinary.uploader.upload(localFilePath, 
            {
                resource_type: "auto"
            })
         console.log("File is uploaded on cloudinary!", response.url);
         return response;
    } catch (error) {
        fs.unlinkSync(localFilePath) //remove the file from local server as uploading on cloudinary got failed
        return null;
    }
 }

 export {ulpoadOnCloudinary}