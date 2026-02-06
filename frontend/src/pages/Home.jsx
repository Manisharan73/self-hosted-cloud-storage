import React, { useEffect, useState } from 'react'
import '../styles/Home.css'
import { MdOutlineFileUpload, MdOutlineFolder } from "react-icons/md"
import { FaSearch } from 'react-icons/fa'
import Sidebar from '../components/Sidebar'
import axios from 'axios'
import FileTable from '../components/FileTable'
import DetailsPanel from '../components/DetailsPanel'

const Home = () => {
    const [isDarkMode, setIsDarkMode] = useState(true)
    const [items, setItems] = useState([])
    const [parentFolderId, setParentFolderId] = useState(null)
    const [currentFolderID, setCurrentFolderId] = useState(null)
    const [selectedItem, setSelectedItem] = useState(null)

    const toggleTheme = () => setIsDarkMode(!isDarkMode)
    const [uploadProgress, setUploadProgress] = useState(0)
    const [isUploading, setIsUploading] = useState(false)

    useEffect(() => {
        const fetchData = async () => {
            const res = await axios.get(`${import.meta.env.VITE_BACKEND}/file/list`, { withCredentials: true })
            console.log(res.data?.currentFolder)
            setItems(res.data?.combinedData)
            setParentFolderId(res.data?.currentFolder?.parentFolderId)
            setCurrentFolderId(res.data?.currentFolder?.id)
        }
        fetchData()
    }, [])

    const refreshFiles = async (currentFolderID) => {
        // console.log(currentFolderID, parentFolderId)
        if (!parentFolderId) return
        const id = currentFolderID ?? parentFolderId
        const res = await axios.get(`${import.meta.env.VITE_BACKEND}/file/list?id=${id}`, { withCredentials: true })
        console.log(parentFolderId, res.data?.currentFolder)
        setItems(res.data?.combinedData)
        setParentFolderId(res.data?.currentFolder?.parentFolderId)
        setCurrentFolderId(res.data?.currentFolder?.id)
    }

    useEffect(() => {console.log(currentFolderID, parentFolderId)}, [currentFolderID, parentFolderId])

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
            alert("File uploaded successfully!")
        } catch (error) {
            alert("Upload failed.")
        } finally {
            setIsUploading(false)
            refreshFiles(currentFolderID)
        }
    }

    const handleCreateFolder = async () => {
        const name = prompt("Enter folder name")

        if(!name) {
            return
        }
        
        try {
            await axios.post(`${import.meta.env.VITE_BACKEND}/folder/create`,
                {
                    name,
                    parentFolderId: currentFolderID
                },
                {withCredentials: true}
            )

            alert("Folder created succesfully!")
        }
        catch(err) {
            console.log(err)
            alert("Failed to create folder")
        }
    }

    return (
        <div className={`home-container ${isDarkMode ? 'dark' : ''}`}>
            <Sidebar isDarkMode={isDarkMode} toggleTheme={toggleTheme} />

            <main className="main-content flex-row">
                <div className="main-content-wrapper flex-grow">
                    <header className="dashboard-header">
                        <div className="search-bar">
                            <FaSearch className="search-icon" />
                            <input type="text" placeholder="Search your files..." />
                        </div>
                        <div className="header-actions">
                            <input type="file" id="file-upload" style={{ display: 'none' }} onChange={handleFileUpload} />

                            <button className="upload-btn" onClick={() => document.getElementById('file-upload').click()} disabled={isUploading}>
                                <MdOutlineFileUpload /> <span>{isUploading ? `Uploading ${uploadProgress}%` : "Upload file"}</span>
                            </button>

                            <button className='upload-btn' onClick={handleCreateFolder}><MdOutlineFolder />Create Folder</button>
                        </div>
                    </header>

                    <section className="section-container">
                        <div className="section-header">
                            <h2 className='text-xl font-bold'>My Storage</h2>
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
                        />
                    </section>
                </div>

                <DetailsPanel item={selectedItem} />
            </main>
        </div>
    )
}

export default Home