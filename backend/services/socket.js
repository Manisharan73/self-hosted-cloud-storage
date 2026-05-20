const { Server } = require("socket.io")
const { socketAuth, onlineUsers } = require('../middlewares/socketAuth')
const SharedItem  = require("../models/sharedItem")
const File = require("../models/file")
const Folder = require("../models/folder")

let io

const shareNotifier = async (io, socket, userId, recipientId) => {
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

    for (const share of shared) {

        let item = null
        if (share.itemType === "file") {
            item = await File.findOne({
                where: {
                    id: share.itemId,
                    isTrashed: false
                }
            })
        } else if (share.itemType === "folder") {
            item = await Folder.findOne({
                where: {
                    id: share.itemId,
                    isTrashed: false
                }
            })
        }
        
        if (!item) continue
                
        console.log(`from ${userId} : to ${recipientId}`)
        io.to(recipientId.toString()).emit("test", "hello")
        io.to(recipientId.toString()).emit(
            "shareNotification",
            {
                id: share.id,
                type: share.itemType,
                item,
                from: {
                    id: socket.user.id,
                    username: socket.user.username,
                    email: socket.user.email
                },
                message: share.itemType === "file"
                    ? `${socket.user.username} shared file "${item.filename}"`
                    : `${socket.user.username} shared folder "${item.name}"`,
                createdAt: new Date()
            }
        )
        await share.update({
            isDelivered: true
        })
    }
}

const initSocket = (server) => {
    const io = new Server(server, {
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

                shareNotifier(io, socket, userId, recipientId)

            } catch (err) {
                console.error(err);
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