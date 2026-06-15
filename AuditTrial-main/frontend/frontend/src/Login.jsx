import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from './api';

export default function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (!email || !password) {
            setError('Please fill in all fields.');
            setLoading(false);
            return;
        }

        try {
            const response = await api.post('/adminSignIn', { email, password });

            if (response.data && response.data.token) {
                localStorage.setItem('adminToken', response.data.token);
                navigate('/admin/dashboard');
            } else if (response.data && response.data.error) {
                setError(response.data.error);
            } else {
                setError('Login failed. Invalid credentials or insufficient privileges.');
            }
        } catch (err) {
            setError(
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
                {/* Header */}
                <div className="auth-header">
                    <Link to="/" className="auth-logo">
                        <div className="logo-icon">🛡️</div>
                        <span>AUDITCORE</span>
                    </Link>
                    <h1>Admin Login</h1>
                    <p>Sign in to access the audit dashboard</p>
                </div>

                {/* Form Card */}
                <div className="auth-card">
                    <form className="auth-form" onSubmit={handleLogin} id="admin-login-form">
                        {error && <div className="auth-error" id="login-error">{error}</div>}

                        <div className="form-group">
                            <label htmlFor="login-email">Email Address</label>
                            <input
                                id="login-email"
                                className="glass-input"
                                type="email"
                                placeholder="admin@audit.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="login-password">Password</label>
                            <input
                                id="login-password"
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
                            id="admin-login-submit"
                        >
                            {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <div className="auth-footer">
                    New user? <Link to="/register">Register here</Link>
                    &nbsp;&nbsp;·&nbsp;&nbsp;
                    <Link to="/">← Back to Home</Link>
                </div>
            </div>
        </div>
    );
}