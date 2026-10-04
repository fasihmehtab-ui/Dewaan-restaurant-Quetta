import React, { useState } from 'react';
import { 
  X, Plus, Minus, Trash2, ShoppingBag, ShieldCheck, 
  MapPin, Clock, CreditCard, DollarSign, Check, Tag, AlertCircle 
} from 'lucide-react';
import { CartItem, Order, OrderStatus } from '../types';
import { saveOrderToSupabase } from '../utils/supabaseService';
import { SUPABASE_CONFIG } from '../utils/supabaseClient';
import { formatPKR } from '../utils/currency';

interface CartCheckoutDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQuantity: (cartItemId: string, newQty: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onClearCart: () => void;
  onOrderPlaced: (order: Order) => void;
}

export const CartCheckoutDrawer: React.FC<CartCheckoutDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onOrderPlaced,
}) => {
  const [step, setStep] = useState<'cart' | 'checkout'>('cart');
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery');

  // Customer form details
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [aptSuite, setAptSuite] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  // Promo code
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discountPercent?: number; fixedDiscount?: number; freeDelivery?: boolean } | null>({
    code: 'DEWAAN15',
    discountPercent: 15,
  });
  const [promoError, setPromoError] = useState('');

  // Tip (PKR)
  const [selectedTip, setSelectedTip] = useState<number>(200);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cod' | 'apple_pay'>('card');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Financial calculations in PKR
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const deliveryFee = orderType === 'delivery' ? (appliedPromo?.freeDelivery ? 0 : 250) : 0;
  const packagingFee = items.length > 0 ? 120 : 0;
  const tax = Math.round(subtotal * 0.05); // 5% provincial sales tax

  let discount = 0;
  if (appliedPromo?.discountPercent) {
    discount = Math.round((subtotal * appliedPromo.discountPercent) / 100);
  } else if (appliedPromo?.fixedDiscount) {
    discount = Math.min(subtotal, appliedPromo.fixedDiscount);
  }

  const total = Math.max(0, subtotal + deliveryFee + packagingFee + tax + selectedTip - discount);

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    setPromoError('');
    const code = promoCodeInput.trim().toUpperCase();
    if (code === 'DEWAAN15') {
      setAppliedPromo({ code: 'DEWAAN15', discountPercent: 15 });
      setPromoCodeInput('');
    } else if (code === 'SHAHI20') {
      if (subtotal < 3000) {
        setPromoError('SHAHI20 requires minimum order of Rs. 3,000');
        return;
      }
      setAppliedPromo({ code: 'SHAHI20', fixedDiscount: 500 });
      setPromoCodeInput('');
    } else if (code === 'ROYALFREE') {
      setAppliedPromo({ code: 'ROYALFREE', freeDelivery: true });
      setPromoCodeInput('');
    } else {
      setPromoError('Invalid promo code. Try DEWAAN15 or ROYALFREE');
    }
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    // Strict validation: Customer phone number is required
    setPhoneError('');
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) {
      setPhoneError('Customer phone number is strictly required for order confirmation and courier dispatch.');
      return;
    }
    const digitsOnly = trimmedPhone.replace(/\D/g, '');
    if (digitsOnly.length < 10) {
      setPhoneError('Please enter a valid customer phone number (minimum 10-11 digits, e.g. 0311-1234567 or +923118427913).');
      return;
    }

    setIsSubmitting(true);

    const orderId = `DW-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date();
    const estArrival = new Date(now.getTime() + 32 * 60 * 1000);

    const newOrder: Order = {
      id: orderId,
      placedAt: now.toISOString(),
      status: 'confirmed',
      orderType,
      items: [...items],
      subtotal,
      deliveryFee,
      packagingFee,
      tax,
      tip: selectedTip,
      discount,
      promoCode: appliedPromo?.code,
      total,
      customer: {
        fullName: fullName.trim() || 'Royal Patron',
        phone: trimmedPhone,
        email: email.trim(),
        address: orderType === 'delivery' ? `${address}${aptSuite ? `, ${aptSuite}` : ''}` : 'Dewaan Royal Palace, Main Zarghoon Road, Quetta',
        aptSuite: aptSuite.trim() ? aptSuite.trim() : undefined,
        deliveryNotes: deliveryNotes.trim() ? deliveryNotes.trim() : undefined,
      },
      paymentMethod,
      estimatedDeliveryMinutes: 32,
      estimatedArrivalTimestamp: estArrival.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      driver: {
        name: 'Allah Dad',
        phone: '+923118427913',
        rating: 4.98,
        tripsCount: 2140,
        vehicle: 'Honda CG-125 Royal Express Cargo',
        plateNumber: 'QTA-772-EXP',
        avatarText: 'AD',
        currentLat: 30.1872,
        currentLng: 66.9961,
        progressPercent: 15,
      },
      milestones: [
        {
          stage: 'confirmed',
          title: 'Order Confirmed & Royal Ticket Issued',
          subtitle: 'Head Chef acknowledged order details & spice preferences',
          timestamp: 'Just now',
          completed: true,
          active: true,
        },
        {
          stage: 'kitchen_dum',
          title: 'Slow-Dum Cooking in Sealed Handi',
          subtitle: 'Awadhi Biryani & Shinwari Karahi cooking over tandoor embers',
          timestamp: 'Upcoming',
          completed: false,
          active: false,
        },
        {
          stage: 'packing_check',
          title: 'Tamper-Evident Royal Packaging',
          subtitle: 'Clay/copper vessels sealed, aroma lock applied, temperature checked',
          timestamp: 'Upcoming',
          completed: false,
          active: false,
        },
        {
          stage: 'out_for_delivery',
          title: 'Dispatched with Courier Allah Dad',
          subtitle: 'En route in heated thermal container. Live GPS tracking.',
          timestamp: 'Upcoming',
          completed: false,
          active: false,
        },
        {
          stage: 'delivered',
          title: 'Delivered at Doorstep',
          subtitle: 'Handed over warm and aromatic. Bon Appétit!',
          timestamp: 'Est. in 32 min',
          completed: false,
          active: false,
        },
      ],
      chatMessages: [
        {
          sender: 'restaurant',
          text: `Salam ${fullName.split(' ')[0] || 'Royal Patron'}! We have received your customized order (${orderId}) and Ustads are preparing the copper handis with your selected spice profiles.`,
          time: 'Just now',
        },
      ],
    };

    // Save order details to Supabase backend table (Project: khbmtvotbiztxadqhnaw)
    saveOrderToSupabase(newOrder).catch((err) => {
      console.warn('[Supabase Backend]', err);
    });

    setTimeout(() => {
      setIsSubmitting(false);
      onClearCart();
      onOrderPlaced(newOrder);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-8 sm:pl-10">
        <div className="w-screen max-w-md bg-[#101218] border-l border-white/[0.08] shadow-2xl flex flex-col">
          
          {/* Modern Drawer Header */}
          <div className="p-5 sm:p-6 bg-[#141620] border-b border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#dfba6c]/15 text-[#dfba6c] flex items-center justify-center">
                <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div>
                <h2 className="font-serif text-lg font-medium text-white">
                  {step === 'cart' ? 'Royal Dastarkhwan Bag' : 'Delivery Details'}
                </h2>
                <span className="text-[10px] font-mono text-[#8c8e96] block">
                  {items.length} {items.length === 1 ? 'handcrafted dish' : 'handcrafted dishes'}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-[#8c8e96] hover:text-white rounded-full bg-white/[0.04] focus:outline-none transition-colors"
              aria-label="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Step 1: Cart Items Review */}
          {step === 'cart' ? (
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 flex flex-col justify-between">
              {items.length === 0 ? (
                <div className="py-20 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-[#161822] flex items-center justify-center mx-auto mb-4 text-[#8c8e96] border border-white/[0.06]">
                    <ShoppingBag className="w-8 h-8 stroke-[1.5]" />
                  </div>
                  <h3 className="font-serif text-xl text-[#ebd8ab] mb-1.5 font-medium">
                    Your Dastarkhwan is Empty
                  </h3>
                  <p className="text-xs text-[#8c8e96] max-w-xs mx-auto mb-6 font-light leading-relaxed">
                    Add our authentic slow-cooked dum handi biryanis, kebabs, or curries to initiate your royal feast.
                  </p>
                  <button
                    onClick={onClose}
                    className="px-6 py-2.5 bg-[#dfba6c] text-[#090a0d] font-semibold text-xs rounded-full hover:bg-[#ebd8ab] transition-all shadow-md shadow-[#dfba6c]/15"
                  >
                    Browse Cuisine Menu
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Items List */}
                  <div className="divide-y divide-white/[0.06]">
                    {items.map((cartItem) => (
                      <div key={cartItem.cartItemId} className="py-4 first:pt-0 last:pb-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <h4 className="text-sm font-medium text-white">
                              {cartItem.menuItem.name}
                            </h4>
                            
                            {/* Customization Details */}
                            <div className="mt-1 space-y-0.5 text-[11px] text-[#8c8e96] font-light">
                              <div>Portion: <span className="text-[#ebd8ab] font-normal">{cartItem.customization.portion.name}</span></div>
                              <div>
                                Heat Level: <span className="capitalize text-[#dfba6c] font-normal">{cartItem.customization.spiceLevel.replace('_', ' ')}</span>
                              </div>
                              {cartItem.customization.protein && (
                                <div>Meat: {cartItem.customization.protein.name}</div>
                              )}
                              {cartItem.customization.accompaniment && (
                                <div>Side: {cartItem.customization.accompaniment.name}</div>
                              )}
                              {cartItem.customization.selectedAddOns.length > 0 && (
                                <div>
                                  Add-ons: {cartItem.customization.selectedAddOns.map((a) => a.name).join(', ')}
                                </div>
                              )}
                              {cartItem.customization.specialInstructions && (
                                <div className="text-[#a4a6ae] italic">
                                  &quot;{cartItem.customization.specialInstructions}&quot;
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Price & Delete */}
                          <div className="text-right">
                            <span className="font-mono text-sm font-bold text-[#dfba6c] tabular-nums">
                              {formatPKR(cartItem.totalPrice)}
                            </span>
                            <button
                              onClick={() => onRemoveItem(cartItem.cartItemId)}
                              className="block ml-auto mt-2 text-[#727581] hover:text-rose-400 p-1 transition-colors"
                              aria-label="Remove item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Quantity Stepper */}
                        <div className="mt-3 flex items-center gap-2.5">
                          <div className="flex items-center bg-[#161822] border border-white/[0.08] rounded-full px-2.5 py-1">
                            <button
                              type="button"
                              onClick={() => onUpdateQuantity(cartItem.cartItemId, cartItem.quantity - 1)}
                              className="p-1 text-[#8c8e96] hover:text-white"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-mono text-xs tabular-nums text-white px-2.5 font-semibold">
                              {cartItem.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => onUpdateQuantity(cartItem.cartItemId, cartItem.quantity + 1)}
                              className="p-1 text-[#8c8e96] hover:text-white"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <span className="text-[11px] text-[#71747d] font-mono tabular-nums">
                            @ {formatPKR(cartItem.unitPrice)} each
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Promo code box */}
                  <div className="pt-4 border-t border-white/[0.06]">
                    <form onSubmit={handleApplyPromo} className="flex gap-2">
                      <div className="relative flex-1">
                        <Tag className="w-3.5 h-3.5 text-[#727581] absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={promoCodeInput}
                          onChange={(e) => setPromoCodeInput(e.target.value)}
                          placeholder="Promo code (e.g. DEWAAN15)"
                          className="w-full pl-9 pr-3 py-2 bg-[#161822] border border-white/[0.08] rounded-full text-xs text-white placeholder-[#71747d] uppercase focus:outline-none focus:border-[#dfba6c]"
                        />
                      </div>
                      <button
                        type="submit"
                        className="px-4 py-2 text-xs font-semibold bg-white/[0.06] text-[#ebd8ab] hover:bg-white/[0.12] rounded-full transition-colors"
                      >
                        Apply
                      </button>
                    </form>
                    {promoError && (
                      <p className="text-[11px] text-rose-400 mt-1 pl-2">{promoError}</p>
                    )}
                    {appliedPromo && (
                      <div className="flex items-center justify-between text-xs text-emerald-400 mt-2 bg-emerald-950/30 border border-emerald-500/30 px-3 py-1.5 rounded-full">
                        <span className="flex items-center gap-1 font-mono text-[11px]">
                          <Check className="w-3.5 h-3.5" />
                          <span>{appliedPromo.code} Applied</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setAppliedPromo(null)}
                          className="text-[10px] text-[#8c8e96] hover:text-white"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Step 2: Checkout Form */
            <form onSubmit={handleCreateOrder} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-xs">
              {/* Order Type Toggle */}
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-[#dfba6c] mb-2">
                  Fulfillment Type
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-[#161822] rounded-full border border-white/[0.08]">
                  <button
                    type="button"
                    onClick={() => setOrderType('delivery')}
                    className={`py-2 text-xs font-medium rounded-full transition-all ${
                      orderType === 'delivery'
                        ? 'bg-[#dfba6c] text-[#090a0d] font-semibold shadow-sm'
                        : 'text-[#8c8e96] hover:text-white'
                    }`}
                  >
                    Thermal Delivery
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderType('pickup')}
                    className={`py-2 text-xs font-medium rounded-full transition-all ${
                      orderType === 'pickup'
                        ? 'bg-[#dfba6c] text-[#090a0d] font-semibold shadow-sm'
                        : 'text-[#8c8e96] hover:text-white'
                    }`}
                  >
                    Self-Pickup
                  </button>
                </div>
              </div>

              {/* Delivery Address Details */}
              {orderType === 'delivery' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-[#dfba6c]">
                      Delivery Destination
                    </label>
                    <span className="text-[10px] text-emerald-400 font-mono">Within 7-mile radius</span>
                  </div>

                  <div>
                    <input
                      type="text"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Street address in Quetta (e.g. House 45, Model Town or Satellite Town, Quetta)"
                      className="w-full px-4 py-2.5 bg-[#161822] border border-white/[0.08] rounded-2xl text-xs text-white placeholder-[#71747d] focus:outline-none focus:border-[#dfba6c]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={aptSuite}
                      onChange={(e) => setAptSuite(e.target.value)}
                      placeholder="Apt, Floor, Block"
                      className="px-4 py-2.5 bg-[#161822] border border-white/[0.08] rounded-2xl text-xs text-white placeholder-[#71747d] focus:outline-none focus:border-[#dfba6c]"
                    />
                    <input
                      type="text"
                      value={deliveryNotes}
                      onChange={(e) => setDeliveryNotes(e.target.value)}
                      placeholder="Gate instructions"
                      className="px-4 py-2.5 bg-[#161822] border border-white/[0.08] rounded-2xl text-xs text-white placeholder-[#71747d] focus:outline-none focus:border-[#dfba6c]"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-[#161822] rounded-2xl border border-white/[0.08] text-xs text-[#a4a6ae]">
                  <div className="font-medium text-white mb-1">Dewaan Royal Palace Lounge</div>
                  <div>12-B, Main Zarghoon Road, Near Chaman Phatak, Quetta</div>
                  <div className="text-[11px] text-[#dfba6c] mt-1">Ready for pickup in ~25-30 minutes</div>
                </div>
              )}

              {/* Contact Information */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-[#dfba6c]">
                    Recipient Contact
                  </label>
                  <span className="text-[10px] font-mono text-amber-400/90 font-medium">
                    * Phone is strictly required
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Full Name"
                      className="w-full px-4 py-2.5 bg-[#161822] border border-white/[0.08] rounded-2xl text-xs text-white placeholder-[#71747d] focus:outline-none focus:border-[#dfba6c]"
                    />
                  </div>
                  <div>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        if (phoneError) setPhoneError('');
                      }}
                      placeholder="Customer Phone (e.g. +923118427913) *"
                      className={`w-full px-4 py-2.5 bg-[#161822] border rounded-2xl text-xs text-white placeholder-[#71747d] focus:outline-none transition-colors ${
                        phoneError ? 'border-rose-500 focus:border-rose-400 bg-rose-950/20' : 'border-white/[0.08] focus:border-[#dfba6c]'
                      }`}
                    />
                  </div>
                </div>

                {phoneError && (
                  <div className="p-3 bg-rose-950/50 border border-rose-800/60 rounded-2xl text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{phoneError}</span>
                  </div>
                )}

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email for digital receipt & tracking link"
                  className="w-full px-4 py-2.5 bg-[#161822] border border-white/[0.08] rounded-2xl text-xs text-white placeholder-[#71747d] focus:outline-none focus:border-[#dfba6c]"
                />
              </div>

              {/* Courier Tip */}
              {orderType === 'delivery' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-mono uppercase tracking-wider text-[#dfba6c]">
                      Courier Tip (100% to Driver)
                    </label>
                    <span className="font-mono text-xs tabular-nums text-[#ebd8ab] font-bold">
                      {formatPKR(selectedTip)}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[100, 200, 300, 500].map((tipVal) => {
                      const isSelected = selectedTip === tipVal;
                      return (
                        <button
                          key={tipVal}
                          type="button"
                          onClick={() => setSelectedTip(tipVal)}
                          className={`py-2 rounded-xl text-xs font-mono tabular-nums transition-all ${
                            isSelected
                              ? 'bg-[#dfba6c] text-[#090a0d] font-bold shadow-sm'
                              : 'bg-[#161822] text-[#a4a6ae] border border-white/[0.08] hover:text-white'
                          }`}
                        >
                          {formatPKR(tipVal)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Payment Method */}
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-[#dfba6c] mb-2">
                  Payment Method
                </label>
                <div className="space-y-2">
                  {[
                    { id: 'card', label: 'Credit or Debit Card', desc: 'Secure Instant Processing' },
                    { id: 'apple_pay', label: 'Apple Pay / Digital Wallet', desc: 'One-touch checkout' },
                    { id: 'cod', label: 'Cash on Delivery (COD)', desc: 'Pay courier upon handoff' },
                  ].map((pm) => {
                    const isSelected = paymentMethod === pm.id;
                    return (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => setPaymentMethod(pm.id as any)}
                        className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all ${
                          isSelected
                            ? 'border-[#dfba6c] bg-[#dfba6c]/10'
                            : 'border-white/[0.08] bg-[#161822] hover:border-white/[0.15]'
                        }`}
                      >
                        <div>
                          <div className={`text-xs font-medium ${isSelected ? 'text-[#ebd8ab]' : 'text-white'}`}>
                            {pm.label}
                          </div>
                          <span className="text-[10px] text-[#71747d] font-light">{pm.desc}</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-[#dfba6c]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

            </form>
          )}

          {/* Drawer Footer with Totals & Action */}
          {items.length > 0 && (
            <div className="p-5 sm:p-6 bg-[#0c0d12] border-t border-white/[0.08] space-y-3.5">
              <div className="space-y-1.5 text-xs text-[#8c8e96]">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-mono tabular-nums text-white font-medium">{formatPKR(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Discount ({appliedPromo?.code})</span>
                    <span className="font-mono tabular-nums">-{formatPKR(discount)}</span>
                  </div>
                )}
                {orderType === 'delivery' && (
                  <div className="flex justify-between">
                    <span>Thermal Delivery</span>
                    <span className="font-mono tabular-nums text-white font-medium">
                      {deliveryFee === 0 ? 'FREE' : formatPKR(deliveryFee)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Copper Handi Aroma Lock & Seal</span>
                  <span className="font-mono tabular-nums text-white font-medium">{formatPKR(packagingFee)}</span>
                </div>
                {selectedTip > 0 && orderType === 'delivery' && (
                  <div className="flex justify-between">
                    <span>Courier Tip</span>
                    <span className="font-mono tabular-nums text-white font-medium">{formatPKR(selectedTip)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2.5 border-t border-white/[0.08] text-sm font-semibold text-white">
                  <span className="font-serif text-base">Grand Total</span>
                  <span className="font-mono tabular-nums text-[#dfba6c] text-lg font-bold">
                    {formatPKR(total)}
                  </span>
                </div>
              </div>

              {step === 'cart' ? (
                <button
                  type="button"
                  onClick={() => setStep('checkout')}
                  className="w-full py-3.5 px-5 bg-gradient-to-r from-[#e9c878] via-[#dfba6c] to-[#c59d5f] hover:brightness-110 active:scale-98 text-[#090a0d] font-semibold text-xs sm:text-sm rounded-full shadow-lg shadow-[#dfba6c]/20 transition-all focus:outline-none flex items-center justify-between"
                >
                  <span>Proceed to Delivery</span>
                  <span className="font-mono tabular-nums font-bold">{formatPKR(total)}</span>
                </button>
              ) : (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleCreateOrder}
                    disabled={isSubmitting}
                    className="w-full py-3.5 px-5 bg-gradient-to-r from-[#e9c878] via-[#dfba6c] to-[#c59d5f] hover:brightness-110 active:scale-98 text-[#090a0d] font-semibold text-xs sm:text-sm rounded-full shadow-lg shadow-[#dfba6c]/20 transition-all focus:outline-none flex items-center justify-between disabled:opacity-50"
                  >
                    <span>{isSubmitting ? 'Confirming Order...' : 'Place Royal Order'}</span>
                    <span className="font-mono tabular-nums font-bold">{formatPKR(total)}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep('cart')}
                    className="w-full py-1 text-center text-xs text-[#8c8e96] hover:text-white"
                  >
                    ← Back to Items
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
