import './App.css'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login_SignUp from './pages/Login_SignUp'
import Home from './pages/Home'
import Notifications from './pages/Notifications'
import Trash from './pages/Trash'
import Shared from './pages/Shared'
import SharedByMe from './pages/SharedByMe'
import { NotificationProvider } from './context/NotificationContext'
import { ThemeProvider } from './context/ThemeContext'
import { LoadingProvider } from './context/LoadingContext'
import { Toaster } from 'react-hot-toast'

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
            <Toaster 
                position='top center' 
                reverseOrder={true}
                toastOptions={{
                    style: {
                        background: "transparent",
                        boxShadow: "none",
                        padding: 0,
                        maxWidth: 800
                    }
            }}/>

            <LoadingProvider>
                <ThemeProvider>
                    <NotificationProvider>
                        <Router>
                            <Routes>
                                <Route path='/' element={<ProtectedRoute><Home /></ProtectedRoute>} />
                                <Route path='/login-signup' element={<Login_SignUp />} />
                                <Route path='/notifications' element={<Notifications />} />
                                <Route path='/trash' element={<Trash />} />
                                <Route path='/shared' element={<Shared />} />
                                <Route path='/shared-by-me' element={<ProtectedRoute><SharedByMe /></ProtectedRoute>} />
                                <Route path='*' element={<Navigate to='/' replace />} />
                            </Routes>
                        </Router>
                    </NotificationProvider>
                </ThemeProvider>
            </LoadingProvider>
        </>
    )
}

export default App
