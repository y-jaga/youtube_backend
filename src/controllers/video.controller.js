import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  deleteFromCloudinary,
  getPublicIdFromCloudinaryUrl,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";

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

  if (!userId || !isValidObjectId(userId)) {
    throw new ApiError(400, "Valid userId is required.");
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

const getVideoById = asyncHandler(async (req, res) => {
  //TODO: get video by id
  const { videoId } = req.params;

  if (!videoId || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Valid videoId is required.");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "video not found.");
  }

  res
    .status(200)
    .json(new ApiResponse(200, video, "Video fetched successfully."));
});

const updateVideo = asyncHandler(async (req, res) => {
  //TODO: update video details like title, description, thumbnail

  // i/p data to update in video
  const { videoId } = req.params;
  const thumbnailPath = req.file?.path;
  const dataToUpdate = req.body;

  const videoDataObj = {
    title: dataToUpdate?.title,
    description: dataToUpdate?.description,
    views: dataToUpdate?.views,
    isPublished: dataToUpdate?.isPublished,
  };

  if (!videoId || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Valid videoId is required.");
  }

  //find video
  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "video not found.");
  }

  //upload new, delete old thumbnail image from cloudinary, update its url in db
  if (thumbnailPath) {
    const oldThumbnailPath = video.thumbnail;
    console.log(oldThumbnailPath);

    const thumbnailResponse = await uploadOnCloudinary(thumbnailPath);

    if (!thumbnailResponse) {
      throw new ApiError(
        500,
        "Error while uploading thumbnail image on cloudinary"
      );
    }

    video.thumbnail = thumbnailResponse.url;

    const deleteResponse = await deleteFromCloudinary(
      getPublicIdFromCloudinaryUrl(oldThumbnailPath)
    );
    console.log(deleteResponse);

    if (
      deleteResponse.result !== "ok" ||
      deleteResponse.result === "not found"
    ) {
      console.error("Old Thumbnail image not found or deleted from cloudinary");
    } else {
      console.log("Old thumbnail image deleted successfully.");
    }
  }

  for (const videoEle of ["title", "description", "views", "isPublished"]) {
    if (videoDataObj[videoEle]) {
      video[videoEle] = videoDataObj[videoEle];
    }
  }

  await video.save();

  res
    .status(201)
    .json(new ApiResponse(201, video, "video updated successfully."));
});

export { getAllVideos, publishAVideo, getVideoById, updateVideo };
