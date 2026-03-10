import './App.css'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login_SignUp from './pages/Login_SignUp'
import Home from './pages/Home'
import Notifications from './pages/Notifications'
import Trash from './pages/Trash'
import Shared from './pages/Shared'
import { NotificationProvider } from './context/NotificationContext'
import { ThemeProvider } from './context/ThemeContext'

function App() {
    const ProtectedRoute = ({ children }) => {
        const token = localStorage.getItem('token')

        if (!token) {
            return <Navigate to="/login-signup" replace />
        }

        return children
    }

    return (
        <>
            <ThemeProvider>
                <NotificationProvider>
                    <Router>
                        <Routes>
                            <Route path='/' element={<ProtectedRoute><Home /></ProtectedRoute>} />
                            <Route path='/login-signup' element={<Login_SignUp />} />
                            <Route path='/notifications' element={<Notifications />} />
                            <Route path='/trash' element={<Trash />} />
                            <Route path='/shared' element={<Shared />} />
                            <Route path='*' element={<Navigate to='/' replace />} />
                        </Routes>
                    </Router>
                </NotificationProvider>
            </ThemeProvider>
        </>
    )
}

export default App
