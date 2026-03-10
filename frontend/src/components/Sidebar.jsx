import React from 'react'
import '../styles/Sidebar.css'
import { useLocation, useNavigate } from 'react-router-dom'
import { FaHome, FaBell } from "react-icons/fa"
import { IoPerson, IoClose } from "react-icons/io5" 
import { FaTrashCan } from "react-icons/fa6"
import { LuLogOut } from "react-icons/lu"
import { MdDarkMode, MdLightMode } from "react-icons/md"
import { useNotifications } from '../context/NotificationContext'
import { GoDotFill } from "react-icons/go";
import { useTheme } from "../context/ThemeContext"
import Cookies from "js-cookie"

const Sidebar = ({ isOpen, setIsOpen }) => {
    const navigate = useNavigate()
    const location = useLocation()

    const { isDarkMode, toggleTheme } = useTheme()

    const isActive = (path) => location.pathname === path ? 'active' : ''

    const handleNavigation = (path) => {
        navigate(path)
        if (window.innerWidth <= 768) {
            setIsOpen(false)
        }
    }

    const handleLogOut = () => {
        localStorage.removeItem('token')
        navigate('/login-signup', { replace: true })
    }

    const { notifications } = useNotifications()
    const receivedCount = notifications.received.length

    return (
        <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
            <div className="sidebar-header-mobile">
                <IoClose className="close-icon" onClick={() => setIsOpen(false)} />
            </div>

            <div className={`nav-item ${isActive('/')}`} onClick={() => handleNavigation("/")}>
                <FaHome className="nav-icon" /> <span>Home</span>
            </div>

            <div className={`nav-item ${isActive('/notifications')}`} onClick={() => handleNavigation("/notifications")}>
                <FaBell className="nav-icon" />
                <div className="notif-bar">
                    <span>Notifications</span>
                    {receivedCount > 0 && <span className="notif-badge"><GoDotFill /></span>}
                </div>
            </div>

            <div className={`nav-item ${isActive('/shared')}`} onClick={() => handleNavigation("/shared")}>
                <IoPerson className="nav-icon" /> <span>Shared with me</span>
            </div>

            <div className={`nav-item ${isActive('/trash')}`} onClick={() => handleNavigation("/trash")}>
                <FaTrashCan className="nav-icon" /> <span>Trash</span>
            </div>

            <div className="sidebar-bottom">
                <div className="nav-item" onClick={toggleTheme}>
                    {isDarkMode ? <MdLightMode className="nav-icon" /> : <MdDarkMode className="nav-icon" />}
                    <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                </div>
                <div className="nav-item logout" onClick={handleLogOut}>
                    <LuLogOut className="nav-icon" /> <span>Logout</span>
                </div>
            </div>
        </aside>
    )
}

export default Sidebar