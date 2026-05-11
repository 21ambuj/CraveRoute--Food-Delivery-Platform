import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import Navbar from '../../components/Navbar';
import toast from 'react-hot-toast';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await axios.post('http://localhost:5000/api/auth/login', {
                email,
                password
            });

            const { token, user } = response.data;
            login(user, token);
            toast.success(`Welcome back, ${user.name}!`);

            // Smart Redirect based on role (The 4-Dashboard System)
            if (user.role === 'admin') navigate('/admin');
            else if (user.role === 'vendor') navigate('/vendor');
            else if (user.role === 'delivery') navigate('/delivery');
            else navigate('/customer');
            
        } catch (err) {
            toast.error(err.response?.data?.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 flex flex-col">
            <Navbar />
            
            <div className="flex-grow flex items-center justify-center p-4 relative">
                {/* Background glow pushed further back */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-rose-500/10 rounded-full mix-blend-multiply dark:mix-blend-lighten filter blur-[120px] pointer-events-none -z-0"></div>

                <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 z-10">
                    <div className="p-8">
                        <Link to="/" className="inline-flex items-center text-sm font-black text-slate-400 hover:text-rose-500 mb-6 transition-colors">
                            ← Back to Home
                        </Link>
                        
                        <div className="text-center mb-10">
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Welcome Back</h2>
                            <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Sign in to your CraveRoute account</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Email Address</label>
                                <input 
                                    type="email" 
                                    required 
                                    className="w-full px-5 py-3.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition-all shadow-sm"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Password</label>
                                <input 
                                    type="password" 
                                    required 
                                    className="w-full px-5 py-3.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition-all shadow-sm"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>

                            <button 
                                type="submit" 
                                disabled={loading}
                                className="w-full py-4 px-4 rounded-xl shadow-lg shadow-rose-500/30 text-white bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 font-bold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed hover:-translate-y-0.5 active:scale-95"
                            >
                                {loading ? 'Authenticating...' : 'Sign In'}
                            </button>
                        </form>
                    </div>
                    
                    <div className="px-8 py-6 bg-slate-100/50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 text-center">
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                            Don't have an account?{' '}
                            <Link to="/register" className="font-bold text-rose-500 hover:text-rose-400 transition-colors">Sign up here</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
