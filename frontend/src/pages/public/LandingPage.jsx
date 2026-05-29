import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';

const LandingPage = () => {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors duration-300 font-sans overflow-x-hidden">
            <Navbar />
            
            {/* HERO SECTION */}
            <main className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between">
                {/* Decorative Blobs */}
                <div className="absolute top-20 left-0 w-[500px] h-[500px] bg-rose-500/20 dark:bg-rose-500/10 rounded-full mix-blend-multiply dark:mix-blend-lighten filter blur-3xl animate-blob"></div>
                <div className="absolute top-40 right-0 w-[500px] h-[500px] bg-orange-500/20 dark:bg-orange-500/10 rounded-full mix-blend-multiply dark:mix-blend-lighten filter blur-3xl animate-blob" style={{ animationDelay: '2s' }}></div>
                
                <div className="z-10 w-full lg:w-1/2 text-center lg:text-left pr-0 lg:pr-12">
                    <div className="inline-block px-4 py-1.5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 font-bold text-sm tracking-wide mb-6 border border-rose-200 dark:border-rose-800/50 shadow-sm">
                        🚀 The CraveRoute V2 Architecture is Live
                    </div>
                    
                    <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-slate-900 dark:text-white tracking-tight mb-8 leading-tight">
                        Engineered for <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-orange-500">
                            Absolute Trust.
                        </span>
                    </h1>
                    
                    <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium">
                        CraveRoute abandons legacy monolithic designs. Experience a decoupled, 4-dashboard food delivery ecosystem backed by ACID transactions, server-side pricing validation, and strict OTP delivery protocols.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row justify-center lg:justify-start items-center space-y-4 sm:space-y-0 sm:space-x-6">
                        <Link to="/login" className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-rose-500/30 transition-all hover:-translate-y-1 active:scale-95">
                            Order Now
                        </Link>
                        <Link to="/register?role=vendor" className="w-full sm:w-auto px-10 py-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 rounded-2xl font-black text-lg shadow-sm transition-all hover:-translate-y-1 active:scale-95">
                            Partner With Us
                        </Link>
                    </div>
                </div>

                <div className="z-10 w-full lg:w-1/2 mt-16 lg:mt-0 relative perspective-1000">
                    {/* Floating Hero Imagery */}
                    <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-slate-900/20 border-4 border-white dark:border-slate-800 transform rotate-y-[-5deg] rotate-x-[5deg] hover:rotate-y-0 hover:rotate-x-0 transition-transform duration-700">
                        <img 
                            src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=2070&auto=format&fit=crop" 
                            alt="Premium Food Delivery" 
                            className="w-full h-auto object-cover opacity-90 hover:opacity-100 transition-opacity"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent flex flex-col justify-end p-8">
                            <span className="text-white font-black text-2xl">Premium Delivery.</span>
                            <span className="text-orange-400 font-bold text-sm uppercase tracking-widest mt-1">Secured by CraveRoute</span>
                        </div>
                    </div>
                    {/* Floating Badge */}
                    <div className="absolute -bottom-6 -left-6 bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 animate-bounce-slow">
                        <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 text-2xl">
                                🔒
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Security</p>
                                <p className="text-lg font-black text-slate-900 dark:text-white">Zero-Trust Network</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* TECHNICAL FEATURES GRID */}
            <section className="py-24 bg-white dark:bg-slate-900/50 border-y border-slate-100 dark:border-slate-800 relative z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl md:text-5xl font-black mb-6">Built for Scale. <br/>Engineered for Integrity.</h2>
                        <p className="text-lg text-slate-500 dark:text-slate-400 font-medium">Unlike legacy platforms, CraveRoute was designed from the ground up to prevent data drift, race conditions, and frontend spoofing.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Feature 1 */}
                        <div className="p-8 md:p-10 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700/50 hover:shadow-2xl hover:shadow-rose-500/10 transition-shadow">
                            <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-2xl flex items-center justify-center text-3xl mb-6">🛡️</div>
                            <h3 className="text-2xl font-black mb-3">Zero-Trust Pricing</h3>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">Client-side pricing logic is easily exploited. CraveRoute completely ignores frontend price payloads, pulling real-time values directly from our secure SQL servers during checkout.</p>
                        </div>

                        {/* Feature 2 */}
                        <div className="p-8 md:p-10 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700/50 hover:shadow-2xl hover:shadow-orange-500/10 transition-shadow">
                            <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-2xl flex items-center justify-center text-3xl mb-6">⚡</div>
                            <h3 className="text-2xl font-black mb-3">ACID Transactions</h3>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">Traffic spikes cause race conditions. We use atomic SQL transactions and <code>SELECT ... FOR UPDATE</code> row locks to guarantee zero double-spending and absolute wallet integrity.</p>
                        </div>

                        {/* Feature 3 */}
                        <div className="p-8 md:p-10 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700/50 hover:shadow-2xl hover:shadow-indigo-500/10 transition-shadow">
                            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl flex items-center justify-center text-3xl mb-6">🔐</div>
                            <h3 className="text-2xl font-black mb-3">OTP Delivery Verification</h3>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">Every dispatch generates a secure 6-digit PIN. Orders cannot be marked as delivered, and payouts are not released, until the driver physically verifies this PIN with the customer.</p>
                        </div>

                        {/* Feature 4 */}
                        <div className="p-8 md:p-10 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700/50 hover:shadow-2xl hover:shadow-emerald-500/10 transition-shadow">
                            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl flex items-center justify-center text-3xl mb-6">🤖</div>
                            <h3 className="text-2xl font-black mb-3">CraveAI Telemetry</h3>
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">Integrated local AI modules analyze order velocity to predict kitchen rush hours for vendors, and calculate dynamic weekly payout forecasts for delivery partners.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 4-DASHBOARD ARCHITECTURE */}
            <section className="py-24 relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col lg:flex-row items-center gap-16">
                        <div className="w-full lg:w-1/2">
                            <h2 className="text-4xl lg:text-5xl font-black mb-6 leading-tight">A specialized portal <br/>for <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500">every role.</span></h2>
                            <p className="text-lg text-slate-500 dark:text-slate-400 font-medium mb-10">Monolithic applications leak privileges and clutter UI. CraveRoute utilizes a decoupled 4-dashboard architecture, ensuring users only see what matters to their specific ecosystem role.</p>
                            
                            <div className="space-y-6">
                                <div className="flex items-start space-x-4 p-4 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700">
                                    <span className="text-3xl">🍔</span>
                                    <div>
                                        <h4 className="text-xl font-bold">Customer Hub</h4>
                                        <p className="text-sm text-slate-500 mt-1">Live map tracking, dynamic carts, and Wallet management.</p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-4 p-4 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700">
                                    <span className="text-3xl">🏪</span>
                                    <div>
                                        <h4 className="text-xl font-bold">Vendor Terminal</h4>
                                        <p className="text-sm text-slate-500 mt-1">Menu CRUD, live kitchen toggles, and CraveAI Rush predictions.</p>
                                    </div>
                                </div>
                                <div className="flex items-start space-x-4 p-4 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700">
                                    <span className="text-3xl">🛵</span>
                                    <div>
                                        <h4 className="text-xl font-bold">Driver Radar</h4>
                                        <p className="text-sm text-slate-500 mt-1">Instant dispatch alerts, earnings logs, and OTP verification.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="w-full lg:w-1/2">
                            <div className="relative rounded-3xl overflow-hidden shadow-2xl border-8 border-slate-800 bg-slate-900 aspect-[4/3]">
                                <img 
                                    src="https://images.unsplash.com/photo-1526367790999-0150786686a2?q=80&w=2071&auto=format&fit=crop" 
                                    alt="Delivery Logistics" 
                                    className="w-full h-full object-cover opacity-60 mix-blend-overlay"
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="text-center p-8 bg-black/40 backdrop-blur-md rounded-3xl border border-white/10">
                                        <p className="text-white font-black text-3xl mb-2">4 Isolated UI Environments</p>
                                        <p className="text-slate-300 font-bold uppercase tracking-widest text-xs">Maximum Security & Clarity</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CALL TO ACTION */}
            <section className="py-24 bg-slate-900 relative border-t border-slate-800 overflow-hidden">
                {/* Background glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-64 bg-rose-500/20 blur-[100px] rounded-full pointer-events-none"></div>
                
                <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
                    <h2 className="text-4xl md:text-6xl font-black text-white mb-8 tracking-tight">Ready to experience the future of delivery?</h2>
                    <p className="text-xl text-slate-400 font-medium mb-12">Whether you're hungry, cooking, or driving — there's a place for you in the CraveRoute ecosystem.</p>
                    
                    <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6">
                        <Link to="/register?role=customer" className="w-full sm:w-auto px-12 py-5 bg-white text-slate-900 rounded-2xl font-black text-lg shadow-xl hover:bg-slate-100 transition-all hover:-translate-y-1 active:scale-95">
                            Join as Customer
                        </Link>
                        <Link to="/register?role=vendor" className="w-full sm:w-auto px-12 py-5 bg-transparent text-white border-2 border-slate-700 hover:border-slate-500 rounded-2xl font-black text-lg transition-all hover:-translate-y-1 active:scale-95">
                            Join as Partner
                        </Link>
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="bg-slate-950 py-12 text-center border-t border-slate-900">
                <p className="text-slate-500 font-bold text-sm">© 2026 CraveRoute Architecture. Built for high-performance scale.</p>
            </footer>
        </div>
    );
};

export default LandingPage;
