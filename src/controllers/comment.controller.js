import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../model/video.model.js";
import { Comment } from "../model/comment.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
  // TODO: Get all comments for a video
  const { videoId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  // Validate video existence
  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Invalid Video Id");
  }

  const commentsAggregate = [
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId), // Match comments for the given video
      },
    },
    {
      // Lookup user details for each comment's owner
      $lookup: {
        from: "users", // MongoDB collection name
        localField: "owner", // Field in Comment schema
        foreignField: "_id", // Field in User schema
        as: "owner",
      },
    },
    {
      // Lookup likes associated with each comment
      $lookup: {
        from: "likes", // MongoDB collection name
        localField: "_id", // Comment ID
        foreignField: "comment", // Field in Like schema
        as: "likes",
      },
    },
    {
      // Add computed fields: likesCount, single owner object, and isLiked status
      $addFields: {
        likesCount: {
          $size: "$likes",
        },
        owner: {
          $first: "$owner",
        },
        isLiked: {
          $cond: {
            if: { $in: [req.user?._id, "$likes.likedBy"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      // Sort comments by newest first
      $sort: {
        createdAt: -1,
      },
    },
    {
      // Project only necessary fields to return
      $project: {
        content: 1,
        createdAt: 1,
        likesCount: 1,
        owner: {
          username: 1,
          fullName: 1,
          "avatar.url": 1,
        },
        isLiked: 1,
      },
    },
  ];

  // Pagination options
  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  // Execute paginated aggregation
  const comments = await Comment.aggregatePaginate(commentsAggregate, options);

  // Send response
  return res
    .status(200)
    .json(new ApiResponse(200, comments, "Comments fetched successfully"));
});

const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { content } = req.body;

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video is not found Or Invalid Video ID");
  }

  if (!content) {
    throw new ApiError(400, "Content is required");
  }

  const comment = await Comment.create({
    content: content,
    owner: req?.user._id,
  });

  if (!comment) {
    throw new ApiError(400, "Comment is not created due to internal error");
  }

  res
    .status(201)
    .json(new ApiResponse(201, comment, "Comment is created successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;

  // Validate content
  if (!content || content.trim() === "") {
    throw new ApiError(400, "Content is required");
  }

  // Find the comment
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  // Check ownership
  if (comment.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Only the owner can edit their comment");
  }

  // Update the comment
  comment.content = content;
  await comment.save();

  return res
    .status(200)
    .json(new ApiResponse(200, comment, "Comment updated successfully"));
});


const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  // Find the comment
  const comment = await Comment.findById(commentId);
  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  // Check ownership
  if (comment.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Only the comment owner can delete their comment");
  }

  // Delete the comment
  await Comment.findByIdAndDelete(commentId);

  // Delete associated likes
  await Like.deleteMany({ comment: commentId });

  // Send response
  return res
    .status(200)
    .json(new ApiResponse(200, { commentId }, "Comment deleted successfully"));
});


export { getVideoComments, addComment, updateComment, deleteComment };
