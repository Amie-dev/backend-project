const asyncHandeler = (requestHandeler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandeler(req, res, next)).catch((err) => next(err));
  };
};

export { asyncHandeler };

// const asyncHandeler=(fun)=>async(req,res,next)=>{
//    return try {
//         await fun(req,res,next)
//     } catch (error) {
//         res.status(error.code || 500).json({
//             success:false,
//             message:error.message
//         })
//     }
// }
