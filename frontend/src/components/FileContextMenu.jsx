import { useState, useEffect, useRef } from "react"
import "../styles/FileContextMenu.css"

const FileContextMenu = ({ x, y, closeContextMenu, onSelect, refreshFiles, selectedItem, currentFolderID }) => {
    const contextRef = useRef(null)

    useEffect(() => {
        const handler = (e) => {
            if (contextRef.current && !contextRef.current.contains(e.target)) {
                closeContextMenu()
            }
        }

        document.addEventListener("mousedown", handler)
        return () => document.removeEventListener("mousedown", handler)
    }, [closeContextMenu])

    const downloadHandler = () => {
        const url = `${import.meta.env.VITE_BACKEND}/file/download/${selectedItem.id}`

        const link = document.createElement("a")
        link.href = url
        link.setAttribute("download", selectedItem.name)
        link.setAttribute("target", "_blank")
        link.click()
    }

    const handleDelete = async () => {
        closeContextMenu()
        const baseUrl = import.meta.env.VITE_BACKEND
        const action = selectedItem.type === "Folder" ? "folder/delete" : "file/delete"
        await axios.get(`${baseUrl}/${action}/${selectedItem.id}`, { withCredentials: true })
        refreshFiles(currentFolderID)
    }

    const handleCopy = async () => {
        closeContextMenu()
        const baseUrl = import.meta.env.VITE_BACKEND
        const action = selectedItem.type === "Folder" ? "folder/copy" : "file/copy"
        await axios.get(`${baseUrl}/${action}/${selectedItem.id}`, { withCredentials: true })
        refreshFiles(currentFolderID)
    }

    const handleMove = async () => {
        closeContextMenu()
        const baseUrl = import.meta.env.VITE_BACKEND
        const action = selectedItem.type === "Folder" ? "folder/move" : "file/move"
    }

    const handleDetails = () => {
        closeContextMenu()
        onSelect(selectedItem)
    }

    const handleRename = async () => {
        closeContextMenu()
        const baseUrl = import.meta.env.VITE_BACKEND
        const action = selectedItem.type === "Folder" ? "folder/rename" : "file/rename"
    }

    return <>
        <div ref={contextRef} className="dropdown-menu" style={{ left: x, top: y }}>
            {selectedItem.type === "File" && <button onClick={() => downloadHandler()}>Download</button>}
            <button onClick={() => handleRename()}>Rename</button>
            <button onClick={() => handleDetails()}>Details</button>
            <button onClick={() => handleCopy()}>Copy</button>
            <button onClick={() => handleMove()}>Move</button>
            <button className="delete-opt" onClick={() => handleDelete()}>Delete</button>
        </div>
    </>
}

export default FileContextMenu