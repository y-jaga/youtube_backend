import mongoose from "mongoose";
import { Comment } from "../models/comment.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
  //TODO: get all comments for a video
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const skip = (page - 1) * limit;

  if (!videoId) {
    throw new ApiError(400, "videoId is required.");
  }

  const comments = await Comment.find({ video: videoId }, null, {
    skip,
    limit,
  }).sort({ updatedAt: -1, createdAt: -1, _id: 1 });

  if (comments.length === 0) {
    throw new ApiError(404, "No comments found.");
  }

  res
    .status(200)
    .json(new ApiResponse(200, comments, "comments fetched successfully."));
});

const addComment = asyncHandler(async (req, res) => {
  // TODO: add a comment to a video
  const { videoId } = req.params;
  const { content } = req.body;

  if (!videoId) {
    throw new ApiError(400, "videoId is required.");
  }
  if (!content || content?.trim().length === 0) {
    throw new ApiError(400, "content is required.");
  }

  const comment = await Comment.create({
    content,
    video: videoId,
    owner: req.user?._id,
  });

  res
    .status(201)
    .json(new ApiResponse(201, comment, "comment created successfully."));
});

const updateComment = asyncHandler(async (req, res) => {
  // TODO: update a comment
  const { commentId } = req.params;
  const { content } = req.body;

  if (!commentId) {
    throw new ApiError(400, "commentId is required.");
  }

  const updatedComment = await Comment.findOneAndUpdate(
    {
      _id: commentId,
      owner: req.user?._id,
    },
    { content },
    { new: true }
  );

  if (!updatedComment) {
    throw new ApiError(404, "comment not found or not authorized.");
  }

  res
    .status(200)
    .json(
      new ApiResponse(200, updatedComment, "comment updated successfully.")
    );
});

const deleteComment = asyncHandler(async (req, res) => {
  // TODO: delete a comment
  const { commentId } = req.params;

  if (!commentId) {
    throw new ApiError(400, "commentId is required.");
  }

  const deletedComment = await Comment.findOneAndDelete({
    _id: commentId,
    owner: req.user?._id,
  });

  if (!deletedComment) {
    throw new ApiError(404, "comment not found or not authorized to delete.");
  }

  res
    .status(200)
    .json(
      new ApiResponse(200, deletedComment, "comment deleted successfully.")
    );
});

export { getVideoComments, addComment, updateComment, deleteComment };
