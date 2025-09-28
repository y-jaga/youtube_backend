import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

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

//TODO: when playlist fetched in getUserPlaylists, getPlaylistById the videos filed contains objId of video should we populate them
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

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
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
