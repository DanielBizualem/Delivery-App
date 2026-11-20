import {v2 as cloudinary} from 'cloudinary';
import dotenv from 'dotenv';
dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
})

export function uploadImage(buffer, folder = "delivery") {
    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ folder, resource_type: "image" }, (err, result) =>
          err ? reject(err) : resolve({ url: result.secure_url, publicId: result.public_id })
        )
        .end(buffer);
    });
  }

export const deleteImage = (publicId) => publicId ? cloudinary.uploader.destroy(publicId) : Promise.resolve();