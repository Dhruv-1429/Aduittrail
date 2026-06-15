import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastProvider } from './ToastContext';
import { ThemeProvider } from './ThemeContext';
import LandingPage from './LandingPage';
import Register from './Register';
import Login from './Login';
import Dashboard from './Dashboard';
import UserLogin from './UserLogin';
import UserDashboard from './UserDashboard';
import './App.css';

function ProtectedRoute({ children, tokenKey = 'adminToken' }) {
    const location = useLocation();
    const token = localStorage.getItem(tokenKey);
    const redirectTo = tokenKey === 'adminToken' ? '/admin/login' : '/user/login';

    if (!token) {
        return <Navigate to={redirectTo} state={{ from: location }} replace />;
    }

    return children;
}

export default function App() {
    return (
        <ThemeProvider>
            <ToastProvider>
                <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/admin/login" element={<Login />} />
                    <Route path="/user/login" element={<UserLogin />} />
                    <Route
                        path="/admin/dashboard"
                        element={
                            <ProtectedRoute tokenKey="adminToken">
                                <Dashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/user/dashboard"
                        element={
                            <ProtectedRoute tokenKey="userToken">
                                <UserDashboard />
                            </ProtectedRoute>
                        }
                    />
                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </ToastProvider>
        </ThemeProvider>
    );
}