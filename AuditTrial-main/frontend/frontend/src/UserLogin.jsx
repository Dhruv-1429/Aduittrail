import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from './ToastContext';
import api from './api';

export default function UserLogin() {
    const navigate = useNavigate();
    const { showSuccess, showError } = useToast();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        if (!email || !password) {
            showError('Please fill in all fields.');
            setLoading(false);
            return;
        }

        try {
            const response = await api.post('/signInUser', { email, password });

            if (response.data && response.data.token) {
                localStorage.setItem('userToken', response.data.token);
                localStorage.setItem('userEmail', response.data.email);
                localStorage.setItem('userName', response.data.name || '');
                localStorage.setItem('userWebsite', response.data.websiteName || '');
                showSuccess(`Welcome back, ${response.data.name || email}!`);
                navigate('/user/dashboard');
            } else if (response.data && response.data.error) {
                showError(response.data.error);
            } else {
                showError('Login failed. Invalid credentials.');
            }
        } catch (err) {
            showError(
                err.response?.data?.error ||
                err.response?.data?.detail ||
                'Authentication failed. Please check your credentials.'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-header">
                    <Link to="/" className="auth-logo">
                        <div className="logo-icon">🛡️</div>
                        <span>AUDITCORE</span>
                    </Link>
                    <h1>User Login</h1>
                    <p>Sign in to view your activity history</p>
                </div>

                <div className="auth-card">
                    <form className="auth-form" onSubmit={handleLogin} id="user-login-form">
                        <div className="form-group">
                            <label htmlFor="user-login-email">Email Address</label>
                            <input
                                id="user-login-email"
                                className="glass-input"
                                type="email"
                                placeholder="john@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="user-login-password">Password</label>
                            <input
                                id="user-login-password"
                                className="glass-input"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn-primary auth-submit"
                            disabled={loading}
                            id="user-login-submit"
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>
                </div>

                <div className="auth-footer">
                    New user? <Link to="/register">Register here</Link>
                    &nbsp;&nbsp;·&nbsp;&nbsp;
                    Admin? <Link to="/admin/login">Admin Login</Link>
                    &nbsp;&nbsp;·&nbsp;&nbsp;
                    <Link to="/">← Back to Home</Link>
                </div>
            </div>
        </div>
    );
}
