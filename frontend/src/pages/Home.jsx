import React, { useEffect, useState } from 'react'
import '../styles/Home.css'
import { MdOutlineFileUpload, MdOutlineFolder } from "react-icons/md"
import { FaSearch } from 'react-icons/fa'
import Sidebar from '../components/Sidebar'
import axios from 'axios'
import FileTable from '../components/FileTable'
import DetailsPanel from '../components/DetailsPanel'
import { MdContentPaste } from "react-icons/md"
import { IoClose } from "react-icons/io5"

const initClipboard = JSON.stringify({
    type: null,
    item: null
})

const Home = () => {
    const [isDarkMode, setIsDarkMode] = useState(true)
    const [items, setItems] = useState([])
    const [parentFolderId, setParentFolderId] = useState(null)
    const [currentFolderID, setCurrentFolderId] = useState(null)
    const [selectedItem, setSelectedItem] = useState(null)
    const [view, setView] = useState("storage")

    const toggleTheme = () => setIsDarkMode(!isDarkMode)
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
        const fetchData = async () => {
            const res = await axios.get(`${import.meta.env.VITE_BACKEND}/file/list?id=root`, { withCredentials: true })
            // console.log(res.data)
            setItems(res.data?.combinedData)
            setParentFolderId(res.data?.currentFolder?.parentFolderId)
            setCurrentFolderId(res.data?.currentFolder?.id)
        }
        fetchData()
    }, [])

    const refreshFiles = async (folderId) => {
        if (view == "trash") {
            fetchTrash()
            return
        }

        if (view === "shared") {
            fetchSharedItems()
            return
        }

        const id = folderId ?? "root"

        const res = await axios.get(
            `${import.meta.env.VITE_BACKEND}/file/list?id=${id}`,
            { withCredentials: true }
        )

        setItems(res.data?.combinedData)
        setParentFolderId(res.data?.currentFolder?.parentFolderId)
        setCurrentFolderId(res.data?.currentFolder?.id)
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
            // alert("File uploaded successfully!")
        } catch (error) {
            alert("Upload failed.")
        } finally {
            setIsUploading(false)
            refreshFiles(currentFolderID)
        }
    }

    const handlePaste = async () => {
        if (!clipboard.item) return

        try {
            const type = clipboard.item.type === "Folder" ? "/folder" : "/file"
            const endpoint = clipboard.type === 'cut' ? '/move' : '/copy'
            await axios.post(`${import.meta.env.VITE_BACKEND}${type}${endpoint}`, {
                id: clipboard.item.id,
                to: currentFolderID
            }, { withCredentials: true })

            if (clipboard.type === 'cut') {
                setClipboard({ item: null, type: null })
                localStorage.setItem("clipboard", JSON.stringify({ item: null, type: null }))
            }

            refreshFiles(currentFolderID)
        } catch (err) {
            const errorMsg = err.response?.data?.error || "Storage service is unreachable."
            alert(`Paste failed: ${errorMsg}`)
        }
    }

    const clearClipboard = (e) => {
        e.stopPropagation()
        setClipboard({ item: null, type: null })
        localStorage.setItem("clipboard", JSON.stringify({ item: null, type: null }))
    }

    const fetchTrash = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_BACKEND}/file/listTrash`, { withCredentials: true })

            setItems(res.data?.combinedData)
            setView("trash")
            setSelectedItem(null)
        } catch (err) {
            console.error("Failed to fetch trash", err)
        }
    }

    const fetchSharedItems = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_BACKEND}/user/shared-with-me`, { withCredentials: true })
            setItems(res.data?.combinedData)
            setView("shared")
            setSelectedItem(null)
        } catch(err) {
            console.error("Failed to fetch shared items", err)
        }
    }

    return (
        <div className={`home-container ${isDarkMode ? 'dark' : ''}`}>
            <Sidebar
                isDarkMode={isDarkMode}
                toggleTheme={toggleTheme}
                onViewTrash={fetchTrash}
                onViewShared = {fetchSharedItems}
                onViewHome={
                    async () => {
                        setView("storage")

                        const res = await axios.get(
                            `${import.meta.env.VITE_BACKEND}/file/list?id=${"root"}`,
                            { withCredentials: true }
                        )

                        setItems(res.data?.combinedData)
                        setParentFolderId(res.data?.currentFolder?.parentFolderId)
                        setCurrentFolderId(res.data?.currentFolder?.id)
                    }
                }
            />

            <main className="main-content flex-row">
                <div className="main-content-wrapper flex-grow">
                    <header className="dashboard-header">
                        <div className="search-bar">
                            <FaSearch className="search-icon" />
                            <input type="text" placeholder="Search your files..." />
                        </div>

                        {view == "storage" && (
                            <div className="header-actions">
                                <input type="file" id="file-upload" style={{ display: 'none' }} onChange={handleFileUpload} />

                                <button className="upload-btn" onClick={() => document.getElementById('file-upload').click()} disabled={isUploading}>
                                    <MdOutlineFileUpload /> <span>{isUploading ? `Uploading ${uploadProgress}%` : "Upload file"}</span>
                                </button>

                                <button className='upload-btn' onClick={() => setPopUp("folder")}><MdOutlineFolder />Create Folder</button>

                            </div>
                        )}
                    </header>

                    <section className="section-container">
                        <div className="section-header">
                            <h2 className='text-xl font-bold'>
                                {view === 'storage' ? (
                                    <>My Storage</>
                                ) : view === 'trash' ? (
                                    <>Trash</>
                                ) : (
                                    <>Shared With Me</>
                                )}
                            </h2>
                            <div className={`paste-container ${clipboard.item ? 'visible' : 'hidden'}`}>
                                <button className="paste-btn" onClick={handlePaste}>
                                    <MdContentPaste className="paste-icon" />
                                    <span>Paste {clipboard.type === 'move' ? 'here' : 'copy'}</span>
                                    <small className="clipboard-label">{clipboard?.item?.name}</small>

                                    <IoClose
                                        className="clear-clipboard"
                                        onClick={clearClipboard}
                                    />
                                </button>
                            </div>
                            <button onClick={() => refreshFiles(parentFolderId)} className="back-btn text-blue-500">← Back</button>
                        </div>


                        <FileTable
                            data={items}
                            selectedId={selectedItem?.id}
                            onSelect={setSelectedItem}
                            selectedItem={selectedItem}
                            setItems={setItems}
                            setParentFolderId={setParentFolderId}
                            setCurrentFolderId={setCurrentFolderId}
                            refreshFiles={refreshFiles}
                            currentFolderID={currentFolderID}
                            popUp={popUp}
                            setPopUp={setPopUp}
                            view={view} 
                        />
                    </section>
                </div>

                <DetailsPanel item={selectedItem} onSelect={setSelectedItem} view={view} />
            </main>
        </div>
    )
}

export default Home