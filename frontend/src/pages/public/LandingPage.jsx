import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';

const LandingPage = () => {
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 flex flex-col">
            <Navbar />
            
            <main className="flex-grow flex items-center justify-center px-4 sm:px-6 lg:px-8 relative overflow-hidden">
                {/* Decorative Blobs for modern aesthetic */}
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-500/10 dark:bg-rose-500/20 rounded-full mix-blend-multiply dark:mix-blend-lighten filter blur-3xl animate-blob"></div>
                <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-orange-500/10 dark:bg-orange-500/20 rounded-full mix-blend-multiply dark:mix-blend-lighten filter blur-3xl animate-blob" style={{ animationDelay: '2s' }}></div>
                
                <div className="text-center z-10 max-w-4xl mx-auto mt-[-10vh]">
                    <div className="inline-block px-4 py-1.5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 font-bold text-sm tracking-wide mb-6 border border-rose-200 dark:border-rose-800/50">
                        ✨ Launching our new 4-Dashboard System
                    </div>
                    
                    <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-8">
                        The ultimate <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-orange-500 leading-tight">high-performance</span> delivery network.
                    </h1>
                    
                    <p className="text-lg md:text-xl text-slate-600 dark:text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
                        Order premium food and cutting-edge accessories. Join as a customer, sell as a vendor, or ride as a delivery partner in one unified ecosystem.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6">
                        <Link to="/login" className="w-full sm:w-auto px-10 py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-full font-bold text-lg shadow-xl shadow-rose-500/30 transition-all hover:-translate-y-1 active:scale-95">
                            Order Now
                        </Link>
                        <Link to="/register?role=vendor" className="w-full sm:w-auto px-10 py-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 hover:border-rose-500 dark:hover:border-rose-500 rounded-full font-bold text-lg shadow-sm transition-all hover:-translate-y-1 active:scale-95">
                            Become a Partner
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default LandingPage;
