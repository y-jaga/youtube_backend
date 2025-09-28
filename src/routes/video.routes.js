import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import {
  getAllVideos,
  getVideoById,
  publishAVideo,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
} from "../controllers/video.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.use(verifyJwt);

router
  .route("/")
  .get(getAllVideos)
  .post(
    upload.fields([
      { name: "videoFile", maxCount: 1 },
      { name: "thumbnail", maxCount: 1 },
    ]),
    publishAVideo
  );

router
  .route("/:videoId")
  .get(getVideoById)
  .post(upload.single("thumbnail"), updateVideo)
  .delete(deleteVideo);

router.route("/toggle/publish/:videoId").patch(togglePublishStatus);

export default router;
