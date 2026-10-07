import React, { useState, useEffect } from 'react';
import { 
  Clock, MapPin, Phone, MessageSquare, ShieldCheck, Flame, 
  ChevronRight, CheckCircle2, Navigation, Send, X, AlertCircle, RotateCcw, FastForward, Check, Sparkles
} from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { formatPKR } from '../utils/currency';
import { fetchCourierGpsTelemetry, QuettaGpsTelemetry } from '../utils/supabaseService';

interface LiveDeliveryTrackerProps {
  orders: Order[];
  activeOrderId: string;
  onSelectOrder: (orderId: string) => void;
  onUpdateOrder: (updatedOrder: Order) => void;
  onBackToMenu: () => void;
}

export const LiveDeliveryTracker: React.FC<LiveDeliveryTrackerProps> = ({
  orders,
  activeOrderId,
  onSelectOrder,
  onUpdateOrder,
  onBackToMenu,
}) => {
  const currentOrder = orders.find((o) => o.id === activeOrderId) || orders[0];

  // Quetta GPS Telemetry from Supabase
  const [gpsTelemetry, setGpsTelemetry] = useState<QuettaGpsTelemetry | null>(null);

  // Chat drawer state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  // Phone call modal state
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [callState, setCallState] = useState<'calling' | 'connected' | 'ended'>('calling');

  // Print Receipt modal state
  const [selectedOrder, setSelectedOrder] = useState<{
    customer_name: string;
    phone: string;
    total: number | string;
    items: React.ReactNode;
  } | null>(null);

  // Order lookup input
  const [lookupId, setLookupId] = useState('');
  const [lookupError, setLookupError] = useState('');

  // Real-time ticking seconds for live ETA
  const [remainingSeconds, setRemainingSeconds] = useState(
    currentOrder ? Math.max(120, currentOrder.estimatedDeliveryMinutes * 60) : 720
  );

  useEffect(() => {
    if (!currentOrder || currentOrder.status === 'delivered') return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          handleAdvanceStage(currentOrder, 'delivered');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentOrder?.id, currentOrder?.status]);

  // Fetch real-time Quetta GPS telemetry from Supabase
  useEffect(() => {
    fetchCourierGpsTelemetry().then((tel) => {
      if (tel) setGpsTelemetry(tel);
    });
  }, [currentOrder?.id, currentOrder?.status]);

  // Lookup order
  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError('');
    if (!lookupId.trim()) return;
    const found = orders.find((o) => o.id.toLowerCase() === lookupId.trim().toLowerCase());
    if (found) {
      onSelectOrder(found.id);
      setLookupId('');
    } else {
      setLookupError(`Order "${lookupId}" not found. Please verify the Order ID on your receipt.`);
    }
  };

  // When no active order exists
  if (!currentOrder) {
    return (
      <div className="max-w-3xl mx-auto py-20 px-4">
        <div className="bg-[#12141a] border border-white/[0.08] rounded-3xl p-8 sm:p-14 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#dfba6c]/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-6 text-[#dfba6c] shadow-lg">
            <Navigation className="w-7 h-7" />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] font-mono tracking-wider uppercase text-[#dfba6c] mb-3">
            <Sparkles className="w-3 h-3" />
            <span>Thermal GPS Tracking</span>
          </div>

          <h2 className="font-serif text-3xl sm:text-4xl text-white font-medium mb-3">
            Track Your Royal Delivery
          </h2>
          <p className="text-sm text-[#9c9ea6] max-w-md mx-auto leading-relaxed mb-8 font-light">
            Enter your Dewaan Order ID to inspect live courier telemetry, kitchen dum pukht progress, and sealed handi thermal safety.
          </p>

          <form onSubmit={handleLookup} className="max-w-md mx-auto flex flex-col sm:flex-row gap-2.5 mb-6">
            <input
              type="text"
              value={lookupId}
              onChange={(e) => setLookupId(e.target.value)}
              placeholder="Enter Order ID (e.g. DW-1234)"
              className="flex-1 px-4 py-3 bg-[#171922] border border-white/[0.08] rounded-full text-xs text-white placeholder-[#6b6e79] focus:outline-none focus:border-[#dfba6c] transition-all"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-[#dfba6c] hover:bg-[#ebd8ab] active:scale-95 text-[#090a0d] font-semibold text-xs rounded-full transition-all shadow-md shadow-[#dfba6c]/15"
            >
              Track Order
            </button>
          </form>

          {lookupError && (
            <div className="max-w-md mx-auto mb-6 p-3 bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs rounded-2xl flex items-center gap-2 text-left">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{lookupError}</span>
            </div>
          )}

          <div className="pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-center gap-3 text-xs text-[#8c8e96]">
            <span>Haven&apos;t placed an order yet?</span>
            <button
              onClick={onBackToMenu}
              className="px-4 py-2 bg-white/[0.04] text-[#ebd8ab] hover:bg-white/[0.08] rounded-full border border-white/[0.08] font-medium transition-colors"
            >
              Browse Cuisine Menu & Order
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Handle stage advances
  const handleAdvanceStage = (order: Order, targetStage?: OrderStatus) => {
    const stageFlow: OrderStatus[] = [
      'confirmed',
      'kitchen_dum',
      'packing_check',
      'out_for_delivery',
      'delivered',
    ];

    const currentIndex = stageFlow.indexOf(order.status);
    const nextStage = targetStage || (currentIndex < stageFlow.length - 1 ? stageFlow[currentIndex + 1] : 'delivered');

    const updatedMilestones = order.milestones.map((m) => {
      const stageIdx = stageFlow.indexOf(m.stage);
      const targetIdx = stageFlow.indexOf(nextStage);
      return {
        ...m,
        completed: stageIdx < targetIdx || nextStage === 'delivered',
        active: stageIdx === targetIdx && nextStage !== 'delivered',
      };
    });

    const progressMap: Record<OrderStatus, number> = {
      confirmed: 15,
      kitchen_dum: 40,
      packing_check: 65,
      out_for_delivery: 85,
      delivered: 100,
    };

    const updatedDriver = order.driver
      ? {
          ...order.driver,
          progressPercent: progressMap[nextStage],
        }
      : undefined;

    const updatedOrder: Order = {
      ...order,
      status: nextStage,
      driver: updatedDriver,
      milestones: updatedMilestones,
    };

    onUpdateOrder(updatedOrder);
  };

  // Chat send message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = {
      sender: 'customer' as const,
      text: chatInput.trim(),
      time: 'Just now',
    };

    const newMessages = [...currentOrder.chatMessages, userMsg];
    setChatInput('');

    onUpdateOrder({
      ...currentOrder,
      chatMessages: newMessages,
    });

    setTimeout(() => {
      const replies = [
        'Assalam-o-Alaikum! Understood, I will ensure the seal remains intact.',
        'Noted! I am arriving near your avenue shortly. Tracking via royal GPS.',
        'Ji bilkul, your order is secured in our thermal insulated hot box.',
        'Thank you! I will follow your instructions upon arrival.',
      ];
      const randomReply = replies[Math.floor(Math.random() * replies.length)];
      const driverMsg = {
        sender: 'driver' as const,
        text: randomReply,
        time: 'Just now',
      };
      onUpdateOrder({
        ...currentOrder,
        chatMessages: [...newMessages, driverMsg],
      });
    }, 1200);
  };

  // Format countdown
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeDisplay = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  return (
    <div className="py-10 sm:py-16 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Modern Top Banner with Navigation and Lookup */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-6 mb-8">
        <div>
          <button
            onClick={onBackToMenu}
            className="text-xs text-[#a9803e] hover:text-[#dfba6c] mb-1.5 focus:outline-none flex items-center gap-1 font-medium transition-colors"
          >
            ← Back to Cuisine Menu
          </button>
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-3xl font-medium text-white">
              Live Delivery Telemetry
            </h1>
            <span className="font-mono text-xs px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.1] text-[#ebd8ab]">
              {currentOrder.id}
            </span>
          </div>
        </div>

        {/* Order ID Search & switcher */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <form onSubmit={handleLookup} className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              value={lookupId}
              onChange={(e) => setLookupId(e.target.value)}
              placeholder="Track Order ID (e.g. DW-1234)"
              className="px-3.5 py-2 bg-[#14161f] border border-white/[0.08] rounded-full text-xs text-[#f1f2f5] placeholder-[#6b6e79] focus:outline-none focus:border-[#dfba6c] w-full sm:w-48 transition-all"
            />
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold bg-white/[0.06] text-[#ebd8ab] hover:bg-white/[0.12] rounded-full whitespace-nowrap transition-colors"
            >
              Track
            </button>
          </form>
        </div>
      </div>

      {lookupError && (
        <div className="mb-6 p-3 bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs rounded-2xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{lookupError}</span>
        </div>
      )}

      {/* Main Grid: Live Vector Map & Milestones (Left), Order Details & Courier (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Interactive Map & Live Milestones (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Real-time Status Card */}
          <div className="p-6 sm:p-7 bg-[#12141a] border border-white/[0.08] rounded-3xl shadow-xl">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <span className="text-[10px] font-mono tracking-wider uppercase text-[#dfba6c] block mb-1">
                  Active Dispatch Phase
                </span>
                <h2 className="font-serif text-2xl text-white font-medium">
                  {currentOrder.status === 'confirmed' && 'Royal Order Confirmed'}
                  {currentOrder.status === 'kitchen_dum' && 'Dum Handi & Charcoal Cooking'}
                  {currentOrder.status === 'packing_check' && 'Quality & Thermal Aroma Seal'}
                  {currentOrder.status === 'out_for_delivery' && 'Dispatched & En Route'}
                  {currentOrder.status === 'delivered' && 'Order Delivered to Doorstep'}
                </h2>
                <p className="text-xs text-[#9c9ea6] mt-1 font-light">
                  Delivering to: {currentOrder.customer.address}
                </p>
              </div>

              {/* Live Countdown Timer */}
              {currentOrder.status !== 'delivered' ? (
                <div className="text-right p-3.5 bg-[#171a22] border border-white/[0.06] rounded-2xl">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#8c8e96] flex items-center justify-end gap-1 mb-0.5">
                    <Clock className="w-3 h-3 text-emerald-400 animate-pulse" />
                    <span>Est. Arrival</span>
                  </div>
                  <div className="font-mono text-2xl font-bold text-emerald-400 tabular-nums">
                    {timeDisplay}
                  </div>
                  <span className="text-[10px] text-[#8c8e96] font-mono">
                    by {currentOrder.estimatedArrivalTimestamp}
                  </span>
                </div>
              ) : (
                <div className="text-right p-3.5 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl">
                  <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1 justify-end">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Delivered</span>
                  </div>
                  <span className="text-[10px] text-emerald-300">Enjoy your royal feast</span>
                </div>
              )}
            </div>

            {/* Interactive Vector Route Map with Modern Dark Theme */}
            <div className="relative h-64 sm:h-72 w-full bg-[#0a0c10] border border-white/[0.06] rounded-2xl overflow-hidden mb-4 shadow-inner">
              <svg className="w-full h-full" viewBox="0 0 600 300" preserveAspectRatio="none">
                <defs>
                  <pattern id="street-grid-modern" width="50" height="50" patternUnits="userSpaceOnUse">
                    <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#161922" strokeWidth="1" />
                  </pattern>
                  <linearGradient id="routeGradModern" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#dfba6c" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>

                <rect width="600" height="300" fill="url(#street-grid-modern)" />

                {/* Major avenues */}
                <path d="M 0,150 L 600,150" stroke="#181c26" strokeWidth="14" />
                <path d="M 180,0 L 180,300" stroke="#181c26" strokeWidth="12" />
                <path d="M 420,0 L 420,300" stroke="#181c26" strokeWidth="12" />
                <path d="M 80,60 L 520,240" stroke="#141822" strokeWidth="8" />

                {/* Center dash */}
                <path d="M 0,150 L 600,150" stroke="#252b3a" strokeWidth="1" strokeDasharray="6,6" />

                {/* Base route */}
                <path
                  d="M 80,80 C 180,80 180,150 300,150 C 420,150 420,220 520,220"
                  fill="none"
                  stroke="#232938"
                  strokeWidth="6"
                  strokeLinecap="round"
                />

                {/* Active progress glowing route */}
                {currentOrder.driver && (
                  <path
                    d="M 80,80 C 180,80 180,150 300,150 C 420,150 420,220 520,220"
                    fill="none"
                    stroke="url(#routeGradModern)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray="600"
                    strokeDashoffset={600 - (currentOrder.driver.progressPercent / 100) * 600}
                    className="transition-all duration-700"
                  />
                )}

                {/* Kitchen Origin Node */}
                <g transform="translate(80, 80)">
                  <circle r="14" fill="#12141a" stroke="#dfba6c" strokeWidth="2.5" />
                  <circle r="5" fill="#dfba6c" />
                </g>

                {/* Destination Node */}
                <g transform="translate(520, 220)">
                  <circle r="14" fill="#12141a" stroke="#10b981" strokeWidth="2.5" />
                  <circle r="5" fill="#10b981" />
                </g>

                {/* Animated Rider Marker position */}
                {currentOrder.driver && (
                  <g
                    transform={`translate(${
                      80 + (currentOrder.driver.progressPercent / 100) * (520 - 80)
                    }, ${
                      currentOrder.driver.progressPercent < 50
                        ? 80 + (currentOrder.driver.progressPercent / 50) * 70
                        : 150 + ((currentOrder.driver.progressPercent - 50) / 50) * 70
                    })`}
                    className="transition-all duration-700"
                  >
                    <circle r="24" fill="#10b981" fillOpacity="0.18">
                      <animate attributeName="r" values="12;28;12" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.8;0.1;0.8" dur="2s" repeatCount="indefinite" />
                    </circle>
                    <circle r="13" fill="#10b981" stroke="#ffffff" strokeWidth="2.5" />
                    <circle r="4" fill="#090a0d" />
                  </g>
                )}
              </svg>

              {/* Overlay Badges on Map */}
              <div className="absolute top-3.5 left-3.5 bg-[#12141a]/90 border border-white/[0.08] backdrop-blur-md px-3 py-1.5 rounded-xl text-[11px] text-[#f1f2f5] shadow-lg">
                <div className="flex items-center gap-1.5 text-[#dfba6c] font-medium">
                  <Flame className="w-3 h-3" />
                  <span>Dewaan Palace Kitchen</span>
                </div>
                <span className="text-[10px] text-[#8c8e96]">Zarghoon Road, Quetta</span>
              </div>

              <div className="absolute bottom-3.5 right-3.5 bg-[#12141a]/90 border border-white/[0.08] backdrop-blur-md px-3 py-1.5 rounded-xl text-[11px] text-[#f1f2f5] text-right shadow-lg">
                <div className="flex items-center justify-end gap-1.5 text-emerald-400 font-medium">
                  <MapPin className="w-3 h-3" />
                  <span>Quetta Destination</span>
                </div>
                <span className="text-[10px] text-[#8c8e96] max-w-[150px] truncate block">
                  {currentOrder.customer.address}
                </span>
              </div>

              {currentOrder.driver && (
                <div className="absolute bottom-3.5 left-3.5 hidden sm:flex items-center gap-2.5 bg-black/85 backdrop-blur-md border border-white/[0.1] px-3.5 py-1.5 rounded-full text-[10px] font-mono text-[#a0a3af] shadow-lg">
                  <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>QUETTA GPS:</span>
                  </span>
                  <span className="text-white font-medium">
                    {gpsTelemetry ? `${gpsTelemetry.currentLat.toFixed(4)}° N, ${gpsTelemetry.currentLng.toFixed(4)}° E` : '30.1872° N, 66.9961° E'}
                  </span>
                  <span aria-hidden="true" className="text-white/20">·</span>
                  <span className="text-[#ebd8ab] truncate max-w-[160px]">
                    {gpsTelemetry?.currentSector || 'Main Zarghoon Road, Quetta'}
                  </span>
                  <span aria-hidden="true" className="text-white/20">·</span>
                  <span className="text-emerald-400 font-semibold">Supabase Connected</span>
                </div>
              )}
            </div>

            {/* Simulation Controller */}
            <div className="pt-3 border-t border-white/[0.06] flex flex-wrap items-center justify-between gap-3 text-xs">
              <span className="text-[#8c8e96] flex items-center gap-1.5 font-light">
                <Navigation className="w-3.5 h-3.5 text-[#dfba6c]" />
                <span>Live GPS Simulator Active</span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAdvanceStage(currentOrder)}
                  disabled={currentOrder.status === 'delivered'}
                  className="px-3 py-1.5 bg-[#181a24] hover:bg-[#202330] disabled:opacity-30 text-[#ebd8ab] rounded-full border border-white/[0.08] flex items-center gap-1.5 text-[11px] font-medium transition-colors"
                  title="Simulate reaching the next delivery milestone"
                >
                  <FastForward className="w-3 h-3 text-[#dfba6c]" />
                  <span>Advance Stage</span>
                </button>

                <button
                  onClick={() => handleAdvanceStage(currentOrder, 'confirmed')}
                  className="px-3 py-1.5 bg-[#181a24] hover:bg-[#202330] text-[#8c8e96] hover:text-white rounded-full border border-white/[0.08] flex items-center gap-1.5 text-[11px] transition-colors"
                  title="Reset order to confirmed stage"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Stage</span>
                </button>
              </div>
            </div>
          </div>

          {/* Timeline Milestones */}
          <div className="p-6 sm:p-7 bg-[#12141a] border border-white/[0.08] rounded-3xl shadow-xl">
            <h3 className="text-xs font-mono uppercase tracking-widest text-[#dfba6c] mb-6">
              Culinary & Delivery Progress Milestones
            </h3>

            <div className="space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/[0.08]">
              {currentOrder.milestones.map((milestone, idx) => {
                return (
                  <div key={idx} className="relative flex items-start gap-4">
                    <div
                      className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                        milestone.completed
                          ? 'bg-emerald-500 border-emerald-400 text-black shadow-md shadow-emerald-500/20'
                          : milestone.active
                          ? 'bg-[#dfba6c] border-[#ebd8ab] text-black animate-pulse shadow-md shadow-[#dfba6c]/20'
                          : 'bg-[#181a24] border-white/[0.1] text-[#555863]'
                      }`}
                    >
                      {milestone.completed ? (
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-current" />
                      )}
                    </div>

                    <div className="flex-1 pt-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-sm font-medium ${
                            milestone.active
                              ? 'text-[#ebd8ab]'
                              : milestone.completed
                              ? 'text-white'
                              : 'text-[#6e717b]'
                          }`}
                        >
                          {milestone.title}
                        </span>
                        <span className="text-[11px] font-mono tabular-nums text-[#8c8e96]">
                          {milestone.timestamp}
                        </span>
                      </div>
                      <p className="text-xs text-[#8c8e96] mt-0.5 font-light">
                        {milestone.subtitle}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Column: Courier Card & Itemized Receipt (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Driver Contact & Profile Card */}
          {currentOrder.driver && (
            <div className="p-6 bg-[#12141a] border border-white/[0.08] rounded-3xl shadow-xl">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#dfba6c] block mb-3">
                Assigned Royal Courier
              </span>

              <div className="flex items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#dfba6c] to-[#99732b] flex items-center justify-center font-serif text-lg font-bold text-[#090a0d] shadow-md shadow-[#dfba6c]/10">
                    {currentOrder.driver.avatarText}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">
                      {currentOrder.driver.name}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-[#8c8e96] mt-0.5">
                      <span className="text-[#dfba6c] font-semibold">★ {currentOrder.driver.rating}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{currentOrder.driver.tripsCount} deliveries</span>
                    </div>
                    <span className="text-[11px] text-[#71747d] block font-light">
                      {currentOrder.driver.vehicle}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                    Thermal Insulated
                  </span>
                </div>
              </div>

              {/* Action Buttons for courier */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setCallState('calling');
                    setCallModalOpen(true);
                  }}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 bg-[#181a24] hover:bg-[#202330] border border-white/[0.08] rounded-2xl text-xs font-medium text-[#f1f2f5] transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Call Courier</span>
                </button>

                <button
                  type="button"
                  onClick={() => setChatOpen(true)}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 bg-[#dfba6c] hover:bg-[#ebd8ab] active:scale-95 rounded-2xl text-xs font-semibold text-[#090a0d] transition-all shadow-md shadow-[#dfba6c]/15"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Direct Chat</span>
                  {currentOrder.chatMessages.length > 0 && (
                    <span className="w-4 h-4 bg-[#090a0d] text-[#dfba6c] rounded-full text-[10px] flex items-center justify-center font-bold">
                      {currentOrder.chatMessages.length}
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Itemized Order Receipt & Customization Breakdown */}
          <div className="p-6 bg-[#12141a] border border-white/[0.08] rounded-3xl shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <span className="text-xs font-mono uppercase tracking-widest text-[#dfba6c]">
                Customized Order Receipt
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedOrder({
                      customer_name: currentOrder.customer.fullName || 'Royal Patron',
                      phone: currentOrder.customer.phone || '+92...',
                      total: currentOrder.total,
                      items: (
                        <div className="space-y-1">
                          {currentOrder.items.map((it, idx) => (
                            <div key={idx} className="flex justify-between items-center text-xs">
                              <span>{it.quantity}x {it.menuItem.name}</span>
                              <span className="font-mono">Rs. {it.totalPrice}</span>
                            </div>
                          ))}
                        </div>
                      ),
                    });
                  }}
                  className="px-2.5 py-1 rounded-full bg-[#dfba6c] hover:bg-[#ebd8ab] text-[#090a0d] text-[10px] font-bold transition-all shadow-sm cursor-pointer"
                >
                  Print Receipt
                </button>
                <span className="text-xs font-mono tabular-nums text-[#8c8e96]">
                  {currentOrder.items.length} {currentOrder.items.length === 1 ? 'item' : 'items'}
                </span>
              </div>
            </div>

            {/* Items list */}
            <div className="divide-y divide-white/[0.06] max-h-72 overflow-y-auto pr-1">
              {currentOrder.items.map((cartItem, idx) => (
                <div key={idx} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-[#dfba6c] font-semibold">
                        {cartItem.quantity}x
                      </span>
                      <span className="text-sm font-medium text-white">
                        {cartItem.menuItem.name}
                      </span>
                    </div>
                    <span className="font-mono text-xs text-[#dfba6c] tabular-nums font-semibold">
                      {formatPKR(cartItem.totalPrice)}
                    </span>
                  </div>

                  <div className="mt-1 pl-5 text-[11px] text-[#8c8e96] space-y-0.5 font-light">
                    <div>Portion: {cartItem.customization.portion.name}</div>
                    <div>Spice: <span className="capitalize text-[#dfba6c]">{cartItem.customization.spiceLevel.replace('_', ' ')}</span></div>
                    {cartItem.customization.protein && (
                      <div>Protein: {cartItem.customization.protein.name}</div>
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
                        Note: &quot;{cartItem.customization.specialInstructions}&quot;
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Financial Breakdown */}
            <div className="pt-3 border-t border-white/[0.06] space-y-1.5 text-xs text-[#8c8e96]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-mono tabular-nums text-white">{formatPKR(currentOrder.subtotal)}</span>
              </div>

              {currentOrder.discount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Royal Promo ({currentOrder.promoCode})</span>
                  <span className="font-mono tabular-nums">-{formatPKR(currentOrder.discount)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Thermal Delivery Fee</span>
                <span className="font-mono tabular-nums text-white">
                  {currentOrder.deliveryFee === 0 ? 'FREE' : formatPKR(currentOrder.deliveryFee)}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Handi Packaging & Aroma Lock</span>
                <span className="font-mono tabular-nums text-white">{formatPKR(currentOrder.packagingFee)}</span>
              </div>

              <div className="flex justify-between">
                <span>Courier Tip</span>
                <span className="font-mono tabular-nums text-white">{formatPKR(currentOrder.tip)}</span>
              </div>

              <div className="flex justify-between pt-2 border-t border-white/[0.08] text-sm font-semibold text-white">
                <span className="font-serif text-base">Total Paid</span>
                <span className="font-mono tabular-nums text-[#dfba6c] text-lg font-bold">
                  {formatPKR(currentOrder.total)}
                </span>
              </div>
            </div>

            {/* Customer Delivery Details */}
            <div className="pt-3 border-t border-white/[0.06] text-xs text-[#8c8e96] space-y-1 font-light">
              <div className="text-white font-medium">{currentOrder.customer.fullName}</div>
              <div>{currentOrder.customer.phone}</div>
              <div>{currentOrder.customer.address}</div>
              {currentOrder.customer.deliveryNotes && (
                <div className="text-[#a4a6ae] italic mt-1">
                  Note: {currentOrder.customer.deliveryNotes}
                </div>
              )}
            </div>

          </div>

        </div>

      </div>

      {/* Interactive Courier Chat Drawer */}
      {chatOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-[#111319] border-l border-white/[0.08] shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
          <div className="p-4 sm:p-5 bg-[#161822] border-b border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#dfba6c] to-[#99732b] text-[#090a0d] font-serif font-bold flex items-center justify-center">
                AD
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Allah Dad</h4>
                <span className="text-[11px] text-emerald-400 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>En Route on Cargo Bike · +923118427913</span>
                </span>
              </div>
            </div>
            <button
              onClick={() => setChatOpen(false)}
              className="p-1.5 text-[#8c8e96] hover:text-white rounded-full focus:outline-none"
              aria-label="Close chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
            {currentOrder.chatMessages.map((msg, i) => (
              <div
                key={i}
                className={`flex flex-col ${
                  msg.sender === 'customer' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[85%] p-3.5 rounded-2xl leading-relaxed ${
                    msg.sender === 'customer'
                      ? 'bg-[#dfba6c] text-[#090a0d] font-medium shadow-sm'
                      : 'bg-[#181a24] text-[#e4e5e8] border border-white/[0.08]'
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[10px] text-[#71747d] mt-1 px-1">
                  {msg.sender === 'customer' ? 'You' : msg.sender === 'driver' ? 'Allah Dad (Courier)' : 'Dewaan Kitchen'} · {msg.time}
                </span>
              </div>
            ))}
          </div>

          <div className="p-2 border-t border-white/[0.06] bg-[#14161f] flex items-center gap-1.5 overflow-x-auto scrollbar-none text-[11px]">
            {[
              'Please ring bell twice',
              'Gate code is #4029',
              'Please leave at front door',
              'Is the handi still warm?',
            ].map((preset, idx) => (
              <button
                key={idx}
                onClick={() => setChatInput(preset)}
                className="whitespace-nowrap px-3 py-1.5 bg-[#1b1e2a] text-[#8c8e96] hover:text-white rounded-full border border-white/[0.06] transition-colors"
              >
                {preset}
              </button>
            ))}
          </div>

          <form onSubmit={handleSendMessage} className="p-3 bg-[#161822] border-t border-white/[0.08] flex items-center gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Message Allah Dad..."
              className="flex-1 px-4 py-2.5 bg-[#111319] border border-white/[0.08] rounded-full text-xs text-white placeholder-[#71747d] focus:outline-none focus:border-[#dfba6c]"
            />
            <button
              type="submit"
              disabled={!chatInput.trim()}
              className="p-2.5 bg-[#dfba6c] text-[#090a0d] rounded-full disabled:opacity-40 hover:bg-[#ebd8ab] transition-colors shadow-sm"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Simulated Phone Call Modal */}
      {callModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-sm bg-[#12141a] border border-white/[0.1] rounded-3xl p-7 text-center shadow-2xl">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#dfba6c] to-[#99732b] text-[#090a0d] mx-auto flex items-center justify-center text-2xl font-serif font-bold mb-4 shadow-lg shadow-[#dfba6c]/20">
              AD
            </div>
            <h4 className="text-xl font-serif font-medium text-white mb-1">
              Allah Dad
            </h4>
            <p className="text-xs text-[#8c8e96] mb-3 font-light">
              Dewaan Royal Courier
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.1] text-xs font-mono text-[#ebd8ab] mb-6">
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span>+923118427913</span>
            </div>

            {callState === 'calling' && (
              <div className="mb-8">
                <div className="inline-flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/60 px-4 py-1.5 rounded-full border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Connecting to Allah Dad...</span>
                </div>
              </div>
            )}

            {callState === 'connected' && (
              <div className="mb-8 p-4 bg-[#181a24] rounded-2xl text-xs text-[#ebd8ab] leading-relaxed border border-white/[0.08]">
                &quot;Assalam-o-Alaikum! Allah Dad here. I am about 8 minutes away with your Awadhi handis in the heated carrier box. See you shortly!&quot;
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-center gap-3">
                {callState === 'calling' && (
                  <button
                    onClick={() => setCallState('connected')}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-full shadow-md transition-all"
                  >
                    Answer (Simulate)
                  </button>
                )}
                <button
                  onClick={() => setCallModalOpen(false)}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-full shadow-md transition-all"
                >
                  End Call
                </button>
              </div>

              <a
                href="tel:+923118427913"
                className="inline-flex items-center justify-center gap-2 py-2 px-4 rounded-full bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/40 text-emerald-400 text-xs font-mono transition-colors"
              >
                <Phone className="w-3 h-3" />
                <span>Direct Dial Phone (+923118427913)</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Thermal Print Receipt Modal requested by User */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/80 z-[10000] flex items-center justify-center p-4">
          <div id="print-receipt" className="bg-white text-black w-full max-w-[350px] p-6 rounded-xl shadow-2xl">
            <div className="text-center border-b-2 border-dashed pb-4 mb-4">
              <h1 className="font-black text-xl tracking-wider">DEWAAN</h1>
              <p className="text-xs font-medium tracking-wide">ROYAL AWADHI CUISINE</p>
              <p className="text-[10px] text-gray-600 mt-2">Quetta, Balochistan</p>
            </div>

            <div className="text-sm space-y-2">
              <p><b>Customer:</b> {selectedOrder.customer_name || 'Royal Patron'}</p>
              <p><b>Phone:</b> {selectedOrder.phone || '+92...'}</p>
              <p><b>Date:</b> {new Date().toLocaleString()}</p>
            </div>

            <div className="border-t border-b border-dashed my-4 py-3 text-sm">
              {selectedOrder.items}
              <div className="flex justify-between font-bold text-base mt-3 pt-2 border-t border-dashed">
                <span>Total</span>
                <span>Rs. {selectedOrder.total}</span>
              </div>
            </div>

            <p className="text-center text-[10px] font-medium text-gray-600">Thank You For Your Order!</p>

            <div className="flex gap-2 mt-6 no-print">
              <button
                onClick={() => {
                  const content = document.getElementById('print-receipt');
                  if (!content) return;
                  try {
                    const printWindow = window.open('', '_blank', 'height=600,width=800');
                    if (printWindow) {
                      printWindow.document.write('<html><head><title>DEWAAN Receipt</title>');
                      printWindow.document.write('<style>body{font-family:sans-serif; padding:20px;} .no-print{display:none;}</style>');
                      printWindow.document.write('</head><body>');
                      printWindow.document.write(content.innerHTML);
                      printWindow.document.write('</body></html>');
                      printWindow.document.close();
                      printWindow.focus();
                      printWindow.print();
                      return;
                    }
                  } catch {
                    // Popup blocked or restricted
                  }
                  window.print();
                }}
                className="flex-1 bg-black text-white py-2.5 rounded-full font-bold cursor-pointer hover:bg-gray-800 transition-colors"
              >
                Print کریں
              </button>
              <button
                onClick={() => setSelectedOrder(null)}
                className="flex-1 bg-gray-200 text-black py-2.5 rounded-full font-bold cursor-pointer hover:bg-gray-300 transition-colors"
              >
                بند کریں
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
