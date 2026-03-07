import React, { useEffect, useState } from 'react'
import Sidebar from '../components/Sidebar'
import axios from 'axios'
import FileTable from '../components/FileTable'
import DetailsPanel from '../components/DetailsPanel'

const Shared = () => {
    const [isDarkMode, setIsDarkMode] = useState(true)
    const [items, setItems] = useState([])
    const [selectedItem, setSelectedItem] = useState(null)

    const fetchShared = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_BACKEND}/user/shared-with-me`, { withCredentials: true })
            setItems(res.data?.combinedData)
        } catch (err) { console.error(err) }
    }

    useEffect(() => { fetchShared() }, [])

    return (
        <div className={`home-container ${isDarkMode ? 'dark' : ''}`}>
            <Sidebar isDarkMode={isDarkMode} toggleTheme={() => setIsDarkMode(!isDarkMode)} />
            <main className="main-content flex-row">
                <div className="main-content-wrapper flex-grow">
                    <header className="dashboard-header">
                        <h2 className='text-xl font-bold'>Shared With Me</h2>
                    </header>
                    <section className="section-container">
                        <FileTable data={items} selectedItem={selectedItem} onSelect={setSelectedItem} refreshFiles={fetchShared} view="shared" />
                    </section>
                </div>
                <DetailsPanel item={selectedItem} view="shared" />
            </main>
        </div>
    )
}
export default Shared