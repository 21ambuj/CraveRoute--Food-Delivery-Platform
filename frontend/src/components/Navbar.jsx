import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    // Check local storage for theme preference, default to dark if not found
    const [darkMode, setDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
        }
        return false;
    });

    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [darkMode]);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    // --- REAL-TIME BLOCKING LISTENER ---
    useEffect(() => {
        if (!user?.id) return;

        let socketInstance = null;

        import('../utils/socket').then(({ default: socket }) => {
            socketInstance = socket;
            // Get token from localStorage
            const token = localStorage.getItem('craveroute_token');
            if (token) {
                socket.auth = { token };
            }
            socket.connect();
            socket.emit('join', user.id);

            socket.on('user_blocked', (data) => {
                alert(`⚠️ SECURITY ALERT:\n\n${data.message}`);
                logout();
                navigate('/login');
            });
        });

        return () => {
            if (socketInstance) {
                socketInstance.off('user_blocked');
            }
        };
    }, [user?.id, logout, navigate]);

    return (
        <nav className="sticky top-0 z-50 w-full backdrop-blur-md bg-white/70 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-20">
                    <div className="flex-shrink-0 flex items-center">
                        <Link to="/" className="text-2xl font-black tracking-tighter">
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-orange-500">Crave</span>
                            <span className="text-slate-900 dark:text-white">Route.</span>
                        </Link>
                    </div>
                    
                    <div className="flex items-center space-x-6">
                        <button 
                            onClick={() => setDarkMode(!darkMode)}
                            className="p-2.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95 shadow-sm border border-slate-200 dark:border-slate-700"
                            aria-label="Toggle Theme"
                        >
                            {darkMode ? '☀️' : '🌙'}
                        </button>

                        {/* Conditional Rendering based on Auth State */}
                        {user ? (
                            <div className="flex items-center space-x-4">
                                <Link 
                                    to={`/${user.role}`}
                                    className="text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-rose-500 dark:hover:text-rose-400 transition-colors hidden sm:block"
                                >
                                    Dashboard
                                </Link>
                                <span className="text-slate-300 dark:text-slate-700 hidden sm:block">|</span>
                                <span className="text-sm font-bold text-slate-600 dark:text-slate-300 hidden sm:block">
                                    Hi, {user.name.split(' ')[0]} 👋
                                </span>
                                <button 
                                    onClick={handleLogout}
                                    className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-5 py-2 rounded-full font-bold transition-all active:scale-95 shadow-sm border border-transparent dark:border-slate-700"
                                >
                                    Logout
                                </button>
                            </div>
                        ) : (
                            <>
                                <Link to="/login" className="text-slate-600 dark:text-slate-300 hover:text-rose-500 dark:hover:text-rose-400 font-bold transition-colors">
                                    Sign In
                                </Link>
                                <Link to="/register" className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-2.5 rounded-full font-bold shadow-lg shadow-rose-500/30 transition-all hover:-translate-y-0.5 active:scale-95">
                                    Get Started
                                </Link>
                            </>
                        )}

                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
