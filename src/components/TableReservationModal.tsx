import React, { useState, useEffect } from 'react';
import { 
  X, Calendar, Clock, Users, CheckCircle2, Sparkles, 
  AlertCircle, Timer, ShieldAlert, Phone, RefreshCw, Trash2, ArrowRight
} from 'lucide-react';
import { 
  saveReservationToSupabase, 
  getReservationTiming, 
  syncAndGetLocalReservation, 
  cancelLocalReservation,
  TableReservation 
} from '../utils/supabaseService';

interface TableReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TableReservationModal: React.FC<TableReservationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const getTodayDateString = () => new Date().toISOString().split('T')[0];

  const [guestCount, setGuestCount] = useState(4);
  const [date, setDate] = useState(() => getTodayDateString());
  const [timeSlot, setTimeSlot] = useState('19:30');
  const [seatingArea, setSeatingArea] = useState<'courtyard' | 'diwan' | 'family'>('diwan');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [notes, setNotes] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [confirmedId, setConfirmedId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active / recent reservation stored locally
  const [activeRes, setActiveRes] = useState<TableReservation | null>(() => syncAndGetLocalReservation());
  const [activeTab, setActiveTab] = useState<'status' | 'book'>(() => {
    const res = syncAndGetLocalReservation();
    return res && res.status !== 'cancelled' ? 'status' : 'book';
  });

  // Calculate timing info for selected date & time in the form
  const currentTiming = getReservationTiming(date, timeSlot, 15);

  // Live 1-second interval to update timing, auto-turn off overdue reservations, and update countdown
  const [, setClockTick] = useState(0);
  useEffect(() => {
    if (!isOpen) return;

    // Run initial sync
    const synced = syncAndGetLocalReservation();
    if (synced) setActiveRes(synced);

    const timer = setInterval(() => {
      setClockTick((t) => t + 1);
      const updated = syncAndGetLocalReservation();
      if (updated) {
        setActiveRes(updated);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setPhoneError('');
    const trimmedPhone = phone.trim();
    if (!trimmedPhone) {
      setPhoneError('Customer phone number is strictly required for table confirmation.');
      return;
    }
    const digitsOnly = trimmedPhone.replace(/\D/g, '');
    if (digitsOnly.length < 10) {
      setPhoneError('Please enter a valid mobile number (e.g. +923118427913 or 0300-1234567).');
      return;
    }

    setIsSubmitting(true);
    const timingInfo = getReservationTiming(date, timeSlot, 15);
    const tempId = `RES-${Math.floor(1000 + Math.random() * 9000)}`;

    const reservationPayload: TableReservation = {
      id: tempId,
      fullName: name.trim() || 'Honored Guest',
      phone: trimmedPhone,
      guestCount,
      reservationDate: date,
      timeSlot,
      seatingArea,
      notes: notes.trim() ? notes.trim() : undefined,
      createdAt: new Date().toISOString(),
      status: 'confirmed',
    };

    // Store in localStorage for patron reference
    try {
      localStorage.setItem('dewaan_my_reservation_v1', JSON.stringify(reservationPayload));
      setActiveRes(reservationPayload);
    } catch (err) {
      console.error(err);
    }

    setConfirmedId(tempId);
    setIsSuccess(true);
    setIsSubmitting(false);

    // Save reservation to Supabase backend table
    saveReservationToSupabase({
      fullName: name.trim() || 'Honored Guest',
      phone: trimmedPhone,
      guestCount,
      reservationDate: date,
      timeSlot,
      seatingArea,
      notes: notes.trim() ? notes.trim() : undefined,
    }).catch((err) => {
      console.warn('[Supabase Reservation]', err);
    });
  };

  const handleCancelBooking = () => {
    if (window.confirm('Are you sure you want to cancel your table reservation? The table will be released immediately.')) {
      cancelLocalReservation();
      setActiveRes((prev) => (prev ? { ...prev, status: 'cancelled' } : null));
    }
  };

  const handleClearBooking = () => {
    try {
      localStorage.removeItem('dewaan_my_reservation_v1');
      setActiveRes(null);
      setActiveTab('book');
    } catch (err) {
      console.error(err);
    }
  };

  const activeResTiming = activeRes 
    ? getReservationTiming(activeRes.reservationDate, activeRes.timeSlot, 15)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#111319] border border-white/[0.1] rounded-3xl shadow-2xl p-5 sm:p-7 overflow-hidden max-h-[92vh] flex flex-col">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-[#8c8e96] hover:text-white rounded-full bg-white/[0.04] hover:bg-white/[0.08] focus:outline-none transition-colors z-10 cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="shrink-0 mb-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] font-mono tracking-wider uppercase text-[#dfba6c] mb-1.5">
            <Sparkles className="w-3 h-3" />
            <span>Palace Dining & Table Management</span>
          </div>
          <h3 className="font-serif text-2xl font-medium text-white flex items-center gap-2">
            <span>Dine-In Reservation</span>
            <span className="text-[11px] font-mono font-normal px-2 py-0.5 rounded-full bg-[#dfba6c]/15 text-[#ebd8ab] border border-[#dfba6c]/30">
              15m Auto-Off
            </span>
          </h3>
          <p className="text-[#8c8e96] text-xs font-light mt-0.5">
            Real-time table scheduling with automatic 15-minute arrival grace policy.
          </p>

          {/* Navigation tabs if patron already has an active reservation */}
          {activeRes && !isSuccess && (
            <div className="flex gap-2 mt-3 p-1 rounded-xl bg-[#161822] border border-white/[0.06]">
              <button
                type="button"
                onClick={() => setActiveTab('status')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'status'
                    ? 'bg-[#dfba6c] text-[#090a0d] font-bold shadow'
                    : 'text-[#8c8e96] hover:text-white'
                }`}
              >
                <Timer className="w-3.5 h-3.5" />
                <span>My Table Status ({activeRes.id})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('book')}
                className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'book'
                    ? 'bg-[#dfba6c] text-[#090a0d] font-bold shadow'
                    : 'text-[#8c8e96] hover:text-white'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Book Another Table</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto space-y-4 pr-1 text-xs scrollbar-thin">

          {/* SUCCESS SCREEN */}
          {isSuccess ? (
            <div className="py-4 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 shadow-lg">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold block mb-1">
                  Booking Reference: {confirmedId}
                </span>
                <h4 className="font-serif text-2xl text-white font-medium">
                  Royal Table Confirmed
                </h4>
              </div>

              <div className="p-4 rounded-2xl bg-[#161822] border border-white/[0.08] text-left space-y-2 text-xs">
                <div className="flex justify-between items-center text-[#8c8e96]">
                  <span>Honored Guest:</span>
                  <span className="text-white font-medium">{name || 'Honored Guest'} ({phone})</span>
                </div>
                <div className="flex justify-between items-center text-[#8c8e96]">
                  <span>Party Size & Lounge:</span>
                  <span className="text-[#ebd8ab] capitalize font-medium">{guestCount} Guests · {seatingArea} Lounge</span>
                </div>
                <div className="flex justify-between items-center text-[#8c8e96]">
                  <span>Reserved Date & Time:</span>
                  <span className="text-white font-mono font-medium">{date} at {timeSlot}</span>
                </div>
                
                {/* Highlighted 15-minute grace period policy & cutoff */}
                <div className="mt-3 pt-3 border-t border-amber-500/20 bg-amber-950/30 p-3.5 rounded-xl border border-amber-500/35">
                  <div className="flex items-center gap-2 text-[#dfba6c] font-semibold text-xs mb-1.5">
                    <Timer className="w-4 h-4 animate-pulse shrink-0" />
                    <span>Arrival Policy: Extra 15 Minutes Grace Period</span>
                  </div>
                  <p className="text-[11px] text-[#e0cfab] leading-relaxed">
                    If you cannot arrive exactly on time, an extra 15 minutes of grace is allowed. 
                    Your table is held until <strong className="text-white font-mono font-bold">{currentTiming.formattedCutoffTime}</strong>.
                    If you do not arrive by this cutoff, the reservation <strong className="text-rose-400">automatically turns OFF</strong> and the table is released.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsSuccess(false);
                    setActiveTab('status');
                  }}
                  className="flex-1 py-3 bg-[#dfba6c] hover:bg-[#ebd8ab] text-[#090a0d] font-bold text-xs rounded-full shadow-md transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Timer className="w-4 h-4" />
                  <span>View Live Table Status & Timer</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="py-3 px-5 bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs rounded-full transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

          ) : activeTab === 'status' && activeRes && activeResTiming ? (

            /* TAB: MY RESERVATION STATUS & LIVE COUNTDOWN */
            <div className="space-y-4">
              
              {/* STATUS CARD */}
              <div className="p-4 rounded-2xl bg-[#161822] border border-white/[0.08] space-y-3">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
                  <div>
                    <span className="text-[10px] font-mono text-[#8c8e96] uppercase tracking-wider block">
                      Booking Reference
                    </span>
                    <span className="text-sm font-mono font-bold text-white">
                      {activeRes.id}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-[#8c8e96] uppercase tracking-wider block">
                      Table / Ambience
                    </span>
                    <span className="text-xs font-medium text-[#dfba6c] capitalize">
                      {activeRes.guestCount} Guests · {activeRes.seatingArea}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                    <span className="text-[10px] font-mono text-[#8c8e96] block mb-0.5">Reserved Time</span>
                    <div className="text-white font-mono font-bold">
                      {activeRes.reservationDate} @ {activeRes.timeSlot}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                    <span className="text-[10px] font-mono text-[#8c8e96] block mb-0.5">+15m Auto-Off Cutoff</span>
                    <div className="text-[#dfba6c] font-mono font-bold">
                      {activeResTiming.formattedCutoffTime}
                    </div>
                  </div>
                </div>

                {/* LIVE STATE CALLOUTS */}
                {activeRes.status === 'arrived' ? (
                  <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 space-y-1">
                    <div className="flex items-center gap-2 font-bold text-xs text-emerald-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Arrived & Seated</span>
                    </div>
                    <p className="text-[11px] text-emerald-300/80 leading-relaxed">
                      You have checked in at the restaurant. Your royal table has been honored and seated.
                    </p>
                  </div>

                ) : activeRes.status === 'cancelled' ? (
                  <div className="p-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[#8c8e96] space-y-1">
                    <div className="flex items-center gap-2 font-bold text-xs text-[#ebd8ab]">
                      <X className="w-4 h-4 text-rose-400" />
                      <span>Reservation Cancelled</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      This table reservation was cancelled and the table was released.
                    </p>
                  </div>

                ) : activeResTiming.isOverdue ? (
                  /* OVERDUE PAST 15 MINUTES - AUTOMATICALLY OFF */
                  <div className="p-4 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-200 space-y-2 shadow-lg">
                    <div className="flex items-center gap-2 font-bold text-xs text-rose-300">
                      <ShieldAlert className="w-4 h-4 text-rose-400 animate-bounce" />
                      <span>Reservation Automatically Turned OFF</span>
                    </div>
                    <p className="text-[11px] text-rose-200/90 leading-relaxed">
                      Because you could not arrive within the <strong className="text-white">15-minute grace period</strong> (cutoff was <span className="font-mono font-bold underline">{activeResTiming.formattedCutoffTime}</span>), this reservation was <strong>automatically turned OFF</strong> and the table has been released to waiting patrons.
                    </p>
                    <div className="text-[10px] font-mono text-rose-300/70 bg-black/30 p-2 rounded-lg flex items-center justify-between">
                      <span>Status: Automatically Closed</span>
                      <span>Overdue by {activeResTiming.minutesOverdue}m</span>
                    </div>
                  </div>

                ) : activeResTiming.isInGracePeriod ? (
                  /* IN 15-MINUTE GRACE PERIOD - LIVE COUNTDOWN TICKING */
                  <div className="p-4 rounded-xl bg-amber-950/70 border border-amber-500/50 text-amber-200 space-y-2.5 shadow-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-xs text-[#dfba6c]">
                        <Timer className="w-4 h-4 animate-pulse text-[#dfba6c]" />
                        <span>15-Minute Grace Window Active!</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-[#ebd8ab] font-mono text-[10px] font-bold">
                        HURRY
                      </span>
                    </div>

                    {/* Big Countdown Timer Display */}
                    <div className="bg-black/40 p-3 rounded-xl border border-amber-500/30 text-center space-y-1">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#dfba6c]">
                        Time Remaining to Arrive Before Auto-Off
                      </span>
                      <div className="text-3xl font-mono font-black text-amber-300 tracking-wider">
                        {activeResTiming.graceCountdownFormatted}
                      </div>
                      <div className="w-full bg-white/[0.1] h-1.5 rounded-full overflow-hidden mt-1.5">
                        <div 
                          className="bg-gradient-to-r from-amber-400 to-rose-400 h-full transition-all duration-1000"
                          style={{ width: `${activeResTiming.gracePercentRemaining}%` }}
                        />
                      </div>
                    </div>

                    <p className="text-[11px] text-[#e0cfab] leading-relaxed">
                      Your reserved time was {activeRes.timeSlot}. Please check in with the host before{' '}
                      <strong className="text-white font-mono">{activeResTiming.formattedCutoffTime}</strong>.{' '}
                      Once the clock reaches zero, the reservation <strong className="text-rose-400">automatically turns OFF</strong>.
                    </p>
                  </div>

                ) : (
                  /* UPCOMING RESERVATION */
                  <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-500/30 text-blue-200 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-xs text-blue-300">
                      <Clock className="w-4 h-4 text-blue-400" />
                      <span>Table Confirmed & Secured</span>
                    </div>
                    <p className="text-[11px] text-blue-200/90 leading-relaxed">
                      Your reservation is scheduled for{' '}
                      <strong className="text-white font-mono">{activeRes.reservationDate} at {activeRes.timeSlot}</strong>.
                      An extra 15-minute arrival grace window applies until{' '}
                      <strong className="text-white font-mono">{activeResTiming.formattedCutoffTime}</strong>.
                    </p>
                    <div className="text-[10px] font-mono text-blue-300/70 bg-black/30 p-2 rounded-lg flex items-center justify-between">
                      <span>Scheduled In:</span>
                      <span>
                        {activeResTiming.minutesUntilScheduled > 60 
                          ? `${Math.floor(activeResTiming.minutesUntilScheduled / 60)}h ${activeResTiming.minutesUntilScheduled % 60}m`
                          : `${activeResTiming.minutesUntilScheduled} minutes`}
                      </span>
                    </div>
                  </div>
                )}

                {/* Customer Contact on Record */}
                <div className="text-[11px] text-[#8c8e96] flex items-center justify-between pt-1">
                  <span>Guest: {activeRes.fullName}</span>
                  <span className="font-mono text-white">{activeRes.phone}</span>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="space-y-2 pt-1">
                {activeRes.status === 'confirmed' && !activeResTiming.isOverdue && (
                  <button
                    type="button"
                    onClick={handleCancelBooking}
                    className="w-full py-2.5 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800/40 rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Release / Cancel Reservation
                  </button>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('book')}
                    className="flex-1 py-2.5 bg-[#dfba6c] hover:bg-[#ebd8ab] text-[#090a0d] font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Book A New Table</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClearBooking}
                    className="py-2.5 px-3 bg-white/[0.04] hover:bg-white/[0.08] text-[#8c8e96] hover:text-white rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1"
                    title="Remove booking from this device"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear</span>
                  </button>
                </div>

                <a
                  href="tel:+923118427913"
                  className="block text-center py-2 text-[11px] text-[#ebd8ab] hover:underline"
                >
                  Running late? Call Restaurant Host (+92 311 8427913)
                </a>
              </div>
            </div>

          ) : (

            /* TAB: BOOK ROYAL TABLE FORM */
            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              
              {/* 15-Minute Policy Callout Banner */}
              <div className="p-3.5 rounded-2xl bg-amber-950/35 border border-amber-500/35 text-[#e0cfab] space-y-1.5 shadow-sm">
                <div className="flex items-center justify-between text-[#dfba6c] font-semibold text-xs">
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 shrink-0 text-[#dfba6c] animate-pulse" />
                    <span>15-Minute Arrival Grace & Auto-Off Rule</span>
                  </div>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-[#ebd8ab]">
                    Automatic
                  </span>
                </div>
                <p className="text-[11px] text-[#e0cfab] leading-relaxed">
                  If you cannot arrive on time, an extra 15 minutes of grace is allowed. 
                  After this extra 15 minutes (<span className="text-white font-mono font-bold">Cutoff: {currentTiming.formattedCutoffTime}</span>), the reservation <strong className="text-rose-400">automatically turns OFF</strong> and the table is released to other guests.
                </p>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-[#ebd8ab] uppercase tracking-wider mb-1 font-mono">
                    Reservation Date
                  </label>
                  <div className="relative">
                    <Calendar className="w-3.5 h-3.5 text-[#727581] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="date"
                      required
                      min={getTodayDateString()}
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-[#171922] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-[#dfba6c]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-[#ebd8ab] uppercase tracking-wider mb-1 font-mono">
                    Time Slot
                  </label>
                  <div className="relative">
                    <Clock className="w-3.5 h-3.5 text-[#727581] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      value={timeSlot}
                      onChange={(e) => setTimeSlot(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-[#171922] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-[#dfba6c]"
                    >
                      <optgroup label="Afternoon & Lunch">
                        <option value="12:30">12:30 PM (Lunch Banquet)</option>
                        <option value="13:30">1:30 PM (Afternoon Lunch)</option>
                        <option value="14:30">2:30 PM (Late Lunch)</option>
                      </optgroup>
                      <optgroup label="Evening & Royal Dinner">
                        <option value="17:30">5:30 PM (Early Dinner)</option>
                        <option value="18:30">6:30 PM (Sunset Dining)</option>
                        <option value="19:30">7:30 PM (Prime Royal)</option>
                        <option value="20:30">8:30 PM (Peak Banquet)</option>
                        <option value="21:30">9:30 PM (Late Night Dining)</option>
                        <option value="22:30">10:30 PM (Closing Dastarkhwan)</option>
                      </optgroup>
                    </select>
                  </div>
                </div>
              </div>

              {/* Dynamic Arrival & Cutoff Preview Indicator */}
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-[#141620] border border-white/[0.06] text-[11px] font-mono">
                <div className="flex items-center gap-1.5 text-[#8c8e96]">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span>Reserved: <strong className="text-white">{timeSlot}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 text-amber-300 justify-end">
                  <Timer className="w-3.5 h-3.5 text-amber-400" />
                  <span>Auto-Off Cutoff: <strong className="text-[#dfba6c]">{currentTiming.formattedCutoffTime}</strong></span>
                </div>
              </div>

              {/* Party Size & Lounge Ambience */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-[#ebd8ab] uppercase tracking-wider mb-1 font-mono">
                    Party Size
                  </label>
                  <div className="relative">
                    <Users className="w-3.5 h-3.5 text-[#727581] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      value={guestCount}
                      onChange={(e) => setGuestCount(Number(e.target.value))}
                      className="w-full pl-9 pr-3 py-2.5 bg-[#171922] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-[#dfba6c]"
                    >
                      {[1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20].map((n) => (
                        <option key={n} value={n}>
                          {n} {n === 1 ? 'Guest' : 'Guests'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-[#ebd8ab] uppercase tracking-wider mb-1 font-mono">
                    Lounge Setting
                  </label>
                  <select
                    value={seatingArea}
                    onChange={(e) => setSeatingArea(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-[#171922] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-[#dfba6c]"
                  >
                    <option value="diwan">Royal Diwan Lounge</option>
                    <option value="courtyard">Open Scented Courtyard</option>
                    <option value="family">Private Family Majlis</option>
                  </select>
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-[#ebd8ab] uppercase tracking-wider mb-1 font-mono">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your Name"
                    className="w-full px-4 py-2.5 bg-[#171922] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-[#dfba6c]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-[#ebd8ab] uppercase tracking-wider mb-1 font-mono">
                    Phone (Required) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (phoneError) setPhoneError('');
                    }}
                    placeholder="e.g. 0311-8427913"
                    className={`w-full px-4 py-2.5 bg-[#171922] border rounded-xl text-white focus:outline-none transition-colors ${
                      phoneError ? 'border-rose-500 focus:border-rose-400 bg-rose-950/20' : 'border-white/[0.08] focus:border-[#dfba6c]'
                    }`}
                  />
                </div>
              </div>

              {phoneError && (
                <div className="p-3 bg-rose-950/50 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{phoneError}</span>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-[10px] text-[#ebd8ab] uppercase tracking-wider mb-1 font-mono">
                  Special Request or Occasion
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Birthday dinner, quiet window table"
                  className="w-full px-4 py-2.5 bg-[#171922] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-[#dfba6c]"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-gradient-to-r from-[#e9c878] via-[#dfba6c] to-[#c59d5f] hover:brightness-110 active:scale-98 text-[#090a0d] font-bold text-xs rounded-full shadow-md shadow-[#dfba6c]/15 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Timer className="w-4 h-4" />
                  <span>Confirm Royal Reservation (+15m Grace Policy)</span>
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
