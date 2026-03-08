import Sidebar from "../components/Sidebar"
import "../styles/Notifications.css"
import { useEffect, useState } from "react"
import axios from "axios"
import { IoMailOpenOutline, IoSendOutline, IoCheckmark, IoClose, IoTrashOutline } from "react-icons/io5"
import { FaBars } from 'react-icons/fa' 
import { useNotifications } from "../context/NotificationContext"

const Notifications = () => {
    const [isDarkMode, setIsDarkMode] = useState(true)
    const [isSidebarOpen, setIsSidebarOpen] = useState(false) // Added for responsiveness
    const [activeTab, setActiveTab] = useState('received')
    
    const { notifications, setNotifications, loading, fetchData } = useNotifications()

    const toggleTheme = () => setIsDarkMode(!isDarkMode)

    useEffect(() => {
        fetchData()
    }, [])

    const handleAction = async (action, shareId) => {
        let endpoint = "";
        if (action === 'accept') endpoint = `/user/share/save/${shareId}`;
        if (action === 'decline') endpoint = `/user/share/decline/${shareId}`;
        if (action === 'revoke') endpoint = `/user/share/revoke/${shareId}`;

        try {
            await axios.post(`${import.meta.env.VITE_BACKEND}${endpoint}`, {}, { withCredentials: true });
            setNotifications(prev => ({
                received: prev.received.filter(n => n.shareId !== shareId),
                sent: prev.sent.filter(n => n.shareId !== shareId)
            }));
        } catch (err) {
            console.error("Action error:", err);
            alert(err.response?.data?.msg || "Failed to process request");
        }
    };

    return (
        <div className={`notif-container ${isDarkMode ? 'dark' : ''}`}>
            {/* Sidebar Overlay */}
            <div 
                className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`} 
                onClick={() => setIsSidebarOpen(false)}
            ></div>

            <Sidebar 
                isDarkMode={isDarkMode} 
                toggleTheme={toggleTheme} 
                isOpen={isSidebarOpen} 
                setIsOpen={setIsSidebarOpen} 
            />

            <main className="notif-content">
                <header className="notif-header">
                    <div className="header-left-notif">
                        <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}>
                            <FaBars />
                        </button>
                        <h1>Sharing Notifications</h1>
                    </div>
                </header>

                <div className="notif-tabs">
                    <button
                        className={`tab-btn ${activeTab === 'received' ? 'active' : ''}`}
                        onClick={() => setActiveTab('received')}
                    >
                        Received <span className="notif-count">{notifications.received.length}</span>
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'sent' ? 'active' : ''}`}
                        onClick={() => setActiveTab('sent')}
                    >
                        Sent <span className="notif-count">{notifications.sent.length}</span>
                    </button>
                </div>

                <div className="notif-list">
                    {loading ? (
                        <p className="empty-msg">Loading notifications...</p>
                    ) : notifications[activeTab].length === 0 ? (
                        <p className="empty-msg">No {activeTab} requests found.</p>
                    ) : (
                        notifications[activeTab].map((n) => (
                            <div key={n.shareId} className="notif-card">
                                <div className="notif-info">
                                    <div className="notif-icon">
                                        {activeTab === 'received' ? <IoMailOpenOutline /> : <IoSendOutline />}
                                    </div>
                                    <div className="notif-details">
                                        <h3>{n.itemName}</h3>
                                        <p className="target-user">
                                            {activeTab === 'received' 
                                                ? `From: ${n.targetUser}` 
                                                : `To: ${n.targetUser}`}
                                        </p>
                                        <p className="notif-date">{new Date(n.date).toLocaleDateString()}</p>
                                    </div>
                                </div>

                                <div className="notif-actions">
                                    {activeTab === 'received' ? (
                                        <>
                                            <button className="btn-action btn-save" onClick={() => handleAction('accept', n.shareId)}>
                                                <IoCheckmark /> <span>Accept</span>
                                            </button>
                                            <button className="btn-action btn-decline" onClick={() => handleAction('decline', n.shareId)}>
                                                <IoClose /> <span>Decline</span>
                                            </button>
                                        </>
                                    ) : (
                                        <button className="btn-action btn-revoke" onClick={() => handleAction('revoke', n.shareId)}>
                                            <IoTrashOutline /> <span>Revoke</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>
        </div>
    )
}

export default Notifications