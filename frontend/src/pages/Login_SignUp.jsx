import React, { useState } from 'react'
import '../styles/Login_SignUp.css'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

const Login_SignUp = () => {
    const [isLogin, setIsLogin] = useState(true)
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()

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
        const { name, value } = e.target;
        setLoginFields(prev => ({ ...prev, [name]: value }));
    }

    const handleSignupChange = (e) => {
        const { name, value } = e.target;
        setSignupFields(prev => ({ ...prev, [name]: value }));
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const baseUrl = 'http://localhost:3001';
        const endpoint = isLogin ? '/auth/login' : '/auth/signup';

        const payload = isLogin
            ? { check: loginFields.check, password: loginFields.password }
            : {
                name: signupFields.fullName,
                username: signupFields.userName,
                email: signupFields.email,
                password: signupFields.password
            };

        try {
            const response = await axios.post(`${baseUrl}${endpoint}`, payload);

            if (response.status === 200 || response.status === 201) {
                if (isLogin) {
                    localStorage.setItem('token', response.data.accessToken);

                    navigate('/', { replace: true });
                } else {
                    alert("Registration successful! Please check your email to verify your account.");

                    setIsLogin(true);
                }
            }
        } catch (error) {
            const errorMsg = error.response?.data?.msg || error.response?.data || "Server error";
            alert(errorMsg);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <div className="logo-section">
                        <div className="logo-icon">☁️</div>
                        <h1>CloudStorage</h1>
                    </div>
                    <p>{isLogin ? "Welcome back! Please login." : "Create your account."}</p>
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
                                    placeholder="Cody"
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
                                    placeholder='cody123'
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
                            placeholder={isLogin ? "Enter username or email" : "cody@example.com"}
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

                    {isLogin && (
                        <div className="form-options">
                            <label className="checkbox-container">
                                <input type="checkbox" /> Remember me
                            </label>
                            <a href="#forgot" className="forgot-link">Forgot password?</a>
                        </div>
                    )}

                    <button type="submit" className="primary-btn">
                        {isLogin ? "Login" : "Create Account"}
                    </button>
                </form>

                <div className="auth-footer">
                    {isLogin ? (
                        <p>Don't have an account? <span onClick={() => setIsLogin(false)}>Sign up</span></p>
                    ) : (
                        <p>Already have an account? <span onClick={() => setIsLogin(true)}>Login</span></p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Login_SignUp;