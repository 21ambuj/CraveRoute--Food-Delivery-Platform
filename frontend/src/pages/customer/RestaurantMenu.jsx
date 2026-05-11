import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../../utils/api';
import Navbar from '../../components/Navbar';
import toast from 'react-hot-toast';

const RestaurantMenu = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    
    // Local State for Shopping Cart
    const [cart, setCart] = useState([]);
    const [paymentSuccess, setPaymentSuccess] = useState({ show: false, txId: '', estDelivery: '' });

    // 1. Fetch Restaurant Details
    const { data: restaurant, isLoading: resLoading } = useQuery({
        queryKey: ['restaurant', id],
        queryFn: async () => {
            const { data } = await api.get(`/restaurants/${id}`);
            return data;
        }
    });

    // 2. Fetch Menu Products
    const { data: products, isLoading: prodLoading } = useQuery({
        queryKey: ['products', id],
        queryFn: async () => {
            const { data } = await api.get(`/products?restaurant_id=${id}`);
            return data.data; // Backend returns { page, limit, results, data: [...] }
        }
    });

    // 3. Checkout Mutation (Creates SQL Transaction)
    const placeOrderMut = useMutation({
        mutationFn: async (orderPayload) => {
            const { data } = await api.post('/orders', orderPayload);
            return data;
        },
        onSuccess: (data) => {
            setPaymentSuccess({ show: true, txId: data.payment_id || 'TXN-'+Date.now(), estDelivery: data.estimated_delivery });
            setCart([]); // Clear the cart
        },
        onError: (err) => {
            toast.error('Failed to place order: ' + (err.response?.data?.message || err.message));
        }
    });

    // Cart Handlers
    const addToCart = (product) => {
        const existing = cart.find(item => item.product_id === product.id);
        if (existing) {
            setCart(cart.map(item => item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
        } else {
            setCart([...cart, { product_id: product.id, name: product.name, price: Number(product.price), quantity: 1 }]);
        }
    };

    const removeFromCart = (productId) => {
        setCart(cart.filter(item => item.product_id !== productId));
    };

    const cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);

    const handleCheckout = async () => {
        if (cart.length === 0) return;
        
        const overallTotal = cartTotal + 28;

        try {
            const rzpKey = import.meta.env.VITE_RAZORPAY_KEY_ID;

            // 1. Create Razorpay Order in Backend
            const { data: orderData } = await api.post('/payments/create-order', { amount: overallTotal });

            const options = {
                key: rzpKey,
                amount: orderData.amount,
                currency: orderData.currency,
                name: "CraveRoute Delivery",
                description: `Order from ${restaurant?.name}`,
                order_id: orderData.id,
                handler: async (response) => {
                    // 2. Verify Payment in Backend
                    try {
                        await api.post('/payments/verify', {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            amount: overallTotal
                        });

                        // 3. Place the actual order if payment is verified
                        placeOrderMut.mutate({
                            restaurant_id: id,
                            items: cart.map(c => ({ product_id: c.product_id, quantity: c.quantity, price: c.price })),
                            total_amount: overallTotal,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id
                        });
                    } catch (err) {
                        toast.error("Payment verification failed!");
                    }
                },
                prefill: {
                    name: "Customer Name",
                    email: "customer@example.com",
                    contact: "9999999999"
                },
                config: {
                    display: {
                        blocks: {
                            upi: {
                                name: "UPI Pay",
                                instruments: [
                                    { method: "upi" }
                                ]
                            }
                        },
                        sequence: ["block.upi", "block.card"]
                    }
                },
                modal: {
                    ondismiss: () => {
                        toast.error("Payment cancelled by user.");
                    }
                },
                theme: { color: "#F43F5E" } // Rose-500
            };

            const rzp = new window.Razorpay(options);
            rzp.open();
        } catch (error) {
            toast.error("Failed to initiate payment. Check console.");
            console.error(error);
        }
    };

    // Loading State
    if (resLoading || prodLoading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
                <Navbar />
                <div className="flex-grow flex justify-center items-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-rose-500 border-t-transparent"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
            <Navbar />
            
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* LEFT SIDE: Menu List */}
                <div className="lg:col-span-2 space-y-6">
                    <button onClick={() => navigate('/customer')} className="inline-flex items-center text-sm font-black text-slate-400 hover:text-rose-500 mb-2 transition-colors">
                        ← Back to Restaurants
                    </button>
                    
                    <div className="p-8 md:p-10 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
                        <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">{restaurant?.name}</h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">📍 {restaurant?.address}</p>
                    </div>

                    <h2 className="text-2xl font-black text-slate-900 dark:text-white pt-4">Menu Items</h2>
                    
                    {products?.length === 0 ? (
                        <div className="p-10 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700">
                            This restaurant hasn't added any items yet.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {products?.map(product => (
                                <div key={product.id} className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1 flex flex-col">
                                    
                                    {/* Product Image */}
                                    <div className="h-48 w-full bg-slate-100 dark:bg-slate-700 relative overflow-hidden group">
                                        {product.image_url ? (
                                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        ) : (
                                            <div className="w-full h-full bg-gradient-to-tr from-rose-400 to-orange-300 group-hover:scale-110 transition-transform duration-500"></div>
                                        )}
                                        <div className="absolute top-4 right-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur px-3 py-1 rounded-full text-xs font-black shadow-sm uppercase tracking-wider text-rose-500">
                                            Rs {Number(product.price).toFixed(2)}
                                        </div>
                                    </div>

                                    <div className="p-6 flex-grow flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="text-xl font-black text-slate-900 dark:text-white leading-tight">{product.name}</h3>
                                            </div>
                                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-2">{product.type}</p>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 line-clamp-2 font-medium">{product.description}</p>
                                        </div>
                                        <button 
                                            onClick={() => addToCart(product)} 
                                            className="w-full py-3 bg-slate-50 hover:bg-rose-50 dark:bg-slate-900/50 dark:hover:bg-rose-900/30 text-slate-900 hover:text-rose-600 dark:text-white font-bold rounded-xl transition-colors border border-slate-200 dark:border-slate-700"
                                        >
                                            Add to Cart +
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* RIGHT SIDE: Floating Shopping Cart */}
                <div className="lg:col-span-1">
                    <div className="sticky top-28 bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 p-8">
                        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6 flex items-center justify-between">
                            Your Order
                            <span className="bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 text-sm px-3 py-1 rounded-full">{cart.reduce((t, i) => t + i.quantity, 0)}</span>
                        </h2>
                        
                        {cart.length === 0 ? (
                            <div className="text-center py-10 text-slate-400 dark:text-slate-500 font-medium">
                                <span className="text-5xl block mb-4">🛒</span>
                                Your cart is empty
                            </div>
                        ) : (
                            <div className="space-y-4 mb-6">
                                {cart.map(item => (
                                    <div key={item.product_id} className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-700 last:border-0">
                                        <div>
                                            <h4 className="font-bold text-slate-900 dark:text-white line-clamp-1">{item.name}</h4>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Qty: {item.quantity}</p>
                                        </div>
                                        <div className="text-right ml-4">
                                            <div className="font-black text-slate-900 dark:text-white">Rs {(item.price * item.quantity).toFixed(2)}</div>
                                            <button onClick={() => removeFromCart(item.product_id)} className="text-xs text-red-500 hover:text-red-600 font-bold mt-1 uppercase tracking-wide">Remove</button>
                                        </div>
                                    </div>
                                ))}
                                
                                <div className="pt-4 mt-4 border-t-2 border-dashed border-slate-200 dark:border-slate-700 space-y-3 text-sm font-bold text-slate-600 dark:text-slate-300">
                                    <div className="flex justify-between">
                                        <span>Food Total:</span>
                                        <span>Rs {cartTotal.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Delivery Charge:</span>
                                        <span>Rs 25.00</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Platform Fee:</span>
                                        <span>Rs 3.00</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xl pt-3 border-t border-slate-100 dark:border-slate-800">
                                        <span className="font-black text-slate-900 dark:text-white">Overall Total:</span>
                                        <span className="font-black text-rose-500">Rs {(cartTotal + 28).toFixed(2)}</span>
                                    </div>
                                </div>

                                <button 
                                    onClick={handleCheckout} 
                                    disabled={placeOrderMut.isPending}
                                    className="w-full mt-8 py-4 bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-600 hover:to-orange-600 text-white rounded-xl font-black shadow-lg shadow-rose-500/30 transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50"
                                >
                                    {placeOrderMut.isPending ? 'Processing...' : 'Checkout Now →'}
                                </button>

                                {/* DEMO MODE BUTTON FOR SHOWCASE */}
                                <button 
                                    onClick={() => {
                                        const total = cartTotal + 28;
                                        placeOrderMut.mutate({
                                            restaurant_id: id,
                                            items: cart.map(c => ({ product_id: c.product_id, quantity: c.quantity, price: c.price })),
                                            total_amount: total,
                                            razorpay_order_id: 'DEMO_ORDER_' + Date.now(),
                                            razorpay_payment_id: 'DEMO_PAY_' + Date.now()
                                        });
                                    }} 
                                    disabled={placeOrderMut.isPending}
                                    className="w-full mt-3 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-all opacity-80 hover:opacity-100"
                                >
                                    🚀 Demo Mode: Instant Pay
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* --- PROFESSIONAL PAYMENT SUCCESS OVERLAY --- */}
            {paymentSuccess.show && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md animate-fade-in"></div>
                    <div className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700 animate-scale-in text-center p-10 md:p-14">
                        <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center text-5xl text-white mx-auto mb-8 shadow-xl shadow-green-500/40 animate-bounce">
                            ✓
                        </div>
                        <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-4">Payment Success!</h2>
                        <p className="text-slate-500 dark:text-slate-400 font-medium mb-10 leading-relaxed">
                            Your order has been received. Our kitchen is already prepping your delicious meal.
                        </p>
                        
                        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-6 mb-10 border border-slate-100 dark:border-slate-700 text-left">
                            <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Transaction ID</span>
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{paymentSuccess.txId}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Est. Delivery</span>
                                <span className="text-sm font-bold text-slate-900 dark:text-white">{paymentSuccess.estDelivery} mins</span>
                            </div>
                        </div>

                        <button 
                            onClick={() => navigate('/customer')}
                            className="w-full py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-lg hover:scale-105 active:scale-95 transition-all shadow-xl shadow-slate-900/20"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RestaurantMenu;
