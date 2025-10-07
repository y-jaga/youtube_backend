import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import {
  getLikedVideos,
  toggleCommentLike,
  toggleTweetLike,
  toggleVideoLike,
} from "../controllers/like.controller.js";

const router = Router();

router.use(verifyJwt);

router.route("/toggles/v/:videoId").post(toggleVideoLike);
router.route("/toggles/c/:commentId").post(toggleCommentLike);
router.route("/toggles/t/:tweetId").post(toggleTweetLike);
router.route("/videos").get(getLikedVideos);

export default router;
