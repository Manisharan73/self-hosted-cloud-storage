import { useState, useEffect, useRef } from "react"
import "../styles/FileContextMenu.css"
import axios from 'axios'

const FileContextMenu = ({ x, y, closeContextMenu, setPopUp, onSelect, refreshFiles, selectedItem, currentFolderID }) => {
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
        closeContextMenu()
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
        // console.log(action)
        refreshFiles(currentFolderID)
    }

    const handleCopy = async () => {
        closeContextMenu()
        localStorage.setItem("clipboard", JSON.stringify({type: "copy", item: selectedItem}))
        window.dispatchEvent(new Event("clipboardUpdate"))
    }

    const handleCut = async () => {
        closeContextMenu()
        localStorage.setItem("clipboard", JSON.stringify({type: "cut", item: selectedItem}))
        window.dispatchEvent(new Event("clipboardUpdate"))
    }

    const handleDetails = () => {
        closeContextMenu()
        onSelect(selectedItem)
    }

    const handleRename = async () => {
        closeContextMenu()
        setPopUp("rename")
    }

    return <>
        <div ref={contextRef} className="dropdown-menu" style={{ left: x, top: y }}>
            {selectedItem.type === "File" && <button onClick={() => downloadHandler()}>Download</button>}
            <button onClick={() => handleRename()}>Rename</button>
            <button onClick={() => handleDetails()}>Details</button>
            <button onClick={() => handleCopy()}>Copy</button>
            <button onClick={() => handleCut()}>Cut</button>
            <button className="delete-opt" onClick={() => handleDelete()}>Delete</button>
        </div>
    </>
}

export default FileContextMenu