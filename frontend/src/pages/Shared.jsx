import React, { useEffect, useState } from 'react'
import Sidebar from '../components/Sidebar'
import axios from 'axios'
import FileTable from '../components/FileTable'
import DetailsPanel from '../components/DetailsPanel'
import { FaBars } from 'react-icons/fa'

const Shared = () => {
    const [isDarkMode, setIsDarkMode] = useState(true)
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [items, setItems] = useState([])
    const [selectedItem, setSelectedItem] = useState(null)

    const toggleTheme = () => setIsDarkMode(!isDarkMode)

    const fetchShared = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_BACKEND}/user/shared-with-me`, { withCredentials: true })
            setItems(res.data?.combinedData)
        } catch (err) { console.error(err) }
    }

    useEffect(() => { fetchShared() }, [])

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
                        <FileTable 
                            data={items} 
                            selectedItem={selectedItem} 
                            onSelect={setSelectedItem} 
                            refreshFiles={fetchShared} 
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