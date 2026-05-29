import axios from 'axios';

// Centralized Axios instance
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : 'http://localhost:5000/api'
});

// Automatically attach the JWT token to every secure request
api.interceptors.request.use(config => {
    const token = sessionStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
