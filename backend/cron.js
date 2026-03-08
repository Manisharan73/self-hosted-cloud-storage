const cron = require("node-cron")
const File = require("./models/file")
const Folder = require("./models/folder")
const { Op } = require('sequelize')

cron.schedule("*/15 * * * *", async () => {
    const expiryTime = new Date(Date.now() -  15 * 24 * 60 * 60 * 1000)

    await File.destroy({
        where: {
            isTrashed: true,
            deletedAt: {
                [Op.lt]: expiryTime
            }
        }
    })

    await Folder.destroy({
        where: {
            isTrashed: true,
            deletedAt: {
                [Op.lt]: expiryTime
            }
        }
    })
})