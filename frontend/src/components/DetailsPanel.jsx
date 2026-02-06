import folderIcon from "../assets/folder-blue.svg"
import "../styles/DetailsPanel.css"
import axios from "axios"
import fileIcon from "../assets/default.svg"

const DetailsPanel = ({ item }) => {
    if (!item) return <aside className="details-panel empty"></aside>

    const icon = (item) => {
        if (item.type === "Folder")
            return folderIcon
        else
            return fileIcon
    }

    return (
        <aside className="details-panel">
            <div className="preview-section">
                <div className={`preview-box ${item.type === 'Folder' ? 'bg-folder' : 'bg-file'}`}>
                    <span className="preview-icon"><img src={icon(item)} alt="" width={32} height={32}/></span>
                </div>
                <h2 className="preview-title">{item.name}</h2>
            </div>

            <div className="info-section">
                <h3>INFO</h3>
                <DetailRow label="Type" value={item.type} />
                <DetailRow label="Size" value={item.size || 'N/A'} />
                <DetailRow label="Owner" value={item.owner || 'You'} />
                <DetailRow label="Modified" value={item.date || 'Today'} />
            </div>

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