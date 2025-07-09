import dotenv from "dotenv"

dotenv.config({
    path :'./.env'
})
import connectDB from "./db/index.js";
import { app } from "./app.js";



connectDB()
.then(() =>
{
    app.listen(process.env.PORT || 8000, () => {
        console.log(`Server is runing at port ${process.env.PORT}`);
    } )
}
)
.catch( (err) => {
    console.log("MONGO DB connection failed!! ", err)   
})


// import express from "express"
// const app = express()

// ;( async () =>
// {
//     try {
//         await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
       
//         app.on("Error", (error) => {
//             console.error("Error : ", error)
//             throw err
//         })

//         app.listen(process.env.PORT, () => {
//             console.log(`App is listening on Port ${process.env.PORT}`);
//         })
        
//     } catch (error) {
//         console.error("ERROR: ", error)
//         throw err
        
//     }
// } )()
