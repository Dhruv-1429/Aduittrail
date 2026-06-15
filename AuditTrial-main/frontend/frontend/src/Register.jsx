import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from './api';

const WEBSITES = ['Flipkart', 'Amazon', 'Instagram', 'Google', 'LeetCode', 'Netflix', 'Twitter', 'LinkedIn', 'Spotify', 'GitHub'];

export default function Register() {
    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        phone: '',
        websiteName: 'Flipkart',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        // Basic validation
        if (!form.name || !form.email || !form.password || !form.phone) {
            setError('All fields are required.');
            setLoading(false);
            return;
        }

        try {
            const payload = {
                name: form.name,
                email: form.email,
                password: form.password,
                phone: parseInt(form.phone, 10),
                websiteName: form.websiteName,
            };
            const response = await api.post('/registerUser', payload);

            if (response.data && response.data.error) {
                setError(response.data.error);
            } else {
                setSuccess(`Registration successful! Welcome aboard, ${form.name}.`);
                setForm({ name: '', email: '', password: '', phone: '', websiteName: 'Flipkart' });
            }
        } catch (err) {
            setError(err.response?.data?.error || err.response?.data?.detail || 'Registration failed. Please try again.');
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
                    <h1>Create Account</h1>
                    <p>Register to start using the platform</p>
                </div>

                {/* Form Card */}
                <div className="auth-card">
                    <form className="auth-form" onSubmit={handleSubmit} id="register-form">
                        {error && <div className="auth-error" id="register-error">{error}</div>}
                        {success && <div className="auth-success" id="register-success">{success}</div>}

                        <div className="form-group">
                            <label htmlFor="reg-name">Full Name</label>
                            <input
                                id="reg-name"
                                className="glass-input"
                                type="text"
                                name="name"
                                placeholder="John Doe"
                                value={form.name}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="reg-email">Email Address</label>
                            <input
                                id="reg-email"
                                className="glass-input"
                                type="email"
                                name="email"
                                placeholder="john@example.com"
                                value={form.email}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="reg-password">Password</label>
                                <input
                                    id="reg-password"
                                    className="glass-input"
                                    type="password"
                                    name="password"
                                    placeholder="••••••••"
                                    value={form.password}
                                    onChange={handleChange}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="reg-phone">Phone Number</label>
                                <input
                                    id="reg-phone"
                                    className="glass-input"
                                    type="tel"
                                    name="phone"
                                    placeholder="9876543210"
                                    value={form.phone}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="reg-website">Website Platform</label>
                            <select
                                id="reg-website"
                                name="websiteName"
                                value={form.websiteName}
                                onChange={handleChange}
                            >
                                {WEBSITES.map((w) => (
                                    <option key={w} value={w}>{w}</option>
                                ))}
                            </select>
                        </div>

                        <button
                            type="submit"
                            className="btn-primary auth-submit"
                            disabled={loading}
                            id="register-submit"
                        >
                            {loading ? 'Creating Account...' : 'Create Account'}
                        </button>
                    </form>
                </div>

                {/* Footer */}
                <div className="auth-footer">
                    Admin? <Link to="/admin/login">Sign in here</Link>
                    &nbsp;&nbsp;·&nbsp;&nbsp;
                    <Link to="/">← Back to Home</Link>
                </div>
            </div>
        </div>
    );
}