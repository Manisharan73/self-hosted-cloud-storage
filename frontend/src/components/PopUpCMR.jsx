import { useState, useEffect } from "react"
import "../styles/PopUpCMR.css"
import { IoClose } from "react-icons/io5"
import axios from "axios"

const PopUpCMR = ({ selectedItem, popUp, setPopUp, currentFolderID, refreshFiles }) => {
    const [closing, setClosing] = useState(false)
    const [name, setName] = useState(popUp === "rename" ? selectedItem.name : "")
    const [recipientId, setRecipientId] = useState("")
    const [permission, setPermission] = useState("read")
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)

        if (popUp === "rename") {
            if (!name.trim()) return
            await handleRename(selectedItem.id, name)
        } else if (popUp === "share") {
            if (!recipientId.trim()) return
            await handleShare()
        } else {
            if (!name.trim()) return
            await handleCreateFolder(name)
        }
        
        setLoading(false)
        close()
    }

    const handleShare = async () => {
        try {
            await axios.post(`${import.meta.env.VITE_BACKEND}/file/share`, {
                itemId: selectedItem.id,
                itemType: selectedItem.type.toLowerCase(),
                sharedWithUserId: recipientId,
                permission: permission
            }, { withCredentials: true })

            alert("Share invitation sent successfully!")
        } catch(err) {
            console.error(err)
        }
    }

    const handleRename = async (id, name) => {
        try {
            const action = selectedItem.type === "Folder" ? "folder/rename" : "file/rename"
            await axios.post(`${import.meta.env.VITE_BACKEND}/${action}`,
                {
                    name,
                    id
                },
                { withCredentials: true }
            )
            refreshFiles(currentFolderID)
        }
        catch (err) {
            console.log(err)
            alert("Failed to rename folder/file")
        }
    }

    const handleCreateFolder = async (name) => {
        try {
            await axios.post(`${import.meta.env.VITE_BACKEND}/folder/create`,
                {
                    name,
                    parentFolderId: currentFolderID
                },
                { withCredentials: true }
            )
            refreshFiles(currentFolderID)
        }
        catch (err) {
            console.log(err)
            alert("Failed to create folder")
        }
    }

    const close = () => {
        setClosing(true)
        setTimeout(() => setPopUp(null), 200)
    }

    return (
        <div className={`popup-container ${closing ? "closing" : ""}`}>
            <form className="popup-dialog" onSubmit={handleSubmit}>
                <header className="popup-header">
                    <h3>
                        {popUp === "rename" ? `Rename ${selectedItem.type}` : 
                         popUp === "share" ? `Share ${selectedItem.name}` : 
                         "Create Folder"}
                    </h3>
                    <button type="button" className="close-popup-btn" onClick={close}>
                        <IoClose size={24} />
                    </button>
                </header>

                <div className="popup-body">
                    {popUp === "share" ? (
                        <>
                            <label className="popup-label">Recipient User ID</label>
                            <input
                                type="text"
                                className="popup-input"
                                placeholder="Enter user ID..."
                                value={recipientId}
                                onChange={(e) => setRecipientId(e.target.value)}
                                autoFocus
                                required
                            />
                            <label className="popup-label" style={{ marginTop: '10px', display: 'block' }}>Permissions</label>
                            <select 
                                className="popup-input" 
                                value={permission} 
                                onChange={(e) => setPermission(e.target.value)}
                            >
                                <option value="read">Read Only</option>
                                <option value="edit">Can Edit</option>
                            </select>
                        </>
                    ) : (
                        <input
                            type="text"
                            className="popup-input"
                            placeholder="Enter name..."
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoFocus
                            onFocus={(e) => e.target.select()}
                        />
                    )}
                </div>

                <footer className="popup-footer">
                    <button type="button" className="cancel-btn" onClick={close}>
                        Cancel
                    </button>
                    <button type="submit" className="confirm-btn" disabled={loading}>
                        {loading ? "Processing..." : popUp === "rename" ? "Save Changes" : popUp === "share" ? "Share" : "Create"}
                    </button>
                </footer>
            </form>
        </div>
    )
}
export default PopUpCMR