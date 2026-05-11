import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../utils/api';
import Navbar from '../../components/Navbar';
import { calculateDistance } from '../../utils/location';
import toast from 'react-hot-toast';

const DeliveryDashboard = () => {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('radar'); // 'radar', 'history'
    const [driverLocation, setDriverLocation] = useState({ lat: null, lng: null });

    const { data: activeOrder, isLoading: activeLoading } = useQuery({
        queryKey: ['activeOrder'],
        queryFn: async () => { const { data } = await api.get('/delivery/orders/active'); return data; },
        refetchInterval: 5000
    });

    const { data: availableOrders, isLoading: availLoading } = useQuery({
        queryKey: ['availableOrders'],
        queryFn: async () => { const { data } = await api.get('/delivery/orders/available'); return data; },
        enabled: !activeOrder && activeTab === 'radar',
        refetchInterval: 5000
    });

    const { data: historyOrders, isLoading: historyLoading } = useQuery({
        queryKey: ['deliveryHistory'],
        queryFn: async () => { const { data } = await api.get('/delivery/orders/history'); return data; }
    });

    // Stream the driver's GPS location
    useEffect(() => {
        if (navigator.geolocation) {
            const watchId = navigator.geolocation.watchPosition(
                (pos) => setDriverLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                (err) => console.log("Location error", err),
                { enableHighAccuracy: true }
            );
            return () => navigator.geolocation.clearWatch(watchId);
        }
    }, []);

    // Sync location to server every 10 seconds if active mission exists
    useEffect(() => {
        if (!driverLocation.lat || !activeOrder) return;

        const interval = setInterval(async () => {
            try {
                await api.put('/delivery/location', {
                    latitude: driverLocation.lat,
                    longitude: driverLocation.lng
                });
            } catch (err) {
                console.error("Failed to sync location", err);
            }
        }, 10000);

        return () => clearInterval(interval);
    }, [driverLocation.lat, !!activeOrder]);

    const totalEarnings = (historyOrders?.length || 0) * 20;

    const acceptMut = useMutation({
        mutationFn: async (orderId) => api.put(`/delivery/orders/${orderId}/accept`),
        onSuccess: () => { 
            queryClient.invalidateQueries({ queryKey: ['activeOrder'] }); 
            queryClient.invalidateQueries({ queryKey: ['availableOrders'] }); 
            toast.success("🛵 Order Accepted! Start your mission."); 
        }
    });

    const pickupMut = useMutation({
        mutationFn: async (orderId) => api.put(`/delivery/orders/${orderId}/pickup`),
        onSuccess: () => { 
            queryClient.invalidateQueries({ queryKey: ['activeOrder'] }); 
            toast.success("🚚 Order Picked Up! Heading to customer."); 
        }
    });

    const completeMut = useMutation({
        mutationFn: async (orderId) => api.put(`/delivery/orders/${orderId}/complete`),
        onSuccess: () => { 
            queryClient.invalidateQueries({ queryKey: ['activeOrder'] }); 
            queryClient.invalidateQueries({ queryKey: ['deliveryHistory'] }); 
            toast.success("✅ Delivered! Payout added to your logbook."); 
        }
    });

    const toggleAvailabilityMut = useMutation({
        mutationFn: (is_available) => api.put('/delivery/availability', { is_available }),
        onMutate: async (is_available) => {
            await queryClient.cancelQueries({ queryKey: ['deliveryProfile'] });
            const previousProfile = queryClient.getQueryData(['deliveryProfile']);
            queryClient.setQueryData(['deliveryProfile'], (old) => ({ ...old, is_available }));
            return { previousProfile };
        },
        onError: (err, is_available, context) => {
            queryClient.setQueryData(['deliveryProfile'], context.previousProfile);
            toast.error("Connection error");
        },
        onSuccess: (response) => {
            toast.success(response.data.message);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['deliveryProfile'] });
        }
    });

    // Fetch delivery profile for availability status
    const { data: profile, isLoading: profileLoading } = useQuery({
        queryKey: ['deliveryProfile'],
        queryFn: async () => {
            const { data } = await api.get('/delivery/profile');
            return data;
        }
    });

    if (activeLoading || profileLoading) return <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col"><Navbar /><div className="flex-grow flex justify-center py-20"><div className="animate-spin h-12 w-12 border-b-4 border-orange-500 rounded-full"></div></div></div>;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
            <Navbar />
            
            <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12">

                {/* STARTUP LEVEL DASHBOARD HEADER */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-orange-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-orange-500/30 text-white">
                            🛵
                        </div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">Logistics Hub</h1>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">CraveRoute Platform</p>
                            <div className="mt-2 inline-flex items-center bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 px-3 py-1 rounded-xl text-xs font-bold">
                                💰 Total Earnings: ₹{totalEarnings.toFixed(2)}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="flex items-center bg-white dark:bg-slate-800 px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <span className={`text-xs font-black uppercase tracking-tighter mr-3 ${Number(profile?.is_available) ? 'text-orange-500' : 'text-slate-500'}`}>
                                {Number(profile?.is_available) ? 'Online' : 'Offline'}
                            </span>
                            <button 
                                onClick={() => toggleAvailabilityMut.mutate(Number(profile?.is_available) ? 0 : 1)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${Number(profile?.is_available) ? 'bg-orange-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${Number(profile?.is_available) ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                        <div className="flex items-center space-x-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700">
                            <span className={`w-2 h-2 rounded-full ${Number(profile?.is_available) ? 'bg-orange-500 animate-pulse' : 'bg-slate-400'}`}></span>
                            <span className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-tighter">Duty Status: {Number(profile?.is_available) ? 'Active' : 'Offline'}</span>
                        </div>
                    </div>
                </div>

                {/* TABS */}
                <div className="flex space-x-2 p-1.5 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full max-w-sm mb-10 shadow-inner border border-slate-300 dark:border-slate-700">
                    <button onClick={() => setActiveTab('radar')} className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${activeTab === 'radar' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Radar / Active 🛵</button>
                    <button onClick={() => setActiveTab('history')} className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${activeTab === 'history' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>History 📜</button>
                </div>

                {activeTab === 'radar' && activeOrder && (
                    <div className="animate-fade-in">
                        <div className="mb-8">
                            <span className="inline-block px-4 py-1.5 rounded-full bg-green-100 text-green-600 font-bold text-sm tracking-wide mb-4 animate-pulse">Currently Delivering</span>
                            <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Active Mission</h2>
                        </div>

                        <div className="bg-gradient-to-tr from-slate-900 to-slate-800 p-8 md:p-10 rounded-3xl shadow-2xl text-white relative overflow-hidden border border-slate-700">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/20 rounded-full filter blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                            
                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-6 border-b border-slate-700 pb-6">
                                    <div><p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Order #{activeOrder.id}</p><h3 className="text-3xl font-black">Rs {Number(activeOrder.total_amount).toFixed(2)}</h3></div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-slate-400 uppercase mb-1">Pay</p>
                                        <p className="text-xl font-bold text-green-400">Earned!</p>
                                    </div>
                                </div>

                                <div className="space-y-4 mb-10">
                                    <div className="flex items-center">
                                        <span className="text-3xl mr-5">🏪</span>
                                        <div>
                                            <p className="text-sm text-slate-400 font-bold uppercase tracking-wide">Pickup: {activeOrder.restaurant_name}</p>
                                            <p className="text-sm text-slate-300 mt-1">📍 {activeOrder.restaurant_address}</p>
                                            {driverLocation.lat && (
                                                <p className="text-xs text-orange-400 font-bold mt-1">Distance to Pickup: {calculateDistance(driverLocation.lat, driverLocation.lng, activeOrder.restaurant_lat, activeOrder.restaurant_lng).toFixed(1)} km</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="h-8 border-l-2 border-dashed border-slate-600 ml-4 my-2"></div>
                                    <div className="flex items-center">
                                        <span className="text-3xl mr-5">📍</span>
                                        <div>
                                            <p className="text-sm text-slate-400 font-bold uppercase tracking-wide">Deliver to: {activeOrder.customer_name}</p>
                                            <p className="text-xs text-orange-400 font-bold mt-1">Distance from Pickup to Dropoff: {calculateDistance(activeOrder.restaurant_lat, activeOrder.restaurant_lng, activeOrder.customer_lat, activeOrder.customer_lng).toFixed(1)} km</p>
                                            {driverLocation.lat && (
                                                <p className="text-xs text-green-400 font-bold mt-1">Distance to Customer: {calculateDistance(driverLocation.lat, driverLocation.lng, activeOrder.customer_lat, activeOrder.customer_lng).toFixed(1)} km</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {activeOrder.status === 'accepted' ? (
                                    <button onClick={() => pickupMut.mutate(activeOrder.id)} disabled={pickupMut.isPending} className="w-full py-5 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-2xl font-black text-lg shadow-xl shadow-orange-500/30 transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50">
                                        {pickupMut.isPending ? 'Processing...' : 'Picked Up (Out for Delivery) 🚚'}
                                    </button>
                                ) : (
                                    <button onClick={() => completeMut.mutate(activeOrder.id)} disabled={completeMut.isPending} className="w-full py-5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-green-500/30 transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50">
                                        {completeMut.isPending ? 'Processing...' : 'Mark as Delivered ✔️'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'radar' && !activeOrder && (
                    <div className="animate-fade-in">
                        <div className="mb-8">
                            <span className="inline-block px-4 py-1.5 rounded-full bg-orange-100 text-orange-600 font-bold text-sm tracking-wide mb-4">Radar Active</span>
                            <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Available Orders</h2>
                            <p className="text-slate-500 mt-2 font-medium">Accept a delivery to start earning.</p>
                        </div>

                        {availLoading ? <div className="py-20 text-center"><div className="animate-spin h-8 w-8 border-b-2 border-orange-500 rounded-full inline-block"></div></div> 
                        : availableOrders?.length === 0 ? (
                            <div className="bg-white dark:bg-slate-800 p-12 rounded-3xl border border-slate-100 dark:border-slate-700 text-center shadow-sm">
                                <span className="text-6xl block mb-6">📭</span>
                                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">No orders available.</h3>
                                <p className="text-slate-500">Wait for customers to place new orders.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {availableOrders?.map(order => {
                                    const distToPickup = driverLocation.lat ? calculateDistance(driverLocation.lat, driverLocation.lng, order.restaurant_lat, order.restaurant_lng) : null;
                                    const distTrip = calculateDistance(order.restaurant_lat, order.restaurant_lng, order.customer_lat, order.customer_lng);
                                    
                                    return (
                                    <div key={order.id} className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm hover:shadow-xl border border-slate-100 dark:border-slate-700 transition-all duration-300 hover:-translate-y-2 flex flex-col justify-between group">
                                        <div className="mb-6">
                                            <div className="flex justify-between items-start mb-5">
                                                <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold uppercase">Order #{order.id}</span>
                                                <span className="font-black text-orange-500 text-2xl">Rs {Number(order.total_amount).toFixed(2)}</span>
                                            </div>
                                            
                                            <div className="space-y-3 mb-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-500 font-medium">To Pickup</span>
                                                    <span className="font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-800 px-2 py-0.5 rounded shadow-sm">{distToPickup ? distToPickup.toFixed(1) + ' km' : 'Loading...'}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-500 font-medium">Trip Distance</span>
                                                    <span className="font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-800 px-2 py-0.5 rounded shadow-sm">{distTrip.toFixed(1)} km</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button onClick={() => acceptMut.mutate(order.id)} disabled={acceptMut.isPending} className="w-full py-3.5 bg-orange-50 hover:bg-orange-500 text-orange-600 hover:text-white font-bold rounded-xl transition-all shadow-sm">
                                            {acceptMut.isPending ? 'Accepting...' : 'Accept Delivery 🛵'}
                                        </button>
                                    </div>
                                )})}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="animate-fade-in">
                        <div className="mb-8">
                            <span className="inline-block px-4 py-1.5 rounded-full bg-blue-100 text-blue-600 font-bold text-sm tracking-wide mb-4">Logbook</span>
                            <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">Delivery History</h2>
                        </div>
                        
                        {historyLoading ? <div className="py-20 text-center"><div className="animate-spin inline-block h-8 w-8 border-b-2 border-orange-500 rounded-full"></div></div> 
                        : historyOrders?.length === 0 ? (
                            <div className="bg-white dark:bg-slate-800 p-12 rounded-3xl border border-slate-100 dark:border-slate-700 text-center">
                                <span className="text-6xl block mb-6">📜</span>
                                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">No history yet.</h3>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {historyOrders?.map(order => (
                                    <div key={order.id} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                                        <div>
                                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Order #{order.id} • {new Date(order.created_at).toLocaleDateString()}</p>
                                            <h4 className="text-lg font-black text-slate-900 dark:text-white">{order.restaurant_name} ➔ {order.customer_name}</h4>
                                        </div>
                                        <div className="text-right">
                                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase tracking-wider">Delivered</span>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mt-3">Payout</p>
                                            <p className="text-xl font-black text-emerald-500 mt-0.5">Rs 25.00</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

            </main>
        </div>
    );
};

export default DeliveryDashboard;
