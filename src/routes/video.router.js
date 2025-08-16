import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { getAllVideos } from "../controllers/video.controller.js";

const videoRouter=Router();
videoRouter.use(verifyJWT);


videoRouter.route("/").get(getAllVideos)


export default videoRouter