import axios from 'axios';

// Centralized Axios instance
const api = axios.create({
    baseURL: 'http://localhost:5000/api'
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
