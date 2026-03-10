import { useEffect, useRef } from "react"
import "../styles/FileContextMenu.css"
import axios from 'axios'

const FileContextMenu = ({
    x, y,
    closeContextMenu,
    setPopUp,
    onSelect,
    refreshFiles,
    selectedItem,
    currentFolderID,
    currentView
}) => {
    const contextRef = useRef(null)
    const baseUrl = import.meta.env.VITE_BACKEND

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
        const url = `${baseUrl}/file/download/${selectedItem.id}`
        const link = document.createElement("a")
        link.href = url
        link.setAttribute("download", selectedItem.name)
        link.setAttribute("target", "_blank")
        link.click()
    }

    const handleMoveToTrash = async () => {
        closeContextMenu()
        try {
            const route = selectedItem.type === "Folder" ? "folder" : "file"
            await axios.post(`${baseUrl}/${route}/trash/${selectedItem.id}`, {}, { withCredentials: true })
            refreshFiles(currentFolderID)
        } catch (err) {
            alert("Failed to move to trash")
        }
    }

    const handleRestore = async () => {
        closeContextMenu()
        try {
            const route = selectedItem.type === "Folder" ? "folder" : "file"
            await axios.post(`${baseUrl}/${route}/restore/${selectedItem.id}`, {}, { withCredentials: true })
            refreshFiles()
        } catch (err) {
            alert("Restore failed")
        }
    }

    const handlePermanentDelete = async () => {
        if (!window.confirm("This will permanently delete the item. This cannot be undone!")) return

        closeContextMenu()
        try {
            const route = selectedItem.type === "Folder" ? "folder" : "file"
            await axios.delete(`${baseUrl}/${route}/delete/${selectedItem.id}`, { withCredentials: true })
            refreshFiles()
        } catch (err) {
            alert("Permanent deletion failed")
        }
    }

    const handleCopy = () => {
        closeContextMenu()
        localStorage.setItem("clipboard", JSON.stringify({ type: "copy", item: selectedItem }))
        window.dispatchEvent(new Event("clipboardUpdate"))
    }

    const handleCut = () => {
        closeContextMenu()
        localStorage.setItem("clipboard", JSON.stringify({ type: "cut", item: selectedItem }))
        window.dispatchEvent(new Event("clipboardUpdate"))
    }

    const handleDetails = () => {
        closeContextMenu()
        onSelect(selectedItem)
    }

    const handleRename = () => {
        closeContextMenu()
        setPopUp("rename")
    }

    return (
        <div ref={contextRef} className="dropdown-menu" style={{ left: x, top: y }}>
            {currentView === 'trash' ? (
                <>
                    <button onClick={handleRestore}>Restore Item</button>
                    <button onClick={handleDetails}>Details</button>
                    <button className="delete-opt" onClick={handlePermanentDelete}>Delete Permanently</button>
                </>
            ) : currentView === 'shared' ? (
                <>
                    {selectedItem.type === "File" && <button onClick={downloadHandler}>Download</button>}
                    <button onClick={handleDetails}>Details</button>
                    <button onClick={handleCopy}>Copy to My Storage</button>
                </>
            ) : (
                <>
                    {selectedItem.type === "File" && <button onClick={downloadHandler}>Download</button>}
                    <button onClick={() => { closeContextMenu()
                         setPopUp("share") }}>Share</button>
                    <button onClick={handleRename}>Rename</button>
                    <button onClick={handleDetails}>Details</button>
                    <button onClick={handleCopy}>Copy</button>
                    <button onClick={handleCut}>Cut</button>
                    <button className="delete-opt" onClick={handleMoveToTrash}>Move to Trash</button>
                </>
            )}
        </div>
    )
}

export default FileContextMenu