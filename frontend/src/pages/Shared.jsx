import React, { useEffect, useState } from 'react'
import Sidebar from '../components/Sidebar'
import axios from 'axios'
import FileTable from '../components/FileTable'
import DetailsPanel from '../components/DetailsPanel'
import { FaBars } from 'react-icons/fa'
import { useTheme } from '../context/ThemeContext'

const Shared = () => {
    const { isDarkMode } = useTheme()

    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [items, setItems] = useState([])
    const [selectedItem, setSelectedItem] = useState(null)
    const [currentFolderId, setCurrentFolderId] = useState("root")
    const [parentFolderId, setParentFolderId] = useState(null)
    const [breadcrumbs, setBreadcrumbs] = useState([])

    const toggleTheme = () => setIsDarkMode(!isDarkMode)

    const fetchShared = async (folderId = "root") => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_BACKEND}/user/listShared?id=${folderId}`, {
                withCredentials: true
            })
            setItems(res.data?.combinedData)
            setParentFolderId(res.data?.currentFolder?.parentFolderId)
            setBreadcrumbs(res.data?.path || [])
            console.log(breadcrumbs)
        } catch (err) {
            console.error(err)
        }
    }

    useEffect(() => {
        setItems([])
        fetchShared(currentFolderId)
    }, [currentFolderId])

    const handleBackClick = () => {
        if (breadcrumbs.length > 1) {
            const parentId = breadcrumbs[breadcrumbs.length - 2].id;
            setCurrentFolderId(parentId);
        }
    }

    return (
        <div className={`home-container ${isDarkMode ? 'dark' : ''}`}>
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

            <main className="main-content flex-row">
                <div className="main-content-wrapper flex-grow">
                    <header className="dashboard-header">
                        <div className="header-left">
                            <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}>
                                <FaBars />
                            </button>
                            <h2 className='text-xl font-bold'>Shared With Me</h2>
                        </div>
                    </header>

                    <section className="section-container">
                        {/* THIS IS THE MISSING PIECE FROM YOUR SCREENSHOT */}
                        <div className="section-header" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div className="breadcrumb-wrapper">
                                {breadcrumbs.map((crumb, index) => (
                                    <span key={crumb.id} className="breadcrumb-item">
                                        <button
                                            onClick={() => setCurrentFolderId(crumb.id)}
                                            className={index === breadcrumbs.length - 1 ? 'crumb-active' : 'crumb-link'}
                                        >
                                            {crumb.name}
                                        </button>
                                        {index < breadcrumbs.length - 1 && <span className="crumb-separator">/</span>}
                                    </span>
                                ))}
                            </div>

                            {breadcrumbs.length > 1 && (
                                <button onClick={handleBackClick} className="back-btn text-blue-500 hover:text-blue-400">
                                    ← Back
                                </button>
                            )}
                        </div>

                        <FileTable
                            data={items}
                            selectedItem={selectedItem}
                            setCurrentFolderId={setCurrentFolderId}
                            onSelect={setSelectedItem}
                            refreshFiles={() => fetchShared(currentFolderId)}
                            view="shared"
                        />
                    </section>
                </div>

                <DetailsPanel item={selectedItem} onSelect={setSelectedItem} view="shared" />
            </main>
        </div>
    )
}

export default Shared