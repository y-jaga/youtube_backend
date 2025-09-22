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
import mongoose from "mongoose";

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
    { $set: { refreshToken: undefined } },
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
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "avatar file is missing.");
  }

  //fetch user
  const user = await User.findById(req.user?._id).select(
    "-password -refreshToken"
  );
  const oldAvatarUrl = user.avatar;

  //upload updated avatar image on cloudinary
  const avatarResponse = await uploadOnCloudinary(avatarLocalPath);

  if (!avatarResponse.url) {
    throw new ApiError(
      500,
      "Error while uploading avatar image on cloudinary."
    );
  }

  user.avatar = avatarResponse.url;

  await user.save();

  //get public id from url and delete image from cloudinary
  const publicId = getPublicIdFromCloudinaryUrl(oldAvatarUrl);

  const destroyResponse = await deleteFromCloudinary(publicId);

  if (destroyResponse.result !== "ok") {
    console.warn(
      "No old avatar image found on Cloudinary to delete:",
      destroyResponse
    );
  }

  res
    .status(200)
    .json(new ApiResponse(200, user, "avatar image updated successfully."));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "coverImage file is missing.");
  }

  //fetch user
  const user = await User.findById(req.user?._id).select(
    "-password -refreshToken"
  );
  const oldCoverImageUrl = user.coverImage;

  //upload updated cover image on cloudinary and update its url in db
  const coverImageResponse = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImageResponse.url) {
    throw new ApiError(500, "Error while uploading cover image on cloudinary.");
  }

  user.coverImage = coverImageResponse.url;

  await user.save();

  if (oldCoverImageUrl) {
    //get public id from url and delete image from cloudinary
    const publicId = getPublicIdFromCloudinaryUrl(oldCoverImageUrl);

    const destroyResponse = await deleteFromCloudinary(publicId);

    if (destroyResponse.result !== "ok") {
      console.warn(
        "No old cover image found on Cloudinary to delete:",
        destroyResponse
      );
    }
  }

  res
    .status(200)
    .json(new ApiResponse(200, user, "cover image updated successfully."));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "username is missing.");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      //gives list of subscribers(or users) of username [e.g chai aur code]
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      //gives list of subscribed channel by username [e.g chai aur code]
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        //counts no of subscribers to username [e.g chai aur code]
        subscribersCount: {
          $size: "$subscribers",
        },
        //counts no of channels username [e.g chai aur code] has subscribed
        channelSubscribedToCount: {
          $size: "$subscribedTo",
        },
        //for button at front-end which shows whether logged-in user (req.user?._id) has subscribed or not.
        //for current user(req.user?._id) which have logged in, if he is among the subscribers to username [e.g chai aur code]
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);

  console.log(channel);

  if (!channel?.length) {
    throw new ApiError(404, "channle does not exists.");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User channel fetched successfully.")
    );
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    username: 1,
                    fullName: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "Watch History fetched successfully."
      )
    );
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
  getUserChannelProfile,
  getWatchHistory,
};
