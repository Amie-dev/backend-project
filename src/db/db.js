import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";


const connectDB=async()=>{
    try {
        // const dburi=await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`);
       await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`);
        console.log(`DB connections succesfull`);
        // console.log(dburi.connection.host);
        
        
    } catch (error) {
        console.log(error);
        process.exit(1)
        
    }
}


export default connectDB;