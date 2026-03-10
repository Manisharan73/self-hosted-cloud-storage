const cron = require('node-cron')
const fs = require('fs').promises
const path = require('path')
const { Op } = require('sequelize')
const File = require('./models/file.js')
const Folder = require('./models/folder.js')
const User = require('./models/user.js') 

cron.schedule("*/15 * * * *", async () => {
    try {
        console.log("Running trash cleanup cron job...")
        const expiryTime = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) 

        const expiredFiles = await File.findAll({
            where: {
                isTrashed: true,
                deletedAt: { [Op.lt]: expiryTime }
            }
        })

        for (const file of expiredFiles) {
            const owner = await User.findByPk(file.ownerId)
            if (owner) {
                const filePath = path.join(__dirname, "..", "uploads", owner.uniqueName, file.filename)
                
                await fs.unlink(filePath).catch(() => {})
            }
            await file.destroy()
        }

        const expiredFolders = await Folder.findAll({
            where: {
                isTrashed: true,
                deletedAt: { [Op.lt]: expiryTime }
            }
        })

        for (const folder of expiredFolders) {
            const owner = await User.findByPk(folder.ownerId)
            if (!owner) {
                await folder.destroy()
                continue
            }

            const userDir = path.join(__dirname, "..", "uploads", owner.uniqueName)

            const queue = [folder.id]
            const filesToDelete = []
            const foldersToDelete = [folder]

            while (queue.length > 0) {
                const currentId = queue.shift()

                const files = await File.findAll({ where: { parentFolderId: currentId } })
                filesToDelete.push(...files)

                const subFolders = await Folder.findAll({ where: { parentFolderId: currentId } })
                for (const sub of subFolders) {
                    queue.push(sub.id)
                    foldersToDelete.push(sub)
                }
            }

            for (const file of filesToDelete) {
                const filePath = path.join(userDir, file.filename)
                await fs.unlink(filePath).catch(() => {})
                await file.destroy()
            }

            for (let i = foldersToDelete.length - 1; i >= 0; i--) {
                await foldersToDelete[i].destroy()
            }
        }

        console.log("Trash cleanup completed successfully.")

    } catch (err) {
        console.error("Cron Job Cleanup Error:", err)
    }
})