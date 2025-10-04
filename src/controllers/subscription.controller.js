import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.models.js";
import { Subscription } from "../models/subscription.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  // TODO: toggle subscription
  const { channelId } = req.params;

  if (!channelId || !isValidObjectId(channelId)) {
    throw new ApiError(400, "Valid channel id is required.");
  }

  // 0. check if channel or user exists
  const channelExists = await User.findById(channelId);
  if (!channelExists) {
    throw new ApiError(404, "Channel not found.");
  }

  // 1. Check if the logged-in user is already subscribed
  const existingSubscription = await Subscription.findOne({
    channel: channelId,
    subscriber: req.user?._id,
  });

  // 2. If already subscribed -> unsubscribe (delete)
  if (existingSubscription) {
    const deletedSubscription = await Subscription.findOneAndDelete({
      channel: channelId,
      subscriber: req.user?._id,
    });

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          deletedSubscription,
          "Channel unsubscribed successfully."
        )
      );
  }

  // 3. Else, subscribe (create)
  const newSubscription = await Subscription.create({
    channel: channelId,
    subscriber: req.user?._id,
  });

  res
    .status(201)
    .json(
      new ApiResponse(201, newSubscription, "Channel subscribed successfully.")
    );
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!channelId || !isValidObjectId(channelId)) {
    throw new ApiError(400, "Valid channel id is required.");
  }

  //fetch on basis of channelId subscribers are returned.
  const subscribers = await Subscription.find({ channel: channelId });

  if (subscribers.length === 0) {
    throw new ApiError(404, "No subscribers found.");
  }

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscribers,
        "subscribers list fetched successfully."
      )
    );
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;

  if (!subscriberId || !isValidObjectId(subscriberId)) {
    throw new ApiError(400, "Valid subscriberId is required.");
  }

  //fetch on basis of subscriberId, subscribed channels are returned.
  const channels = await Subscription.find({ subscriber: subscriberId });

  if (channels.length === 0) {
    throw new ApiError(404, "No channels subscribed.");
  }

  res
    .status(200)
    .json(
      new ApiResponse(200, channels, "channels list fetched successfully.")
    );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
