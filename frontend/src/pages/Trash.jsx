import React, { useEffect, useState } from 'react'
import Sidebar from '../components/Sidebar'
import axios from 'axios'
import FileTable from '../components/FileTable'
import DetailsPanel from '../components/DetailsPanel'
import { FaSearch } from 'react-icons/fa'

const Trash = () => {
    const [isDarkMode, setIsDarkMode] = useState(true)
    const [items, setItems] = useState([])
    const [selectedItem, setSelectedItem] = useState(null)
    const [currentFolderId, setCurrentFolderId] = useState("root")
    const [parentFolderId, setParentFolderId] = useState(null)

    const fetchTrash = async (folderId = "root") => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_BACKEND}/user/listTrash?id=${folderId}`, {
                withCredentials: true
            });

            setItems(res.data?.combinedData);

            setParentFolderId(res.data?.currentFolder?.parentFolderId);
        } catch (err) {
            console.error(err);
        }
    }

    useEffect(() => {
        setItems([]);
        fetchTrash(currentFolderId);
    }, [currentFolderId]);

    const handleBackClick = () => {
        if (parentFolderId && parentFolderId !== "root") {
            setCurrentFolderId(parentFolderId)
        } else {
            setCurrentFolderId("root")
            fetchTrash("root")
        }
    }

    return (
        <div className={`home-container ${isDarkMode ? 'dark' : ''}`}>
            <Sidebar isDarkMode={isDarkMode} toggleTheme={() => setIsDarkMode(!isDarkMode)} />
            <main className="main-content flex-row">
                <div className="main-content-wrapper flex-grow">
                    <header className="dashboard-header">
                        <div className="search-bar">
                            <FaSearch className="search-icon" />
                            <input type="text" placeholder="Search trash..." />
                        </div>
                    </header>
                    <section className="section-container">
                        <div className="section-header flex justify-between items-center mb-4">
                            <h2 className='text-xl font-bold'>Trash</h2>
                            {currentFolderId !== "root" && (
                                <button onClick={handleBackClick} className="back-btn text-blue-500 hover:underline">
                                    ← Back
                                </button>
                            )}
                        </div>
                        <FileTable
                            data={items}
                            setItems={setItems}
                            selectedItem={selectedItem}
                            onSelect={setSelectedItem}
                            refreshFiles={fetchTrash}
                            setCurrentFolderId={setCurrentFolderId}
                            setParentFolderId={setParentFolderId}
                            currentFolderID={currentFolderId}
                            view="trash"
                        />
                    </section>
                </div>
                <DetailsPanel item={selectedItem} view="trash" />
            </main>
        </div>
    )
}
export default Trash