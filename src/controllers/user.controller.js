import path from "path";
import { User } from "../models/user.models.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { registerUserValidation } from "../validations/validation.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { __dirname } from "../utils/paths.js";

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

export { registerUser };
