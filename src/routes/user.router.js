import { Router } from "express";
import {
  changeCurrentPassword,
  getCurrentUser,
  getUserChannelProfile,
  refreshAccessToken,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  userLogIn,
  userLogOut,
  userRegister,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const userRouter = Router();

userRouter.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  userRegister
);

userRouter.route("/login").post(userLogIn);

userRouter.get("/logout", verifyJWT, userLogOut);

userRouter.post("/refresh-token", refreshAccessToken);

userRouter.post("/change-password", verifyJWT, changeCurrentPassword);
userRouter.get("/user", verifyJWT, getCurrentUser);

userRouter.patch("/update-account", verifyJWT, updateAccountDetails);

userRouter.patch(
  "/update-avatar",
  verifyJWT,
  upload.single("avatar"),
  updateUserAvatar
);
userRouter.patch(
  "/update-cover-image",
  verifyJWT,
  upload.single("coverImage"),
  updateUserCoverImage
);

userRouter.get("/user/:username",verifyJWT,getUserChannelProfile)

// userRouter.route("/login").get(userlogIn)   ---> multiple methods (.get(), .post(), .put(), etc.) for the same route.

/*
userRouter.route("/")
  .get(getUsers)
  .post(createUser);
  
 */

// userRouter.post("/", userRegister);

export default userRouter;
