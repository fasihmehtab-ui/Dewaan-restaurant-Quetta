import React, { useState } from 'react';
import { X, Calendar, Clock, Users, CheckCircle2, Sparkles, Database } from 'lucide-react';
import { saveReservationToSupabase } from '../utils/supabaseService';

interface TableReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TableReservationModal: React.FC<TableReservationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [guestCount, setGuestCount] = useState(4);
  const [date, setDate] = useState('2026-10-04');
  const [timeSlot, setTimeSlot] = useState('19:30');
  const [seatingArea, setSeatingArea] = useState<'courtyard' | 'diwan' | 'family'>('diwan');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [notes, setNotes] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
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

    setIsSuccess(true);

    // Save reservation to Supabase backend table (Project: khbmtvotbiztxadqhnaw)
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

    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#111319] border border-white/[0.1] rounded-3xl shadow-2xl p-6 sm:p-8 overflow-hidden">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-[#8c8e96] hover:text-white rounded-full bg-white/[0.04] focus:outline-none transition-colors"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {isSuccess ? (
          <div className="py-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 shadow-lg">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="font-serif text-2xl text-white font-medium">
              Royal Table Confirmed
            </h3>
            <p className="text-xs text-[#a4a6ae] max-w-sm mx-auto leading-relaxed font-light">
              Assalam-o-Alaikum, {name || 'Honored Guest'}. Your reservation for {guestCount} guests in the{' '}
              <span className="text-[#ebd8ab] capitalize">{seatingArea} Lounge</span> on {date} at{' '}
              {timeSlot} has been secured. A confirmation SMS has been dispatched.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] font-mono tracking-wider uppercase text-[#dfba6c] mb-2">
                <Sparkles className="w-3 h-3" />
                <span>Palace Dining</span>
              </div>
              <h3 className="font-serif text-2xl font-medium text-white">
                Reserve Your Royal Table
              </h3>
              <p className="text-[#8c8e96] mt-1 font-light">
                Experience candlelit authentic Awadhi and Mughlai hospitality.
              </p>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-[10px] text-[#ebd8ab] uppercase tracking-wider mb-1 font-mono">
                  Date
                </label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-[#727581] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="date"
                    required
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
                    <option value="17:30">5:30 PM (Early Dinner)</option>
                    <option value="18:30">6:30 PM</option>
                    <option value="19:30">7:30 PM (Prime Royal)</option>
                    <option value="20:30">8:30 PM</option>
                    <option value="21:30">9:30 PM (Late Banquet)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Guests & Seating Preference */}
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
                    {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
                      <option key={n} value={n}>
                        {n} {n === 1 ? 'Guest' : 'Guests'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] text-[#ebd8ab] uppercase tracking-wider mb-1 font-mono">
                  Ambience Setting
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

            {/* Contact details */}
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
                  Phone Number (Required) *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (phoneError) setPhoneError('');
                  }}
                  placeholder="e.g. +923118427913 *"
                  className={`w-full px-4 py-2.5 bg-[#171922] border rounded-xl text-white focus:outline-none transition-colors ${
                    phoneError ? 'border-rose-500 focus:border-rose-400 bg-rose-950/20' : 'border-white/[0.08] focus:border-[#dfba6c]'
                  }`}
                />
              </div>
            </div>

            {phoneError && (
              <div className="p-3 bg-rose-950/50 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <span>{phoneError}</span>
              </div>
            )}

            {/* Special Requests */}
            <div>
              <label className="block text-[10px] text-[#ebd8ab] uppercase tracking-wider mb-1 font-mono">
                Special Occasion or Dietary Note
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Anniversary dinner, quiet booth preferred"
                className="w-full px-4 py-2.5 bg-[#171922] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-[#dfba6c]"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-[#e9c878] via-[#dfba6c] to-[#c59d5f] hover:brightness-110 active:scale-98 text-[#090a0d] font-semibold text-xs rounded-full shadow-md shadow-[#dfba6c]/15 transition-all"
              >
                Confirm Royal Reservation
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
