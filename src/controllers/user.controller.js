import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import User from "../model/user.model.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import { removeLocalFile } from "../middlewares/multer.middleware.js";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "somthing will wrong while generating access and referesh Token"
    );
  }
};

export const userRegister = asyncHandler(async (req, res) => {
  // get user details from frontend
  // validation - not empty
  // check if user already exists: username, email
  // check for images, check for avatar
  // upload them to cloudinary, avatar
  // create user object - create entry in db
  // remove password and refresh token field from response
  // check for user creation
  // return res
  const { fullName, email, password, username } = req.body;

  // ✅ Validate required fields
  if ([fullName, email, password, username].some((field) => !field?.trim())) {
    throw new ApiError(400, "All fields are required");
  }

  // ✅ Check for existing user
  const existingUser = await User.findOne({
    $or: [{ email }, { username: username.toLowerCase() }],
  });

  // ✅ Extract file paths early
  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
  // ✅ If user exists, clean up files and throw error
  if (existingUser) {
    await removeLocalFile(avatarLocalPath);
    await removeLocalFile(coverImageLocalPath);
    throw new ApiError(400, "User already exists with this username or email");
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  let avatar, coverImage;

  try {
    // ✅ Upload to Cloudinary
    avatar = await uploadOnCloudinary(avatarLocalPath);
    if (!avatar?.url || !avatar?.public_id) {
      throw new ApiError(400, "Failed to upload avatar");
    }

    if (coverImageLocalPath) {
      coverImage = await uploadOnCloudinary(coverImageLocalPath);
    }

    // ✅ Create user
    const user = await User.create({
      fullName,
      email,
      password,
      username: username.toLowerCase(),
      avatar: avatar.url,
      avatarPublicId: avatar?.public_id,
      coverImage: coverImage?.url || "",
      coverImagePublicId: coverImage?.public_id || "",
    });

    const createUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );

    if (!createUser) {
      throw new ApiError(500, "User creation failed");
    }

    // ✅ Success response
    console.log("✅ User registered successfully");

    res
      .status(201)
      .json(new ApiResponse(201, createUser, "User registered successfully"));
  } catch (error) {
    console.error("User registration error:", error.message || error);

    // ✅ Cleanup uploaded files
    if (avatar?.public_id) {
      await deleteFromCloudinary(avatar.public_id);
    }
    if (coverImage?.public_id) {
      await deleteFromCloudinary(coverImage.public_id);
    }

    throw new ApiError(500, "User registration failed, uploads rolled back");
  }
});

export const userLogIn = asyncHandler(async (req, res) => {
  //req body ->data
  // username or email
  // find user
  // password check
  // access and referesh token
  // send cookie

  const { email, password, username } = req.body;

  if (!(username || email)) {
    throw new ApiError(400, "username or email is required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(400, "user does not exists on this username or email");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "inCorrect Password");
  }
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const logInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
    // maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };
  console.log("User LogIn Successfully");

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: logInUser,
          refreshToken,
          accessToken,
        },
        "user loggIn Successfully"
      )
    );
});

export const userLogOut = asyncHandler(async (req, res) => {
  console.log(req.user);

  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
    // maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };
  console.log("LogOut SuccessFully");
  //  const updatedUser = await User.findById(req.user._id);
  // console.log("Updated refreshToken:", updatedUser.refreshToken);
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, "User LogOut Successfully"));
});

export const refreshAccessToken = asyncHandler(async (req, res) => {
  const inComingToken = req.cookies?.refreshToken || req.body.refreshToken;

  // console.log(req.cookies.refreshToken);

  // console.log(inComingToken);

  if (!inComingToken) {
    throw new ApiError(401, "Unauthorized requiest");
  }

  try {
    const decodedToken = jwt.verify(
      inComingToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh Token");
    }

    if (inComingToken !== user.refreshToken) {
      throw new ApiError(401, "refresh token expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
      // maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    };

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
      user._id
    );

    // console.log("\naccessToken:\n",accessToken,"\nrefreshToken:\n", refreshToken);
    console.log("Token are refreshed successfully");

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    console.error("Refresh token error:", error);
    throw new ApiError(500, "Error while refreshing access token");
  }
});

export const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword, confirmdPassword } = req.body;

  // Check if new password and confirmation match
  if (newPassword !== confirmdPassword) {
    throw new ApiError(400, "New password and confirmation do not match");
  }
  // Check if new password or confirmation is  match match with oldPassword not allowed for change password
  if (oldPassword === newPassword) {
    throw new ApiError(
      400,
      "new password or confirmation is  match match with oldPassword not allowed for change password"
    );
  }

  // Find the user by ID
  const user = await User.findById(req.user._id);
  if (!user) {
    throw new ApiError(401, "Unauthorized user");
  }

  // Verify old password
  const isPasswordValid = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordValid) {
    throw new ApiError(401, "Incorrect old password");
  }

  // Update password
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  // Send response
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "User password updated successfully"));
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User fetched successfully"));
});

export const updateAccountDetails = asyncHandler(async (req, res) => {
  let { fullName, email, username } = req.body || {};
  const existingUser = await User.findById(req.user?._id);
  if (!existingUser) {
    throw new ApiError(400, "Unauthorized user");
  }

  // Use existing values if no new ones are provided

  /*

  if(!fullName) fullName=existingUser.fullName
  if(!username) username=existingUser.username
  if(!email) email=existingUser.email

  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email,
        username,
      },
    },
    { new: true }
  ).select("-password");

  */

  //or

  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName: fullName || existingUser.fullName,
        email: email || existingUser.email,
        username: username || existingUser.username,
      },
    },
    { new: true }
  ).select("-password");

  // or

  /*

  const updatedFullName = fullName || existingUser.fullName;
  const updatedEmail = email || existingUser.email;
  const updatedUsername = username || existingUser.username;

  // await user.save({validateBeforeSave:false})

  const updatedUser = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName: updatedFullName,
        email: updatedEmail,
        username: updatedUsername,
      },
    },
    { new: true }
  ).select("-password");

  */

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedUser, "Account details updated successfully")
    );
});

export const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new ApiError(401, "Unauthorized user");
  }

  // 🧹 Delete old avatar from Cloudinary if it exists
  if (user.avatarPublicId) {
    await deleteFromCloudinary(user.avatarPublicId);
  }

  // 📤 Upload new avatar
  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url || !avatar.public_id) {
    throw new ApiError(400, "Error while uploading avatar");
  }

  // 📝 Update user with new avatar URL and public_id
  user.avatar = avatar.url;
  user.avatarPublicId = avatar.public_id;
  await user.save({ validateBeforeSave: false });

  // const user = await User.findByIdAndUpdate(
  //     req.user?._id,
  //     {
  //         $set:{
  //             avatar: avatar.url
  //         }
  //     },
  //     {new: true}
  // ).select("-password")

  const updatedUser = await User.findById(req.user._id).select("-password");

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedUser, "Avatar image updated successfully")
    );
});
export const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover file is missing");
  }

  const user = await User.findById(req.user?._id);
  if (!user) {
    throw new ApiError(401, "Unauthorized user");
  }

  // 🧹 Delete old avatar from Cloudinary if it exists
  if (user.coverImagePublicId) {
    await deleteFromCloudinary(user.coverImagePublicId);
  }

  // 📤 Upload new avatar
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!coverImage.url || !coverImage.public_id) {
    throw new ApiError(400, "Error while uploading cover Image");
  }

  // 📝 Update user with new avatar URL and public_id
  user.coverImage = coverImage.url;
  user.coverImagePublicId = coverImage.public_id;
  await user.save({ validateBeforeSave: false });

  // const user = await User.findByIdAndUpdate(
  //     req.user?._id,
  //     {
  //         $set:{
  //             avatar: avatar.url
  //         }
  //     },
  //     {new: true}
  // ).select("-password")

  const updatedUser = await User.findById(req.user._id).select("-password");

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedUser, "cover image updated successfully")
    );
});

export const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "User name is not found from params");
  }

  // const user=await User.find({username})

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage:1,
        email:1,
        createdAt: 1
      },
    },
  ]);

  if (!channel?.length) {
    throw new ApiError(404,"Channel does not exists")
  }

  return res
  .status(200)
  .json(new ApiResponse(200,channel[0],"User channel fetch succesfully"))
});
