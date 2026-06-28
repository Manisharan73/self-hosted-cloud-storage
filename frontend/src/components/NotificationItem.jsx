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
    const { shareId, itemType, itemName, targetUser, date } = notification

    const formatNotificationDate = (dateString) => {
        if (!dateString) return ''
        const dateObj = new Date(dateString)
        return dateObj.toLocaleDateString('en-IN', {
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
                        <span className="username">@{targetUser?.uniqueName || targetUser?.name || 'Unknown'}</span>
                        <div className="time-container">
                            <FiClock className="time-icon" />
                            <span>{formatNotificationDate(date)}</span>
                        </div>
                    </div>

                    <p className="message">
                        Shared a {itemType}: <span className="filename">{itemName}</span>
                    </p>
                </div>
            </div>

            {/* Actions */}
            {(onAccept || onDecline) && (
                <div className="actions-row">
                    {onDecline && (
                        <button onClick={() => onDecline(shareId)} className="btn btn-decline">
                            <FiX className="btn-icon" /> Decline
                        </button>
                    )}
                    {onAccept && (
                        <button onClick={() => onAccept(shareId)} className="btn btn-accept">
                            <FiCheck className="btn-icon" /> Accept Share
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}

export default NotificationItem