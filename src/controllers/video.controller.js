import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../model/video.model.js";
import User from "../model/user.model.js";

import { asyncHandler } from "../utils/asyncHandler.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";

import { ApiError } from "../utils/apiError.js";

import { removeLocalFile } from "../middlewares/multer.middleware.js";
import { title } from "process";

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
  //TODO: get all videos based on query, sort, pagination

  //    console.log(userId);

  const pipeline = [];

  // for using Full Text based search u need to create a search index in mongoDB atlas
  // you can include field mapppings in search index eg.title, description, as well
  // Field mappings specify which fields within your documents should be indexed for text search.
  // this helps in seraching only in title, desc providing faster search results
  // here the name of search index is 'search-videos'
  if (query) {
    pipeline.push({
      $search: {
        index: "search-videos",
        text: {
          query: query,
          path: ["title", "description"], //search only on title, desc
        },
      },
    });
  }

  if (userId) {
    if (!isValidObjectId(userId)) {
      throw new ApiError(400, "Invalid userId");
    }

    pipeline.push({
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    });
  }

  // fetch videos only that are set isPublished as true
  pipeline.push({ $match: { isPublished: true } });

  //sortBy can be views, createdAt, duration
  //sortType can be ascending(-1) or descending(1)
  if (sortBy && sortType) {
    pipeline.push({
      $sort: {
        [sortBy]: sortType === "asc" ? 1 : -1,
      },
    });
  } else {
    pipeline.push({ $sort: { createdAt: -1 } });
  }

  pipeline.push(
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
        pipeline: [
          {
            $project: {
              username: 1,
              "avatar.url": 1,
            },
          },
        ],
      },
    },
    {
      $unwind: "$ownerDetails",
    }
  );

  const videoAggregate = Video.aggregate(pipeline);

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  const video = await Video.aggregatePaginate(videoAggregate, options);
  console.log(video);

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Videos fetched successfully"));
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  // 🔍 Validate required text fields
  if (!title?.trim() || !description?.trim()) {
    throw new ApiError(400, "Title and description are required");
  }

  // 📁 Extract file paths
  const videoLocalPath = req.files?.videoFile?.[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;
  if (!videoLocalPath) {
    throw new ApiError(400, "Video file is required");
  }
  if (!thumbnailLocalPath) {
    throw new ApiError(400, "thumbnail file is required");
  }
  //   if (!videoLocalPath || !thumbnailLocalPath) {
  //     const missing = [];
  //     if (!videoLocalPath) missing.push("video file");
  //     if (!thumbnailLocalPath) missing.push("thumbnail file");
  //     throw new ApiError(400, `Missing required ${missing.join(" and ")}`);
  //   }

  try {
    // ☁️ Upload video to Cloudinary
    const videoFile = await uploadOnCloudinary(videoLocalPath);
    if (!videoFile?.url || !videoFile?.public_id) {
      removeLocalFile(videoLocalPath);
      throw new ApiError(400, "Video upload failed");
    }

    // ☁️ Upload thumbnail to Cloudinary
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    if (!thumbnail?.url || !thumbnail?.public_id) {
      removeLocalFile(videoLocalPath); // Clean up video if thumbnail fails
      removeLocalFile(thumbnailLocalPath); // Clean up video if thumbnail fails
      throw new ApiError(400, "Thumbnail upload failed");
    }

    // 📝 Save video metadata to DB
    const video = await Video.create({
      title,
      description,
      duration: videoFile.duration,
      videoFile: {
        url: videoFile.url,
        public_id: videoFile.public_id,
      },
      thumbnail: {
        url: thumbnail.url,
        public_id: thumbnail.public_id,
      },
      owner: req.user._id,
      isPublished: false,
    });

    // 🔍 Fetch clean version of uploaded video
    const uploadedVideo = await Video.findById(video._id).select(
      "-videoFile.public_id -thumbnail.public_id"
    );

    if (!uploadedVideo) {
      throw new ApiError(400, "Video upload failed");
    }

    // ✅ Send success response
    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          uploadedVideo,
          "Video and thumbnail uploaded successfully"
        )
      );
  } catch (error) {
    // 🛑 Optional: log or forward error
    console.error("Upload error:", error);
    throw new ApiError(500, "Internal server error during video upload");
  }
});

// const publishAVideo = asyncHandler(async (req, res) => {
//   const { title, description } = req.body;
//   // TODO: get video, upload to cloudinary, create video
//   if ([title, description].some((field) => field.trim() === "")) {
//     throw new ApiError(400, "All fields are required");
//   }
//   // ✅ Extract file paths early
//   const videoLocalPath = req.files?.videoFile[0].path;
//   const thumbnailLocalPath = req.files?.thumbnail[0].path;

//   if (!videoLocalPath) {
//     throw new ApiError(400, "Video file is required");
//   }
//   if (!thumbnailLocalPath) {
//     throw new ApiError(400, "thumbnail file is required");
//   }
// //   const videoFile = await uploadOnCloudinary(videoLocalPath);
// //   const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
//   let videoFile, thumbnail;
//   try {
//     videoFile = await uploadOnCloudinary(videoLocalPath);
//     if (!videoFile.url || !videoFile.public_id) {
//       removeLocalFile(videoLocalPath);
//       throw new ApiError(400, "Video File not found");
//     }

//     thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
//     if (!thumbnail.url || !thumbnail.public_id) {
//       removeLocalFile(videoLocalPath);
//       throw new ApiError(400, "Video File not found");
//     }

//     const video=await Video.create({
//         title,
//         description,
//         duration:videoFile.duration,
//         videoFile:{
//             url:videoFile.url,
//             public_id:videoFile.public_id
//         },
//         thumbnail:{
//             url:thumbnail.url,
//             public_id:thumbnail.public_id
//         },
//         owner:req.user._id,
//         isPublished:false
//     })

//     const uploadedVideo=await Video.findById(video._id).select("-videoFile.public_id -thumbnail.public_id")
//     if (!uploadedVideo) {
//         throw new ApiError(400,"Video Upload fail")
//     }

//     res.status(200)
//     .json(new ApiResponse(200,uploadedVideo,"Video and thumbnail uplodad succesfully"))
//   } catch (error) {}
// });

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: get video by id
  const video = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId),
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          {
            $lookup: {
              from: "subscriptions",
              localField: "_id",
              foreignField: "channel",
              as: "subscribers",
            },
          },
          {
            $addFields: {
              subscribersCount: {
                $size: "$subscribers",
              },
              isSubscribed: {
                $cond: {
                  if: {
                    $in: [req.user?._id, "$subscribers.subscriber"],
                  },
                  then: true,
                  else: false,
                },
              },
            },
          },
          {
            $project: {
              username: 1,
              "avatar.url": 1,
              isSubscribed: 1,
              subscribersCount: 1,
            },
          },
        ],
      },
    },
    {
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
      $project: {
        "videoFile.url": 1,
        title: 1,
        description: 1,
        views: 1,
        createdAt: 1,
        duration: 1,
        comments: 1,
        owner: 1,
        likesCount: 1,
        isLiked: 1,
      },
    },
  ]);
  if (!video.length) {
    throw new ApiError(404, "Video not found");
  }

  // increment views if video fetched successfully
  await Video.findByIdAndUpdate(videoId, {
    $inc: {
      views: 1,
    },
  });

  // add this video to user watch history
  if (req.user?._id) {
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: {
        watchHistory: videoId,
      },
    });
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video[0], "video details fetched successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;

  if (!videoId) {
    throw new ApiError(400, "Video ID is required");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.owner.toString() !== req.user?._id.toString()) {
    throw new ApiError(403, "Only the owner can edit this video");
  }

  const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;
  if (!thumbnailLocalPath) {
    throw new ApiError(400, "Thumbnail file is required");
  }

  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
  if (!thumbnail?.url || !thumbnail?.public_id) {
    removeLocalFile(thumbnailLocalPath);
    throw new ApiError(400, "Thumbnail upload failed");
  }

  // Clean up local file after successful upload
  // removeLocalFile(thumbnailLocalPath);

  // Delete old thumbnail from Cloudinary
  await deleteFromCloudinary(video.thumbnail.public_id);

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: {
        title,
        description,
        thumbnail: {
          public_id: thumbnail.public_id,
          url: thumbnail.url,
        },
      },
    },
    { new: true }
  ).select("-thumbnail.public_id");

  if (!updatedVideo) {
    await deleteFromCloudinary(thumbnail.public_id);
    throw new ApiError(500, "Video update failed");
  }

  res
    .status(200)
    .json(new ApiResponse(200, updatedVideo, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
