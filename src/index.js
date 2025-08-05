import dotenv from 'dotenv';
import connectDB from './db/db.js';
import app from './app.js';

dotenv.config()

const port=process.env.PORT || 8000
connectDB()
.then(()=>{
    app.listen(port,()=>{
        console.log(`Server is listen at port ${port}`);
        
    })
})
.catch((err)=>{
    console.log(`Mongo DB Connections faild !!! ,${err}`);
    
})