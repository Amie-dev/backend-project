import { Router } from "express";
import { userlogIn, userRegister } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

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
  userRegister)
userRouter.route("/login").get(userlogIn)


// userRouter.route("/login").get(userlogIn)   ---> multiple methods (.get(), .post(), .put(), etc.) for the same route.

/*
userRouter.route("/")
  .get(getUsers)
  .post(createUser);
  
 */

// userRouter.post("/", userRegister);


export default userRouter;