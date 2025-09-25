import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  //TODO: get all videos based on query, sort, pagination

  const {
    page = 1,
    limit = 10,
    query,
    sortBy = "views",
    sortType = "desc",
    userId,
  } = req.query;

  if (!userId) {
    throw new ApiError(400, "userId is required.");
  }

  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 10;

  //matches videos based on userId and title or description
  //then sorted and applied pagination
  const videos = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
        //case-insensitive search on title or description
        $or: [
          { title: { $regex: query, $options: "i" } },
          { description: { $regex: query, $options: "i" } },
        ],
      },
    },
    {
      $sort: {
        [sortBy]: sortType?.toLowerCase() === "asc" ? 1 : -1,
      },
    },
    {
      //pagination
      $facet: {
        metadata: [{ $count: "totalCount" }],
        data: [{ $skip: (pageNum - 1) * limitNum }, { $limit: limitNum }],
      },
    },
  ]);

  if (!videos[0] || videos[0].data.length === 0) {
    throw new ApiError(400, "No videos found.");
  }

  res.status(200).json(
    new ApiResponse(
      200,
      {
        videosMetadata: { totalCount: videos[0].metadata[0]?.totalCount || 0 },
        videos: videos[0].data,
      },
      "Videos fetched successfully."
    )
  );
});

const publishAVideo = asyncHandler(async (req, res) => {
  // TODO: get video, upload to cloudinary, create video
  const userId = req.user?._id;
  const { title, description } = req.body;

  console.log("uploaded files \n", req.files);

  if (!title || !description) {
    throw new ApiError(400, "title and description are required.");
  }
  //req.files = {videoFile: [{}], thumbnail: [{}]}
  const videoFilePath = req.files.videoFile?.[0]?.path;
  const thumbnailPath = req.files.thumbnail?.[0]?.path;

  if (!videoFilePath || !thumbnailPath) {
    throw new ApiError(
      400,
      "videoFile and thumbnail image not uploaded correctly."
    );
  }

  const videoResponse = await uploadOnCloudinary(videoFilePath);

  if (!videoResponse) {
    throw new ApiError(500, "Error while uploading video to cloudinary.");
  }

  const thumbnailResponse = await uploadOnCloudinary(thumbnailPath);

  if (!thumbnailResponse) {
    throw new ApiError(
      500,
      "Error while uploading thumbnail image to cloudinary."
    );
  }

  const video = await Video.create({
    videoFile: videoResponse.url,
    thumbnail: thumbnailResponse.url,
    title,
    description,
    duration: videoResponse.duration,
    owner: userId,
  });

  res
    .status(201)
    .json(new ApiResponse(201, video, "video published successfully."));
});

export { getAllVideos, publishAVideo };
