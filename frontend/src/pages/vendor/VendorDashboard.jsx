import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import Navbar from '../../components/Navbar';
import { calculateDistance } from '../../utils/location';

const VendorDashboard = () => {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('orders'); // 'orders', 'history', 'menu'
    
    
    // 1. Fetch Vendor Profile
    const { data: vprofile, isLoading: profileLoading } = useQuery({
        queryKey: ['vendorProfile'],
        queryFn: async () => {
            const { data } = await api.get('/vendor/profile');
            return data;
        }
    });

    // 2. Fetch Orders
    const { data: orders } = useQuery({
        queryKey: ['vendorOrders'],
        queryFn: async () => {
            const { data } = await api.get('/vendor/orders');
            return data;
        },
        enabled: !!vprofile,
        refetchInterval: 5000 // Live feed
    });

    // 3. Fetch Restaurant Menu Items
    const { data: products } = useQuery({
        queryKey: ['vendorProducts'],
        queryFn: async () => {
            const { data } = await api.get(`/products?restaurant_id=${vprofile.id}`);
            return data.data; 
        },
        enabled: !!vprofile
    });

    // 4. Fetch Ratings
    const { data: ratingsData } = useQuery({
        queryKey: ['vendorRatings'],
        queryFn: async () => {
            const { data } = await api.get('/vendor/ratings');
            return data;
        },
        enabled: !!vprofile
    });

    // --- Real-time Socket Connection (MOVED AFTER INITIALIZATION) ---
    useEffect(() => {
        if (!vprofile?.user_id) return;

        import('../../utils/socket').then(({ default: socket }) => {
            socket.connect();
            socket.emit('join', vprofile.user_id);

            socket.on('vendor_order_update', (data) => {
                toast.success(`New order notification: ${data.orderId}`, { icon: '🍽️', duration: 8000 });
                queryClient.invalidateQueries(['vendorOrders']);
            });

            return () => {
                socket.off('vendor_order_update');
                socket.disconnect();
            };
        });
    }, [vprofile?.user_id]);

    const [profileForm, setProfileForm] = useState({ name: '', address: '', description: '', image_url: '', latitude: null, longitude: null });
    const [uploading, setUploading] = useState(false);

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('image', file);
        setUploading(true);

        try {
            const { data } = await api.post('/vendor/upload-image', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setProfileForm({ ...profileForm, image_url: data.url });
            toast.success('Image uploaded successfully!');
        } catch (err) {
            toast.error('Failed to upload image');
        } finally {
            setUploading(false);
        }
    };
    
    useEffect(() => {
        if (navigator.geolocation && !profileForm.latitude) {
            navigator.geolocation.getCurrentPosition(pos => {
                setProfileForm(prev => ({ ...prev, latitude: pos.coords.latitude, longitude: pos.coords.longitude }));
            });
        }
    }, []);

    useEffect(() => {
        if (vprofile) {
            setProfileForm({
                name: vprofile.name || '',
                address: vprofile.address || '',
                description: vprofile.description || '',
                image_url: vprofile.image_url || '',
                latitude: vprofile.latitude || null,
                longitude: vprofile.longitude || null
            });
        }
    }, [vprofile]);

    const [productForm, setProductForm] = useState({ name: '', description: '', price: '', type: 'food', image_url: '' });
    const [editProduct, setEditProduct] = useState(null);

    const createProfileMut = useMutation({
        mutationFn: (newProfile) => api.post('/vendor/profile', newProfile),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vendorProfile'] })
    });

    const updateProfileMut = useMutation({
        mutationFn: (updatedProfile) => api.put('/vendor/profile', updatedProfile),
        onSuccess: () => {
            toast.success('✨ Store profile updated successfully!');
            queryClient.invalidateQueries({ queryKey: ['vendorProfile'] });
        }
    });

    const addProductMut = useMutation({
        mutationFn: (newProduct) => api.post('/vendor/products', newProduct),
        onSuccess: () => {
            toast.success('✅ Product added to your menu!');
            setProductForm({ name: '', description: '', price: '', type: 'food', image_url: '' });
            queryClient.invalidateQueries({ queryKey: ['vendorProducts'] });
        }
    });

    const updateProductMut = useMutation({
        mutationFn: ({ productId, data }) => api.put(`/vendor/products/${productId}`, data),
        onSuccess: () => {
            toast.success('✨ Product updated successfully!');
            setEditProduct(null);
            queryClient.invalidateQueries({ queryKey: ['vendorProducts'] });
        }
    });

    const deleteProductMut = useMutation({
        mutationFn: (productId) => api.delete(`/vendor/products/${productId}`),
        onSuccess: () => {
            toast.success('🗑️ Product removed from menu.');
            queryClient.invalidateQueries({ queryKey: ['vendorProducts'] });
        }
    });

    const updateOrderStatusMut = useMutation({
        mutationFn: ({ orderId, status }) => api.put(`/vendor/orders/${orderId}/status`, { status }),
        onSuccess: () => {
            toast.success('Order status updated!');
            queryClient.invalidateQueries({ queryKey: ['vendorOrders'] });
        }
    });

    const toggleShopStatusMut = useMutation({
        mutationFn: (is_active) => api.put('/vendor/profile/status', { is_active }),
        onMutate: async (is_active) => {
            await queryClient.cancelQueries({ queryKey: ['vendorProfile'] });
            const previousProfile = queryClient.getQueryData(['vendorProfile']);
            queryClient.setQueryData(['vendorProfile'], (old) => ({ ...old, is_active }));
            return { previousProfile };
        },
        onError: (err, is_active, context) => {
            queryClient.setQueryData(['vendorProfile'], context.previousProfile);
            toast.error("Failed to update status");
        },
        onSuccess: (response) => {
            toast.success(response.data.message);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['vendorProfile'] });
        }
    });

    if (profileLoading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col"><Navbar /><div className="flex-grow flex justify-center items-center"><div className="animate-spin rounded-full h-12 w-12 border-b-4 border-rose-500"></div></div></div>
        );
    }

    const liveOrders = orders?.filter(o => !['delivered', 'cancelled'].includes(o.status));
    const historyOrders = orders?.filter(o => ['delivered', 'cancelled'].includes(o.status));
    const totalEarnings = historyOrders?.filter(o => o.status === 'delivered').reduce((sum, o) => sum + Math.max(0, Number(o.total_amount) - 23), 0) || 0;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
            <Navbar />
            <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12">

                {/* STARTUP LEVEL DASHBOARD HEADER */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white">Vendor HQ</h1>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">Manage your kitchen and orders.</p>
                    </div>
                    <div className="flex items-center space-x-6">
                        {vprofile && (
                            <>
                                <div className="hidden sm:flex items-center space-x-2 bg-white dark:bg-slate-800 px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                    <span className="text-orange-400">⭐</span>
                                    <span className="text-sm font-black text-slate-900 dark:text-white">{Number(vprofile.rating || 0).toFixed(1)}</span>
                                    <span className="text-[10px] text-slate-400 font-bold">({vprofile.rating_count || 0} reviews)</span>
                                </div>
                                <div className="flex items-center bg-white dark:bg-slate-800 px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                    <span className={`text-xs font-black uppercase tracking-tighter mr-3 ${Number(vprofile.is_active) ? 'text-green-500' : 'text-red-500'}`}>
                                        Shop {Number(vprofile.is_active) ? 'Open' : 'Closed'}
                                    </span>
                                    <button 
                                        onClick={() => toggleShopStatusMut.mutate(Number(vprofile.is_active) ? 0 : 1)}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${Number(vprofile.is_active) ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${Number(vprofile.is_active) ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                                <div className="hidden md:flex items-center space-x-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700">
                                    <span className={`w-2 h-2 rounded-full ${Number(vprofile?.is_active) ? 'bg-blue-500 animate-pulse' : 'bg-slate-400'}`}></span>
                                    <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">Status: {Number(vprofile?.is_active) ? 'Online' : 'Offline'}</span>
                                </div>
                            </>
                        )}
                    </div>
                </div>
                {!vprofile ? (
                    // LAUNCH PROFILE...
                    <div className="max-w-3xl mx-auto bg-white dark:bg-slate-800 p-8 md:p-10 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700">
                        <h2 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-6">Launch your shop.</h2>
                        <form onSubmit={(e) => { e.preventDefault(); createProfileMut.mutate(profileForm); }} className="space-y-6">
                            <div><label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Restaurant Name</label><input required type="text" className="w-full px-5 py-3.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white" value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} /></div>
                            <div><label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Full Address</label><input required type="text" className="w-full px-5 py-3.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white" value={profileForm.address} onChange={e => setProfileForm({...profileForm, address: e.target.value})} /></div>
                            <div><label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Shop Description</label><textarea required rows="3" className="w-full px-5 py-3.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white resize-none" placeholder="E.g. The best authentic Italian pizza in town..." value={profileForm.description} onChange={e => setProfileForm({...profileForm, description: e.target.value})}></textarea></div>
                            
                            {/* --- IMAGE UPLOAD --- */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Restaurant Cover Photo</label>
                                <div className="flex flex-col md:flex-row gap-6">
                                    <div className={`flex-1 h-48 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center relative overflow-hidden group ${profileForm.image_url ? 'border-none' : ''}`}>
                                        {profileForm.image_url ? (
                                            <img src={profileForm.image_url} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="Preview" />
                                        ) : (
                                            <div className="text-center">
                                                <span className="text-4xl block mb-2">📸</span>
                                                <p className="text-xs font-bold text-slate-400">Upload your best shot</p>
                                            </div>
                                        )}
                                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageUpload} />
                                        {uploading && (
                                            <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 flex flex-col justify-center">
                                        <p className="text-sm font-medium text-slate-500 mb-4">Make sure your image shows both your food and items clearly. Use JPG or PNG up to 5MB.</p>
                                        {profileForm.image_url && (
                                            <button type="button" onClick={() => setProfileForm({ ...profileForm, image_url: '' })} className="text-rose-500 text-xs font-black uppercase tracking-widest hover:underline">Remove Image</button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                <div>
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">GPS Coordinates</p>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {profileForm.latitude ? `Lat: ${profileForm.latitude.toFixed(4)}, Lng: ${profileForm.longitude.toFixed(4)}` : 'Detecting location...'}
                                    </p>
                                </div>
                                <button type="button" onClick={() => { if (navigator.geolocation) navigator.geolocation.getCurrentPosition(pos => setProfileForm({...profileForm, latitude: pos.coords.latitude, longitude: pos.coords.longitude})); }} className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-lg text-sm">📍 Get My Location</button>
                            </div>
                            <button type="submit" disabled={createProfileMut.isPending} className="w-full py-4 mt-4 bg-gradient-to-r from-rose-500 to-orange-500 text-white rounded-xl font-bold">{createProfileMut.isPending ? 'Creating...' : 'Launch Restaurant 🚀'}</button>
                        </form>
                    </div>
                ) : (
                    <div className="space-y-8 animate-fade-in">
                        <div className="relative p-8 md:p-10 bg-gradient-to-tr from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-900 rounded-3xl shadow-2xl text-white overflow-hidden border border-slate-700">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/20 rounded-full filter blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between">
                                <div><h1 className="text-4xl md:text-5xl font-black mb-2">{vprofile.name}</h1><p className="text-slate-300 font-medium">📍 {vprofile.address}</p></div>
                                <div className="mt-6 md:mt-0 flex flex-col items-end gap-3">
                                    <div className="px-5 py-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 flex flex-col items-end">
                                        <span className="text-[10px] font-black text-rose-300 uppercase tracking-widest">Total Earnings</span>
                                        <span className="text-3xl font-black text-white mt-0.5">Rs {totalEarnings.toFixed(2)}</span>
                                    </div>
                                    <div className="inline-flex items-center px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-full text-green-400 text-xs font-bold"><span className="w-2 h-2 rounded-full bg-green-400 mr-2 animate-pulse"></span> Receiving Orders</div>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 p-1.5 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full max-w-3xl mx-auto shadow-inner border border-slate-300 dark:border-slate-700">
                            <button onClick={() => setActiveTab('orders')} className={`flex-1 py-3 px-2 text-sm font-bold rounded-xl transition-all ${activeTab === 'orders' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}>Live Orders 🔔</button>
                            <button onClick={() => setActiveTab('history')} className={`flex-1 py-3 px-2 text-sm font-bold rounded-xl transition-all ${activeTab === 'history' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}>History 📜</button>
                            <button onClick={() => setActiveTab('menu')} className={`flex-1 py-3 px-2 text-sm font-bold rounded-xl transition-all ${activeTab === 'menu' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}>Menu 🍔</button>
                            <button onClick={() => setActiveTab('ratings')} className={`flex-1 py-3 px-2 text-sm font-bold rounded-xl transition-all ${activeTab === 'ratings' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}>Reviews ⭐</button>
                            <button onClick={() => setActiveTab('settings')} className={`flex-1 py-3 px-2 text-sm font-bold rounded-xl transition-all ${activeTab === 'settings' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}>Settings ⚙️</button>
                        </div>

                        {(activeTab === 'orders' || activeTab === 'history') && (
                            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 p-8">
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">{activeTab === 'orders' ? 'Incoming Orders' : 'Completed Orders'}</h2>
                                
                                {((activeTab === 'orders' ? liveOrders : historyOrders)?.length === 0) ? (
                                    <div className="text-center py-16 text-slate-400"><span className="text-5xl block mb-4">💤</span><h3 className="text-xl font-bold">No orders here</h3></div>
                                ) : (
                                    <div className="space-y-6">
                                        {(activeTab === 'orders' ? liveOrders : historyOrders)?.map(order => {
                                            const dist = calculateDistance(vprofile.latitude, vprofile.longitude, order.customer_lat, order.customer_lng);
                                            return (
                                            <div key={order.id} className="p-6 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                                <div>
                                                    <div className="flex items-center space-x-3 mb-2">
                                                        <span className="font-black text-lg text-slate-900 dark:text-white">Order #{order.id}</span>
                                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : order.status === 'delivered' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>{order.status}</span>
                                                    </div>
                                                    <p className="text-sm text-slate-500 font-medium">Customer: {order.customer_name} • Distance: <span className="font-bold text-slate-700 dark:text-slate-300">{dist.toFixed(1)} km</span></p>
                                                    {order.delivery_boy_id && (
                                                        <div className="mt-2 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/40 rounded-xl text-xs text-orange-600 dark:text-orange-400">
                                                            <p className="font-black uppercase tracking-wider mb-1">🛵 Assigned Partner</p>
                                                            <p className="font-bold">{order.delivery_boy_name}</p>
                                                            {order.delivery_boy_lat && (
                                                                <p className="mt-0.5 font-medium opacity-80">Distance to shop: {calculateDistance(vprofile.latitude, vprofile.longitude, order.delivery_boy_lat, order.delivery_boy_lng).toFixed(1)} km</p>
                                                            )}
                                                        </div>
                                                    )}
                                                    {activeTab === 'orders' ? (
                                                        <p className="text-sm text-slate-500 font-medium mt-2">Order Bill: <span className="text-rose-500 font-black">Rs {Number(order.total_amount).toFixed(2)}</span></p>
                                                    ) : (
                                                        <div className="mt-2 bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-xl">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Order Bill: Rs {Number(order.total_amount).toFixed(2)}</p>
                                                            <p className="text-sm text-emerald-600 font-black mt-1">Your Payout: Rs {(Math.max(0, Number(order.total_amount) - 28) * (Math.max(0, Number(order.total_amount) - 28) <= 200 ? 0.80 : 0.70)).toFixed(2)}</p>
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                                                    {order.status === 'pending' && (
                                                        <>
                                                            <button onClick={() => updateOrderStatusMut.mutate({ orderId: order.id, status: 'preparing' })} className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold transition-all active:scale-95">Start Preparing</button>
                                                            <button onClick={() => updateOrderStatusMut.mutate({ orderId: order.id, status: 'cancelled' })} className="px-6 py-3 bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-500 hover:text-white rounded-xl font-bold transition-all active:scale-95">Cancel Order</button>
                                                        </>
                                                    )}
                                                    {order.status === 'preparing' && (
                                                        <>
                                                            <button onClick={() => updateOrderStatusMut.mutate({ orderId: order.id, status: 'out_for_delivery' })} className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold transition-all active:scale-95">Ready / Out for Delivery</button>
                                                            <button onClick={() => updateOrderStatusMut.mutate({ orderId: order.id, status: 'cancelled' })} className="px-6 py-3 bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-500 hover:text-white rounded-xl font-bold transition-all active:scale-95">Cancel Order</button>
                                                        </>
                                                    )}
                                                    {order.status === 'out_for_delivery' && (
                                                        <button onClick={() => updateOrderStatusMut.mutate({ orderId: order.id, status: 'delivered' })} className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold transition-all active:scale-95">Mark Delivered</button>
                                                    )}
                                                </div>
                                            </div>
                                        )})}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'menu' && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-1">
                                    <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 sticky top-24">
                                        <h2 className="text-xl font-black text-slate-900 dark:text-white mb-6">Add New Item</h2>
                                        <form onSubmit={(e) => { e.preventDefault(); addProductMut.mutate(productForm); }} className="space-y-5">
                                            <div><label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Item Name</label><input required type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white" value={productForm.name} onChange={e => setProductForm({...productForm, name: e.target.value})} /></div>
                                            <div><label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Price (₹)</label><input required type="number" step="0.01" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white" value={productForm.price} onChange={e => setProductForm({...productForm, price: e.target.value})} /></div>
                                            <div><label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Category</label><select className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white" value={productForm.type} onChange={e => setProductForm({...productForm, type: e.target.value})}><option value="food">Food</option><option value="accessory">Accessory</option></select></div>
                                            <div><label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Image URL</label><input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white" value={productForm.image_url} onChange={e => setProductForm({...productForm, image_url: e.target.value})} /></div>
                                            <div><label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Description</label><textarea rows="2" className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white resize-none" value={productForm.description} onChange={e => setProductForm({...productForm, description: e.target.value})}></textarea></div>
                                            <button type="submit" disabled={addProductMut.isPending} className="w-full py-4 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-xl font-bold">{addProductMut.isPending ? 'Adding...' : 'Add to Menu +'}</button>
                                        </form>
                                    </div>
                                </div>
                                <div className="lg:col-span-2">
                                    <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Current Menu</h2>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        {products?.map(product => (
                                            <div key={product.id} className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col group relative">
                                                <div className="h-40 relative bg-slate-200 dark:bg-slate-700">
                                                    {product.image_url ? <img src={product.image_url} className="w-full h-full object-cover" /> : <div className="absolute inset-0 bg-gradient-to-tr from-rose-400 to-orange-300"></div>}
                                                    <div className="absolute top-4 right-4 bg-white/90 px-3 py-1 rounded-full text-xs font-black text-rose-500">Rs {Number(product.price).toFixed(2)}</div>
                                                    
                                                    {/* Hover Actions */}
                                                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-3">
                                                        <button 
                                                            onClick={() => setEditProduct(product)}
                                                            className="p-3 bg-white text-slate-900 rounded-full hover:scale-110 transition-transform shadow-xl"
                                                        >
                                                            ✏️
                                                        </button>
                                                        <button 
                                                            onClick={() => { if(window.confirm("Delete this item?")) deleteProductMut.mutate(product.id); }}
                                                            className="p-3 bg-rose-500 text-white rounded-full hover:scale-110 transition-transform shadow-xl"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="p-6 flex-grow">
                                                    <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">{product.name}</h3>
                                                    <p className="text-xs text-slate-400 font-bold uppercase mb-3">{product.type}</p>
                                                    <p className="text-sm text-slate-500 line-clamp-2">{product.description}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                 </div>
                             </div>
                         )}

                        {activeTab === 'ratings' && (
                            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-700 p-8 animate-fade-in">
                                <div className="flex items-center justify-between mb-10">
                                    <div>
                                        <h2 className="text-3xl font-black text-slate-900 dark:text-white">Customer Feedback</h2>
                                        <p className="text-slate-500 font-medium">Understand what your customers love about your service.</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-5xl font-black text-rose-500">{Number(vprofile.rating || 0).toFixed(1)}</p>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Average Star Rating</p>
                                    </div>
                                </div>

                                {ratingsData?.length === 0 ? (
                                    <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                                        <span className="text-6xl block mb-4">⭐</span>
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">No reviews yet</h3>
                                        <p className="text-slate-500">Provide great service to receive your first rating!</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {ratingsData?.map(rating => (
                                            <div key={rating.id} className="p-8 rounded-[2rem] bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 transition-all hover:shadow-lg">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-10 h-10 bg-rose-500 rounded-full flex items-center justify-center text-white font-black">
                                                            {rating.user_name[0]}
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-slate-900 dark:text-white">{rating.user_name}</p>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(rating.created_at).toLocaleDateString()}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex">
                                                        {[1,2,3,4,5].map(num => (
                                                            <span key={num} className={`text-sm ${rating.rating >= num ? 'text-orange-400' : 'text-slate-200 dark:text-slate-700'}`}>⭐</span>
                                                        ))}
                                                    </div>
                                                </div>
                                                <p className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed italic">
                                                    "{rating.comment || "The customer didn't leave a written review."}"
                                                </p>
                                                <div className="mt-4 pt-4 border-t border-slate-200/50 dark:border-slate-800 flex items-center text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                                    Linked to Order #{rating.order_id}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'settings' && (
                            <div className="bg-white dark:bg-slate-800 p-8 md:p-10 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 animate-fade-in">
                                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-6">Store Settings</h2>
                                <form onSubmit={(e) => { e.preventDefault(); updateProfileMut.mutate(profileForm); }} className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Restaurant Name</label>
                                        <input required type="text" className="w-full px-5 py-3.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white" value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Full Address</label>
                                        <input required type="text" className="w-full px-5 py-3.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white" value={profileForm.address} onChange={e => setProfileForm({...profileForm, address: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Shop Description</label>
                                        <textarea required rows="3" className="w-full px-5 py-3.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white resize-none" value={profileForm.description} onChange={e => setProfileForm({...profileForm, description: e.target.value})}></textarea>
                                    </div>
                                    
                                    {/* --- IMAGE UPLOAD --- */}
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Restaurant Cover Photo</label>
                                        <div className="flex flex-col md:flex-row gap-6">
                                            <div className={`flex-1 h-48 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center relative overflow-hidden group ${profileForm.image_url ? 'border-none' : ''}`}>
                                                {profileForm.image_url ? (
                                                    <img src={profileForm.image_url} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="Preview" />
                                                ) : (
                                                    <div className="text-center">
                                                        <span className="text-4xl block mb-2">📸</span>
                                                        <p className="text-xs font-bold text-slate-400">Upload your storefront image</p>
                                                    </div>
                                                )}
                                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageUpload} />
                                                {uploading && (
                                                    <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
                                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 flex flex-col justify-center">
                                                <p className="text-sm font-medium text-slate-500 mb-4">Upload a custom picture for your restaurant. Recommended size: 800x600px. JPG, PNG up to 5MB.</p>
                                                {profileForm.image_url && (
                                                    <button type="button" onClick={() => setProfileForm({ ...profileForm, image_url: '' })} className="text-rose-500 text-xs font-black uppercase tracking-widest hover:underline text-left">Remove Image</button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <button type="submit" disabled={updateProfileMut.isPending} className="w-full py-4 mt-4 bg-gradient-to-r from-rose-500 to-orange-500 text-white rounded-xl font-bold shadow-lg shadow-rose-500/30 hover:opacity-90 transition-all active:scale-95">{updateProfileMut.isPending ? 'Saving...' : 'Save Changes ✨'}</button>
                                </form>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* --- EDIT PRODUCT MODAL --- */}
            {editProduct && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setEditProduct(null)}></div>
                    <div className="relative w-full max-w-xl bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-scale-in">
                        <div className="p-8 md:p-10">
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Edit Item</h2>
                                <button onClick={() => setEditProduct(null)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors text-2xl">✕</button>
                            </div>
                            
                            <form onSubmit={(e) => {
                                e.preventDefault();
                                updateProductMut.mutate({ productId: editProduct.id, data: editProduct });
                            }} className="space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Item Name</label>
                                        <input required type="text" className="w-full px-5 py-3.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white" value={editProduct.name} onChange={e => setEditProduct({...editProduct, name: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Price (₹)</label>
                                        <input required type="number" step="0.01" className="w-full px-5 py-3.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white" value={editProduct.price} onChange={e => setEditProduct({...editProduct, price: e.target.value})} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Image URL</label>
                                    <input type="text" className="w-full px-5 py-3.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white" value={editProduct.image_url} onChange={e => setEditProduct({...editProduct, image_url: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Description</label>
                                    <textarea rows="3" className="w-full px-5 py-3.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white resize-none" value={editProduct.description} onChange={e => setEditProduct({...editProduct, description: e.target.value})}></textarea>
                                </div>
                                <button type="submit" disabled={updateProductMut.isPending} className="w-full py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-black shadow-lg shadow-rose-500/30 transition-all active:scale-95">
                                    {updateProductMut.isPending ? 'Saving Changes...' : 'Update Item Details'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

         </div>
    );
};
export default VendorDashboard;
