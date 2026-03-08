import React, { useState, useEffect } from 'react'
import '../styles/Login_SignUp.css'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { MdDarkMode, MdLightMode } from "react-icons/md"

const Login_SignUp = () => {
    const [isLogin, setIsLogin] = useState(true)
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

    // Theme state: Persists choice in localStorage
    const [isDarkMode, setIsDarkMode] = useState(() => {
        const savedTheme = localStorage.getItem('theme')
        return savedTheme === 'light' ? false : true
    })

    const toggleTheme = () => {
        const newTheme = !isDarkMode
        setIsDarkMode(newTheme)
        localStorage.setItem('theme', newTheme ? 'dark' : 'light')
    }

    const [loginFields, setLoginFields] = useState({
        check: '',
        password: ''
    })

    const [signupFields, setSignupFields] = useState({
        fullName: '',
        userName: '',
        email: '',
        password: ''
    })

    const handleLoginChange = (e) => {
        const { name, value } = e.target
        setLoginFields(prev => ({ ...prev, [name]: value }))
    }

    const handleSignupChange = (e) => {
        const { name, value } = e.target
        setSignupFields(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)

        const baseUrl = import.meta.env.VITE_BACKEND
        const endpoint = isLogin ? '/auth/login' : '/auth/signup'

        const payload = isLogin
            ? { check: loginFields.check, password: loginFields.password }
            : {
                name: signupFields.fullName,
                username: signupFields.userName,
                email: signupFields.email,
                password: signupFields.password
            }

        try {
            const response = await axios.post(`${baseUrl}${endpoint}`, payload, {
                withCredentials: true
            })

            if (response.status === 200 || response.status === 201) {
                if (isLogin) {
                    localStorage.setItem('token', response.data.accessToken)
                    navigate('/', { replace: true })
                } else {
                    setIsLogin(true)
                }
            }
        } catch (error) {
            const errorMsg = error.response?.data?.msg || error.response?.data || "Server error"
            alert(errorMsg)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className={`auth-container ${isDarkMode ? 'dark' : ''}`}>
            {/* Floating Theme Toggle */}
            <button className="auth-theme-toggle" onClick={toggleTheme} type="button">
                {isDarkMode ? <MdLightMode /> : <MdDarkMode />}
            </button>

            <div className="auth-card">
                <div className="auth-header">
                    <h1>{isLogin ? "Welcome back!" : "Create account"}</h1>
                    <p>{isLogin ? "Please login to manage your files." : "Sign up to start storing files."}</p>
                </div>

                <div className="auth-toggle">
                    <button className={isLogin ? "active" : ""} onClick={() => setIsLogin(true)}>
                        Login
                    </button>
                    <button className={!isLogin ? "active" : ""} onClick={() => setIsLogin(false)}>
                        Sign Up
                    </button>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    {!isLogin && (
                        <>
                            <div className="input-group">
                                <label>Full Name</label>
                                <input
                                    type="text"
                                    name="fullName"
                                    placeholder="John Doe"
                                    value={signupFields.fullName}
                                    onChange={handleSignupChange}
                                    required
                                />
                            </div>
                            <div className="input-group">
                                <label>Username</label>
                                <input
                                    type='text'
                                    name='userName'
                                    placeholder='johndoe123'
                                    value={signupFields.userName}
                                    onChange={handleSignupChange}
                                    required
                                />
                            </div>
                        </>
                    )}

                    <div className="input-group">
                        <label>{isLogin ? "Username or Email" : "Email Address"}</label>
                        <input
                            type={isLogin ? "text" : "email"}
                            name={isLogin ? "check" : "email"}
                            placeholder={isLogin ? "Email or Username" : "email@example.com"}
                            value={isLogin ? loginFields.check : signupFields.email}
                            onChange={isLogin ? handleLoginChange : handleSignupChange}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label>Password</label>
                        <input
                            type="password"
                            name="password"
                            placeholder="••••••••"
                            value={isLogin ? loginFields.password : signupFields.password}
                            onChange={isLogin ? handleLoginChange : handleSignupChange}
                            required
                        />
                    </div>

                    <button type="submit" className="primary-btn" disabled={loading}>
                        {loading ? "Loading..." : (isLogin ? "Login" : "Create Account")}
                    </button>
                </form>

                <div className="auth-footer">
                    {isLogin ? (
                        <p>New here? <span onClick={() => setIsLogin(false)}>Create an account</span></p>
                    ) : (
                        <p>Have an account? <span onClick={() => setIsLogin(true)}>Sign in instead</span></p>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Login_SignUp