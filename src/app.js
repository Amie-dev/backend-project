import express from "express";
import cookieParser from "cookie-parser";
import cors from 'cors';

const app=express();

app.use(cors({
    origin:process.env.CORS_ORIGINE,
    credentials:true
}))

app.use(express.json({limit:"16kb"}));

app.use(express.urlencoded());
app.use(express.static("public"));
app.use(cookieParser())

//router import
import userRouter from "./routes/user.router.js";

//used

app.use("/api/v1/user",userRouter)

export default app;