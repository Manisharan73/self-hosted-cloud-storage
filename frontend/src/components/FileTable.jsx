import axios from "axios"
import "../styles/FileTable.css"
import fileIcon from "../assets/default.svg"
import folderIcon from "../assets/folder-blue.svg"
import { useState, useEffect } from "react"
import FileContextMenu from "./FileContextMenu"

const initailContextMenu = {
    show: false,
    x: 0,
    y: 0
}

const FileTable = ({ data, selectedId, onSelect, setItems, setParentFolderId, setCurrentFolderId, refreshFiles, currentFolderID }) => {
    const [contextMenu, setContextMenu] = useState(initailContextMenu)
    const [selectedItem, setSelectedItem] = useState(null)
    const [previewUrl, setPreviewUrl] = useState(null)
    const [previewType, setPreviewType] = useState(null)


    const onDoubleCLickHandler = async (item) => {
        if (item.type === "Folder") {
            const res = await axios.get(`${import.meta.env.VITE_BACKEND}/file/list?id=${item.id}`, { withCredentials: true })
            setItems(res.data?.combinedData)
            setParentFolderId(res.data?.currentFolder?.parentFolderId)
            setCurrentFolderId(res.data?.currentFolder?.id)
        } else {
            const res = await axios.get(`${import.meta.env.VITE_BACKEND}/file/download/${item?.id}`, {
                withCredentials: true,
                responseType: "blob"
            })
            const url = URL.createObjectURL(res.data)
            setPreviewUrl(url)
            setPreviewType(blob.type)
        }
    }

    function formatDate(dateString) {
        const d = new Date(dateString)

        const pad = (n) => n.toString().padStart(2, "0")

        const hours = pad(d.getHours())
        const minutes = pad(d.getMinutes())
        const seconds = pad(d.getSeconds())

        const day = pad(d.getDate())
        const month = pad(d.getMonth() + 1)
        const year = d.getFullYear()

        return `${hours}:${minutes}:${seconds}-${day}-${month}-${year}`
    }

    const formatSize = (size) => {
        if (size < 1024) {
            return `${size} B`
        } else if (size / (2 ** 10) < 1024) {
            return `${(size / (2 ** 10)).toFixed(1)} KB`
        } else if (size / (2 ** 20) < 1024) {
            return `${(size / (2 ** 20)).toFixed(1)} MB`
        } else if (size / (2 ** 30) < 1024) {
            return `${(size / (2 ** 30)).toFixed(1)} GB`
        }
    }

    const icon = (item) => {
        if (item.type === "Folder")
            return folderIcon
        else
            return fileIcon
    }

    const onSelectHandler = (item) => {
        if (selectedItem?.id === item.id) onSelect(null)
        else onSelect(item)
    }

    const handleContextMenu = (e, item) => {
        e.preventDefault()

        const { pageX, pageY } = e
        setContextMenu({
            show: true,
            x: pageX,
            y: pageY
        })
        setSelectedItem(item)
    }

    const closeContextMenu = () => { setContextMenu(initailContextMenu) }

    return (<>
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
                        // onClick={() => onSelectHandler(item)}
                        onDoubleClick={() => onDoubleCLickHandler(item)}
                        className={`table-row ${selectedId === item.id ? 'active' : ''}`}
                        onContextMenu={(e) => handleContextMenu(e, item)}
                    >
                        <td className="name-cell">
                            <span className={`icon ${item.type === 'Folder' ? 'folder-color' : 'file-color'}`}>
                                <img src={icon(item)} alt="" width={32} height={32} />
                            </span>
                            <span className="name-text">{item.name}</span>
                        </td>
                        <td className="meta-cell">{formatDate(item.date) || '---'}</td>
                        <td className="meta-cell">{formatSize(item.size) || '---'}</td>


                    </tr>
                ))}
            </tbody>
        </table>
        {contextMenu.show && <FileContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            refreshFiles={refreshFiles}
            selectedItem={selectedItem}
            closeContextMenu={closeContextMenu}
            currentFolderID={currentFolderID}
            onSelect={onSelect}
        />}
    </>
    )
}

// <td className="action-cell">
//     <div className="action-container">
//         <div
//             className={`action_menu ${activeMenuId === item.id ? 'active' : ''}`}
//             onClick={(e) => toggleMenu(e, item.id)}
//         >
//             •••
//         </div>

//         {activeMenuId === item.id && (
//             <div className="dropdown-menu">
//                 <button onClick={() => handleDownload(item)}>Download</button>
//                 <button onClick={() => handleRename(item)}>Rename</button>
//                 <button className="delete-opt" onClick={() => handleDelete(item)}>Delete</button>
//             </div>
//         )}
//     </div>
// </td>

export default FileTable