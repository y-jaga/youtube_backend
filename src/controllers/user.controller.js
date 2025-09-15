import path from "path";
import jwt from "jsonwebtoken";
import { User } from "../models/user.models.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  loginUserValidation,
  registerUserValidation,
} from "../validations/validation.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
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
      req.cookies.refreshToken || req.body.refreshToken;

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
      await generateRefreshAndAccessToken();

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

export { registerUser, loginUser, logoutUser, refreshAccessToken };
