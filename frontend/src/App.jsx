import './App.css'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login_SignUp from './pages/Login_SignUp'
import Home from './pages/Home'

function App() {
  const ProtectedRoute = ({ children }) => {
    const token = localStorage.getItem('token');

    if (!token) {
      return <Navigate to="/login-signup" replace />;
    }

    return children;
  };

  return (
    <>
      <Router>
        <Routes>
          <Route path='/' element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path='/login-signup' element={<Login_SignUp />} />
          <Route path='*' element={<Navigate to='/' replace />}/>
        </Routes>
      </Router>
    </>
  )
}

export default App
