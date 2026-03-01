import { useState, useEffect } from "react"
import "../styles/PopUpCMR.css"
import { IoClose } from "react-icons/io5"
import axios from "axios"

const PopUpCMR = ({ selectedItem, popUp, setPopUp, currentFolderID, refreshFiles }) => {
    const [closing, setClosing] = useState(false)
    const [name, setName] = useState(popUp === "rename" ? selectedItem.name : "")

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!name.trim()) return

        if (popUp === "rename") {
            handleRename(selectedItem.id, name)
        } else {
            handleCreateFolder(name)
        }
        close()
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
                    <h3>{popUp === "rename" ? `Rename ${selectedItem.type}` : "Create Folder"}</h3>
                    <button type="button" className="close-popup-btn" onClick={close}>
                        <IoClose size={24} />
                    </button>
                </header>

                <div className="popup-body">
                    <input
                        type="text"
                        className="popup-input"
                        placeholder="Enter name..."
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoFocus
                        onFocus={(e) => e.target.select()}
                    />
                </div>

                <footer className="popup-footer">
                    <button type="button" className="cancel-btn" onClick={close}>
                        Cancel
                    </button>
                    <button type="submit" className="confirm-btn">
                        {popUp === "rename" ? "Save Changes" : "Create"}
                    </button>
                </footer>
            </form>
        </div>
    )
}
export default PopUpCMR