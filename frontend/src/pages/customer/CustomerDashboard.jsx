import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import Navbar from '../../components/Navbar';
import toast from 'react-hot-toast';
import { calculateDistance } from '../../utils/location';
import LiveMap from '../../components/LiveMap';

const fetchRestaurants = async () => {
    const { data } = await api.get('/restaurants');
    return data;
};

// --- Premium Skeleton Loader Component ---
const SkeletonCard = () => (
    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] overflow-hidden border border-slate-100 dark:border-slate-700 p-4 animate-pulse">
        <div className="h-48 bg-slate-200 dark:bg-slate-700 rounded-3xl mb-4"></div>
        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-full w-3/4 mb-3"></div>
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full w-1/2 mb-4"></div>
        <div className="flex justify-between items-center mt-2">
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-xl w-24"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full w-12"></div>
        </div>
    </div>
);

const CustomerDashboard = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('explore');
    const [driverLocs, setDriverLocs] = useState({}); // { orderId: { lat, lng } }
    const [searchTerm, setSearchTerm] = useState('');
    const [userLocation, setUserLocation] = useState({ lat: null, lng: null });
    const [ratingModal, setRatingModal] = useState({ show: false, orderId: null, restaurantId: null, restaurantName: '' });
    const [ratingForm, setRatingForm] = useState({ rating: 5, comment: '' });
    const [confirmCancelModal, setConfirmCancelModal] = useState({ show: false, orderId: null, isPreparing: false });


    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                () => console.log("Location access denied.")
            );
        }
    }, []);
    
    const { data: restaurants, isLoading: resLoading } = useQuery({
        queryKey: ['restaurants'],
        queryFn: fetchRestaurants,
        refetchInterval: 5000 
    });

    const { data: custProfile, refetch: refetchProfile } = useQuery({
        queryKey: ['userProfile'],
        queryFn: async () => {
            const { data } = await api.get('/auth/profile');
            return data;
        },
        refetchInterval: 10000
    });

    const { data: myOrders, isLoading: ordersLoading, refetch: refetchOrders } = useQuery({
        queryKey: ['myOrders'],
        queryFn: async () => {
            const { data } = await api.get('/orders/myorders');
            return data;
        },
        enabled: activeTab === 'orders',
        refetchInterval: activeTab === 'orders' ? 5000 : false 
    });

    // --- Real-time Socket Connection (MOVED AFTER INITIALIZATION) ---
    useEffect(() => {
        if (!custProfile?.id) return;
        
        import('../../utils/socket').then(({ default: socket }) => {
            socket.connect();
            socket.emit('join', custProfile.id);

            socket.on('order_update', (data) => {
                toast.success(data.message, { icon: '🚀', duration: 6000 });
                refetchOrders();
                refetchProfile();
            });

            socket.on('driver_location', (data) => {
                setDriverLocs(prev => ({
                    ...prev,
                    [data.orderId]: { lat: data.latitude, lng: data.longitude }
                }));
            });

            return () => {
                socket.off('order_update');
                socket.disconnect();
            };
        });
    }, [custProfile?.id]);

    const submitRatingMut = useMutation({
        mutationFn: (data) => api.post(`/restaurants/${data.restaurantId}/rate`, { 
            rating: data.rating, 
            comment: data.comment, 
            orderId: data.orderId 
        }),
        onSuccess: () => {
            toast.success('Rating submitted! Thank you.');
            setRatingModal({ show: false, orderId: null, restaurantId: null, restaurantName: '' });
            setRatingForm({ rating: 5, comment: '' });
            refetchOrders();
        },
        onError: () => toast.error('Failed to submit rating. Please try again.')
    });

    const cancelOrderMut = useMutation({
        mutationFn: async (orderId) => api.put(`/orders/${orderId}/cancel`),
        onSuccess: () => {
            toast.success("Order cancelled successfully.");
            refetchOrders();
            refetchProfile();
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || "Failed to cancel order");
        }
    });

    const filteredRestaurants = restaurants?.filter(r => 
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.address.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 transition-colors duration-500">
            <Navbar />
            
            {/* --- CINEMATIC HERO SECTION --- */}
            {activeTab === 'explore' && (
                <div className="relative pt-12 pb-24 overflow-hidden">
                    {/* Background Accents */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-rose-500/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-orange-500/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/4 pointer-events-none"></div>

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
                            <div className="flex-1 text-center lg:text-left animate-slide-up">
                                <div className="inline-flex items-center px-4 py-2 bg-rose-50 dark:bg-rose-900/20 rounded-full border border-rose-100 dark:border-rose-800 mb-6">
                                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse mr-2"></span>
                                    <span className="text-xs font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">CraveRoute Delivery</span>
                                </div>
                                <h1 className="text-5xl lg:text-7xl font-black text-slate-900 dark:text-white leading-[1.1] tracking-tight">
                                    The art of <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-orange-500">Fast Dining</span>
                                </h1>
                                <p className="text-lg lg:text-xl text-slate-500 dark:text-slate-400 mt-6 max-w-xl font-medium leading-relaxed">
                                    Experience premium culinary delights delivered with speed and precision to your doorstep.
                                </p>
                                
                                {/* SEARCH BAR INTEGRATED IN HERO */}
                                <div className="mt-10 max-w-2xl mx-auto lg:mx-0 group relative">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-rose-500 to-orange-500 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                                    <div className="relative flex items-center bg-white dark:bg-slate-800 rounded-[1.5rem] shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden">
                                        <span className="pl-6 text-2xl">🔍</span>
                                        <input 
                                            type="text" 
                                            placeholder="Find your favorite restaurant or cuisine..." 
                                            className="w-full px-6 py-6 text-lg font-medium bg-transparent border-none outline-none text-slate-900 dark:text-white placeholder:text-slate-400"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                        <button className="mr-3 px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black transition-all hover:scale-105 active:scale-95">Search</button>
                                    </div>
                                </div>
                            </div>

                            {/* Hero Image Mockup (Decorative) */}
                            <div className="hidden lg:block flex-1 animate-scale-in">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-gradient-to-tr from-rose-500/20 to-orange-500/20 rounded-[3rem] blur-3xl"></div>
                                    <img 
                                        src="https://images.unsplash.com/photo-1604719312566-8912e9227c6a?q=80&w=2070&auto=format&fit=crop" 
                                        className="relative z-10 w-full h-[450px] object-cover rounded-[3rem] shadow-2xl border-4 border-white dark:border-slate-800"
                                        alt="Food and Daily Essentials"
                                    />
                                    <div className="absolute -bottom-6 -left-6 z-20 bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-2xl animate-bounce duration-[3000ms]">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center text-2xl shadow-lg shadow-green-500/20">🚀</div>
                                            <div><p className="text-xs font-black text-slate-400 uppercase">Average Delivery</p><p className="text-xl font-black text-slate-900 dark:text-white">25-35 Mins</p></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-32">
                
                {/* --- NAVIGATION TABS (STICKY) --- */}
                <div className="sticky top-20 z-40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl py-6 mb-12 border-b border-slate-100 dark:border-slate-900 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
                    <div className="flex items-center justify-between">
                        <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                            <button 
                                onClick={() => setActiveTab('explore')}
                                className={`px-8 py-3 text-sm font-black rounded-xl transition-all ${activeTab === 'explore' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-lg' : 'text-slate-500 hover:text-slate-900'}`}
                            >
                                Explore Hub
                            </button>
                            <button 
                                onClick={() => setActiveTab('orders')}
                                className={`px-8 py-3 text-sm font-black rounded-xl transition-all ${activeTab === 'orders' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-lg' : 'text-slate-500 hover:text-slate-900'}`}
                            >
                                Track Orders {myOrders?.length > 0 && <span className="ml-2 w-5 h-5 bg-rose-500 text-white rounded-full text-[10px] inline-flex items-center justify-center">{myOrders.length}</span>}
                            </button>
                        </div>

                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2 px-5 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-600 dark:text-emerald-400 shadow-sm">
                                <span className="text-lg">💳</span>
                                <div className="flex flex-col items-start">
                                    <span className="text-[9px] font-black uppercase tracking-wide opacity-80">Wallet Balance</span>
                                    <span className="text-base font-black">Rs {Number(custProfile?.wallet || 0).toFixed(2)}</span>
                                </div>
                            </div>
                            <div className="hidden sm:flex items-center space-x-2 px-4 py-2 bg-slate-50 dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-800">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">Active Connection</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- EXPLORE VIEW --- */}
                {activeTab === 'explore' && (
                    <div className="animate-fade-in">
                        <div className="flex items-baseline justify-between mb-8">
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white">Featured Restaurants</h2>
                            <span className="text-sm font-bold text-slate-400">{filteredRestaurants?.length || 0} Places Nearby</span>
                        </div>

                        {resLoading ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                                {[1,2,3,4,5,6,7,8].map(i => <SkeletonCard key={i} />)}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                                {filteredRestaurants?.map((restaurant, idx) => {
                                    const dist = userLocation.lat ? calculateDistance(userLocation.lat, userLocation.lng, restaurant.latitude, restaurant.longitude) : null;
                                    const isClosed = !Number(restaurant.is_active);
                                    
                                    // Use specific keyword-based images for Veg / Daily Needs
                                    const imgKeywords = ['vegetarian-food', 'fresh-vegetables', 'grocery-store', 'organic-food', 'daily-needs', 'spices'];
                                    const defaultImg = `https://source.unsplash.com/featured/800x600?${imgKeywords[idx % imgKeywords.length]}`;
                                    const imgUrl = restaurant.image_url || defaultImg;
                                    
                                    return (
                                        <div 
                                            key={restaurant.id} 
                                            style={{ animationDelay: `${idx * 50}ms` }}
                                            onClick={() => !isClosed && navigate(`/customer/restaurant/${restaurant.id}`)}
                                            className={`group animate-slide-up bg-white dark:bg-slate-800 rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-3 transition-all duration-500 border border-slate-100 dark:border-slate-800 flex flex-col ${isClosed ? 'opacity-70 grayscale-[0.5] cursor-not-allowed' : 'cursor-pointer'}`}
                                        >
                                            <div className="h-56 relative overflow-hidden">
                                                {/* Image Placeholder with Gradient */}
                                                <div className="absolute inset-0 bg-gradient-to-tr from-rose-500 to-orange-400"></div>
                                                <img 
                                                    src={imgUrl} 
                                                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80"
                                                    alt={restaurant.name}
                                                    onError={(e) => { e.target.src = defaultImg; }}
                                                />
                                                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-all"></div>
                                                
                                                {/* Tags */}
                                                <div className="absolute top-5 left-5 right-5 flex justify-between items-start z-20">
                                                    <span className={`px-4 py-1.5 backdrop-blur-xl border border-white/30 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl ${isClosed ? 'bg-slate-900/80' : 'bg-green-500/80'}`}>
                                                        {isClosed ? 'Closed' : 'Open'}
                                                    </span>
                                                    <div className="bg-white/95 dark:bg-slate-900/95 p-2 rounded-2xl shadow-xl flex items-center space-x-1">
                                                        <span className="text-orange-400 text-xs">⭐</span>
                                                        <span className="text-xs font-black text-slate-900 dark:text-white">
                                                            {Number(restaurant.rating || 0).toFixed(1)}
                                                            <span className="text-[10px] text-slate-400 font-bold ml-1">({restaurant.rating_count || 0})</span>
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="absolute bottom-6 left-6 right-6 text-white transform transition-all group-hover:translate-x-1">
                                                    <h3 className="text-3xl font-black drop-shadow-lg leading-tight">{restaurant.name}</h3>
                                                </div>
                                            </div>

                                            <div className="p-7">
                                                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 font-medium h-10">
                                                    {restaurant.description || "Fresh ingredients, authentic recipes, and a passion for great food."}
                                                </p>
                                                
                                                <div className="flex items-center text-slate-400 text-xs font-bold uppercase tracking-wider mb-5 line-clamp-1">
                                                    <span className="mr-2">📍</span> {restaurant.address}
                                                </div>
                                                
                                                <div className="flex justify-between items-center pt-5 border-t border-slate-50 dark:border-slate-700/50">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">Estimated Distance</span>
                                                        <span className="text-xl font-black text-slate-900 dark:text-white">{dist !== null ? `${dist.toFixed(1)} km` : '--'}</span>
                                                    </div>
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isClosed ? 'bg-slate-100 text-slate-400' : 'bg-rose-500 text-white group-hover:scale-110 shadow-lg shadow-rose-500/20'}`}>
                                                        <span className="text-xl">➔</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* --- ORDERS VIEW --- */}
                {activeTab === 'orders' && (
                    <div className="animate-fade-in max-w-4xl mx-auto">
                        <div className="flex items-center justify-between mb-12">
                            <div>
                                <h2 className="text-4xl font-black text-slate-900 dark:text-white">My Deliveries</h2>
                                <p className="text-slate-500 font-medium mt-2">Track your live orders and view past delights.</p>
                            </div>
                            <div className="w-16 h-16 bg-orange-500 rounded-3xl flex items-center justify-center text-3xl shadow-2xl shadow-orange-500/30 text-white">📦</div>
                        </div>
                        
                        {ordersLoading ? (
                            <div className="space-y-6">
                                {[1,2,3].map(i => <div key={i} className="h-40 bg-slate-100 dark:bg-slate-900 rounded-3xl animate-pulse"></div>)}
                            </div>
                        ) : myOrders?.length === 0 ? (
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-20 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800 text-center">
                                <span className="text-8xl block mb-8">🥑</span>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white">Your belly is empty!</h3>
                                <p className="text-slate-500 mt-4 text-lg">No active orders found. Let's fix that by exploring some top restaurants.</p>
                                <button onClick={() => setActiveTab('explore')} className="mt-10 px-10 py-5 bg-rose-500 text-white rounded-2xl font-black shadow-xl shadow-rose-500/20 hover:scale-105 transition-all">Go Exploring Now</button>
                            </div>
                        ) : (
                            <div className="space-y-8">
                                {myOrders?.map((order, idx) => {
                                    let statusColor, statusText, progress, icon;
                                    switch(order.status) {
                                        case 'pending': statusColor = 'bg-yellow-500'; statusText = 'Waiting for confirmation'; progress = '20%'; icon = '⌛'; break;
                                        case 'preparing': statusColor = 'bg-blue-500'; statusText = 'Masterchef is cooking'; progress = '40%'; icon = '👨‍🍳'; break;
                                        case 'accepted': statusColor = 'bg-indigo-500'; statusText = 'Driver matching / Out of Pickup'; progress = '60%'; icon = '🛵'; break;
                                        case 'out_for_delivery': statusColor = 'bg-orange-500'; statusText = 'On the way to you'; progress = '80%'; icon = '🚚'; break;
                                        case 'delivered': statusColor = 'bg-green-500'; statusText = 'Delivered & Enjoyed'; progress = '100%'; icon = '✅'; break;
                                        case 'cancelled': statusColor = 'bg-rose-500'; statusText = 'Order Cancelled'; progress = '0%'; icon = '✖'; break;
                                        default: statusColor = 'bg-slate-500'; statusText = order.status; progress = '0%'; icon = '❓';
                                    }

                                    const dist = userLocation.lat ? calculateDistance(userLocation.lat, userLocation.lng, order.restaurant_lat, order.restaurant_lng) : null;

                                    return (
                                        <div 
                                            key={order.id} 
                                            style={{ animationDelay: `${idx * 100}ms` }}
                                            className="animate-slide-up group relative bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden"
                                        >
                                            {/* Top Progress Line */}
                                            <div className="absolute top-0 left-0 h-2 bg-slate-100 dark:bg-slate-800 w-full">
                                                <div className={`h-full ${statusColor} transition-all duration-[2000ms] ease-in-out shadow-lg`} style={{ width: progress }}></div>
                                            </div>
                                            
                                            <div className="p-8 md:p-10">
                                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                                                    <div className="flex items-center space-x-6">
                                                        <div className={`w-20 h-20 rounded-3xl ${statusColor} text-white flex items-center justify-center text-4xl shadow-2xl shadow-slate-200 dark:shadow-none`}>
                                                            {icon}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center space-x-3 mb-2">
                                                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Order #{order.id}</span>
                                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase text-white ${statusColor}`}>{order.status}</span>
                                                            </div>
                                                            <h3 className="text-3xl font-black text-slate-900 dark:text-white leading-tight">{order.restaurant_name}</h3>
                                                            <p className="text-slate-500 font-medium mt-1">{statusText}</p>
                                                            {order.delivery_boy_id && (
                                                                <div className="mt-3 inline-flex items-center px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300">
                                                                    <span className="mr-2">🛵</span> {order.delivery_boy_name} is handling your delivery
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="w-full md:w-auto flex items-center justify-between md:justify-end gap-10 bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-700/50">
                                                        <div>
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">Total Bill</p>
                                                            <p className="text-2xl font-black text-rose-500">Rs {Number(order.total_amount).toFixed(2)}</p>
                                                        </div>
                                                        <div className="w-px h-10 bg-slate-200 dark:bg-slate-700"></div>
                                                        <div>
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">Trip Distance</p>
                                                            <p className="text-2xl font-black text-slate-900 dark:text-white">{dist ? `${dist.toFixed(1)} km` : '--'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {order.status === 'delivered' && (
                                                    <div className="mt-8 pt-8 border-t border-slate-50 dark:border-slate-800 flex justify-end">
                                                        <button 
                                                            onClick={() => setRatingModal({ show: true, orderId: order.id, restaurantId: order.restaurant_id, restaurantName: order.restaurant_name })}
                                                            className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black text-sm hover:scale-105 transition-all"
                                                        >
                                                            Rate Experience ⭐
                                                        </button>
                                                    </div>
                                                )}

                                                {order.status !== 'delivered' && (
                                                    <div className="mt-10">
                                                        <div className="flex items-center space-x-4 mb-6">
                                                            <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                                                <div className={`h-full ${statusColor} animate-pulse`} style={{ width: progress }}></div>
                                                            </div>
                                                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{progress} complete</span>
                                                        </div>

                                                        {/* LIVE TRACKING MAP */}
                                                        {['accepted', 'out_for_delivery'].includes(order.status) && (
                                                            <div className="h-64 md:h-80 w-full mb-4 animate-scale-in">
                                                                <LiveMap 
                                                                    driverLoc={driverLocs[order.id]}
                                                                    destinationLoc={{ lat: userLocation.lat, lng: userLocation.lng }}
                                                                    restaurantLoc={{ lat: order.restaurant_lat, lng: order.restaurant_lng }}
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {['pending', 'preparing'].includes(order.status) && (
                                                    <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                                                        <button 
                                                            onClick={() => {
                                                                    setConfirmCancelModal({
                                                                        show: true,
                                                                        orderId: order.id,
                                                                        isPreparing: order.status === 'preparing'
                                                                    });
                                                            }} 
                                                            disabled={cancelOrderMut.isPending} 
                                                            className="px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold text-xs shadow-lg shadow-rose-500/20 transition-all active:scale-95 disabled:opacity-50"
                                                        >
                                                            {cancelOrderMut.isPending ? 'Cancelling...' : 'Cancel Order ✖'}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* --- PREMIUM FLOATING ACTION (FOR MOBILE HCI) --- */}
            <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 lg:hidden">
                <div className="glass px-6 py-4 rounded-3xl shadow-2xl border border-white/50 flex items-center space-x-8">
                    <button onClick={() => setActiveTab('explore')} className={`text-2xl ${activeTab === 'explore' ? 'scale-125' : 'opacity-40'}`}>🍔</button>
                    <button onClick={() => setActiveTab('orders')} className={`text-2xl ${activeTab === 'orders' ? 'scale-125' : 'opacity-40'}`}>🛵</button>
                    <button onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})} className="text-2xl opacity-40">⬆️</button>
                </div>
            </div>

            {/* --- RATING MODAL --- */}
            {ratingModal.show && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setRatingModal({ ...ratingModal, show: false })}></div>
                    <div className="relative bg-white dark:bg-slate-800 w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-white/20 p-10 animate-scale-in">
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Rate {ratingModal.restaurantName}</h2>
                        <p className="text-slate-500 font-medium mb-8">How was your order #{ratingModal.orderId}?</p>
                        
                        <div className="flex justify-center space-x-4 mb-10">
                            {[1,2,3,4,5].map(num => (
                                <button 
                                    key={num} 
                                    onClick={() => setRatingForm({...ratingForm, rating: num})}
                                    className={`text-4xl transition-all ${ratingForm.rating >= num ? 'grayscale-0 scale-125' : 'grayscale opacity-30'}`}
                                >
                                    ⭐
                                </button>
                            ))}
                        </div>

                        <textarea 
                            placeholder="Tell us about the food quality and service..."
                            className="w-full p-6 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-700 outline-none focus:ring-2 focus:ring-rose-500 text-slate-900 dark:text-white font-medium resize-none mb-8"
                            rows="4"
                            value={ratingForm.comment}
                            onChange={(e) => setRatingForm({...ratingForm, comment: e.target.value})}
                        ></textarea>

                        <div className="flex gap-4">
                            <button 
                                onClick={() => setRatingModal({ ...ratingModal, show: false })}
                                className="flex-1 py-4 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-black hover:bg-slate-200"
                            >
                                Skip
                            </button>
                            <button 
                                onClick={() => submitRatingMut.mutate({ ...ratingForm, ...ratingModal })}
                                disabled={submitRatingMut.isPending}
                                className="flex-[2] py-4 bg-rose-500 text-white rounded-2xl font-black shadow-xl shadow-rose-500/30 hover:scale-105 active:scale-95 disabled:opacity-50"
                            >
                                {submitRatingMut.isPending ? 'Submitting...' : 'Submit Review'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- CONFIRM CANCEL MODAL --- */}
            {confirmCancelModal.show && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setConfirmCancelModal({ show: false, orderId: null, isPreparing: false })}></div>
                    <div className="relative bg-white dark:bg-slate-800 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-white/20 p-8 animate-scale-in">
                        <div className="text-center">
                            <span className="text-5xl block mb-4">⚠️</span>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Cancel Your Order?</h2>
                            
                            {confirmCancelModal.isPreparing ? (
                                <p className="text-rose-500 font-bold text-sm bg-rose-500/10 p-4 rounded-2xl border border-rose-500/20 mb-6 mt-4">
                                    🚨 Are you sure? The merchant is already preparing your food. 70% of your overall bill will be deducted as a penalty.
                                </p>
                            ) : (
                                <p className="text-slate-500 font-medium text-sm mb-6 mt-4">
                                    Full refund will be added back to your personal CraveRoute Wallet balance. Do you wish to proceed?
                                </p>
                            )}
                        </div>

                        <div className="flex gap-4 mt-6">
                            <button 
                                onClick={() => setConfirmCancelModal({ show: false, orderId: null, isPreparing: false })}
                                className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl font-black hover:bg-slate-200 text-sm"
                            >
                                No, Keep Order
                            </button>
                            <button 
                                onClick={() => {
                                    cancelOrderMut.mutate(confirmCancelModal.orderId);
                                    setConfirmCancelModal({ show: false, orderId: null, isPreparing: false });
                                }}
                                className="flex-1 py-3.5 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-black shadow-xl shadow-rose-500/30 active:scale-95 text-sm"
                            >
                                Yes, Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerDashboard;
