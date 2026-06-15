import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from './ToastContext';
import { useTheme } from './ThemeContext';
import api from './api';

export default function UserDashboard() {
    const navigate = useNavigate();
    const { showInfo } = useToast();
    const { theme, toggleTheme } = useTheme();

    const [auditLogs, setAuditLogs] = useState([]);
    const [activityLogs, setActivityLogs] = useState([]);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('activity');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [isPaying, setIsPaying] = useState(false);

    const [userName, setUserName] = useState(localStorage.getItem('userName') || 'User');
    const userEmail = localStorage.getItem('userEmail') || '';
    const userWebsite = localStorage.getItem('userWebsite') || '';

    // Settings
    const [profileName, setProfileName] = useState('');
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');

    useEffect(() => {
        fetchUserData();
    }, []);

    async function fetchUserData() {
        setLoading(true);
        try {
            const [auditRes, activityRes, paymentRes] = await Promise.allSettled([
                api.get(`/api/audit/logs/user-history/${encodeURIComponent(userEmail)}`),
                api.get(`/api/activity/logs/user-history/${encodeURIComponent(userEmail)}`),
                api.get(`/api/payments/user-history/${encodeURIComponent(userEmail)}`)
            ]);

            if (auditRes.status === 'fulfilled') {
                const data = auditRes.value.data;
                setAuditLogs(data.logs || []);
            }
            if (activityRes.status === 'fulfilled') {
                const data = activityRes.value.data;
                setActivityLogs(data.activities || []);
            }
            if (paymentRes.status === 'fulfilled') {
                setPayments(paymentRes.value.data || []);
            }
        } catch (err) {
            console.error('Failed to fetch user data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        try {
            const res = await api.put('/api/user/profile', { name: profileName });
            if (res.data?.error) {
                showInfo(res.data.error);
            } else {
                showInfo('Profile updated successfully');
                localStorage.setItem('userName', profileName);
                setUserName(profileName);
                setProfileName('');
            }
        } catch { showInfo('Failed to update profile'); }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        try {
            const res = await api.put('/api/user/profile', { oldPassword, newPassword });
            if (res.data?.error) {
                showInfo(res.data.error);
            } else {
                showInfo('Password changed successfully');
                setOldPassword('');
                setNewPassword('');
            }
        } catch { showInfo('Failed to change password'); }
    };

    const handlePayment = async (e) => {
        e.preventDefault();
        if (!paymentAmount || isNaN(paymentAmount) || paymentAmount <= 0) {
            return showInfo('Please enter a valid payment amount');
        }
        setIsPaying(true);
        try {
            // Mock processing delay for aesthetics
            await new Promise(resolve => setTimeout(resolve, 1500));
            const res = await api.post('/api/payments', { amount: parseFloat(paymentAmount) });
            showInfo(`Payment of $${paymentAmount} successful!`);
            setPaymentAmount('');
            setPayments([res.data, ...payments]);
        } catch (err) {
            showInfo('Payment failed');
        } finally {
            setIsPaying(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('userToken');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userName');
        localStorage.removeItem('userWebsite');
        showInfo('Logged out successfully');
        navigate('/');
    };

    return (
        <div className="dashboard-layout">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <div className="logo-icon">🛡️</div>
                    <div>
                        <h2>AUDITCORE</h2>
                        <p>My Dashboard</p>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    <button className={activeTab === 'activity' ? 'active' : ''} onClick={() => setActiveTab('activity')}>
                        <span className="nav-icon">⚡</span> My Activity
                    </button>
                    <button className={activeTab === 'audit' ? 'active' : ''} onClick={() => setActiveTab('audit')}>
                        <span className="nav-icon">🛡️</span> My Audit Trail
                    </button>
                    <button className={activeTab === 'payments' ? 'active' : ''} onClick={() => setActiveTab('payments')}>
                        <span className="nav-icon">💳</span> Payments
                    </button>
                    <button className={activeTab === 'profile' ? 'active' : ''} onClick={() => setActiveTab('profile')}>
                        <span className="nav-icon">👤</span> Profile
                    </button>
                </nav>

                <div className="sidebar-footer">
                    <button className="btn-ghost" onClick={toggleTheme} style={{ width: '100%', marginBottom: 8 }}>
                        {theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
                    </button>
                    <button className="btn-danger" onClick={handleLogout} style={{ width: '100%' }}>
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main */}
            <main className="dashboard-main">
                <div className="dashboard-header">
                    <div>
                        <h1>Welcome, {userName}</h1>
                        <p>Your personal audit trail and activity history</p>
                    </div>
                    <button className="btn-ghost" onClick={fetchUserData}>↻ Refresh</button>
                </div>

                {/* Profile Tab */}
                {activeTab === 'profile' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div className="panel">
                            <div className="panel-header">
                                <div><h3>My Profile Overview</h3></div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="stat-card">
                                    <div className="stat-icon">👤</div>
                                    <div className="stat-label">Name</div>
                                    <div className="stat-value" style={{ fontSize: '1.2rem' }}>{userName}</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon">📧</div>
                                    <div className="stat-label">Email</div>
                                    <div className="stat-value" style={{ fontSize: '1.2rem' }}>{userEmail}</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon">🌐</div>
                                    <div className="stat-label">Website</div>
                                    <div className="stat-value" style={{ fontSize: '1.2rem' }}>{userWebsite || 'N/A'}</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-icon">📊</div>
                                    <div className="stat-label">Total Activities</div>
                                    <div className="stat-value" style={{ fontSize: '1.2rem' }}>{activityLogs.length + auditLogs.length}</div>
                                </div>
                            </div>
                        </div>

                        {/* Settings Panels */}
                        <div className="charts-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                            <div className="panel">
                                <div className="panel-header"><div><h3>Update Profile</h3></div></div>
                                <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div className="form-group">
                                        <label>New Name</label>
                                        <input type="text" className="glass-input" value={profileName} onChange={e => setProfileName(e.target.value)} required placeholder="Enter new name" />
                                    </div>
                                    <button type="submit" className="btn-primary">Update Name</button>
                                </form>
                            </div>

                            <div className="panel">
                                <div className="panel-header"><div><h3>Change Password</h3></div></div>
                                <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div className="form-group">
                                        <label>Old Password</label>
                                        <input type="password" className="glass-input" value={oldPassword} onChange={e => setOldPassword(e.target.value)} required placeholder="Current password" />
                                    </div>
                                    <div className="form-group">
                                        <label>New Password</label>
                                        <input type="password" className="glass-input" value={newPassword} onChange={e => setNewPassword(e.target.value)} required placeholder="New password" />
                                    </div>
                                    <button type="submit" className="btn-primary">Update Password</button>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* Activity Tab */}
                {activeTab === 'activity' && (
                    <div className="panel">
                        <div className="panel-header">
                            <div>
                                <h3>My Activity Logs</h3>
                                <p>{activityLogs.length} entries</p>
                            </div>
                        </div>
                        {loading ? (
                            <div className="loading-state"><div className="spinner"></div><p>Loading...</p></div>
                        ) : activityLogs.length > 0 ? (
                            <div className="data-table-wrapper">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Activity Type</th>
                                            <th>Website</th>
                                            <th>Description</th>
                                            <th>Severity</th>
                                            <th>Time</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {activityLogs.map((log, i) => (
                                            <tr key={log._id || i}>
                                                <td>{log.activityType}</td>
                                                <td className="domain-cell">{log.websiteName}</td>
                                                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {log.description || '—'}
                                                </td>
                                                <td>
                                                    <span className={`badge ${log.severity === 'HIGH' || log.severity === 'CRITICAL' ? 'badge-danger' : log.severity === 'MEDIUM' ? 'badge-warning' : 'badge-success'}`}>
                                                        {log.severity}
                                                    </span>
                                                </td>
                                                <td className="time-cell">
                                                    {log.activityTime ? new Date(log.activityTime).toLocaleString() : '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="empty-state">
                                <div className="empty-icon">⚡</div>
                                <p>No activity logs found</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Audit Tab */}
                {activeTab === 'audit' && (
                    <div className="panel">
                        <div className="panel-header">
                            <div>
                                <h3>My Audit Trail</h3>
                                <p>{auditLogs.length} entries</p>
                            </div>
                        </div>
                        {loading ? (
                            <div className="loading-state"><div className="spinner"></div><p>Loading...</p></div>
                        ) : auditLogs.length > 0 ? (
                            <div className="data-table-wrapper">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Action</th>
                                            <th>Website</th>
                                            <th>Status</th>
                                            <th>Details</th>
                                            <th>Time</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {auditLogs.map((log, i) => (
                                            <tr key={log._id || i}>
                                                <td>{log.action}</td>
                                                <td className="domain-cell">{log.websiteName}</td>
                                                <td>
                                                    <span className={`badge ${log.status === 'FAILED' ? 'badge-danger' : 'badge-success'}`}>
                                                        {log.status}
                                                    </span>
                                                </td>
                                                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '12px', color: 'var(--text-muted)' }}>
                                                    {log.details || log.errorMessage || '—'}
                                                </td>
                                                <td className="time-cell">
                                                    {log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="empty-state">
                                <div className="empty-icon">🛡️</div>
                                <p>No audit logs found</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Payments Tab */}
                {activeTab === 'payments' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {/* Make a Payment Section */}
                        <div className="panel" style={{ border: '1px solid var(--accent-color)' }}>
                            <div className="panel-header">
                                <div>
                                    <h3 style={{ color: 'var(--accent-color)' }}>💳 Make a Payment</h3>
                                    <p>Secure payment processing</p>
                                </div>
                            </div>
                            <form onSubmit={handlePayment} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                                <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                                    <label>Amount (USD)</label>
                                    <div style={{ position: 'relative' }}>
                                        <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>$</span>
                                        <input 
                                            type="number" 
                                            step="0.01"
                                            className="glass-input" 
                                            value={paymentAmount} 
                                            onChange={e => setPaymentAmount(e.target.value)} 
                                            placeholder="0.00"
                                            style={{ paddingLeft: '2.5rem' }}
                                            disabled={isPaying}
                                        />
                                    </div>
                                </div>
                                <button type="submit" className="btn-primary" disabled={isPaying} style={{ height: '42px', padding: '0 2rem' }}>
                                    {isPaying ? 'Processing...' : 'Pay Now'}
                                </button>
                            </form>
                        </div>

                        {/* Payment History Section */}
                        <div className="panel">
                            <div className="panel-header">
                                <div>
                                    <h3>Payment History</h3>
                                    <p>{payments.length} transactions</p>
                                </div>
                            </div>
                            {loading ? (
                                <div className="loading-state"><div className="spinner"></div><p>Loading...</p></div>
                            ) : payments.length > 0 ? (
                                <div className="data-table-wrapper">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Transaction ID</th>
                                                <th>Amount</th>
                                                <th>Status</th>
                                                <th>Date</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {payments.map((payment, i) => (
                                                <tr key={payment._id || i}>
                                                    <td style={{ fontFamily: 'monospace', color: 'var(--accent-color)' }}>
                                                        {payment.transactionId}
                                                    </td>
                                                    <td style={{ fontWeight: 'bold' }}>
                                                        ${payment.amount.toFixed(2)} {payment.currency}
                                                    </td>
                                                    <td>
                                                        <span className={`badge badge-success`}>
                                                            {payment.status}
                                                        </span>
                                                    </td>
                                                    <td className="time-cell">
                                                        {payment.paymentDate ? new Date(payment.paymentDate).toLocaleString() : '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="empty-state">
                                    <div className="empty-icon">💳</div>
                                    <p>No payment history found</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
