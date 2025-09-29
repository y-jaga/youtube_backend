import { Router } from "express";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import {
  addVideoToPlaylist,
  createPlaylist,
  getPlaylistById,
  getUserPlaylists,
} from "../controllers/playlist.controller.js";

const router = Router();

router.use(verifyJwt); // Apply verifyJWT middleware to all routes in this file

router.route("/").post(createPlaylist);

router.route("/user/:userId").get(getUserPlaylists);

router.route("/:playlistId").get(getPlaylistById);

router.route("/add/:playlistId/:videoId").patch(addVideoToPlaylist);

export default router;
