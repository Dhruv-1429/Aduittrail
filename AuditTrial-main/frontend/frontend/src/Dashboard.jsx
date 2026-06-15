import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useToast } from './ToastContext';
import { useTheme } from './ThemeContext';
import api, { downloadCSV, checkAllHealth } from './api';

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#818cf8'];
const STATUS_COLORS = { SUCCESS: '#22c55e', FAILED: '#ef4444' };

export default function Dashboard() {
    const navigate = useNavigate();
    const { showSuccess, showError, showInfo } = useToast();
    const { theme, toggleTheme } = useTheme();

    // Sidebar
    const [activeTab, setActiveTab] = useState('overview');
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Data states
    const [stats, setStats] = useState(null);
    const [websiteBreakdown, setWebsiteBreakdown] = useState([]);
    const [recentActivity, setRecentActivity] = useState({ recentAuditLogs: [], recentActivityLogs: [] });
    const [users, setUsers] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [activityLogs, setActivityLogs] = useState([]);
    const [payments, setPayments] = useState([]);
    const [paymentsTotal, setPaymentsTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [sessionRemaining, setSessionRemaining] = useState(null);

    // Filters
    const [websiteFilter, setWebsiteFilter] = useState('');
    const [emailFilter, setEmailFilter] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [severityFilter, setSeverityFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [websiteSearchQuery, setWebsiteSearchQuery] = useState('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Modal
    const [modalData, setModalData] = useState(null);

    // Analytics
    const [timeseriesData, setTimeseriesData] = useState([]);
    const [aggregationData, setAggregationData] = useState(null);

    // Alerts
    const [suspiciousAlerts, setSuspiciousAlerts] = useState([]);
    const [dismissedAlerts, setDismissedAlerts] = useState(false);

    // Health
    const [healthData, setHealthData] = useState(null);

    // Settings
    const [profileName, setProfileName] = useState('');
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');

    // User detail
    const [selectedUser, setSelectedUser] = useState(null);
    const [userHistory, setUserHistory] = useState({ audit: [], activity: [] });

    // ===================== FETCH DATA =====================

    const fetchOverview = useCallback(async () => {
        setLoading(true);
        try {
            const [statsRes, breakdownRes, activityRes] = await Promise.allSettled([
                api.get('/api/admin/dashboard/stats'),
                api.get('/api/admin/dashboard/website-breakdown'),
                api.get('/api/admin/dashboard/recent-activity'),
            ]);
            if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
            if (breakdownRes.status === 'fulfilled') setWebsiteBreakdown(breakdownRes.value.data || []);
            if (activityRes.status === 'fulfilled') setRecentActivity(activityRes.value.data || { recentAuditLogs: [], recentActivityLogs: [] });
        } catch (err) {
            showError('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchUsers = useCallback(async () => {
        try {
            const res = await api.get('/api/admin/users', { params: { includeInactive: true } });
            setUsers(Array.isArray(res.data) ? res.data : []);
        } catch (err) { console.error(err); }
    }, []);

    const fetchAnalytics = useCallback(async () => {
        try {
            const [tsRes, aggRes] = await Promise.allSettled([
                api.get('/api/audit/logs/timeseries', { params: { days: 30 } }),
                api.get('/api/audit/logs/aggregations'),
            ]);
            if (tsRes.status === 'fulfilled') setTimeseriesData(Array.isArray(tsRes.value.data) ? tsRes.value.data : []);
            if (aggRes.status === 'fulfilled') setAggregationData(aggRes.value.data);
        } catch (err) { console.error(err); }
    }, []);

    const fetchSuspicious = useCallback(async () => {
        try {
            const res = await api.get('/api/audit/logs/suspicious', { params: { minutes: 60, threshold: 3 } });
            setSuspiciousAlerts(res.data?.alerts || []);
        } catch (err) { console.error(err); }
    }, []);

    const fetchHealth = useCallback(async () => {
        const data = await checkAllHealth();
        setHealthData(data);
    }, []);

    const fetchPayments = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/admin/payments/search', { params: { limit: 100 } });
            setPayments(res.data?.payments || []);
            setPaymentsTotal(res.data?.totalPayments || 0);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchTokenInfo = useCallback(async () => {
        try {
            const res = await api.get('/api/admin/token-info');
            setSessionRemaining(res.data?.remainingSeconds || null);
        } catch { setSessionRemaining(null); }
    }, []);

    // ===================== EFFECTS =====================

    useEffect(() => {
        fetchOverview();
        fetchTokenInfo();
    }, []);

    useEffect(() => {
        if (activeTab === 'users') fetchUsers();
        if (activeTab === 'analytics') fetchAnalytics();
        if (activeTab === 'alerts') fetchSuspicious();
        if (activeTab === 'health') fetchHealth();
        if (activeTab === 'payments') fetchPayments();
        if (activeTab === 'activity') {
            queryActivityLogs('/api/activity/logs/search', { websiteName: websiteFilter, userEmail: emailFilter, activityType: typeFilter, severity: severityFilter, startDate: startDate, endDate: endDate });
        }
        if (activeTab === 'audit') {
            queryAuditLogs('/api/audit/logs/search', { websiteName: websiteFilter, userEmail: emailFilter, status: statusFilter, startDate: startDate, endDate: endDate });
        }
    }, [activeTab, currentPage]);

    // Session countdown
    useEffect(() => {
        if (sessionRemaining === null) return;
        const interval = setInterval(() => {
            setSessionRemaining(prev => {
                if (prev <= 0) { clearInterval(interval); return 0; }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [sessionRemaining]);

    // ===================== ACTIONS =====================

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        showInfo('Logged out');
        navigate('/');
    };

    const formatTime = (secs) => {
        if (!secs || secs <= 0) return '—';
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = secs % 60;
        return `${h}h ${m}m ${s}s`;
    };

    const exportPaymentsCsv = () => {
        if (!payments || payments.length === 0) return showInfo('No payments to export');
        const headers = ['Transaction ID', 'User Email', 'Amount', 'Currency', 'Status', 'Date'];
        const csvRows = [headers.join(',')];
        
        for (const p of payments) {
            const date = p.paymentDate ? new Date(p.paymentDate).toLocaleString() : '—';
            const row = [
                `"${p.transactionId}"`,
                `"${p.userEmail}"`,
                `"${p.amount}"`,
                `"${p.currency}"`,
                `"${p.status}"`,
                `"${date}"`
            ];
            csvRows.push(row.join(','));
        }
        
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payments_report_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const exportUsersCsv = () => {
        if (!users || users.length === 0) return showInfo('No users to export');
        const headers = ['ID', 'Name', 'Email', 'Role', 'Website', 'Status'];
        const csvRows = [headers.join(',')];
        
        for (const u of users) {
            const row = [
                `"${u.id || ''}"`,
                `"${u.name || ''}"`,
                `"${u.email || ''}"`,
                `"${u.role || ''}"`,
                `"${u.websiteName || ''}"`,
                `"${u.isActive === false ? 'INACTIVE' : 'ACTIVE'}"`
            ];
            csvRows.push(row.join(','));
        }
        
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users_report_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // ===================== AUDIT LOG QUERIES =====================

    const queryAuditLogs = async (endpoint, params = {}) => {
        try {
            setLoading(true);
            params.page = currentPage;
            params.limit = 20;
            if (searchQuery) params.search = searchQuery;
            const res = await api.get(endpoint, { params });
            const data = res.data;
            setAuditLogs(data.logs || []);
            setTotalPages(data.totalPages || 1);
        } catch (err) {
            showError('Query failed');
        } finally {
            setLoading(false);
        }
    };

    const queryActivityLogs = async (endpoint, params = {}) => {
        try {
            setLoading(true);
            params.page = currentPage;
            params.limit = 20;
            if (searchQuery) params.search = searchQuery;
            const res = await api.get(endpoint, { params });
            const data = res.data;
            setActivityLogs(data.activities || []);
            setTotalPages(data.totalPages || 1);
        } catch (err) {
            showError('Query failed');
        } finally {
            setLoading(false);
        }
    };

    // ===================== USER MANAGEMENT =====================

    const handleDeactivateUser = async (userId) => {
        if (!window.confirm('Deactivate this user?')) return;
        try {
            await api.put(`/api/admin/users/${userId}/deactivate`);
            showSuccess('User deactivated');
            fetchUsers();
        } catch { showError('Failed to deactivate'); }
    };

    const handleActivateUser = async (userId) => {
        try {
            await api.put(`/api/admin/users/${userId}/activate`);
            showSuccess('User activated');
            fetchUsers();
        } catch { showError('Failed to activate'); }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('Permanently delete this user? This cannot be undone.')) return;
        try {
            await api.delete(`/api/admin/users/${userId}`);
            showSuccess('User deleted');
            fetchUsers();
        } catch { showError('Failed to delete'); }
    };

    const handleRoleChange = async (userId, newRole) => {
        try {
            await api.put(`/api/admin/users/${userId}/role`, { role: newRole });
            showSuccess(`Role changed to ${newRole}`);
            fetchUsers();
        } catch { showError('Failed to change role'); }
    };

    // User detail
    const openUserDetail = async (user) => {
        setSelectedUser(user);
        try {
            const [auditRes, actRes] = await Promise.allSettled([
                api.get(`/api/audit/logs/user-history/${encodeURIComponent(user.email)}`),
                api.get(`/api/activity/logs/user-history/${encodeURIComponent(user.email)}`)
            ]);
            setUserHistory({
                audit: auditRes.status === 'fulfilled' ? (auditRes.value.data.logs || []) : [],
                activity: actRes.status === 'fulfilled' ? (actRes.value.data.activities || []) : [],
            });
        } catch { console.error('user history err'); }
    };

    // ===================== ADMIN PROFILE =====================

    const handleChangePassword = async (e) => {
        e.preventDefault();
        try {
            const res = await api.put('/api/admin/profile', { oldPassword, newPassword });
            if (res.data?.error) {
                showError(res.data.error);
            } else {
                showSuccess('Password changed successfully');
                setOldPassword('');
                setNewPassword('');
            }
        } catch { showError('Failed to change password'); }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        try {
            const res = await api.put('/api/admin/profile', { name: profileName });
            if (res.data?.error) showError(res.data.error);
            else showSuccess('Profile updated');
        } catch { showError('Failed to update profile'); }
    };

    // ===================== NAV ITEMS =====================

    const navItems = [
        { key: 'overview', icon: '📊', label: 'Overview' },
        { key: 'audit', icon: '🛡️', label: 'Audit Logs' },
        { key: 'activity', icon: '⚡', label: 'Activity Logs' },
        { key: 'payments', icon: '💳', label: 'Payments' },
        { key: 'users', icon: '👥', label: 'Users' },
        { key: 'websites', icon: '🌐', label: 'Websites' },
        { key: 'analytics', icon: '📈', label: 'Analytics' },
        { key: 'alerts', icon: '🚨', label: 'Alerts' },
        { key: 'health', icon: '💚', label: 'System Health' },
        { key: 'settings', icon: '⚙️', label: 'Settings' },
    ];

    // ===================== RENDER HELPERS =====================

    const SkeletonCard = () => (
        <div className="stat-card skeleton-card">
            <div className="skeleton skeleton-text" style={{ width: '60%', height: 16 }}></div>
            <div className="skeleton skeleton-text" style={{ width: '40%', height: 28, marginTop: 8 }}></div>
        </div>
    );

    const PaginationControls = () => totalPages > 1 && (
        <div className="pagination">
            <button disabled={currentPage <= 1} onClick={() => { setCurrentPage(p => p - 1); }}>← Prev</button>
            <span>Page {currentPage} / {totalPages}</span>
            <button disabled={currentPage >= totalPages} onClick={() => { setCurrentPage(p => p + 1); }}>Next →</button>
        </div>
    );

    // ===================== RENDER =====================

    return (
        <div className="dashboard-layout">
            {/* Mobile hamburger */}
            <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} id="mobile-menu-toggle">
                ☰
            </button>

            {/* Sidebar overlay (mobile) */}
            {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>}

            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
                <div className="sidebar-logo">
                    <div className="logo-icon">🛡️</div>
                    <div>
                        <h2>AUDITCORE</h2>
                        <p>Admin Panel</p>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map(item => (
                        <button
                            key={item.key}
                            className={activeTab === item.key ? 'active' : ''}
                            onClick={() => { setActiveTab(item.key); setSidebarOpen(false); setCurrentPage(1); setAuditLogs([]); setActivityLogs([]); }}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            {item.label}
                            {item.key === 'alerts' && suspiciousAlerts.length > 0 && !dismissedAlerts && (
                                <span className="badge badge-danger" style={{ marginLeft: 'auto', fontSize: 10 }}>
                                    {suspiciousAlerts.length}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <button className="btn-ghost" onClick={toggleTheme} style={{ width: '100%', marginBottom: 8 }}>
                        {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
                    </button>
                    <button className="btn-danger" onClick={handleLogout} style={{ width: '100%' }}>
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <main className="dashboard-main">
                {/* Header */}
                <div className="dashboard-header">
                    <div>
                        <h1>{navItems.find(n => n.key === activeTab)?.icon} {navItems.find(n => n.key === activeTab)?.label}</h1>
                        {sessionRemaining !== null && (
                            <p style={{ fontSize: 12, color: sessionRemaining < 300 ? '#ef4444' : 'var(--text-muted)' }}>
                                Session: {formatTime(sessionRemaining)}
                            </p>
                        )}
                    </div>
                    <button className="btn-ghost" onClick={() => { fetchOverview(); fetchTokenInfo(); }}>↻ Refresh</button>
                </div>

                {/* ==================== OVERVIEW TAB ==================== */}
                {activeTab === 'overview' && (
                    <>
                        {/* Stats Cards */}
                        <div className="stats-grid">
                            {loading || !stats ? (
                                <>
                                    {SkeletonCard()}{SkeletonCard()}{SkeletonCard()}{SkeletonCard()}
                                </>
                            ) : (
                                <>
                                    <div className="stat-card">
                                        <div className="stat-icon">👥</div>
                                        <div className="stat-label">Total Users</div>
                                        <div className="stat-value">{stats.totalUsers ?? 0}</div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-icon">🌐</div>
                                        <div className="stat-label">Websites</div>
                                        <div className="stat-value">{stats.websiteStats?.length ?? 0}</div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-icon">🛡️</div>
                                        <div className="stat-label">Audit Entries</div>
                                        <div className="stat-value">{stats.totalAuditLogs ?? 0}</div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-icon">🚫</div>
                                        <div className="stat-label">Failed Attempts</div>
                                        <div className="stat-value" style={{ color: '#ef4444' }}>{stats.failedLogins ?? 0}</div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Charts Row */}
                        <div className="charts-row">
                            <div className="panel chart-panel">
                                <div className="panel-header"><div><h3>Users by Website</h3></div></div>
                                <ResponsiveContainer width="100%" height={280}>
                                    <BarChart data={stats?.websiteStats || []}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                        <XAxis dataKey="websiteName" stroke="var(--text-muted)" tick={{ fontSize: 12 }} />
                                        <YAxis stroke="var(--text-muted)" />
                                        <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }} />
                                        <Bar dataKey="userCount" fill="#6366f1" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="panel chart-panel">
                                <div className="panel-header"><div><h3>Success vs Failure</h3></div></div>
                                <ResponsiveContainer width="100%" height={280}>
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { name: 'Success', value: stats?.successfulLogins || 0 },
                                                { name: 'Failed', value: stats?.failedLogins || 0 }
                                            ]}
                                            cx="50%" cy="50%" outerRadius={100} dataKey="value" label
                                        >
                                            <Cell fill="#22c55e" />
                                            <Cell fill="#ef4444" />
                                        </Pie>
                                        <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Activity Feed */}
                        <div className="panel">
                            <div className="panel-header"><div><h3>Recent Activity</h3></div></div>
                            <div className="activity-feed">
                                {(recentActivity.recentAuditLogs || []).slice(0, 8).map((log, i) => (
                                    <div key={i} className="activity-item" onClick={() => setModalData(log)} style={{ cursor: 'pointer' }}>
                                        <span className={`badge ${log.status === 'FAILED' ? 'badge-danger' : 'badge-success'}`}>{log.status}</span>
                                        <span>{log.userEmail}</span>
                                        <span className="activity-action">{log.action}</span>
                                        <span className="activity-time">{log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}</span>
                                    </div>
                                ))}
                                {(!recentActivity.recentAuditLogs || recentActivity.recentAuditLogs.length === 0) && (
                                    <div className="empty-state"><div className="empty-icon">📋</div><p>No recent activity</p></div>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* ==================== AUDIT LOGS TAB ==================== */}
                {activeTab === 'audit' && (
                    <div className="panel">
                        <div className="panel-header">
                            <div><h3>Audit Log Queries</h3></div>
                            <button className="btn-ghost" onClick={async () => {
                                if (auditLogs && auditLogs.length > 0) {
                                    downloadCSV(auditLogs, 'audit_logs');
                                } else {
                                    try {
                                        const res = await api.get('/api/admin/dashboard/recent-activity');
                                        const logs = res.data?.recentAuditLogs || [];
                                        if (logs.length > 0) {
                                            downloadCSV(logs, 'audit_logs_recent');
                                            showSuccess('Exported recent audit logs.');
                                        } else {
                                            showError('No logs available to export.');
                                        }
                                    } catch (e) {
                                        showError('Failed to fetch logs for export.');
                                    }
                                }
                            }}>📄 Export CSV</button>
                        </div>

                        {/* Search */}
                        <div className="search-bar">
                            <input placeholder="Search logs..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="glass-input" />
                        </div>

                        {/* Filters */}
                        <div className="filter-controls">
                            <input placeholder="Website" value={websiteFilter} onChange={e => setWebsiteFilter(e.target.value)} className="glass-input" />
                            <input placeholder="User Email" value={emailFilter} onChange={e => setEmailFilter(e.target.value)} className="glass-input" />
                            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="glass-input">
                                <option value="">Any Status</option>
                                <option value="SUCCESS">SUCCESS</option>
                                <option value="FAILED">FAILED</option>
                            </select>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="glass-input" />
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="glass-input" />
                        </div>

                        <div className="query-buttons" style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                            <button className="btn-primary" style={{ flex: 1, padding: '12px' }} onClick={() => queryAuditLogs('/api/audit/logs/search', { websiteName: websiteFilter, userEmail: emailFilter, status: statusFilter, startDate: startDate, endDate: endDate })}>🔍 Search Logs</button>
                            <button className="btn-ghost" onClick={() => {
                                setSearchQuery('');
                                setWebsiteFilter('');
                                setEmailFilter('');
                                setStatusFilter('');
                                setStartDate('');
                                setEndDate('');
                                queryAuditLogs('/api/audit/logs/search');
                            }}>Clear Filters</button>
                        </div>

                        {/* Results Table */}
                        {auditLogs.length > 0 && (
                            <>
                                <div className="data-table-wrapper">
                                    <table className="data-table">
                                        <thead>
                                            <tr><th>User</th><th>Action</th><th>Website</th><th>Status</th><th>Details</th><th>Time</th></tr>
                                        </thead>
                                        <tbody>
                                            {auditLogs.map((log, i) => (
                                                <tr key={log._id || i} onClick={() => setModalData(log)} style={{ cursor: 'pointer' }}>
                                                    <td>{log.userEmail}</td>
                                                    <td>{log.action}</td>
                                                    <td className="domain-cell">{log.websiteName}</td>
                                                    <td><span className={`badge ${log.status === 'FAILED' ? 'badge-danger' : 'badge-success'}`}>{log.status}</span></td>
                                                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, color: 'var(--text-muted)' }}>
                                                        {log.details || log.errorMessage || '—'}
                                                    </td>
                                                    <td className="time-cell">{log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {PaginationControls()}
                            </>
                        )}
                    </div>
                )}

                {/* ==================== ACTIVITY LOGS TAB ==================== */}
                {activeTab === 'activity' && (
                    <div className="panel">
                        <div className="panel-header">
                            <div><h3>Activity Log Queries</h3></div>
                            <button className="btn-ghost" onClick={async () => {
                                if (activityLogs && activityLogs.length > 0) {
                                    downloadCSV(activityLogs, 'activity_logs');
                                } else {
                                    try {
                                        const res = await api.get('/api/admin/dashboard/recent-activity');
                                        const logs = res.data?.recentActivityLogs || [];
                                        if (logs.length > 0) {
                                            downloadCSV(logs, 'activity_logs_recent');
                                            showSuccess('Exported recent activity logs.');
                                        } else {
                                            showError('No logs available to export.');
                                        }
                                    } catch (e) {
                                        showError('Failed to fetch logs for export.');
                                    }
                                }
                            }}>📄 Export CSV</button>
                        </div>

                        <div className="search-bar">
                            <input placeholder="Search activities..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="glass-input" />
                        </div>

                        <div className="filter-controls">
                            <input placeholder="Website" value={websiteFilter} onChange={e => setWebsiteFilter(e.target.value)} className="glass-input" />
                            <input placeholder="User Email" value={emailFilter} onChange={e => setEmailFilter(e.target.value)} className="glass-input" />
                            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="glass-input">
                                <option value="">Activity Type</option>
                                <option value="LOGIN">LOGIN</option>
                                <option value="REGISTRATION">REGISTRATION</option>
                            </select>
                            <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} className="glass-input">
                                <option value="">Severity</option>
                                <option value="LOW">LOW</option>
                                <option value="MEDIUM">MEDIUM</option>
                                <option value="HIGH">HIGH</option>
                                <option value="CRITICAL">CRITICAL</option>
                            </select>
                        </div>

                        <div className="query-buttons" style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                            <button className="btn-primary" style={{ flex: 1, padding: '12px' }} onClick={() => queryActivityLogs('/api/activity/logs/search', { websiteName: websiteFilter, userEmail: emailFilter, activityType: typeFilter, severity: severityFilter, startDate: startDate, endDate: endDate })}>🔍 Search Logs</button>
                            <button className="btn-ghost" onClick={() => {
                                setSearchQuery('');
                                setWebsiteFilter('');
                                setEmailFilter('');
                                setTypeFilter('');
                                setSeverityFilter('');
                                setStartDate('');
                                setEndDate('');
                                queryActivityLogs('/api/activity/logs/search');
                            }}>Clear Filters</button>
                        </div>

                        {activityLogs.length > 0 && (
                            <>
                                <div className="data-table-wrapper">
                                    <table className="data-table">
                                        <thead>
                                            <tr><th>User</th><th>Type</th><th>Website</th><th>Description</th><th>Severity</th><th>Time</th></tr>
                                        </thead>
                                        <tbody>
                                            {activityLogs.map((log, i) => (
                                                <tr key={log._id || i} onClick={() => setModalData(log)} style={{ cursor: 'pointer' }}>
                                                    <td>{log.userEmail}</td>
                                                    <td>{log.activityType}</td>
                                                    <td className="domain-cell">{log.websiteName}</td>
                                                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.description || '—'}</td>
                                                    <td><span className={`badge ${log.severity === 'HIGH' || log.severity === 'CRITICAL' ? 'badge-danger' : log.severity === 'MEDIUM' ? 'badge-warning' : 'badge-success'}`}>{log.severity}</span></td>
                                                    <td className="time-cell">{log.activityTime ? new Date(log.activityTime).toLocaleString() : '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {PaginationControls()}
                            </>
                        )}
                    </div>
                )}

                {/* ==================== PAYMENTS TAB ==================== */}
                {activeTab === 'payments' && (
                    <div className="panel">
                        <div className="panel-header">
                            <div><h3>All Payments</h3><p>{paymentsTotal} total</p></div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button className="btn-secondary" onClick={exportPaymentsCsv}>📥 Export CSV</button>
                                <button className="btn-ghost" onClick={fetchPayments}>↻ Refresh</button>
                            </div>
                        </div>

                        {payments.length > 0 ? (
                            <div className="data-table-wrapper">
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Transaction ID</th>
                                            <th>User Email</th>
                                            <th>Amount</th>
                                            <th>Status</th>
                                            <th>Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {payments.map((p, i) => (
                                            <tr key={p._id || i}>
                                                <td style={{ fontFamily: 'monospace', color: 'var(--accent-color)' }}>{p.transactionId}</td>
                                                <td>{p.userEmail}</td>
                                                <td style={{ fontWeight: 'bold' }}>${p.amount.toFixed(2)} {p.currency}</td>
                                                <td><span className="badge badge-success">{p.status}</span></td>
                                                <td className="time-cell">{p.paymentDate ? new Date(p.paymentDate).toLocaleString() : '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="empty-state">
                                <div className="empty-icon">💳</div>
                                <p>No payments found</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ==================== USERS TAB ==================== */}
                {activeTab === 'users' && (
                    <div className="panel">
                        <div className="panel-header">
                            <div><h3>Registered Users</h3><p>{users.length} total</p></div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button className="btn-secondary" onClick={exportUsersCsv}>📄 Export CSV</button>
                                <button className="btn-ghost" onClick={fetchUsers}>↻ Refresh</button>
                            </div>
                        </div>

                        {selectedUser ? (
                            /* User Detail View */
                            <div>
                                <button className="btn-ghost" onClick={() => setSelectedUser(null)} style={{ marginBottom: 16 }}>← Back to Users</button>
                                <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                                    <div className="stat-card">
                                        <div className="stat-icon">👤</div>
                                        <div className="stat-label">Name</div>
                                        <div className="stat-value" style={{ fontSize: '1rem' }}>{selectedUser.name}</div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-icon">📧</div>
                                        <div className="stat-label">Email</div>
                                        <div className="stat-value" style={{ fontSize: '0.9rem' }}>{selectedUser.email}</div>
                                    </div>
                                    <div className="stat-card">
                                        <div className="stat-icon">🌐</div>
                                        <div className="stat-label">Website</div>
                                        <div className="stat-value" style={{ fontSize: '1rem' }}>{selectedUser.websiteName}</div>
                                    </div>
                                </div>
                                <h4 style={{ margin: '20px 0 10px', color: 'var(--text-primary)' }}>Audit History ({userHistory.audit.length})</h4>
                                {userHistory.audit.length > 0 ? (
                                    <div className="data-table-wrapper">
                                        <table className="data-table">
                                            <thead><tr><th>Action</th><th>Status</th><th>Details</th><th>Time</th></tr></thead>
                                            <tbody>{userHistory.audit.slice(0,20).map((l,i) => (
                                                <tr key={i}><td>{l.action}</td><td><span className={`badge ${l.status==='FAILED'?'badge-danger':'badge-success'}`}>{l.status}</span></td><td style={{maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontSize:12}}>{l.details||l.errorMessage||'—'}</td><td className="time-cell">{l.timestamp?new Date(l.timestamp).toLocaleString():'—'}</td></tr>
                                            ))}</tbody>
                                        </table>
                                    </div>
                                ) : <p style={{ color: 'var(--text-muted)' }}>No audit history</p>}

                                <h4 style={{ margin: '20px 0 10px', color: 'var(--text-primary)' }}>Activity History ({userHistory.activity.length})</h4>
                                {userHistory.activity.length > 0 ? (
                                    <div className="data-table-wrapper">
                                        <table className="data-table">
                                            <thead><tr><th>Type</th><th>Description</th><th>Severity</th><th>Time</th></tr></thead>
                                            <tbody>{userHistory.activity.slice(0,20).map((l,i) => (
                                                <tr key={i}><td>{l.activityType}</td><td style={{maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l.description||'—'}</td><td><span className={`badge ${l.severity==='HIGH'||l.severity==='CRITICAL'?'badge-danger':'badge-success'}`}>{l.severity}</span></td><td className="time-cell">{l.activityTime?new Date(l.activityTime).toLocaleString():'—'}</td></tr>
                                            ))}</tbody>
                                        </table>
                                    </div>
                                ) : <p style={{ color: 'var(--text-muted)' }}>No activity history</p>}
                            </div>
                        ) : (
                            /* User Cards Grid */
                            <>
                                <div style={{ marginBottom: 16 }}>
                                    <input
                                        type="text"
                                        placeholder="Search users by name, email, or website..."
                                        className="glass-input"
                                        value={userSearchQuery}
                                        onChange={e => setUserSearchQuery(e.target.value)}
                                        style={{ width: '100%', maxWidth: 400 }}
                                    />
                                </div>
                                {(() => {
                                    const filtered = users.filter(u => 
                                        u.name?.toLowerCase().includes(userSearchQuery.toLowerCase()) || 
                                        u.email?.toLowerCase().includes(userSearchQuery.toLowerCase()) || 
                                        u.websiteName?.toLowerCase().includes(userSearchQuery.toLowerCase())
                                    );
                                    const activeUsers = filtered.filter(u => u.isActive !== false);
                                    const suspendedUsers = filtered.filter(u => u.isActive === false);

                                    const renderUserCard = (user) => (
                                        <div key={user.id} className={`user-card ${user.isActive === false ? 'user-card-inactive' : ''}`}>
                                            <div className="user-card-header" onClick={() => openUserDetail(user)} style={{ cursor: 'pointer' }}>
                                                <div className="user-avatar">{(user.name || '?')[0].toUpperCase()}</div>
                                                <div>
                                                    <div className="user-name">{user.name}</div>
                                                    <div className="user-email">{user.email}</div>
                                                </div>
                                            </div>
                                            <div className="user-card-body">
                                                <span className={`badge ${user.isActive === false ? 'badge-danger' : 'badge-success'}`}>
                                                    {user.isActive === false ? 'INACTIVE' : 'ACTIVE'}
                                                </span>
                                                <span className="badge badge-primary">{user.websiteName}</span>
                                                <span className={`badge ${user.role === 'ADMIN' ? 'badge-warning' : 'badge-ghost'}`}>{user.role}</span>
                                            </div>
                                            <div className="user-card-actions">
                                                {user.isActive === false ? (
                                                    <button className="btn-ghost" onClick={() => handleActivateUser(user.id)} title="Activate">✅ Activate</button>
                                                ) : (
                                                    <button className="btn-ghost" onClick={() => handleDeactivateUser(user.id)} title="Deactivate">⏸️ Suspend</button>
                                                )}
                                                <button className="btn-ghost" onClick={() => handleRoleChange(user.id, user.role === 'ADMIN' ? 'USER' : 'ADMIN')} title="Toggle Role">
                                                    {user.role === 'ADMIN' ? '👤 Make User' : '👑 Make Admin'}
                                                </button>
                                                <button className="btn-danger" onClick={() => handleDeleteUser(user.id)} title="Delete">🗑️ Delete</button>
                                            </div>
                                        </div>
                                    );

                                    return (
                                        <>
                                            <div className="user-cards-grid">
                                                {activeUsers.map(renderUserCard)}
                                            </div>
                                            {suspendedUsers.length > 0 && (
                                                <>
                                                    <h4 style={{ margin: '32px 0 16px', color: 'var(--text-primary)' }}>Suspended Users</h4>
                                                    <div className="user-cards-grid" style={{ opacity: 0.75 }}>
                                                        {suspendedUsers.map(renderUserCard)}
                                                    </div>
                                                </>
                                            )}
                                            {filtered.length === 0 && <div className="empty-state"><div className="empty-icon">👥</div><p>No users found</p></div>}
                                        </>
                                    );
                                })()}
                        </>
                        )}
                    </div>
                )}

                {/* ==================== WEBSITES TAB ==================== */}
                {activeTab === 'websites' && (
                    <div className="panel">
                        <div className="panel-header"><div><h3>Website Breakdown</h3></div></div>
                        <div style={{ marginBottom: 16 }}>
                            <input
                                type="text"
                                placeholder="Search websites..."
                                className="glass-input"
                                value={websiteSearchQuery}
                                onChange={e => setWebsiteSearchQuery(e.target.value)}
                                style={{ width: '100%', maxWidth: 400 }}
                            />
                        </div>
                        <div className="user-cards-grid">
                            {websiteBreakdown.filter(wb => 
                                wb.websiteName?.toLowerCase().includes(websiteSearchQuery.toLowerCase())
                            ).map((wb, i) => {
                                const domain = {
                                    'Flipkart': 'flipkart.com',
                                    'Amazon': 'amazon.com',
                                    'Instagram': 'instagram.com',
                                    'Google': 'google.com',
                                    'LeetCode': 'leetcode.com',
                                    'Netflix': 'netflix.com',
                                    'Twitter': 'twitter.com',
                                    'LinkedIn': 'linkedin.com',
                                    'Spotify': 'spotify.com',
                                    'GitHub': 'github.com'
                                }[wb.websiteName] || `${wb.websiteName.toLowerCase().replace(/\s+/g, '')}.com`;
                                
                                return (
                                <div key={i} className="stat-card" style={{ cursor: 'default' }}>
                                    <div className="stat-icon" style={{ background: 'transparent' }}>
                                        <img 
                                            src={`https://logo.clearbit.com/${domain}`} 
                                            alt={wb.websiteName} 
                                            style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'contain' }}
                                            onError={(e) => { e.target.onerror = null; e.target.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(wb.websiteName) + '&background=random' }}
                                        />
                                    </div>
                                    <div className="stat-label">{wb.websiteName}</div>
                                    <div className="stat-value">{wb.userCount} users</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                                        ✅ {wb.successfulActions || 0} success · ❌ {wb.failedActions || 0} failed
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ==================== ANALYTICS TAB ==================== */}
                {activeTab === 'analytics' && (
                    <>
                        <div className="panel chart-panel">
                            <div className="panel-header"><div><h3>Audit Trend (Last 30 Days)</h3></div></div>
                            {timeseriesData && timeseriesData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={timeseriesData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                        <XAxis dataKey="date" tickFormatter={d => new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' })} stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                                        <YAxis stroke="var(--text-muted)" />
                                        <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }} />
                                        <Legend />
                                        <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} dot={false} />
                                        <Line type="monotone" dataKey="success" stroke="#22c55e" strokeWidth={2} dot={false} />
                                        <Line type="monotone" dataKey="failed" stroke="#ef4444" strokeWidth={2} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="empty-state" style={{ padding: '2rem' }}><p>No analytics data available yet.</p></div>
                            )}
                        </div>

                        <div className="charts-row">
                            {/* Top Users */}
                            <div className="panel chart-panel">
                                <div className="panel-header"><div><h3>Top 5 Active Users</h3></div></div>
                                <ResponsiveContainer width="100%" height={250}>
                                    <BarChart data={aggregationData?.topUsers || []} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                        <XAxis type="number" stroke="var(--text-muted)" />
                                        <YAxis dataKey="userEmail" type="category" width={140} stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
                                        <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }} />
                                        <Bar dataKey="count" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Peak Hours */}
                            <div className="panel chart-panel">
                                <div className="panel-header"><div><h3>Peak Login Hours</h3></div></div>
                                <ResponsiveContainer width="100%" height={250}>
                                    <BarChart data={aggregationData?.peakHours || []}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                        <XAxis dataKey="hour" stroke="var(--text-muted)" tickFormatter={h => `${h}:00`} tick={{ fontSize: 11 }} />
                                        <YAxis stroke="var(--text-muted)" />
                                        <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)' }} />
                                        <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Failure Rate */}
                        {aggregationData?.failureRateByWebsite && (
                            <div className="panel">
                                <div className="panel-header"><div><h3>Failure Rate by Website</h3></div></div>
                                <div className="data-table-wrapper">
                                    <table className="data-table">
                                        <thead><tr><th>Website</th><th>Total</th><th>Success</th><th>Failed</th><th>Failure Rate</th></tr></thead>
                                        <tbody>
                                            {aggregationData.failureRateByWebsite.map((w, i) => (
                                                <tr key={i}>
                                                    <td className="domain-cell">{w.websiteName}</td>
                                                    <td>{w.total}</td>
                                                    <td style={{ color: '#22c55e' }}>{w.success}</td>
                                                    <td style={{ color: '#ef4444' }}>{w.failed}</td>
                                                    <td>
                                                        <span className={`badge ${w.failureRate > 30 ? 'badge-danger' : w.failureRate > 10 ? 'badge-warning' : 'badge-success'}`}>
                                                            {w.failureRate?.toFixed(1)}%
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* ==================== ALERTS TAB ==================== */}
                {activeTab === 'alerts' && (
                    <div className="panel">
                        <div className="panel-header">
                            <div>
                                <h3>Suspicious Activity Alerts</h3>
                                <p>Users with 3+ failed logins in the last 60 minutes</p>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button className="btn-secondary" onClick={() => { setDismissedAlerts(true); showSuccess('Alerts dismissed'); }}>✓ Dismiss Alerts</button>
                                <button className="btn-ghost" onClick={fetchSuspicious}>↻ Refresh</button>
                            </div>
                        </div>

                        {suspiciousAlerts.length > 0 ? (
                            <div className="user-cards-grid">
                                {suspiciousAlerts.map((alert, i) => (
                                    <div key={i} className="stat-card" style={{ borderLeft: '4px solid #ef4444' }}>
                                        <div className="stat-icon">🚨</div>
                                        <div className="stat-label">{alert.userEmail}</div>
                                        <div className="stat-value" style={{ color: '#ef4444' }}>{alert.failedCount} failed attempts</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                                            Last: {alert.lastAttempt ? new Date(alert.lastAttempt).toLocaleString() : '—'}
                                        </div>
                                        <div style={{ marginTop: 4 }}>
                                            {alert.websites?.map((w, j) => (
                                                <span key={j} className="badge badge-ghost" style={{ marginRight: 4, fontSize: 10 }}>{w}</span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state">
                                <div className="empty-icon">✅</div>
                                <p>No suspicious activity detected</p>
                            </div>
                        )}
                    </div>
                )}

                {/* ==================== HEALTH TAB ==================== */}
                {activeTab === 'health' && (
                    <div className="panel">
                        <div className="panel-header">
                            <div><h3>System Health</h3></div>
                            <button className="btn-ghost" onClick={fetchHealth}>↻ Refresh</button>
                        </div>

                        {healthData ? (
                            <div className="stats-grid">
                                {Object.entries(healthData).map(([key, info]) => (
                                    <div key={key} className="stat-card" style={{ borderLeft: `4px solid ${info.status === 'UP' ? '#22c55e' : info.status === 'DOWN' ? '#ef4444' : '#f59e0b'}` }}>
                                        <div className="stat-icon">{info.status === 'UP' ? '💚' : info.status === 'DOWN' ? '❌' : '⚠️'}</div>
                                        <div className="stat-label">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                                        <div className="stat-value" style={{ fontSize: '1rem', color: info.status === 'UP' ? '#22c55e' : '#ef4444' }}>
                                            {info.status}
                                        </div>
                                        {info.port && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Port {info.port}</div>}
                                        {info.error && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{info.error}</div>}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="loading-state"><div className="spinner"></div><p>Checking...</p></div>
                        )}
                    </div>
                )}

                {/* ==================== SETTINGS TAB ==================== */}
                {activeTab === 'settings' && (
                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                        {/* Profile Update */}
                        <div className="panel">
                            <div className="panel-header"><div><h3>Update Profile</h3></div></div>
                            <form onSubmit={handleUpdateProfile} style={{ display: 'flex', gap: 12, alignItems: 'end' }}>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label>Name</label>
                                    <input className="glass-input" value={profileName} onChange={e => setProfileName(e.target.value)} placeholder="New name" />
                                </div>
                                <button type="submit" className="btn-primary" style={{ height: 42 }}>Update</button>
                            </form>
                        </div>

                        {/* Change Password */}
                        <div className="panel">
                            <div className="panel-header"><div><h3>Change Password</h3></div></div>
                            <form onSubmit={handleChangePassword} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'end' }}>
                                <div className="form-group">
                                    <label>Current Password</label>
                                    <input className="glass-input" type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} placeholder="••••••••" />
                                </div>
                                <div className="form-group">
                                    <label>New Password</label>
                                    <input className="glass-input" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="••••••••" />
                                </div>
                                <button type="submit" className="btn-primary" style={{ height: 42 }}>Change</button>
                            </form>
                        </div>

                        {/* Info */}
                        <div className="panel">
                            <div className="panel-header"><div><h3>System Info</h3></div></div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div className="stat-card">
                                    <div className="stat-label">Log Retention</div>
                                    <div className="stat-value" style={{ fontSize: '1rem' }}>90 days (TTL)</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-label">Rate Limit</div>
                                    <div className="stat-value" style={{ fontSize: '1rem' }}>200 req/min</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* ==================== LOG DETAIL MODAL ==================== */}
            {modalData && (
                <div className="modal-overlay" onClick={() => setModalData(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => setModalData(null)}>✕</button>
                        <h3>Log Details</h3>
                        <div className="modal-body">
                            {Object.entries(modalData).filter(([k]) => k !== '__v').map(([key, value]) => (
                                <div key={key} className="modal-row">
                                    <span className="modal-key">{key}</span>
                                    <span className="modal-value">
                                        {key.includes('time') || key.includes('Time') || key === 'timestamp'
                                            ? (value ? new Date(value).toLocaleString() : '—')
                                            : key === 'status'
                                                ? <span className={`badge ${value === 'FAILED' ? 'badge-danger' : 'badge-success'}`}>{value}</span>
                                                : String(value ?? '—')
                                        }
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}