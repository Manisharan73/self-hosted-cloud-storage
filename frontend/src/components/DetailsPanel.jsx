import folderIcon from "../assets/folder-blue.svg"
import "../styles/DetailsPanel.css"
import axios from "axios"
import fileIcon from "../assets/default.svg"
import { IoClose } from "react-icons/io5"
import { useEffect, useState } from "react"

const DetailsPanel = ({ item, onSelect, view, refreshFiles }) => {
    const [sharedUsers, setSharedUsers] = useState([])
    const [isLoadingUsers, setIsLoadingUsers] = useState(false)

    useEffect(() => {
        if (view === 'shared-by-me' && item && item.explicitShare) {
            fetchSharedUsers(item.type.toLowerCase(), item.id)
        } else {
            setSharedUsers([])
        }
    }, [item, view])

    const fetchSharedUsers = async (itemType, itemId) => {
        setIsLoadingUsers(true)
        try {
            const res = await axios.get(`${import.meta.env.VITE_BACKEND}/user/shareDetails/${itemType}/${itemId}`, {
                withCredentials: true
            })
            setSharedUsers(res.data.sharedUsers || [])
        } catch (err) {
            console.error(err)
        } finally {
            setIsLoadingUsers(false)
        }
    }

    const handleUpdatePermission = async (recipientId, newPermission) => {
        try {
            const response = await axios.patch(
                `${import.meta.env.VITE_BACKEND}/user/share`,
                {
                    itemId: item.id,
                    itemType: item.type.toLowerCase(),
                    recipientId,
                    permission: newPermission
                },
                { withCredentials: true }
            )
        } catch (err) {
            console.log(err);
        }
    };

    const handleRemoveAccess = async (recipientId) => {
        if (!window.confirm("Remove access for this user?")) return
        try {
            await axios.delete(`${import.meta.env.VITE_BACKEND}/user/share`, {
                data: {
                    itemId: item.id,
                    itemType: item.type.toLowerCase(),
                    recipientId
                },
                withCredentials: true
            })
            fetchSharedUsers(item.type.toLowerCase(), item.id)
            if (refreshFiles) refreshFiles()
        } catch (err) {
            alert('Failed to remove access')
        }
    }

    if (!item) return <aside className="details-panel empty"></aside>

    const icon = (item) => {
        if (item.type === "Folder")
            return folderIcon
        else
            return fileIcon
    }



    return (
        <aside className="details-panel">
            <button
                className="close-panel-btn"
                onClick={() => onSelect(null)}
                aria-label="Close panel"
            >
                <IoClose size={24} />
            </button>

            <div className="preview-section">
                <div className={`preview-box ${item.type === 'Folder' ? 'bg-folder' : 'bg-file'}`}>
                    <span className="preview-icon"><img src={icon(item)} alt="" width={32} height={32} /></span>
                </div>
                <h2 className="preview-title">{item.name}</h2>
            </div>

            <div className="info-section">
                <h3>INFO</h3>
                <DetailRow label="Type" value={item.type} />
                <DetailRow label="Size" value={item.size || 'N/A'} />
                <DetailRow label="Owner" value={item.owner || 'You'} />
                <DetailRow label={view === "trash" ? "Deleted" : "Modified"} value={item.date || 'Today'} />
                {view === 'shared-by-me' && (
                    <>
                        <DetailRow label="Share Count" value={item.shareCount || 0} />
                        <DetailRow label="Last Shared" value={item.lastSharedAt ? new Date(item.lastSharedAt).toLocaleDateString() : 'N/A'} />
                    </>
                )}
            </div>

            {view === 'shared-by-me' && item.explicitShare && (
                <div className="share-section" style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '15px' }}>
                    <h3 style={{ fontSize: '12px', fontWeight: 'bold', color: '#64748b', marginBottom: '10px' }}>SHARED WITH ({sharedUsers.length})</h3>
                    {isLoadingUsers ? (
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>Loading...</div>
                    ) : (
                        <div className="shared-users-list" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {sharedUsers.map(u => (
                                <div key={u.id} className="shared-user-item" style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontSize: '14px', fontWeight: '500', color: '#334155' }}>{u.username}</span>
                                            <span style={{ fontSize: '12px', color: '#64748b' }}>{u.email}</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '5px' }}>
                                        <select
                                            value={u.permission}
                                            onChange={(e) => handleUpdatePermission(u.id, e.target.value)}
                                            style={{ fontSize: '12px', padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                        >
                                            <option value="read">Viewer</option>
                                            <option value="write">Editor</option>
                                        </select>
                                        <button
                                            onClick={() => handleRemoveAccess(u.id)}
                                            style={{ fontSize: '12px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="settings-section">
                <h3>SETTINGS</h3>
                <ToggleRow label="File Sharing" defaultChecked={true} />
                <ToggleRow label="Backup" />
                <ToggleRow label="Sync" />
            </div>
        </aside>
    )
}

const DetailRow = ({ label, value }) => (
    <div className="detail-row">
        <span className="label">{label}</span>
        <span className="value">{value}</span>
    </div>
)

const ToggleRow = ({ label, defaultChecked = false }) => (
    <div className="toggle-row">
        <span className="toggle-label">{label}</span>
        <label className="switch">
            <input type="checkbox" defaultChecked={defaultChecked} />
            <span className="slider round"></span>
        </label>
    </div>
)


export default DetailsPanel