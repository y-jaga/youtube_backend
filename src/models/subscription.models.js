import mongoose, { Schema } from "mongoose";

//subscriber(user with userId) subscribed to channel(user with userId)
//e.g yogesh(subscriber) subscribed to chai aur code(channel)
//e.g chai aur code(subscriber) subscribed to National Geography(channel)

//if searched on basis of channel(or user) can find no. of subscribers for the channel
//if searched on basis of subscriber can find no. of channel the subscriber(or user) has subscribed
const subscriptionSchema = new Schema(
  {
    //channel and subscriber both are users with "userId"
    channel: {
      type: Schema.Types.ObjectId, //one to whom "subscriber" is subscribing
      ref: "User",
    },
    subscriber: {
      type: Schema.Types.ObjectId, //one who is subscribing to a channel
      ref: "User",
    },
  },
  { timestamps: true }
);

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
