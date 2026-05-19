const { Server } = require("socket.io")
const { socketAuth, onlineUsers } = require('../middlewares/socketAuth')
const { SharedItem } = require("../models/sharedItem")
const { sharedItem } = require("../controllers/user")

let io

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
        const userId = socket.user.id

        console.log("User connected: ", userId)

        socket.emit("welcome", "Welcome to the server.")
        socket.broadcast.emit("welcome", `${userId} joined the server.`)

        socket.join(userId)

        socket.on("disconnect", () => {
            console.log(userId, " disconnected")
        })

        socket.on("connect_error", (err) => {
            console.log("Socket connect error:", err.message);
        })

        socket.on("itemShared", async (recipientId) => {
            try {
                const userId = socket.user.id;

                const shared = await SharedItem.findAll({
                    where: {
                        ownerId: userId,
                        sharedWith: recipientId,
                        status: "active",
                        isSavedByRecipient: false
                    }
                });

                for (const share of shared) {

                    let item = null;

                    if (share.itemType === "file") {

                        item = await File.findOne({
                            where: {
                                id: share.itemId,
                                isTrashed: false
                            }
                        });

                    } else if (share.itemType === "folder") {

                        item = await Folder.findOne({
                            where: {
                                id: share.itemId,
                                isTrashed: false
                            }
                        });
                    }

                    if (!item) continue;

                    io.to(`user:${recipientId}`).emit(
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
                            message:
                                share.itemType === "file"
                                    ? `${socket.user.username} shared file "${item.name}"`
                                    : `${socket.user.username} shared folder "${item.name}"`,
                            createdAt: new Date()
                        }
                    );
                }

            } catch (err) {
                console.error(err);
            }
        });

        io.engine.on("connection_error", (err) => {
            console.log("CONNECTION ERROR");
            console.log(err.req);
            console.log(err.code);
            console.log(err.message);
            console.log(err.context);
        });
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