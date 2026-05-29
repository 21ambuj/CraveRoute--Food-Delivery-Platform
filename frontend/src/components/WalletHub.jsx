import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../utils/api';

const WalletHub = ({ balance, user, refetchProfile }) => {
    const [addAmount, setAddAmount] = useState('');
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawMethod, setWithdrawMethod] = useState('UPI');
    const [withdrawDest, setWithdrawDest] = useState('');

    const initRazorpay = (order) => {
        const options = {
            key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'your_key',
            amount: order.amount,
            currency: order.currency,
            name: "CraveRoute Wallet",
            description: "Add funds to your wallet",
            order_id: order.id,
            handler: async (response) => {
                try {
                    await api.post('/payments/verify', {
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature,
                        amount: Number(addAmount)
                    });
                    toast.success(`Successfully added Rs ${addAmount} to wallet!`);
                    setAddAmount('');
                    refetchProfile();
                } catch (error) {
                    toast.error("Payment verification failed.");
                }
            },
            prefill: {
                name: user?.name,
                email: user?.email,
            },
            theme: {
                color: "#10b981", // emerald-500
            },
        };
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response) {
            toast.error(response.error.description);
        });
        rzp.open();
    };

    const addFundsMut = useMutation({
        mutationFn: async (amount) => {
            const { data } = await api.post('/payments/create-order', { amount });
            return data;
        },
        onSuccess: (orderData) => {
            initRazorpay(orderData);
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Failed to initiate payment');
        }
    });

    const handleAddFunds = (e) => {
        e.preventDefault();
        if (!addAmount || Number(addAmount) <= 0) return toast.error("Enter a valid amount");
        addFundsMut.mutate(Number(addAmount));
    };

    const withdrawMut = useMutation({
        mutationFn: async (payload) => {
            const { data } = await api.post('/payments/withdraw', payload);
            return data;
        },
        onSuccess: (data) => {
            toast.success(data.message);
            setWithdrawAmount('');
            setWithdrawDest('');
            refetchProfile();
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Failed to withdraw funds');
        }
    });

    const handleWithdraw = (e) => {
        e.preventDefault();
        if (!withdrawAmount || Number(withdrawAmount) <= 0) return toast.error("Enter a valid amount");
        if (!withdrawDest) return toast.error("Enter destination details");
        if (Number(withdrawAmount) > balance) return toast.error("Insufficient balance");
        
        withdrawMut.mutate({
            amount: Number(withdrawAmount),
            method: withdrawMethod,
            destination: withdrawDest
        });
    };

    return (
        <div className="animate-fade-in pb-20">
            <div className="mb-8">
                <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Wallet Hub</h2>
                <p className="text-slate-500 font-medium">Manage your funds, add money, or withdraw your unused balance.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Balance Card */}
                <div className="lg:col-span-1 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-8 text-white shadow-xl shadow-emerald-500/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4"></div>
                    <div className="relative z-10">
                        <span className="text-emerald-100 font-bold uppercase tracking-widest text-xs mb-2 block">Current Balance</span>
                        <h3 className="text-5xl font-black mb-8">Rs {Number(balance).toFixed(2)}</h3>
                        
                        <div className="flex items-center space-x-2 text-emerald-100 text-sm font-medium bg-black/10 w-max px-4 py-2 rounded-2xl">
                            <span>💳</span>
                            <span>Secure & Instant</span>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    {/* Add Funds */}
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-100 dark:border-slate-700 shadow-lg relative">
                        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6 flex items-center">
                            <span className="text-2xl mr-2">📥</span> Add Funds
                        </h3>
                        <form onSubmit={handleAddFunds}>
                            <div className="mb-6">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Amount (Rs)</label>
                                <input 
                                    type="number" 
                                    value={addAmount}
                                    onChange={(e) => setAddAmount(e.target.value)}
                                    placeholder="Enter amount to add"
                                    className="w-full px-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none text-slate-900 dark:text-white font-bold outline-none ring-2 ring-transparent focus:ring-emerald-500 transition-all"
                                />
                            </div>
                            <div className="flex gap-2 mb-6">
                                {[100, 500, 1000].map(amt => (
                                    <button 
                                        type="button" 
                                        key={amt} 
                                        onClick={() => setAddAmount(amt)}
                                        className="flex-1 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm border border-emerald-100 dark:border-emerald-800 hover:bg-emerald-100 transition-colors"
                                    >
                                        +Rs {amt}
                                    </button>
                                ))}
                            </div>
                            <button 
                                type="submit" 
                                disabled={addFundsMut.isPending}
                                className="w-full py-4 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black hover:scale-[1.02] active:scale-95 transition-all shadow-xl disabled:opacity-50"
                            >
                                {addFundsMut.isPending ? 'Processing...' : 'Proceed to Pay'}
                            </button>
                        </form>
                    </div>

                    {/* Withdraw Funds */}
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-100 dark:border-slate-700 shadow-lg relative">
                        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-6 flex items-center">
                            <span className="text-2xl mr-2">📤</span> Withdraw Funds
                        </h3>
                        <form onSubmit={handleWithdraw}>
                            <div className="mb-4">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Amount (Rs)</label>
                                <input 
                                    type="number" 
                                    value={withdrawAmount}
                                    onChange={(e) => setWithdrawAmount(e.target.value)}
                                    placeholder="Enter amount to withdraw"
                                    className="w-full px-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none text-slate-900 dark:text-white font-bold outline-none ring-2 ring-transparent focus:ring-rose-500 transition-all"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Method</label>
                                    <select 
                                        value={withdrawMethod}
                                        onChange={(e) => setWithdrawMethod(e.target.value)}
                                        className="w-full px-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none text-slate-900 dark:text-white font-bold outline-none ring-2 ring-transparent focus:ring-rose-500 transition-all cursor-pointer"
                                    >
                                        <option value="UPI">UPI ID</option>
                                        <option value="Bank">Bank Account</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Details</label>
                                    <input 
                                        type="text" 
                                        value={withdrawDest}
                                        onChange={(e) => setWithdrawDest(e.target.value)}
                                        placeholder={withdrawMethod === 'UPI' ? "Enter UPI ID" : "Account Number"}
                                        className="w-full px-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none text-slate-900 dark:text-white font-bold outline-none ring-2 ring-transparent focus:ring-rose-500 transition-all"
                                    />
                                </div>
                            </div>
                            
                            <button 
                                type="submit" 
                                disabled={withdrawMut.isPending}
                                className="w-full py-4 mt-2 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white font-black hover:bg-slate-200 dark:hover:bg-slate-600 active:scale-95 transition-all disabled:opacity-50"
                            >
                                {withdrawMut.isPending ? 'Processing...' : 'Request Withdrawal'}
                            </button>
                        </form>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default WalletHub;
