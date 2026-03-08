import axios from "axios"
import "../styles/FileTable.css"
import fileIcon from "../assets/default.svg"
import folderIcon from "../assets/folder-blue.svg"
import { useState } from "react"
import FileContextMenu from "./FileContextMenu"
import PopUpCMR from "./PopUpCMR"

const initialContextMenu = { show: false, x: 0, y: 0 }

const FileTable = ({ data, selectedId, onSelect, setItems, setParentFolderId, setCurrentFolderId, refreshFiles, currentFolderID, popUp, setPopUp, view }) => {
    const [contextMenu, setContextMenu] = useState(initialContextMenu)
    const [selectedItem, setSelectedItem] = useState(null)
    const [previewUrl, setPreviewUrl] = useState(null)
    const [previewType, setPreviewType] = useState(null)

    const onDoubleCLickHandler = async (item) => {
        if (item.type === "Folder") {
            // If we are in Trash, we just update the ID and let the parent component fetch
            if (view === "trash") {
                if (typeof setCurrentFolderId === "function") {
                    setCurrentFolderId(item.id);
                }
                return;
            }

            // Normal Storage Navigation
            try {
                const res = await axios.get(`${import.meta.env.VITE_BACKEND}/file/list?id=${item.id}`, { withCredentials: true });
                if (typeof setItems === "function") setItems(res.data?.combinedData);
                if (typeof setParentFolderId === "function") setParentFolderId(res.data?.currentFolder?.parentFolderId);
                if (typeof setCurrentFolderId === "function") setCurrentFolderId(res.data?.currentFolder?.id);
            } catch (err) {
                console.error("Failed to open folder", err);
            }
        } else {
            // File Preview/Download Logic
            try {
                const res = await axios.get(`${import.meta.env.VITE_BACKEND}/file/download/${item?.id}`, {
                    withCredentials: true,
                    responseType: "blob"
                });
                const url = URL.createObjectURL(res.data);
                setPreviewUrl(url);
                setPreviewType(res.data.type);
            } catch (err) {
                console.error("Download failed", err);
            }
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '---';
        const d = new Date(dateString);
        return d.toLocaleString(); // Simplified for clarity
    }

    const formatSize = (size) => {
        if (size === '---' || !size) return '---';
        if (size < 1024) return `${size} B`;
        if (size < 1048576) return `${(size / 1024).toFixed(1)} KB`;
        return `${(size / 1048576).toFixed(1)} MB`;
    }

    const handleContextMenu = (e, item) => {
        e.preventDefault();
        setContextMenu({
            show: true,
            x: Math.min(e.clientX, window.innerWidth - 300),
            y: Math.min(e.clientY, window.innerHeight - 350)
        });
        setSelectedItem(item);
    }

    return (
        <>
            <table className="file-manager-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Modified</th>
                        <th>Size</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((item) => (
                        <tr
                            key={item.id}
                            onDoubleClick={() => onDoubleCLickHandler(item)}
                            className={`table-row ${selectedId === item.id ? 'active' : ''}`}
                            onContextMenu={(e) => handleContextMenu(e, item)}
                        >
                            <td className="name-cell">
                                <span className={`icon ${item.type === 'Folder' ? 'folder-color' : 'file-color'}`}>
                                    <img src={item.type === "Folder" ? folderIcon : fileIcon} alt="" width={32} height={32} />
                                </span>
                                <span className="name-text">{item.name}</span>
                            </td>
                            <td className="meta-cell">{formatDate(item.date)}</td>
                            <td className="meta-cell">{formatSize(item.size)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
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
        </>
    )
}

export default FileTable