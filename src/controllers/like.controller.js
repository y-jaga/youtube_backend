import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.models.js";
import { Comment } from "../models/comment.models.js";
import { Tweet } from "../models/tweet.models.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  //TODO: toggle like on video

  //retrieve and validate video id
  const { videoId } = req.params;
  if (!videoId || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Valid video id is required.");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found.");
  }

  //fetch liked video
  const likedVideo = await Like.findOne({
    video: videoId,
    likedBy: req.user?._id,
  });
  console.log(likedVideo);

  //if liked video found dislike it (i.e. delete the document)
  if (likedVideo) {
    const dislikedVideo = await Like.findOneAndDelete({
      video: videoId,
      likedBy: req.user?._id,
    });

    return res
      .status(200)
      .json(
        new ApiResponse(200, dislikedVideo, "video disliked successfully.")
      );
  }

  //if liked video not found like it (i.e. create the document)
  const newLikedVideo = await Like.create({
    video: videoId,
    likedBy: req.user?._id,
  });

  res
    .status(201)
    .json(new ApiResponse(200, newLikedVideo, "video liked successfully."));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  //TODO: toggle like on comment

  //retrieve and validate comment id
  const { commentId } = req.params;

  if (!commentId || !isValidObjectId(commentId)) {
    throw new ApiError(400, "Valid commentId is required.");
  }

  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "comment not found.");
  }

  //fetch liked comment
  const likedComment = await Like.findOne({
    comment: commentId,
    likedBy: req.user?._id,
  });

  //if comment liked dislike(or delete the document)
  if (likedComment) {
    const dislikedComment = await Like.findOneAndDelete({
      comment: commentId,
      likedBy: req.user?._id,
    });

    return res
      .status(200)
      .json(
        new ApiResponse(200, dislikedComment, "comment disliked successfully.")
      );
  }

  const newLikedComment = await Like.create({
    comment: commentId,
    likedBy: req.user?._id,
  });

  res
    .status(201)
    .json(new ApiResponse(201, newLikedComment, "comment liked successfully."));
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  //TODO: toggle like on tweet

  //retrieve and validate tweet id

  if (!tweetId || !isValidObjectId(tweetId)) {
    throw new ApiError(400, "Valid tweetId is required.");
  }

  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throw new ApiError(404, "tweet not found.");
  }

  //fetch liked tweet
  const likedTweet = await Like.findOne({
    tweet: tweetId,
    likedBy: req.user?._id,
  });

  //if tweet liked -> dislike(or delete the document)
  if (likedTweet) {
    const dislikedTweet = await Like.findOneAndDelete({
      tweet: tweetId,
      likedBy: req.user?._id,
    });

    return res
      .status(200)
      .json(
        new ApiResponse(200, dislikedTweet, "tweet disliked successfully.")
      );
  }

  //if tweet disliked or not found -> like(or create the document)
  const newLikedTweet = await Like.create({
    tweet: tweetId,
    likedBy: req.user?._id,
  });

  res
    .status(201)
    .json(new ApiResponse(201, newLikedTweet, "tweet liked successfully."));
});

const getLikedVideos = asyncHandler(async (req, res) => {
  //TODO: get all liked videos
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const likedVideos = await Like.find({
    likedBy: req.user?._id,
    video: { $exists: true, $ne: null },
  })
    .populate("video", "title thumbnail videoFile description")
    .skip(skip)
    .limit(limit);

  if (likedVideos.length === 0) {
    throw new ApiError(404, "no liked videos found.");
  }

  res
    .status(200)
    .json(
      new ApiResponse(200, likedVideos, "liked videos fetched successfully.")
    );
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
