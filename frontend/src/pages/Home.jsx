import React, { useEffect, useState } from 'react'
import '../styles/Home.css'
import { MdOutlineFileUpload, MdOutlineFolder } from "react-icons/md"
import { FaSearch, FaBars } from 'react-icons/fa' // Added FaBars
import Sidebar from '../components/Sidebar'
import axios from 'axios'
import FileTable from '../components/FileTable'
import DetailsPanel from '../components/DetailsPanel'
import { MdContentPaste } from "react-icons/md"
import { IoClose } from "react-icons/io5"

const Home = () => {
    const [isDarkMode, setIsDarkMode] = useState(true)
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [items, setItems] = useState([])
    const [parentFolderId, setParentFolderId] = useState(null)
    const [currentFolderID, setCurrentFolderId] = useState(null)
    const [selectedItem, setSelectedItem] = useState(null)
    const [uploadProgress, setUploadProgress] = useState(0)
    const [isUploading, setIsUploading] = useState(false)
    const [popUp, setPopUp] = useState(null)
    const [clipboard, setClipboard] = useState(() => {
        const saved = localStorage.getItem("clipboard")
        try {
            return saved ? JSON.parse(saved) : { item: null, type: null }
        } catch {
            return { item: null, type: null }
        }
    })

    const toggleTheme = () => setIsDarkMode(!isDarkMode)

    useEffect(() => {
        const syncClipboard = () => {
            const saved = localStorage.getItem("clipboard")
            setClipboard(saved ? JSON.parse(saved) : { item: null, type: null })
        }
        window.addEventListener("clipboardUpdate", syncClipboard)
        window.addEventListener("storage", syncClipboard)
        return () => {
            window.removeEventListener("clipboardUpdate", syncClipboard)
            window.removeEventListener("storage", syncClipboard)
        }
    }, [])

    useEffect(() => {
        refreshFiles("root")
    }, [])

    const refreshFiles = async (folderId) => {
        const id = folderId ?? "root"
        try {
            const res = await axios.get(`${import.meta.env.VITE_BACKEND}/file/list?id=${id}`, { withCredentials: true })
            setItems(res.data?.combinedData)
            setParentFolderId(res.data?.currentFolder?.parentFolderId)
            setCurrentFolderId(res.data?.currentFolder?.id)
        } catch (err) { console.error(err) }
    }

    const handleFileUpload = async (event) => {
        const file = event.target.files[0]
        if (!file) return
        const formData = new FormData()
        formData.append('file', file)
        const id = currentFolderID ?? "root"
        setIsUploading(true)
        try {
            await axios.post(`${import.meta.env.VITE_BACKEND}/file/upload/${id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (p) => setUploadProgress(Math.round((p.loaded * 100) / p.total)),
                withCredentials: true
            })
        } catch (error) { alert("Upload failed.") } finally {
            setIsUploading(false)
            refreshFiles(currentFolderID)
        }
    }

    return (
        <div className={`home-container ${isDarkMode ? 'dark' : ''}`}>
            <div className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`} onClick={() => setIsSidebarOpen(false)}></div>

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
                            <div className="search-bar">
                                <FaSearch className="search-icon" />
                                <input type="text" placeholder="Search..." />
                            </div>
                        </div>

                        <div className="header-actions">
                            <input type="file" id="file-upload" style={{ display: 'none' }} onChange={handleFileUpload} />
                            <button className="upload-btn" onClick={() => document.getElementById('file-upload').click()} disabled={isUploading}>
                                <MdOutlineFileUpload /> 
                                <span className="btn-text">{isUploading ? `${uploadProgress}%` : "Upload"}</span>
                            </button>
                            <button className='upload-btn secondary' onClick={() => setPopUp("folder")}>
                                <MdOutlineFolder /> <span className="btn-text">New</span>
                            </button>
                        </div>
                    </header>

                    <section className="section-container">
                        <div className="section-header">
                            <h2 className='text-xl font-bold'>My Storage</h2>
                            <button onClick={() => refreshFiles(parentFolderId)} className="back-btn">← Back</button>
                        </div>

                        <FileTable
                            data={items}
                            selectedId={selectedItem?.id}
                            onSelect={setSelectedItem}
                            selectedItem={selectedItem}
                            refreshFiles={refreshFiles}
                            currentFolderID={currentFolderID}
                            popUp={popUp}
                            setPopUp={setPopUp}
                        />
                    </section>
                </div>
                <DetailsPanel item={selectedItem} onSelect={setSelectedItem} view='storage' />
            </main>
        </div>
    )
}

export default Home