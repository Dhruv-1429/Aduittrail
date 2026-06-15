import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8000', // FastAPI Gateway
    headers: {
        'Content-Type': 'application/json',
    },
});

// JWT Token interceptor — automatically attaches Authorization header
// Uses the correct token based on the current page context
api.interceptors.request.use(
    (config) => {
        const path = window.location.pathname;
        let token;
        if (path.startsWith('/user')) {
            token = localStorage.getItem('userToken');
        } else if (path.startsWith('/admin')) {
            token = localStorage.getItem('adminToken');
        } else {
            // Fallback: try admin first, then user
            token = localStorage.getItem('adminToken') || localStorage.getItem('userToken');
        }
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor — handle 401 token expiry
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            const path = window.location.pathname;
            // Only redirect if not already on auth pages
            if (!path.includes('/admin/login') && 
                !path.includes('/register') &&
                !path.includes('/user/login')) {
                // Redirect to the correct login page based on context
                if (path.startsWith('/user')) {
                    localStorage.removeItem('userToken');
                    localStorage.removeItem('userEmail');
                    localStorage.removeItem('userName');
                    localStorage.removeItem('userWebsite');
                    window.location.href = '/user/login';
                } else {
                    localStorage.removeItem('adminToken');
                    window.location.href = '/admin/login';
                }
            }
        }
        return Promise.reject(error);
    }
);

// ===================== CSV Export Helper =====================

/**
 * Convert an array of objects to CSV string and trigger download.
 * @param {Array} data - Array of objects to export
 * @param {string} filename - Name of the file (without extension)
 */
export function downloadCSV(data, filename = 'export') {
    if (!data || data.length === 0) {
        alert('No data to export');
        return;
    }

    // Get all unique keys across all objects
    const allKeys = [...new Set(data.flatMap(obj => Object.keys(obj)))];
    
    // Filter out internal fields
    const keys = allKeys.filter(k => !k.startsWith('_') || k === '_id');

    // Build CSV
    const csvRows = [];
    
    // Header row
    csvRows.push(keys.map(k => `"${k}"`).join(','));
    
    // Data rows
    for (const row of data) {
        const values = keys.map(k => {
            let val = row[k];
            if (val === null || val === undefined) val = '';
            if (typeof val === 'object') val = JSON.stringify(val);
            // Escape double quotes
            val = String(val).replace(/"/g, '""');
            return `"${val}"`;
        });
        csvRows.push(values.join(','));
    }

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ===================== Health Check Helper =====================

export async function checkAllHealth() {
    try {
        const response = await api.get('/api/health/all');
        return response.data;
    } catch (err) {
        return {
            gateway: { status: 'DOWN', error: err.message },
            springBoot: { status: 'UNKNOWN' },
            nodeJs: { status: 'UNKNOWN' },
            mongodb: { status: 'UNKNOWN' }
        };
    }
}

export default api;