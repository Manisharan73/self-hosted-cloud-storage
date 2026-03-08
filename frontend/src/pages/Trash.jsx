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

    const fetchTrash = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_BACKEND}/user/listTrash`, { withCredentials: true })
            setItems(res.data?.combinedData)
        } catch (err) { console.error(err) }
    }

    // const refreshFiles = async (folderId) => {
    //     const id = folderId ?? "root"

    //     const res = await axios.get(
    //         `${import.meta.env.VITE_BACKEND}/file/list?id=${id}`,
    //         { withCredentials: true }
    //     )

    //     setItems(res.data?.combinedData)
    //     setParentFolderId(res.data?.currentFolder?.parentFolderId)
    //     setCurrentFolderId(res.data?.currentFolder?.id)
    // }

    useEffect(() => { fetchTrash() }, [])

    return (
        <div className={`home-container ${isDarkMode ? 'dark' : ''}`}>
            <Sidebar isDarkMode={isDarkMode} toggleTheme={() => setIsDarkMode(!isDarkMode)} />
            <main className="main-content flex-row">
                <div className="main-content-wrapper flex-grow">
                    <header className="dashboard-header">
                        <div className="search-bar"><FaSearch className="search-icon" /><input type="text" placeholder="Search trash..." /></div>
                    </header>
                    <section className="section-container">
                        <h2 className='text-xl font-bold'>Trash</h2>
                        <FileTable data={items} selectedItem={selectedItem} onSelect={setSelectedItem} refreshFiles={fetchTrash} view="trash" />
                    </section>
                </div>
                <DetailsPanel item={selectedItem} view="trash" />
            </main>
        </div>
    )
}
export default Trash