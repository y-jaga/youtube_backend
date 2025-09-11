import { ApiError } from "../utils/ApiError.js";
import validator from "validator";

function registerUserValidation(userData, avatarLocalPath) {
  const requiredFields = [
    userData.username,
    userData.email,
    userData.fullName,
    userData.password,
  ];
  if (requiredFields.some((field) => !field || field?.trim() === "")) {
    throw new ApiError(400, "All fields are required.");
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar image is required.");
  }

  if (!validator.isEmail(userData.email)) {
    throw new ApiError(400, "email in not valid.");
  }
}

export { registerUserValidation };
