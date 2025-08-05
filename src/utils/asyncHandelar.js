const asyncHandeler=(requestHandeler)=>{
    (req,res,next)=>{
        Promise.resolve(requestHandeler(req,res,next)).catch((err)=>next(err))
    }
}



export {asyncHandeler}






// const asyncHandeler=(fun)=>async(req,resizeBy,next)=>{
//     try {
//         await fun(req,res,next)
//     } catch (error) {
//         res.status(error.code || 500).json({
//             success:false,
//             message:error.message
//         })
//     }
// }