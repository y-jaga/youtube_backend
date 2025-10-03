import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.models.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
  //TODO: create tweet
  const { content } = req.body;

  if (!content || content?.trim()?.length === 0) {
    throw new ApiError(400, "content is required.");
  }

  const tweet = await Tweet.create({
    owner: req.user?._id,
    content,
  });

  res
    .status(201)
    .json(new ApiResponse(201, tweet, "tweet created successfully."));
});

const getUserTweets = asyncHandler(async (req, res) => {
  // TODO: get user tweets

  const { userId } = req.params;

  if (!userId || !isValidObjectId(userId)) {
    throw new ApiError(400, "Valid userId is required.");
  }

  //retrieve and validate user
  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "user not found.");
  }

  //fetch users tweets
  const tweets = await Tweet.find({ owner: userId });

  if (tweets.length === 0) {
    throw new ApiError(404, "No tweets found.");
  }

  res
    .status(200)
    .json(new ApiResponse(200, tweets, "tweets fetched successfully."));
});

const updateTweet = asyncHandler(async (req, res) => {
  //TODO: update tweet
  const { content } = req.body;
  const { tweetId } = req.params;

  if (!content || content?.trim()?.length === 0) {
    throw new ApiError(400, "content is required.");
  }

  if (!tweetId || !isValidObjectId(tweetId)) {
    throw new ApiError(400, "Valid tweetId is required.");
  }

  //only tweet owner can update it
  const updatedTweet = await Tweet.findOneAndUpdate(
    { _id: tweetId, owner: req.user?._id },
    { content },
    { new: true }
  );

  if (!updatedTweet) {
    throw new ApiError(404, "Tweet not found or you are not authorized.");
  }

  res
    .status(200)
    .json(new ApiResponse(200, updatedTweet, "tweet updated successfully."));
});

const deleteTweet = asyncHandler(async (req, res) => {
  //TODO: delete tweet
  const { tweetId } = req.params;

  if (!tweetId || !isValidObjectId(tweetId)) {
    throw new ApiError(400, "Valid tweetId is required.");
  }

  const tweet = await Tweet.findOneAndDelete({
    _id: tweetId,
    owner: req.user?._id,
  });

  if (!tweet) {
    throw new ApiError(404, "Tweet not found or you are not authorized.");
  }

  res.status(204).json();
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
