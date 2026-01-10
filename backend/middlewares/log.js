const fs = require("fs")

function logHandler(filename){
    return (req, res, next) => {
        fs.appendFile(filename, `\n${Date.now()} -- ${req.path} -- ${req.method}`, () => {
            next()
        })
    }
}

module.exports = {logHandler}