import '../styles/Sidebar.css'
import { useLocation, useNavigate } from 'react-router-dom'
import { FaHome, FaBell } from "react-icons/fa"
import { IoPerson } from "react-icons/io5"
import { FaTrashCan } from "react-icons/fa6"
import { LuLogOut } from "react-icons/lu"
import { MdDarkMode, MdLightMode } from "react-icons/md"
import { useNotifications } from '../context/NotificationContext'

const Sidebar = ({ isDarkMode, toggleTheme }) => {
    const navigate = useNavigate()
    const location = useLocation()

    const isActive = (path) => location.pathname === path ? 'active' : ''

    const handleLogOut = () => {
        localStorage.removeItem('token')
        navigate('/login-signup', { replace: true })
    }

    const { notifications } = useNotifications()
    const receivedCount = notifications.received.length

    return (<>
        <aside className="sidebar">
            <div
                className={`nav-item ${isActive('/')}`}
                onClick={() => {
                    navigate("/")
                }}
            >
                <FaHome className="nav-icon" /> <span>Home</span>
            </div>
            <div className="nav-item" onClick={() => navigate("/notifications")}>
                <FaBell className="nav-icon" /> 
                <span>Notifications</span>
                {receivedCount > 0 && <span className="notif-badge">{receivedCount}</span>}
            </div>
            <div
                className={`nav-item ${isActive('/shared')}`}
                onClick={() => {
                    navigate("/shared")
                }}
            >
                <IoPerson className="nav-icon" /> <span>Shared with me</span>
            </div>
            <div
                className={`nav-item ${isActive('/trash')}`}
                onClick={() => {
                    navigate("/trash")
                }}
            >
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
    </>)
}

export default Sidebar