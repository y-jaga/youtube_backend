import mongoose from "mongoose";
import { Video } from "../models/video.models.js";
import { Subscription } from "../models/subscription.models.js";
import { Like } from "../models/like.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
  // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.

  //fetch total subscribers count
  const totalSubscribers = await Subscription.countDocuments({
    channel: req.user?._id,
  });

  //fetch total videos
  const videos = await Video.find({ owner: req.user?._id }).select("_id views");

  const totalVideos = videos.length;

  //fetch total video views (sum of all videos sum)
  const totalViews = videos.reduce(
    (totalVideoViews, currvideo) => (totalVideoViews += currvideo.views || 0),
    0
  );

  // Total likes (all likes on all videos by this channel)
  const videosIds = videos.map((video) => video?._id);
  const totalLikes = await Like.countDocuments({ video: { $in: videosIds } });

  const channelStats = {
    totalVideos,
    totalSubscribers,
    totalViews,
    totalLikes,
  };

  res
    .status(200)
    .json(
      new ApiResponse(200, channelStats, "channel stats fetched successfully.")
    );
});

const getChannelVideos = asyncHandler(async (req, res) => {
  // TODO: Get all the videos uploaded by the channel
  const videos = await Video.find({ owner: req.user?._id })
    .select("_id title thumbnail videoFile description duration views")
    .lean();

  if (videos.length === 0) {
    throw new ApiError(404, "No videos found.");
  }

  res
    .status(200)
    .json(new ApiResponse(200, videos, "video fetched successfully."));
});

export { getChannelStats, getChannelVideos };
