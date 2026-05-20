import { createContext, useState, useEffect, useContext } from "react"
import axios from "axios"
import { socket } from "../scripts/socket"
import toast from "react-hot-toast"
import NotificationItem from "../components/NotificationItem"

const NotificationContext = createContext()

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState({ received: [], sent: [] })
    const [loading, setLoading] = useState(true)
    const [toasts, setToasts] = useState([])

    const fetchData = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_BACKEND}/user/notifications`, { withCredentials: true })
            setNotifications(res.data)
        } catch (err) {
            console.error("Failed to fetch notifications", err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        socket.on("connection", () => {
            console.log("Connected ", socket.id)
        })

        socket.on("welcome", (s) => console.log(s))

        socket.io.on("upgrade", (transport) => {
            console.log("upgraded to", transport.name)
        })

        socket.io.on("reconnect_attempt", () => {
            console.log("reconnect attempt")
        })

        socket.on("connect_error", (err) => {
            console.log(err)
        })

        socket.on("test", (data) => {
            console.log(data)
        })

        socket.on("shareNotification", (notification) => {
            console.log(notification)
            const id = crypto.randomUUID()

            const toastData = {
                id,
                ...notification
            }
            setToasts(prev => [...prev, toastData])

            toast((t) => (
                <NotificationItem notification={notification} />
            ))

            setTimeout(() => {
                setToasts(prev =>
                    prev.filter(t => t.id !== id)
                )
            }, 5000)
        })

        socket.onAny((event, ...args) => {
            console.log("EVENT:", event, args)
        })

        return () => {
            socket.disconnect()
        }
    }, [])

    return (
        <NotificationContext.Provider value={{ toasts, setToasts, notifications, setNotifications, fetchData, loading }}>
            {children}
        </NotificationContext.Provider>
    )
}

export const useNotifications = () => useContext(NotificationContext)