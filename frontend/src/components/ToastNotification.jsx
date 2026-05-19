import { IoClose, IoMailOpenOutline } from "react-icons/io5";

const ToastNotification = ({ toast, removeToast }) => {

    return (
        <div className="toast-container active">
            <div className="toast-dialog">
                <header>
                    <button
                        type="button"
                        className="close-popup-btn"
                        onClick={removeToast}
                    >
                        <IoClose size={10} />
                    </button>
                </header>

                <div className="notif-info">

                    <div className="notif-icon">
                        <IoMailOpenOutline />
                    </div>

                    <div className="notif-details">

                        <h3>
                            {toast.from.username}
                        </h3>

                        <p className="target-user">
                            {toast.type === "file"
                                ? `Shared file "${toast.item.name}"`
                                : `Shared folder "${toast.item.name}"`}
                        </p>

                        <p className="notif-date">
                            {new Date(toast.createdAt)
                                .toLocaleString()}
                        </p>

                    </div>

                </div>

            </div>

        </div>
    );
};

export default ToastNotification