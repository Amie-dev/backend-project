import { asyncHandeler } from "../utils/asyncHandelar.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import User from "../model/user.model.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
import jwt from "jsonwebtoken"

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "somthing will wrong while generating access and referesh Token"
    );
  }
};

export const userRegister = asyncHandeler(async (req, res) => {
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

  if (existingUser) {
    throw new ApiError(400, "User already exists with this username or email");
  }

  // ✅ Extract file paths
  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

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
      coverImage: coverImage?.url || "",
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

export const userLogIn = asyncHandeler(async (req, res) => {
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

export const userLogOut = asyncHandeler(async (req, res) => {
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


export const refreshAccessToken=asyncHandeler(async(req,res)=>{
  const inComingToken = req.cookies?.refreshToken || req.body.refreshToken;

  console.log(req.cookies.refreshToken);
  
  console.log(inComingToken);
  
  if (!inComingToken) {
    throw new ApiError(401,"Unauthorized requiest")
  }

  try {
    const decodedToken = jwt.verify(
      inComingToken,
      process.env.REFRESH_TOKEN_SECRET
    )
    const user=await User.findById(decodedToken?._id);
  
    if (!user) {
      throw new ApiError(401,"Invalid refresh Token")
    }
  
    if(inComingToken !== user.refreshToken){
      throw new ApiError(401,"refresh token expired or used")
    }
  
    const options = {
      httpOnly: true,
      secure: true,
      // maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    };
  
    const {accessToken,refreshToken}=await generateAccessAndRefreshTokens(user._id);
  
  
    console.log("\naccessToken:\n",accessToken,"\nrefreshToken:\n",refreshToken);
    
    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
      new ApiResponse(
        200,
        {accessToken,refreshToken},
        "Access token refreshed"
      )
    )
  } catch (error) {
console.error("Refresh token error:", error);
throw new ApiError(500, "Error while refreshing access token");
  }
})
