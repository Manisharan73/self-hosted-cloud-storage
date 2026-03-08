import { createContext, useState, useEffect, useContext } from "react"
import axios from "axios"

const NotificationContext = createContext()

export const NotificationProvider = ({ children }) => {
    const [notifications, setNotifications] = useState({ received: [], sent: [] })
    const [loading, setLoading] = useState(true)

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
        fetchData()

        const interval = setInterval(() => {
            fetchData()
        }, 10000)

        return () => clearInterval(interval)
    }, [])

    return (
        <NotificationContext.Provider value={{ notifications, setNotifications, fetchData, loading }}>
            {children}
        </NotificationContext.Provider>
    )
}

export const useNotifications = () => useContext(NotificationContext)