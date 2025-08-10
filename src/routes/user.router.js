import { Router } from "express";
import { refreshAccessToken, userLogIn, userLogOut, userRegister } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const userRouter=Router();


userRouter.route("/register").post(
  upload.fields(
    [{
      name:"avatar",
      maxCount:1
    },
    {
      name:"coverImage",
      maxCount:1
    }]
  ),
  userRegister);

userRouter.route("/login").post(userLogIn);

userRouter.get("/logout", verifyJWT,userLogOut)

userRouter.post("/refresh-token",refreshAccessToken)


// userRouter.route("/login").get(userlogIn)   ---> multiple methods (.get(), .post(), .put(), etc.) for the same route.

/*
userRouter.route("/")
  .get(getUsers)
  .post(createUser);
  
 */

// userRouter.post("/", userRegister);


export default userRouter;