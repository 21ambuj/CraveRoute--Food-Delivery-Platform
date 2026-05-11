import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import Navbar from '../../components/Navbar';
import toast from 'react-hot-toast';

const Register = () => {
    // Allows us to pre-select a role if they clicked "Become a Partner"
    const [searchParams] = useSearchParams();
    const defaultRole = searchParams.get('role') || 'customer';

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: defaultRole,
        latitude: null,
        longitude: null
    });
    
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setFormData(prev => ({ ...prev, latitude: pos.coords.latitude, longitude: pos.coords.longitude })),
                () => console.log("Location access denied")
            );
        }
    }, []);

    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await axios.post('http://localhost:5000/api/auth/register', formData);
            toast.success('Account created successfully! Redirecting to login...');
            
            // Wait 2 seconds so they can read the success message
            setTimeout(() => navigate('/login'), 2000);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 flex flex-col">
            <Navbar />
            
            <div className="flex-grow flex items-center justify-center p-4 relative py-12">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-500/10 rounded-full mix-blend-multiply dark:mix-blend-lighten filter blur-[150px] pointer-events-none -z-0"></div>

                <div className="max-w-xl w-full bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700 z-10">
                    <div className="p-8 md:p-10">
                        <Link to="/" className="inline-flex items-center text-sm font-black text-slate-400 hover:text-rose-500 mb-6 transition-colors">
                            ← Back to Home
                        </Link>

                        <div className="text-center mb-10">
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Join CraveRoute</h2>
                            <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Create your account and get started</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            
                            {/* Role Selection UI */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 text-center">Select Account Type</label>
                                <div className="grid grid-cols-3 gap-3 mb-2">
                                    {['customer', 'vendor', 'delivery'].map((r) => (
                                        <label key={r} className={`cursor-pointer border rounded-xl p-3 text-center transition-all ${formData.role === r ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 font-bold ring-2 ring-rose-500/50 shadow-sm' : 'border-slate-200 dark:border-slate-700 hover:border-rose-300 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                                            <input type="radio" name="role" value={r} className="hidden" checked={formData.role === r} onChange={handleChange} />
                                            <span className="capitalize text-sm">{r}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Full Name</label>
                                <input 
                                    type="text" 
                                    name="name"
                                    required 
                                    className="w-full px-5 py-3.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition-all shadow-sm"
                                    placeholder="John Doe"
                                    value={formData.name}
                                    onChange={handleChange}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Email Address</label>
                                <input 
                                    type="email" 
                                    name="email"
                                    required 
                                    className="w-full px-5 py-3.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition-all shadow-sm"
                                    placeholder="you@example.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Password</label>
                                <input 
                                    type="password" 
                                    name="password"
                                    required 
                                    className="w-full px-5 py-3.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition-all shadow-sm"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={handleChange}
                                />
                            </div>

                            <button 
                                type="submit" 
                                disabled={loading}
                                className="w-full mt-8 py-4 px-4 rounded-xl shadow-lg shadow-orange-500/30 text-white bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 font-bold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed hover:-translate-y-0.5 active:scale-95"
                            >
                                {loading ? 'Creating Account...' : 'Create Account'}
                            </button>
                        </form>
                    </div>
                    
                    <div className="px-8 py-6 bg-slate-100/50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 text-center">
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                            Already have an account?{' '}
                            <Link to="/login" className="font-bold text-rose-500 hover:text-rose-400 transition-colors">Sign in</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
