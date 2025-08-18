import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../model/like.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid videoId");
  }

  const userId = req.user._id;

  const likeAlready = await Like.findOne({
    video: videoId,
    likeBy: userId,
  });

  if (likeAlready) {
    await Like.findByIdAndDelete(likeAlready._id);
    return res.status(200).json(new ApiResponse(200, { isLiked: false }));
  }

  await Like.create({
    video: videoId,
    likeBy: userId,
  });

  return res.status(200).json(new ApiResponse(200, { isLiked: true }));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  //TODO: toggle like on comment

  if (!isValidObjectId(commentId)) {
    throw new ApiError(404, "Invalid comment id");
  }

  const userId = req?.user._id;

  const likeAlready = await Like.findOne({
    comment: commentId,
    likeBy: userId,
  });

  if (likeAlready) {
    await Like.findByIdAndDelete(likeAlready._id);

    return res.status(200).json(new ApiResponse(200, { isLiked: false }));
  }

  await Like.create({
    Comment: commentId,
    likeBy: userId,
  });

  return res.status(200).json(new ApiResponse(200, { isLiked: true }));
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  //TODO: toggle like on tweet
  if (!isValidObjectId(tweetId)) {
    throw new ApiError(404, "Invalid Tweet Id");
  }

  const userId = req?.user?._id;

  const likedAlready = await findOne({
    tweet: tweetId,
    likeBy: userId,
  });
  if (likedAlready) {
    await Like.findByIdAndDelete(likedAlready?._id);

    return res
      .status(200)
      .json(new ApiResponse(200, { tweetId, isLiked: false }));
  }

  await Like.create({
    tweet: tweetId,
    likedBy: req.user?._id,
  });

  return res.status(200).json(new ApiResponse(200, { isLiked: true }));
});

const getLikedVideos = asyncHandler(async (req, res) => {
  //TODO: get all liked videos

  const likedVideosAggegate = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "likedVideo",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "ownerDetails",
            },
          },
          {
            $unwind: "$ownerDetails",
          },
        ],
      },
    },
    {
      $unwind: "$likedVideo",
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $project: {
        _id: 0,
        likedVideo: {
          _id: 1,
          "videoFile.url": 1,
          "thumbnail.url": 1,
          owner: 1,
          title: 1,
          description: 1,
          views: 1,
          duration: 1,
          createdAt: 1,
          isPublished: 1,
          ownerDetails: {
            username: 1,
            fullName: 1,
            "avatar.url": 1,
          },
        },
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        likedVideosAggegate,
        "liked videos fetched successfully"
      )
    );
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
