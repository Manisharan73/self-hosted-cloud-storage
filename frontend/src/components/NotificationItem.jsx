import React from 'react'
import {
    FiFileText,
    FiX,
    FiCheck,
    FiClock,
    FiHardDrive
} from 'react-icons/fi'
import '../styles/NotificationItem.css'

const NotificationItem = ({ notification, onAccept, onDecline }) => {
    const { id, type, item, from, createdAt } = notification

    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 Bytes'
        const k = 1024
        const sizes = ['Bytes', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    const formatNotificationDate = (dateString) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    return (
        <div className="notification-card">
            <div className="notification-layout">

                {/* Dynamic Icon */}
                <div className="icon-container">
                    <FiFileText className="icon" />
                </div>

                {/* Content Section */}
                <div className="content-container">
                    <div className="header-row">
                        <span className="username">@{from.username}</span>
                        <div className="time-container">
                            <FiClock className="time-icon" />
                            <span>{formatNotificationDate(createdAt)}</span>
                        </div>
                    </div>

                    <p className="message">
                        Shared a {type}: <span className="filename">{item.originalFilename}</span>
                    </p>

                    <div className="metadata-box">
                        <div className="meta-item">
                            <FiHardDrive className="meta-icon" />
                            <span>{formatBytes(item.size)}</span>
                        </div>
                        <div className="meta-badge">
                            {item.mimetype.split('/')[1] || 'Unknown'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="actions-row">
                <button
                    onClick={() => onDecline(id)}
                    className="btn btn-decline"
                >
                    <FiX className="btn-icon" />
                    Decline
                </button>
                <button
                    onClick={() => onAccept(id)}
                    className="btn btn-accept"
                >
                    <FiCheck className="btn-icon" />
                    Accept Share
                </button>
            </div>
        </div>
    )
}

export default NotificationItem