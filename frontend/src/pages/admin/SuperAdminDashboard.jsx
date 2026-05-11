import React, { useState, useMemo, useContext } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import api from '../../utils/api';
import Navbar from '../../components/Navbar';
import { AuthContext } from '../../context/AuthContext';

const SuperAdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('overview');
    const auth = useContext(AuthContext);
    const currentUser = auth?.user;

    // 1. Fetch Platform Stats
    const { data: stats, isLoading: statsLoading, refetch: statsRefetch } = useQuery({
        queryKey: ['adminStatsDetailed'],
        queryFn: async () => {
            const { data } = await api.get('/admin/stats');
            return data;
        }
    });

    // 2. Fetch All Users
    const { data: users, isLoading: usersLoading, refetch: usersRefetch } = useQuery({
        queryKey: ['adminUsers'],
        queryFn: async () => {
            const { data } = await api.get('/admin/users');
            return data;
        }
    });
    // Toggle Block Status
    const toggleUserStatusMut = useMutation({
        mutationFn: async ({ userId, is_active }) => {
            await api.put(`/admin/users/${userId}/status`, { is_active });
        },
        onSuccess: () => {
            toast.success("User status modified!");
            usersRefetch();
        },
        onError: () => toast.error("Action failed.")
    });

    // Delete User
    const deleteUserMut = useMutation({
        mutationFn: async (userId) => {
            await api.delete(`/admin/users/${userId}`);
        },
        onSuccess: () => {
            toast.success("User removed.");
            usersRefetch();
        },
        onError: () => toast.error("Deletion failed.")
    });

    // 3. Compute Daily Earnings Data for Graphs
    const chartData = useMemo(() => {
        if (!stats?.orders) return [];
        const dailyMap = {};
        const delivered = stats.orders.filter(o => o.status === 'delivered');
        
        delivered.forEach(o => {
            const date = new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
            if (!dailyMap[date]) {
                dailyMap[date] = { date, 'Platform Profit': 0, 'Gross Volume': 0 };
            }
            dailyMap[date]['Platform Profit'] += Number(o.admin_earned || 0);
            dailyMap[date]['Gross Volume'] += Number(o.total_amount || 0);
        });

        return Object.values(dailyMap).reverse();
    }, [stats?.orders]);

    if (statsLoading || usersLoading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
                <Navbar />
                <div className="flex-grow flex justify-center items-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-500 border-t-transparent"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
            <Navbar />
            
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                {/* STARTUP LEVEL DASHBOARD HEADER */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
                    <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-purple-500/30 text-white">
                            🛡️
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">Master Control</h1>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">CraveRoute Platform</p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-4">
                        <button 
                            onClick={() => { statsRefetch(); usersRefetch(); }}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-md transition-all active:scale-95"
                        >
                            🔄 Refresh Data
                        </button>
                        <div className="flex items-center space-x-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700">
                            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                            <span className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-tighter">System Status: Secure</span>
                        </div>
                    </div>
                </div>

                {/* Tabs Switcher */}
                <div className="flex space-x-2 p-1 bg-slate-200/60 dark:bg-slate-800/60 rounded-2xl max-w-md mb-10 border border-slate-200/30 dark:border-slate-700/30">
                    <button 
                        onClick={() => setActiveTab('overview')}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all ${activeTab === 'overview' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm border border-slate-100 dark:border-slate-600' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        Platform Overview
                    </button>
                    <button 
                        onClick={() => setActiveTab('orders')}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all ${activeTab === 'orders' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm border border-slate-100 dark:border-slate-600' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        Order Ledger
                    </button>
                    <button 
                        onClick={() => setActiveTab('users')}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all ${activeTab === 'users' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm border border-slate-100 dark:border-slate-600' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        User Base
                    </button>
                </div>

                {activeTab === 'overview' && (
                    <>
                        {/* KPI Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-12">
                            {[
                                { label: 'Total Users', value: stats?.total_users, color: 'text-blue-500', icon: '👥' },
                                { label: 'Active Vendors', value: stats?.total_vendors, color: 'text-rose-500', icon: '🏪' },
                                { label: 'Total Orders', value: stats?.total_orders, color: 'text-orange-500', icon: '📦' },
                                { label: 'Gross Volume', value: `Rs ${Number(stats?.total_revenue).toFixed(2)}`, color: 'text-slate-500', icon: '📊' },
                                { label: 'Platform Profit', value: `Rs ${Number(stats?.admin_wallet).toFixed(2)}`, color: 'text-emerald-500 font-black scale-105', icon: '💎' },
                            ].map((kpi, i) => (
                                <div key={i} className={`bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 hover:shadow-xl transition-all duration-300 ${i === 4 ? 'border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/10' : ''}`}>
                                    <div className="text-4xl mb-4">{kpi.icon}</div>
                                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">{kpi.label}</p>
                                    <h3 className={`text-2xl font-black ${kpi.color}`}>{kpi.value}</h3>
                                </div>
                            ))}
                        </div>

                        {/* Graph Section */}
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm mb-10">
                            <h2 className="text-xl font-black text-slate-900 dark:text-white mb-2">Daily Sales & Platform Performance</h2>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Interactive ledger trends</p>
                            <div className="h-80">
                                {chartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <XAxis dataKey="date" stroke="#94A3B8" fontSize={10} fontWeight="bold"/>
                                            <YAxis stroke="#94A3B8" fontSize={10} fontWeight="bold"/>
                                            <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: 'none', borderRadius: '12px', color: '#F8FAFC', fontWeight: 'bold', fontSize: '12px' }}/>
                                            <Area type="monotone" dataKey="Platform Profit" stroke="#10B981" fillOpacity={1} fill="url(#colorProfit)" strokeWidth={3}/>
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold text-sm">No financial logs recorded yet.</div>
                                )}
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'orders' && (
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700">
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white">Order Payment Allocations</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">
                                    <tr>
                                        <th className="px-6 py-4">Order ID</th>
                                        <th className="px-6 py-4">Customer/Restaurant</th>
                                        <th className="px-6 py-4">Gross Total</th>
                                        <th className="px-6 py-4">Food Cost</th>
                                        <th className="px-6 py-4">Platform Fee</th>
                                        <th className="px-6 py-4">Courier Fee</th>
                                        <th className="px-6 py-4">Vendor Earn</th>
                                        <th className="px-6 py-4 text-right">Platform Earn</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {stats?.orders?.map((order) => (
                                        <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                                            <td className="px-6 py-4 font-black text-slate-900 dark:text-white">#{order.id}</td>
                                            <td className="px-6 py-4 font-bold">
                                                <div className="text-slate-700 dark:text-slate-200">{order.customer_name}</div>
                                                <div className="text-slate-400 text-[10px] mt-0.5">{order.restaurant_name}</div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-900 dark:text-slate-200 font-black">Rs {Number(order.total_amount).toFixed(2)}</td>
                                            <td className="px-6 py-4 text-slate-500 font-medium">Rs {Number(order.food_cost).toFixed(2)}</td>
                                            <td className="px-6 py-4 text-blue-500 font-bold">Rs {Number(order.platform_fee).toFixed(2)}</td>
                                            <td className="px-6 py-4 text-orange-500 font-bold">Rs {Number(order.delivery_fee).toFixed(2)}</td>
                                            <td className="px-6 py-4 text-rose-500 font-black">Rs {Number(order.vendor_earned).toFixed(2)}</td>
                                            <td className="px-6 py-4 text-right font-black text-emerald-500">Rs {Number(order.admin_earned).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700">
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white">User Management</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest">
                                    <tr>
                                        <th className="px-8 py-4">Name</th>
                                        <th className="px-8 py-4">Email</th>
                                        <th className="px-8 py-4">Role</th>
                                        <th className="px-8 py-4">Joined</th>
                                        <th className="px-8 py-4 text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {users?.map((user) => (
                                        <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                                            <td className="px-8 py-5 font-bold text-slate-900 dark:text-white">{user.name}</td>
                                            <td className="px-8 py-5 text-slate-500 dark:text-slate-400 font-medium">{user.email}</td>
                                            <td className="px-8 py-5">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                                                    user.role === 'admin' ? 'bg-purple-100 text-purple-600' :
                                                    user.role === 'vendor' ? 'bg-rose-100 text-rose-600' :
                                                    user.role === 'delivery' ? 'bg-orange-100 text-orange-600' :
                                                    'bg-blue-100 text-blue-600'
                                                }`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-slate-400 text-sm">{new Date(user.created_at).toLocaleDateString()}</td>
                                            <td className="px-8 py-5 text-right flex items-center justify-end space-x-3">
                                                {user.id !== currentUser?.id ? (
                                                    <>
                                                        <button 
                                                            onClick={() => toggleUserStatusMut.mutate({ userId: user.id, is_active: user.is_active === 0 ? 1 : 0 })}
                                                            className={`px-3 py-1 text-xs font-bold uppercase rounded-lg border transition-all ${user.is_active !== 0 ? 'border-amber-500 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20' : 'border-emerald-500 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'}`}
                                                        >
                                                            {user.is_active !== 0 ? '🚫 Block' : '🔓 Unblock'}
                                                        </button>
                                                        <button 
                                                            onClick={() => {
                                                                if(window.confirm("Are you absolutely sure you want to erase this user?")) {
                                                                    deleteUserMut.mutate(user.id);
                                                                }
                                                            }}
                                                            className="px-3 py-1 text-xs font-bold uppercase rounded-lg border border-rose-500 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all"
                                                        >
                                                            🗑️ Delete
                                                        </button>
                                                    </>
                                                ) : (
                                                    <span className="text-purple-500 font-black text-xs tracking-widest uppercase">You (Admin)</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default SuperAdminDashboard;
