import mongoose from 'mongoose'

const connectDB = async()=>{
    try{
        const conn = await mongoose.connect(process.env.MONGOO_URI)
        console.log("Database connected")
    }catch(err){
        console.log(err)
        process.exit(1)
    }
}

export default connectDB

