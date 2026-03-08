import React from 'react'
import { MdChevronRight, MdHome } from "react-icons/md"
import '../styles/Breadcrumbs.css'

const Breadcrumbs = ({ path, onNavigate }) => {
    return (
        <nav className="breadcrumb-nav">
            {path.map((folder, index) => (
                <div key={folder.id} className="breadcrumb-item">
                    <button
                        onClick={() => onNavigate(folder.id)}
                        className="breadcrumb-btn"
                        disabled={index === path.length - 1}
                    >
                        {folder.id === 'root' && <MdHome size={18} />}
                        <span>{folder.name}</span>
                    </button>
                    {index < path.length - 1 && <MdChevronRight className="breadcrumb-separator" size={20} />}
                </div>
            ))}
        </nav>
    )
}

export default Breadcrumbs