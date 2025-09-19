import { Router } from "express";
import {
  changeCurrentPassword,
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
  updateUserDetails,
  updateUserAvatar,
  updateUserCoverImage,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";

const router = Router();

//register user
router.route("/register").post(
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  registerUser
);

//login user
router.route("/login").post(loginUser);

//secured routes
router.route("/logout").post(verifyJwt, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/password").patch(verifyJwt, changeCurrentPassword);
router.route("/").get(verifyJwt, getCurrentUser);
router.route("/").patch(verifyJwt, updateUserDetails);

router.route("/avatar").patch(
  upload.fields([
    { name: "avatar", maxCount: 1 },
  ]),
  verifyJwt,
  updateUserAvatar
);

router.route("/cover-image").patch(
  upload.fields([
    { name: "coverImage", maxCount: 1 },
  ]),
  verifyJwt,
  updateUserCoverImage
);

export default router;
