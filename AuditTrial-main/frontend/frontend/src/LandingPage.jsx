import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
    const navigate = useNavigate();

    return (
        <div className="landing-page">
            {/* Navigation */}
            <nav className="landing-nav">
                <div className="landing-logo">
                    <div className="logo-icon">🛡️</div>
                    <h2>AUDITCORE</h2>
                </div>
                <div className="landing-nav-links">
                    <button className="btn-ghost" onClick={() => navigate('/register')}>
                        Register
                    </button>
                    <button className="btn-ghost" onClick={() => navigate('/user/login')}>
                        User Login
                    </button>
                    <button className="btn-primary" onClick={() => navigate('/admin/login')}>
                        Admin Login
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="landing-hero">
                <div className="landing-badge">
                    <span className="dot"></span>
                    Enterprise Security Platform
                </div>

                <h1>
                    Activity Log &<br />
                    <span className="gradient-text">Audit Trail Dashboard</span>
                </h1>

                <p>
                    Monitor user registrations, track login attempts, and analyze system 
                    activities across multiple websites. Real-time visibility into your 
                    entire security pipeline.
                </p>

                {/* Dual CTA Cards */}
                <div className="landing-cards">
                    <div className="landing-card" onClick={() => navigate('/register')} id="register-cta">
                        <div className="card-icon">👤</div>
                        <h3>User Registration</h3>
                        <p>
                            Register with your email, phone, and select a website 
                            platform — Flipkart, Amazon, Instagram, Google, or LeetCode.
                        </p>
                    </div>

                    <div className="landing-card" onClick={() => navigate('/user/login')} id="user-cta">
                        <div className="card-icon">🔑</div>
                        <h3>User Login</h3>
                        <p>
                            Sign in to view your personal activity history, 
                            audit trail, and account information.
                        </p>
                    </div>

                    <div className="landing-card" onClick={() => navigate('/admin/login')} id="admin-cta">
                        <div className="card-icon">🔐</div>
                        <h3>Admin Dashboard</h3>
                        <p>
                            Access the full audit trail. View registrations, login 
                            activity, failed attempts, and per-website analytics.
                        </p>
                    </div>
                </div>

                {/* Feature Highlights */}
                <div className="landing-features">
                    <div className="feature-item">
                        <span className="feat-icon">📊</span>
                        Real-time Analytics
                    </div>
                    <div className="feature-item">
                        <span className="feat-icon">🔍</span>
                        Audit Trail Logs
                    </div>
                    <div className="feature-item">
                        <span className="feat-icon">⚡</span>
                        Activity Monitoring
                    </div>
                    <div className="feature-item">
                        <span className="feat-icon">📄</span>
                        CSV Export
                    </div>
                    <div className="feature-item">
                        <span className="feat-icon">🚨</span>
                        Threat Alerts
                    </div>
                    <div className="feature-item">
                        <span className="feat-icon">🌓</span>
                        Dark/Light Mode
                    </div>
                </div>
            </section>
        </div>
    );
}
