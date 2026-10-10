"use client";
import React, { useState } from 'react';
import { MessageCircle, Send, MapPin, Phone, User, Utensils, Sparkles, X, CheckCircle2 } from 'lucide-react';

interface CustomOrderFormProps {
  onClose?: () => void;
  isModal?: boolean;
}

export default function CustomOrderForm({ onClose, isModal = false }: CustomOrderFormProps) {
  const [type, setType] = useState('Home Delivery');
  const [submitted, setSubmitted] = useState(false);
  const [lastUrl, setLastUrl] = useState<string | null>(null);

  const handleSubmit = (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get('name') || '';
    const phone = formData.get('phone') || '';
    const address = formData.get('address') || (type === 'Home Delivery' ? '' : 'Dine-In / Takeaway at Restaurant');
    const order = formData.get('order') || '';

    // Message formatted with encoding
    const message = `*New Custom Order - Dewaan Quetta*%0AName: ${encodeURIComponent(String(name))}%0APhone: ${encodeURIComponent(String(phone))}%0AType: ${encodeURIComponent(type)}%0AAddress: ${encodeURIComponent(String(address))}%0AOrder Detail: ${encodeURIComponent(String(order))}`;
    
    // Dewaan Quetta WhatsApp number
    const whatsappUrl = `https://wa.me/923118427913?text=${message}`;
    setLastUrl(whatsappUrl);
    setSubmitted(true);

    try {
      window.open(whatsappUrl, '_blank');
    } catch {
      // In case window.open is blocked by popup blocker
      window.location.href = whatsappUrl;
    }
  };

  return (
    <div className={`relative ${isModal ? 'w-full max-w-lg mx-auto bg-[#12141a] border border-white/10 rounded-3xl p-6 shadow-2xl text-white' : 'w-full bg-[#12141a] border border-white/[0.08] rounded-3xl p-6 sm:p-8 text-white shadow-xl'}`}>
      
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#800000]/30 border border-[#800000]/60 text-rose-300 font-mono text-[10px] uppercase tracking-wider mb-2">
            <Sparkles className="w-3 h-3 text-[#dfba6c]" />
            <span>Dewaan Royal Kitchen · Quetta</span>
          </div>
          <h3 className="font-serif text-2xl font-bold text-white tracking-wide flex items-center gap-2">
            <span>کسٹم آرڈر فارم</span>
            <span className="text-sm font-sans font-normal text-[#a0a3af] hidden sm:inline">| Custom Order</span>
          </h3>
          <p className="text-xs text-[#8c8e96] mt-1 font-light leading-relaxed">
            خاص تقاریب، ہانڈی، دم پخت، یا اپنی مرضی کا آرڈر واٹس ایپ پر براہ راست شیئر کریں
          </p>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#8c8e96] hover:text-white rounded-full bg-white/[0.04] hover:bg-white/[0.08] transition-colors cursor-pointer shrink-0"
            title="بند کریں"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {submitted && lastUrl ? (
        <div className="py-8 text-center space-y-4 animate-in fade-in duration-200">
          <div className="w-16 h-16 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h4 className="font-serif text-xl font-bold text-white">
            شکریہ! آپ کا کسٹم آرڈر تیار ہے
          </h4>
          <p className="text-xs text-[#9c9ea6] max-w-sm mx-auto leading-relaxed">
            اگر واٹس ایپ خود بخود نہیں کھلا، تو نیچے دیے گئے بٹن پر کلک کریں:
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <a
              href={lastUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#25D366] hover:bg-[#20ba59] text-black font-bold text-xs rounded-xl shadow-lg transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              <span>واٹس ایپ پر آرڈر بھیجیں</span>
            </a>
            <button
              type="button"
              onClick={() => setSubmitted(false)}
              className="px-5 py-3 bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium rounded-xl text-white transition-colors"
            >
              نیا آرڈر لکھیں
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          {/* Name Field */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-[#dfba6c] mb-1.5 flex items-center gap-1.5">
              <User className="w-3 h-3 text-[#dfba6c]" />
              <span>آپ کا نام (Full Name)</span>
            </label>
            <input
              name="name"
              required
              placeholder="آپ کا نام"
              className="w-full bg-[#181a24] border border-white/10 rounded-xl p-3 text-sm text-white placeholder-[#71747d] focus:outline-none focus:border-[#dfba6c] transition-colors"
            />
          </div>

          {/* Phone Field */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-[#dfba6c] mb-1.5 flex items-center gap-1.5">
              <Phone className="w-3 h-3 text-[#dfba6c]" />
              <span>فون نمبر (Phone Number)</span>
            </label>
            <input
              name="phone"
              required
              placeholder="فون نمبر 03XX-XXXXXXX"
              className="w-full bg-[#181a24] border border-white/10 rounded-xl p-3 text-sm text-white placeholder-[#71747d] font-mono focus:outline-none focus:border-[#dfba6c] transition-colors"
            />
          </div>

          {/* Order Type Radio Selection */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-[#dfba6c] mb-2 flex items-center gap-1.5">
              <Utensils className="w-3 h-3 text-[#dfba6c]" />
              <span>آرڈر کی نوعیت (Order Type)</span>
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { id: 'Dine-In', label: 'Dine-In', urdu: 'ڈائن ان' },
                { id: 'Takeaway', label: 'Takeaway', urdu: 'ٹیک اوے' },
                { id: 'Home Delivery', label: 'Home Delivery', urdu: 'ہوم ڈیلیوری' },
              ].map((item) => (
                <label
                  key={item.id}
                  className={`flex flex-col items-center justify-center gap-1 p-2.5 rounded-xl border cursor-pointer transition-all text-xs text-center select-none ${
                    type === item.id
                      ? 'bg-[#800000]/40 border-[#dfba6c] text-white font-bold shadow-md shadow-[#800000]/20'
                      : 'bg-[#181a24] border-white/10 text-[#9c9ea6] hover:text-white hover:border-white/20'
                  }`}
                >
                  <input
                    type="radio"
                    name="orderTypeSelection"
                    checked={type === item.id}
                    onChange={() => setType(item.id)}
                    className="sr-only"
                  />
                  <span className="font-semibold">{item.label}</span>
                  <span className="text-[10px] font-urdu text-[#dfba6c]">{item.urdu}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Address (Conditional for Home Delivery) */}
          {type === 'Home Delivery' && (
            <div className="animate-in fade-in duration-200">
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[#dfba6c] mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-[#dfba6c]" />
                <span>مکمل ایڈریس (Delivery Address)</span>
              </label>
              <textarea
                name="address"
                required
                rows={2}
                placeholder="مکمل ایڈریس لکھیں - جناح روڈ، کوئٹہ"
                className="w-full bg-[#181a24] border border-white/10 rounded-xl p-3 text-sm text-white placeholder-[#71747d] focus:outline-none focus:border-[#dfba6c] transition-colors resize-none"
              />
            </div>
          )}

          {/* Custom Order Detail Field */}
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-[#dfba6c] mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#dfba6c]" />
              <span>کسٹم آرڈر کی تفصیل (Order Details)</span>
            </label>
            <textarea
              name="order"
              required
              rows={3}
              placeholder="کسٹم آرڈر کی تفصیل - مثلاً: 2 کلو نمکین دنبہ کڑاہی، کم مرچ، 6 تندوری روٹی، سلاد اور رائتہ"
              className="w-full bg-[#181a24] border border-white/10 rounded-xl p-3 text-sm text-white placeholder-[#71747d] focus:outline-none focus:border-[#dfba6c] transition-colors resize-none"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-[#800000] hover:bg-[#990000] active:scale-[0.99] text-white p-3.5 rounded-xl font-bold text-sm tracking-wide shadow-lg shadow-[#800000]/40 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            <MessageCircle className="w-4 h-4 fill-current text-white" />
            <span>واٹس ایپ پر آرڈر بھیجیں</span>
          </button>

          <p className="text-[11px] text-center text-[#727581] font-mono">
            Dewaan Official WhatsApp: +92 311 8427913 (کوئٹہ)
          </p>
        </form>
      )}

    </div>
  );
}
