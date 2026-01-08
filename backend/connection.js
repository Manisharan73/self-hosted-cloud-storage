const mongoose =  require("mongoose")

function connectMongoDB(url){
    return mongoose.connect(url).then(() => console.log("Connected to mongoDB"))
}

module.exports ={ connectMongoDB }