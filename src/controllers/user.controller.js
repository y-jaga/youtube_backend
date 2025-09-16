import path from "path";
import jwt from "jsonwebtoken";
import { User } from "../models/user.models.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  loginUserValidation,
  registerUserValidation,
} from "../validations/validation.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { __dirname } from "../utils/paths.js";

const generateRefreshAndAccessToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating access and refresh token."
    );
  }
};

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

const registerUser = asyncHandler(async (req, res) => {
  const userData = req.body;
  //req.files = {avatar: [{}], coverImage: [{}]}
  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  //validation function
  registerUserValidation(userData, avatarLocalPath);

  //check if same user already exists
  const userByname = await User.findOne({ username: userData.username });
  const userByEmail = await User.findOne({ email: userData.email });

  if (userByname) {
    throw new ApiError(409, "user with same username already exists.");
  }
  if (userByEmail) {
    throw new ApiError(409, "user with same email already exists.");
  }

  //get file path and upload on cloudinary
  const avatarPath = path.join(__dirname, "../../", avatarLocalPath);
  let coverImagePath;
  if (coverImageLocalPath) {
    coverImagePath = path.join(__dirname, "../../", coverImageLocalPath);
  }

  const avatarImageResponse = await uploadOnCloudinary(avatarPath);
  const coverImageResponse = await uploadOnCloudinary(coverImagePath);

  if (!avatarImageResponse) {
    throw new ApiError(
      500,
      "Something went wrong whihle uploading avatar image on cloudinary."
    );
  }

  //creating new user and saving it into db
  const newUser = new User({
    username: userData.username.toLowerCase(),
    email: userData.email,
    fullName: userData.fullName,
    avatar: avatarImageResponse.url,
    coverImage: coverImageResponse?.url || "",
    password: userData.password,
  });

  await newUser.save();

  const createdUser = await User.findById(newUser._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(
      500,
      "Something went wrong while registring a new user."
    );
  }

  res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  loginUserValidation(username, email, password);

  const existedUser = await User.findOne({ $or: [{ username }, { email }] });

  if (!existedUser) {
    throw new ApiError(404, `${username} is not a registered user.`);
  }

  const isPasswordValid = await existedUser.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials.");
  }

  const { accessToken, refreshToken } = await generateRefreshAndAccessToken(
    existedUser._id
  );

  const loggedInUser = await User.findById(existedUser._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User logged In Successfully."
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: { refreshToken: null } },
    { new: true }
  ).select("-password -refreshToken");

  const options = {
    httpOnly: true,
    secure: true,
  };

  res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
      new ApiResponse(200, { loggedoutUser: updatedUser }, "User logged out")
    );
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  try {
    const incomingRefreshToken =
      req.cookies?.refreshToken || req.body?.refreshToken;

    if (!incomingRefreshToken) {
      throw new ApiError(401, "Unauthorized request");
    }

    const decodedRefreshToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedRefreshToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh Token is expired or used.");
    }

    const { newRefreshToken, accessToken } =
      await generateRefreshAndAccessToken(decodedRefreshToken?._id);

    const options = {
      httpOnly: true,
      secure: true,
    };

    res
      .status(200)
      .cookie("refreshToken", newRefreshToken, options)
      .cookie("accessToken", accessToken, options)
      .json(
        new ApiResponse(
          201,
          { accessToken, newRefreshToken },
          "accesToken refreshed successfully."
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  //receive old and new password from user
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    throw new ApiError(400, "Old password or new password is required.");
  }

  if (oldPassword === newPassword) {
    throw new ApiError(
      400,
      "New password cannot be the same as the old password."
    );
  }

  //fetch user from db, and confirm its password
  const user = await User.findById(req.user?._id);

  const checkPassword = await user.isPasswordCorrect(oldPassword);
  if (!checkPassword) {
    throw new ApiError(401, "Invalid old password.");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  //logout user after changing password
  user.refreshToken = null;

  const options = {
    httpOnly: true,
    secure: true,
  };

  res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
      new ApiResponse(
        200,
        {},
        "Password updated successfully. Please sign in with your new password."
      )
    );
});

const getCurrentUser = asyncHandler(async (req, res) => {
  res
    .status(200)
    .json(
      new ApiResponse(200, req.user, "Current user retrieved successfully.")
    );
});

const updateUserDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;

  if (!fullName || !email) {
    throw new ApiError(400, "All fields are required.");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(
      new ApiResponse(200, user, "User account details updated successfully.")
    );
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  //req.files = {avatar: [{}], coverImage: [{}]}
  const avatarLocalPath = req.files?.avatar?.[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "avatar file is missing.");
  }

  const oldAvatarUrl = await User.findById(req.user?._id).avatar;

  //upload updated avatar image on cloudinary and update its url in db
  const avatarResponse = await uploadOnCloudinary(avatarLocalPath);

  if (!avatarResponse.url) {
    throw new ApiError(
      500,
      "Error while uploading avatar image on cloudinary."
    );
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: { avatar: avatarResponse.url },
    },
    { new: true }
  ).select("-password -refreshToken");

  //get public id from url and delete image from cloudinary
  const publicId = getPublicIdFromCloudinaryUrl(oldAvatarUrl);

  const destroyResponse = await deleteFromCloudinary(publicId);

  if (destroyResponse.result === "not found") {
    console.warn(
      "No old cover image found on Cloudinary to delete:",
      destroyResponse
    );
  }

  res
    .status(200)
    .json(new ApiResponse(200, user, "avatar image updated successfully."));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  //req.files = {avatar: [{}], coverImage: [{}]}
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "coverImage file is missing.");
  }

  const oldCoverImageUrl = await User.findById(req.user?._id).coverImage;

  //upload updated cover image on cloudinary and update its url in db
  const coverImageResponse = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImageResponse.url) {
    throw new ApiError(500, "Error while uploading cover image on clodinary.");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: { coverImage: coverImageResponse.url },
    },
    { new: true }
  ).select("-password -refreshToken");

  if (oldCoverImageUrl) {
    //get public id from url and delete image from cloudinary
    const publicId = getPublicIdFromCloudinaryUrl(oldCoverImageUrl);

    const destroyResponse = await deleteFromCloudinary(publicId);

    if (destroyResponse.result === "not found") {
      console.warn(
        "No old cover image found on Cloudinary to delete:",
        destroyResponse
      );
    }
  }

  res
    .status(200)
    .json(new ApiResponse(200, user, "Cover image updated successfully."));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateUserDetails,
  updateUserAvatar,
  updateUserCoverImage,
};
