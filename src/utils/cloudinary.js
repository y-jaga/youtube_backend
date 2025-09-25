import fs from "fs";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const getPublicIdFromCloudinaryUrl = (url) => {
  //remove old avatar image from cloudinary
  //https://res.cloudinary.com/dwzmkzzw6/image/upload/v1757574577/users/profile/ixlhnb2qzkx5hbt6qyxi.jpg"
  const afterUpload =
    url.split(
      "/upload/"
    )[1]; /* /v1757574577/users/profile/ixlhnb2qzkx5hbt6qyxi.jpg */

  const withoutVersion = afterUpload.replace(
    /^v[0-9]+\/?/,
    ""
  ); /* users/profile/ixlhnb2qzkx5hbt6qyxi.jpg */

  const publicId = withoutVersion.replace(
    /\.[^/.]+$/,
    ""
  ); /* users/profile/ixlhnb2qzkx5hbt6qyxi */

  return publicId;
};

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    console.log(response);
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    console.error(error);
    fs.unlinkSync(localFilePath);
  }
};

const deleteFromCloudinary = async (publicId) => {
  try {
    const response = await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
    });

    return response;
  } catch (error) {
    console.error(error);
  }
};

export {
  uploadOnCloudinary,
  deleteFromCloudinary,
  getPublicIdFromCloudinaryUrl,
};
