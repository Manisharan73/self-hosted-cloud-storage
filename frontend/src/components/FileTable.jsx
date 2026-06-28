import axios from "axios"
import "../styles/FileTable.css"
import fileIcon from "../assets/default.svg"
import folderIcon from "../assets/folder-blue.svg"
import { useState } from "react"
import { Oval } from "react-loader-spinner"
import { useLoading } from "../context/LoadingContext"
import FileContextMenu from "./FileContextMenu"
import PopUpCMR from "./PopUpCMR"

const initialContextMenu = { show: false, x: 0, y: 0 }

const FileTable = ({ data, selectedId, onSelect, setItems, setParentFolderId, setCurrentFolderId, refreshFiles, currentFolderID, popUp, setPopUp, view }) => {
    const [contextMenu, setContextMenu] = useState(initialContextMenu)
    const [selectedItem, setSelectedItem] = useState(null)
    const [previewUrl, setPreviewUrl] = useState(null)
    const [previewType, setPreviewType] = useState(null)
    const { isLoading, setIsLoading } = useLoading()

    const onDoubleCLickHandler = async (item) => {
        if (item.type === "Folder") {
            setIsLoading(true)
            setCurrentFolderId(item.id)

        } else {
            try {
                const res = await axios.get(`${import.meta.env.VITE_BACKEND}/file/download/${item?.id}`, {
                    withCredentials: true,
                    responseType: "blob"
                })

                const url = URL.createObjectURL(res.data)
                
                window.open(url)
                setPreviewUrl(url)
                setPreviewType(res.data.type)
            } catch (err) {
                console.error("Download failed", err)
            }
        }
    }

    const formatDate = (dateString) => {
        if (!dateString) return '---'
        const d = new Date(dateString)
        return d.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        }) + ' • ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    const formatSize = (size) => {
        if (size === '---' || !size) return '---'
        if (size < 1024) return `${size} B`
        if (size < 1048576) return `${(size / 1024).toFixed(1)} KB`
        return `${(size / 1048576).toFixed(1)} MB`
    }

    const handleContextMenu = (e, item) => {
        e.preventDefault()
        setContextMenu({
            show: true,
            x: Math.min(e.clientX, window.innerWidth - 300),
            y: Math.min(e.clientY, window.innerHeight - 350)
        })
        setSelectedItem(item)
    }

    const getColumns = (currentView) => {
        if (currentView === 'shared-by-me') {
            return [
                { key: 'shareCount', label: 'Shared Count', render: (item) => item.shareCount || 0 },
                { key: 'lastSharedAt', label: 'Last Shared', render: (item) => formatDate(item.lastSharedAt) },
                { key: 'size', label: 'Size', render: (item) => formatSize(item.size) }
            ]
        }
        if (currentView === 'shared') {
            return [
                { key: 'owner', label: 'Owner', render: (item) => item.owner || 'Unknown' },
                { key: 'date', label: 'Modified', render: (item) => formatDate(item.date) },
                { key: 'size', label: 'Size', render: (item) => formatSize(item.size) }
            ]
        }
        return [
            { key: 'date', label: 'Modified', render: (item) => formatDate(item.date) },
            { key: 'size', label: 'Size', render: (item) => formatSize(item.size) }
        ]
    }

    const columns = getColumns(view)

    return (
        <div className="table-responsive-container">
            {isLoading ? (
                <div className="loader-container">
                    <Oval
                        height={50}
                        width={50}
                        color="#3b82f6"
                        secondaryColor="#dbe7ff"
                        strokeWidth={4}
                        strokeWidthSecondary={4}
                    />
                </div>
            ) : (
                <table className="file-manager-table">
                <thead>
                    <tr>
                        <th className="th-name">Name</th>
                        {columns.map(col => (
                            <th key={col.key} className="th-modified hide-mobile">{col.label}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((item) => (
                        <tr
                            key={item.id}
                            onDoubleClick={() => onDoubleCLickHandler(item)}
                            onClick={() => onSelect && onSelect(item)}
                            className={`table-row ${selectedId === item.id ? 'active' : ''}`}
                            onContextMenu={(e) => handleContextMenu(e, item)}
                        >
                            <td className="name-cell">
                                <div className="name-content">
                                    <span className={`icon ${item.type === 'Folder' ? 'folder-color' : 'file-color'}`}>
                                        <img src={item.type === "Folder" ? folderIcon : fileIcon} alt="" width={28} height={28} />
                                    </span>
                                    <div className="text-details">
                                        <span className="name-text">
                                            {item.name}
                                            {view === 'shared-by-me' && item.inheritedShare && (
                                                <span style={{marginLeft: '8px', fontSize: '10px', backgroundColor: '#e2e8f0', color: '#475569', padding: '2px 6px', borderRadius: '10px'}}>
                                                    Inherited
                                                </span>
                                            )}
                                        </span>
                                        <span className="mobile-meta show-mobile">
                                            {formatDate(item.date)} • {formatSize(item.size)}
                                        </span>
                                    </div>
                                </div>
                            </td>
                            {columns.map(col => (
                                <td key={col.key} className="meta-cell hide-mobile">
                                    {col.render(item)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
                </table>
            )}

            {contextMenu.show && (
                <FileContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    refreshFiles={refreshFiles}
                    selectedItem={selectedItem}
                    closeContextMenu={() => setContextMenu(initialContextMenu)}
                    currentFolderID={currentFolderID}
                    onSelect={onSelect}
                    setPopUp={setPopUp}
                    currentView={view}
                />
            )}
            {popUp && (
                <PopUpCMR
                    popUp={popUp}
                    setPopUp={setPopUp}
                    selectedItem={selectedItem}
                    currentFolderID={currentFolderID}
                    refreshFiles={refreshFiles}
                />
            )}
        </div>
    )
}

export default FileTable