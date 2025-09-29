import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.models.js";

const createPlaylist = asyncHandler(async (req, res) => {
  //TODO: create playlist

  //retrieve playlist name and description and validate them
  const { name, description } = req.body;

  if (!name || !description) {
    throw new ApiError(400, "name or description is required.");
  }

  //create playlist
  const video = await Playlist.create({
    name,
    description,
    owner: req.user?._id,
  });

  res
    .status(201)
    .json(new ApiResponse(201, video, "Playlist created successfully."));
});

//TODO: when playlist fetched in getUserPlaylists, getPlaylistById the videos field contains objId of video should we populate them
//anyone can fetch all playlist of any user
const getUserPlaylists = asyncHandler(async (req, res) => {
  //TODO: get user playlists
  const { userId } = req.params;

  if (!userId || !isValidObjectId(userId)) {
    throw new ApiError(400, "Valid user id is required.");
  }

  const playlist = await Playlist.find({ owner: userId });

  if (playlist.length === 0) {
    throw new ApiError(404, "No playlist found.");
  }

  res
    .status(200)
    .json(
      new ApiResponse(200, playlist, "user playlist fetched successfully.")
    );
});

const getPlaylistById = asyncHandler(async (req, res) => {
  //TODO: get playlist by id

  const { playlistId } = req.params;

  if (!playlistId || !isValidObjectId(playlistId)) {
    throw new ApiError(400, "Valid playlist id is required.");
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(404, "No playlist found.");
  }

  res
    .status(200)
    .json(new ApiResponse(200, playlist, "playlist fetched successfully."));
});

//only owner can video in playlist
const addVideoToPlaylist = asyncHandler(async (req, res) => {
  //retrieve and validate videoId and playlistId
  const { playlistId, videoId } = req.params;

  if (!playlistId || !isValidObjectId(playlistId)) {
    throw new ApiError(400, "Valid playlistId is required.");
  }
  if (!videoId || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Valid videoId is required.");
  }

  //fetch playlist and video by id, and validate them as well
  const [playlist, video] = await Promise.all([
    Playlist.findById(playlistId),
    Video.findById(videoId),
  ]);

  if (!playlist) {
    throw new ApiError(404, "playlist doesn't exists.");
  }
  if (!video) {
    throw new ApiError(404, "video doesn't exists.");
  }

  if (!playlist.owner.equals(req.user?._id)) {
    throw new ApiError(403, "Only playlist owner can add video in playlist.");
  }

  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    { $addToSet: { videos: videoId } },
    { new: true }
  ).populate({
    path: "videos",
    select: "title thumbnail videoFile duration ",
    options: { limit: 20, skip: 0 },
  });

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedPlaylist,
        "video added to playlist successfully."
      )
    );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  // TODO: remove video from playlist
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  // TODO: delete playlist
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;
  //TODO: update playlist
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
