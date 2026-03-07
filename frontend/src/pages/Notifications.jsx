import Sidebar from "../components/Sidebar"
import "../styles/Notifications.css"
import { useState } from "react"

const Notifications = () => {
    const [isDarkMode, setIsDarkMode] = useState(true)

    const toggleTheme = () => setIsDarkMode(!isDarkMode)

    return(
        <div className={`notif-container ${isDarkMode ? 'dark' : ''}`}>
            <Sidebar isDarkMode={isDarkMode} toggleTheme={toggleTheme}/>
        </div>
    )
}

export default Notifications