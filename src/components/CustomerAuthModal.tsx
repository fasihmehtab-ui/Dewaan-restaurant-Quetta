import React, { useState, useEffect } from 'react';
import { 
  X, User, Mail, Lock, Phone, MapPin, CheckCircle2, AlertCircle, 
  Sparkles, LogOut, ArrowRight, ShieldCheck, Eye, EyeOff, ShoppingBag,
  ExternalLink, KeyRound
} from 'lucide-react';
import { CustomerUser, signInCustomer, signUpCustomer, signOutCustomer, updateCustomerProfile } from '../utils/supabaseService';
import { Order } from '../types';
import { formatPKR } from '../utils/currency';

interface CustomerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: CustomerUser | null;
  onUserChange: (user: CustomerUser | null) => void;
  orders: Order[];
  onSelectOrder?: (orderId: string) => void;
  initialMode?: 'signin' | 'signup' | 'profile';
}

export const CustomerAuthModal: React.FC<CustomerAuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserChange,
  orders,
  onSelectOrder,
  initialMode = 'signin',
}) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'profile'>(
    currentUser ? 'profile' : initialMode
  );

  useEffect(() => {
    if (currentUser) {
      setMode('profile');
    } else {
      setMode(initialMode);
    }
  }, [currentUser, initialMode, isOpen]);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Edit profile states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');

  // Status & loading
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Filter orders for this customer
  const userOrders = currentUser
    ? orders.filter(
        (o) =>
          (o.customer.email && o.customer.email.toLowerCase() === currentUser.email.toLowerCase()) ||
          (o.customer.phone && o.customer.phone.trim() === currentUser.phone.trim())
      )
    : [];

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    const res = await signInCustomer({ email, password });
    setIsLoading(false);

    if (res.success && res.user) {
      onUserChange(res.user);
      setSuccessMsg(`Khush Amdeed! Welcome back, ${res.user.fullName}.`);
      setTimeout(() => {
        onClose();
      }, 1200);
    } else {
      setErrorMsg(res.error || 'Failed to sign in. Please verify your credentials.');
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    if (!phone.trim()) {
      setErrorMsg('Customer phone number is strictly required for delivery in Quetta.');
      return;
    }

    setIsLoading(true);
    const res = await signUpCustomer({
      email,
      password,
      fullName,
      phone,
      deliveryAddress: address,
      city: 'Quetta',
    });
    setIsLoading(false);

    if (res.success && res.user) {
      onUserChange(res.user);
      setSuccessMsg('Account created successfully with Supabase! Logged in as Royal Patron.');
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      setErrorMsg(res.error || 'Failed to create account. Please try again.');
    }
  };

  const handleSignOut = async () => {
    await signOutCustomer();
    onUserChange(null);
    setMode('signin');
    setSuccessMsg('You have been signed out.');
    setTimeout(() => setSuccessMsg(null), 2500);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsLoading(true);
    const updated = await updateCustomerProfile(currentUser.id, {
      fullName: editFullName.trim() || currentUser.fullName,
      phone: editPhone.trim() || currentUser.phone,
      deliveryAddress: editAddress.trim() || currentUser.deliveryAddress,
    });
    setIsLoading(false);
    if (updated) {
      onUserChange(updated);
      setIsEditingProfile(false);
      setSuccessMsg('Your profile has been updated and synced to Supabase.');
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const startEditProfile = () => {
    if (!currentUser) return;
    setEditFullName(currentUser.fullName);
    setEditPhone(currentUser.phone);
    setEditAddress(currentUser.deliveryAddress || '');
    setIsEditingProfile(true);
  };

  const handleDemoFill = () => {
    setEmail('patron.quetta@dewaan-dining.com');
    setPassword('Dewaan123!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#101218] border border-white/[0.1] rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        
        {/* Glow ambient accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#dfba6c]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-[#141620] border-b border-white/[0.08] flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#dfba6c] to-[#99732b] flex items-center justify-center text-[#090a0d] font-serif font-bold text-lg shadow-md shadow-[#dfba6c]/15">
              D
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-lg font-bold text-white tracking-wide">
                  {mode === 'profile' ? 'Royal Patron Account' : 'Dewaan Authentication'}
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-[9px] font-mono text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Supabase</span>
                </span>
              </div>
              <p className="text-[11px] text-[#8c8e96] font-light">
                {mode === 'profile' 
                  ? 'Your profile, delivery details & active orders' 
                  : 'Sign in to save addresses, order history & live GPS tracking'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[#8c8e96] hover:text-white rounded-full bg-white/[0.04] focus:outline-none transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector Tabs (only when not logged in) */}
        {!currentUser && (
          <div className="px-6 pt-4 pb-2 bg-[#12141a] flex border-b border-white/[0.06] gap-2">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMsg(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                mode === 'signin'
                  ? 'bg-[#dfba6c] text-[#090a0d] shadow-sm'
                  : 'text-[#8c8e96] hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMsg(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${
                mode === 'signup'
                  ? 'bg-[#dfba6c] text-[#090a0d] shadow-sm'
                  : 'text-[#8c8e96] hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 text-xs text-[#a0a3af] relative z-10">
          
          {errorMsg && (
            <div className="p-3 bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs rounded-2xl flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-500/50 text-emerald-300 text-xs rounded-2xl flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ===================================================================== */}
          {/* 1. SIGN IN FORM                                                       */}
          {/* ===================================================================== */}
          {!currentUser && mode === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-[#dfba6c] mb-1.5">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#6e717b] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#171922] border border-white/[0.08] rounded-2xl text-xs text-white placeholder-[#6b6e79] focus:outline-none focus:border-[#dfba6c] transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-[#dfba6c]">
                    Password *
                  </label>
                  <button
                    type="button"
                    onClick={handleDemoFill}
                    className="text-[10px] text-[#dfba6c] hover:underline"
                  >
                    Use Sample Credentials
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#6e717b] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-10 py-2.5 bg-[#171922] border border-white/[0.08] rounded-2xl text-xs text-white placeholder-[#6b6e79] focus:outline-none focus:border-[#dfba6c] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6e717b] hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-[#dfba6c] to-[#c59d5f] hover:brightness-110 active:scale-98 disabled:opacity-50 text-[#090a0d] font-bold text-xs rounded-full transition-all shadow-md shadow-[#dfba6c]/20 flex items-center justify-center gap-2 mt-2"
              >
                {isLoading ? (
                  <span>Authenticating with Supabase...</span>
                ) : (
                  <>
                    <span>Sign In to Dewaan</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <span className="text-[11px] text-[#71747d]">New patron to Dewaan Quetta? </span>
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="text-[11px] text-[#dfba6c] hover:underline font-medium"
                >
                  Create an account
                </button>
              </div>
            </form>
          )}

          {/* ===================================================================== */}
          {/* 2. SIGN UP / CREATE ACCOUNT FORM                                      */}
          {/* ===================================================================== */}
          {!currentUser && mode === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-[#dfba6c] mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#6e717b] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Mir Fasih Mehtab"
                    className="w-full pl-10 pr-4 py-2 bg-[#171922] border border-white/[0.08] rounded-2xl text-xs text-white placeholder-[#6b6e79] focus:outline-none focus:border-[#dfba6c]"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-[#dfba6c]">
                    Customer Phone (Required) *
                  </label>
                  <span className="text-[9px] font-mono text-emerald-400">Strictly required for courier</span>
                </div>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#6e717b] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+923118427913"
                    className="w-full pl-10 pr-4 py-2 bg-[#171922] border border-white/[0.08] rounded-2xl text-xs text-white placeholder-[#6b6e79] focus:outline-none focus:border-[#dfba6c]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-[#dfba6c] mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#6e717b] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your-email@example.com"
                    className="w-full pl-10 pr-4 py-2 bg-[#171922] border border-white/[0.08] rounded-2xl text-xs text-white placeholder-[#6b6e79] focus:outline-none focus:border-[#dfba6c]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-[#dfba6c] mb-1">
                  Default Quetta Delivery Address (Optional)
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-[#6e717b] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. House 45, Model Town, Quetta"
                    className="w-full pl-10 pr-4 py-2 bg-[#171922] border border-white/[0.08] rounded-2xl text-xs text-white placeholder-[#6b6e79] focus:outline-none focus:border-[#dfba6c]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-[#dfba6c] mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 chars"
                    className="w-full px-3 py-2 bg-[#171922] border border-white/[0.08] rounded-2xl text-xs text-white placeholder-[#6b6e79] focus:outline-none focus:border-[#dfba6c]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-[#dfba6c] mb-1">
                    Confirm *
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm"
                    className="w-full px-3 py-2 bg-[#171922] border border-white/[0.08] rounded-2xl text-xs text-white placeholder-[#6b6e79] focus:outline-none focus:border-[#dfba6c]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-[#dfba6c] hover:bg-[#ebd8ab] active:scale-98 disabled:opacity-50 text-[#090a0d] font-bold text-xs rounded-full transition-all shadow-md shadow-[#dfba6c]/20 flex items-center justify-center gap-2 mt-2"
              >
                {isLoading ? (
                  <span>Registering with Supabase...</span>
                ) : (
                  <>
                    <span>Create Royal Account</span>
                    <Sparkles className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ===================================================================== */}
          {/* 3. SIGNED IN USER PROFILE & ORDER HISTORY                             */}
          {/* ===================================================================== */}
          {currentUser && mode === 'profile' && (
            <div className="space-y-4">
              
              {/* Profile Card */}
              <div className="p-4 bg-[#141620] border border-white/[0.08] rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#dfba6c] to-[#99732b] text-[#090a0d] flex items-center justify-center font-serif text-xl font-bold shadow-md">
                      {currentUser.fullName?.[0]?.toUpperCase() || 'P'}
                    </div>
                    <div>
                      <h4 className="font-serif text-base font-semibold text-white">
                        {currentUser.fullName}
                      </h4>
                      <span className="text-[10px] font-mono text-[#dfba6c] bg-[#dfba6c]/10 border border-[#dfba6c]/20 px-2 py-0.5 rounded-full inline-block mt-0.5">
                        {currentUser.loyaltyTier || 'Royal Patron'} · Quetta
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={startEditProfile}
                    className="px-3 py-1 bg-white/[0.06] hover:bg-white/[0.1] text-[#ebd8ab] rounded-full text-[11px] transition-colors"
                  >
                    Edit
                  </button>
                </div>

                <div className="pt-2 border-t border-white/[0.06] space-y-1.5 text-[11px] font-light">
                  <div className="flex items-center gap-2 text-[#a0a3af]">
                    <Mail className="w-3.5 h-3.5 text-[#dfba6c]" />
                    <span className="text-white">{currentUser.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#a0a3af]">
                    <Phone className="w-3.5 h-3.5 text-[#dfba6c]" />
                    <span className="text-white font-mono">{currentUser.phone}</span>
                  </div>
                  {currentUser.deliveryAddress && (
                    <div className="flex items-start gap-2 text-[#a0a3af]">
                      <MapPin className="w-3.5 h-3.5 text-[#dfba6c] shrink-0 mt-0.5" />
                      <span className="text-white">{currentUser.deliveryAddress}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Edit Profile Form */}
              {isEditingProfile && (
                <form onSubmit={handleSaveProfile} className="p-4 bg-[#161822] border border-white/[0.08] rounded-2xl space-y-3">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#dfba6c] block">
                    Update Profile Details
                  </span>
                  <div>
                    <label className="block text-[10px] text-[#8c8e96] mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#101218] border border-white/[0.08] rounded-xl text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#8c8e96] mb-1">Phone Number (Required)</label>
                    <input
                      type="tel"
                      required
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#101218] border border-white/[0.08] rounded-xl text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#8c8e96] mb-1">Quetta Delivery Address</label>
                    <input
                      type="text"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#101218] border border-white/[0.08] rounded-xl text-xs text-white"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      className="px-3 py-1 text-xs text-[#8c8e96]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-4 py-1.5 bg-[#dfba6c] text-[#090a0d] font-semibold text-xs rounded-full"
                    >
                      Save Profile
                    </button>
                  </div>
                </form>
              )}

              {/* Order History */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#dfba6c]">
                    Your Orders in Quetta ({userOrders.length})
                  </span>
                  <span className="text-[10px] text-[#71747d] font-mono">Synced with Supabase</span>
                </div>

                {userOrders.length === 0 ? (
                  <div className="p-6 text-center bg-[#141620] border border-white/[0.06] rounded-2xl">
                    <ShoppingBag className="w-6 h-6 text-[#71747d] mx-auto mb-2" />
                    <span className="text-xs text-[#8c8e96] block">No orders placed under this account yet.</span>
                    <button
                      type="button"
                      onClick={onClose}
                      className="mt-3 px-4 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] text-[#ebd8ab] rounded-full text-xs font-medium transition-colors"
                    >
                      Browse Cuisine Menu
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {userOrders.map((order) => (
                      <div
                        key={order.id}
                        onClick={() => {
                          if (onSelectOrder) onSelectOrder(order.id);
                          onClose();
                        }}
                        className="p-3 bg-[#141620] border border-white/[0.06] hover:border-[#dfba6c]/40 rounded-xl cursor-pointer flex items-center justify-between transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-[#dfba6c]">
                              {order.id}
                            </span>
                            <span className="text-[9px] font-mono text-emerald-400 capitalize bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              {order.status.replace('_', ' ')}
                            </span>
                          </div>
                          <span className="text-[10px] text-[#71747d] block mt-0.5">
                            {new Date(order.placedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-xs font-bold text-white block">
                            {formatPKR(order.total)}
                          </span>
                          <span className="text-[10px] text-[#dfba6c] flex items-center justify-end gap-1">
                            Track <ArrowRight className="w-2.5 h-2.5" />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sign Out Action */}
              <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Authenticated via Supabase</span>
                </div>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/40 text-rose-300 text-xs transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer / Guest Option */}
        <div className="p-4 bg-[#141620] border-t border-white/[0.08] flex items-center justify-between text-xs text-[#71747d] relative z-10">
          <div className="flex items-center gap-1.5 font-mono text-[10px]">
            <Sparkles className="w-3 h-3 text-[#dfba6c]" />
            <span>Quetta Dastarkhwan Hospitality</span>
          </div>

          {!currentUser ? (
            <button
              type="button"
              onClick={onClose}
              className="text-[#ebd8ab] hover:underline text-xs font-medium"
            >
              Continue as Guest →
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] text-white rounded-full text-xs font-medium transition-colors"
            >
              Close
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
