import { io } from "socket.io-client";

export const socket = io(import.meta.env.VITE_BACKEND, {
    withCredentials: true,
    transports: ["polling", "websocket"],
    autoConnect: true,
})