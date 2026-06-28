const { Server } = require("socket.io")
const { socketAuth, onlineUsers } = require('../middlewares/socketAuth')
const SharedItem  = require("../models/sharedItem")
const File = require("../models/file")
const Folder = require("../models/folder")
const User = require("../models/user")

let io

const shareNotifier = async (io, socket, userId, recipientId) => {
    if (!recipientId) return;

    const whereClause = {
        sharedWith: recipientId,
        status: "active",
        isSavedByRecipient: false,
        isDelivered: false
    }

    if (userId != null) {
        whereClause.ownerId = userId
    }

    const shared = await SharedItem.findAll({
        where: whereClause
    })

    const fileIds = []
    const folderIds = []
    const userIds = new Set()
    
    shared.forEach(share => {
        if (share.itemType === 'file') fileIds.push(share.itemId)
        else if (share.itemType === 'folder') folderIds.push(share.itemId)
        userIds.add(share.ownerId)
    })

    const [files, folders, users] = await Promise.all([
        fileIds.length > 0 ? File.findAll({ where: { id: fileIds, isTrashed: false } }) : [],
        folderIds.length > 0 ? Folder.findAll({ where: { id: folderIds, isTrashed: false } }) : [],
        User.findAll({ where: { id: Array.from(userIds) }, attributes: ['id', 'name', 'uniqueName', 'username', 'email'] })
    ])

    const fileMap = new Map(files.map(f => [f.id, f]))
    const folderMap = new Map(folders.map(f => [f.id, f]))
    const userMap = new Map(users.map(u => [u.id, u]))

    for (const share of shared) {
        const isFile = share.itemType === 'file'
        const item = isFile ? fileMap.get(share.itemId) : folderMap.get(share.itemId)
        
        if (!item) continue
                
        const owner = userMap.get(share.ownerId)

        const payload = {
            shareId: share.id,
            itemId: share.itemId,
            itemName: isFile ? item.originalFilename : item.name,
            itemType: share.itemType,
            targetUser: owner ? {
                id: owner.id,
                name: owner.name,
                uniqueName: owner.username
            } : { id: share.ownerId, name: 'Unknown User' },
            date: share.createdAt,
            type: 'received',
            message: isFile
                ? `${owner ? owner.name : 'Someone'} shared file "${item.originalFilename}"`
                : `${owner ? owner.name : 'Someone'} shared folder "${item.name}"`
        }

        io.to(recipientId.toString()).emit("shareNotification", payload, async (response) => {
            if (response === 'ok') {
                await share.update({ isDelivered: true })
            }
        })
    }
}

const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: [
                'http://localhost:5173',
                'http://100.116.29.119:5173',
                'http://100.76.246.47:5173',
                'https://self-hosted-cloud-storage-p6j711cvy.vercel.app'
            ],
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization']
        }
    })

    io.use(socketAuth)

    io.on('connection', (socket) => {
        const userId = socket.user.id.toString()

        console.log("User connected: ", userId)

        socket.emit("welcome", "Welcome to the server.")
        socket.broadcast.emit("welcome", `${userId} joined the server.`)

        socket.join(userId)
        shareNotifier(io, socket, null, userId)
        console.log("ROOMS:", socket.rooms)

        socket.on("disconnect", () => {
            console.log(userId, " disconnected")
        })

        socket.on("connect_error", (err) => {
            console.log("Socket connect error:", err.message)
        })



        socket.on("itemShared", async (recipientId) => {
            try {
                const userId = socket.user.id
                if (!recipientId) return;

                await shareNotifier(io, socket, userId, recipientId)

            } catch (err) {
                console.error("itemShared error:", err);
            }
        })

        io.engine.on("connection_error", (err) => {
            console.log("CONNECTION ERROR")
            console.log(err.req)
            console.log(err.code)
            console.log(err.message)
            console.log(err.context)
        })
    })

    return io
}

const getIO = () => {
    if (!io)
        throw new Error("Socket.io not initialized")

    return io
}

module.exports = {
    initSocket,
    getIO
}