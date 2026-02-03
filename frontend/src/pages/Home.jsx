import React, { useEffect, useState } from 'react';
import '../styles/Home.css';
import { MdOutlineFileUpload } from "react-icons/md";
import { FaSearch } from 'react-icons/fa';
import Sidebar from '../components/Sidebar';
import axios from 'axios'

const Home = () => {
    const [isDarkMode, setIsDarkMode] = useState(false);

    const toggleTheme = () => {
        setIsDarkMode(!isDarkMode);
    };

    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        const tokenValidate = async () => {
            const res = await axios.get(`${import.meta.env.VITE_BACKEND}/test`, {
                withCredentials: true,
            })
            
            console.log(res.data)
        }
        tokenValidate()
    }, [])

    const handleFileUpload = async (event) => {
        const file = event.target.files[0]
        if (!file) return;

        const formData = new FormData()
        formData.append('file', file)

        setIsUploading(true);
        setUploadProgress(0);

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(`${import.meta.env.VITE_BACKEND}/file/upload/1`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
                    setUploadProgress(percentCompleted)
                },
                withCredentials: true
            });

            if (response.status === 200) {
                alert("File uploaded successfully!")
            }
        } catch (error) {
            console.error("Upload error:", error)
            alert("Upload failed.");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className={`home-container ${isDarkMode ? 'dark' : ''}`}>
            <Sidebar isDarkMode={isDarkMode} toggleTheme={toggleTheme} />

            <main className="main-content">
                <div className="main-content-wrapper">
                    <header className="dashboard-header">
                        <div className="search-bar">
                            <FaSearch className="search-icon" />
                            <input type="text" placeholder="Search your files..." />
                        </div>
                        <div className="header-actions">
                            <input
                                type="file"
                                id="file-upload"
                                style={{ display: 'none' }}
                                onChange={handleFileUpload}
                            />

                            <button
                                className="upload-btn"
                                onClick={() => document.getElementById('file-upload').click()}
                                disabled={isUploading}
                            >
                                <MdOutlineFileUpload /> <span>{isUploading ? `Uploading ${uploadProgress}%` : "Upload file"}</span>
                            </button>
                        </div>
                    </header>

                    <section className="section-container">
                        <div className="section-header">
                            <h2>Recently opened</h2>
                        </div>
                        <div className="recent-grid">
                            <div className="recent-card"><div className="folder-icon blue" /><span>Travel 2026</span></div>
                            <div className="recent-card"><div className="file-doc" /><span>blog-artic.docx</span></div>
                            <div className="recent-card"><div className="file-img-preview" /><span>travelDiaryItaly.jpg</span></div>
                            <div className="recent-card"><div className="file-sheet" /><span>IRS-Returns-2026.xlsx</span></div>
                        </div>
                    </section>

                    <section className="section-container">
                        <div className="section-header">
                            <h2>All files</h2>
                        </div>
                        <div className="files-grid">
                            {['Simon\'s', 'Italy 2025', 'Artdocs', 'detailed_imgs', 'Crash file', 'Analysis dec'].map(file => (
                                <div className="file-item" key={file}>
                                    <div className="small-folder" />
                                    <span>{file}</span>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
};

export default Home;