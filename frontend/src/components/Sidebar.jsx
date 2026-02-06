import '../styles/Sidebar.css'
import { useNavigate } from 'react-router-dom';
import { FaHome, FaBell } from "react-icons/fa";
import { IoMdPhotos, IoIosDocument } from "react-icons/io";
import { BiSolidVideos } from "react-icons/bi";
import { MdAudiotrack } from "react-icons/md";
import { IoPerson } from "react-icons/io5";
import { FaTrashCan } from "react-icons/fa6";
import { LuLogOut } from "react-icons/lu";
import { MdDarkMode, MdLightMode } from "react-icons/md";

const Sidebar = ({ isDarkMode, toggleTheme }) => {
    const navigate = useNavigate()

    const handleLogOut = () => {
        localStorage.removeItem('token')
        navigate('/login-signup', { replace: true })
    }

    return (<>
        <aside className="sidebar">
            <div className="sidebar-top">
                <div className="nav-item active">
                    <FaHome className="nav-icon" /> <span>Home</span>
                </div>
                <div className="nav-item">
                    <FaBell className="nav-icon" /> <span>Notifications</span>
                </div>
            </div>

            <div className="sidebar-middle">
                <h3 className="section-title">Categories</h3>
                <div className="nav-item">
                    <IoMdPhotos className="nav-icon" /> <span>Photos</span>
                </div>
                <div className="nav-item">
                    <BiSolidVideos className="nav-icon" /> <span>Videos</span>
                </div>
                <div className="nav-item">
                    <IoIosDocument className="nav-icon" /> <span>Documents</span>
                </div>
                <div className="nav-item">
                    <MdAudiotrack className="nav-icon" /> <span>Audio</span>
                </div>
                <div className="nav-item">
                    <IoPerson className="nav-icon" /> <span>Shared with me</span>
                </div>
                <div className="nav-item">
                    <FaTrashCan className="nav-icon" /> <span>Trash</span>
                </div>
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