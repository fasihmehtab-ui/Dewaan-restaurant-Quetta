import React from 'react';
import { MapPin, Phone, Mail, Clock, ShieldCheck, Sparkles, Shield, Lock } from 'lucide-react';

interface FooterProps {
  onNavClick: (tab: 'menu' | 'track' | 'heritage' | 'reserve') => void;
  onOpenSupabaseModal?: () => void;
  onOpenAdminPortal: () => void;
}

export const Footer: React.FC<FooterProps> = ({ 
  onNavClick, 
  onOpenSupabaseModal,
  onOpenAdminPortal
}) => {
  return (
    <footer className="bg-[#07080b] border-t border-white/[0.08] text-xs text-[#8c8e96]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-14">
          
          {/* Col 1: Brand & Certification */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#dfba6c] to-[#99732b] flex items-center justify-center text-[#090a0d] font-serif font-bold text-lg shadow-sm">
                D
              </div>
              <span className="font-serif text-2xl font-bold tracking-wider gold-gradient-text">
                DEWAAN
              </span>
            </div>
            <p className="text-xs text-[#7c808f] leading-relaxed font-light">
              Purveyors of authentic Awadhi dum pukht and royal banquet cuisine.
              Slow-cooked in sealed copper handis and delivered with GPS-tracked thermal integrity.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-[11px] text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Strictly 100% Certified Hand-Cut Halal</span>
            </div>
          </div>

          {/* Col 2: Navigation */}
          <div className="space-y-3">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#dfba6c] block mb-4">
              Navigation
            </span>
            <ul className="space-y-2.5 text-xs">
              <li>
                <button
                  onClick={() => onNavClick('menu')}
                  className="hover:text-white transition-colors"
                >
                  Cuisine Menu
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavClick('track')}
                  className="hover:text-white transition-colors"
                >
                  Live Delivery Tracker
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavClick('heritage')}
                  className="hover:text-white transition-colors"
                >
                  Culinary Heritage & Dum Pukht
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavClick('reserve')}
                  className="hover:text-white transition-colors"
                >
                  Dine-In Table Reservations
                </button>
              </li>
              <li className="pt-1.5 border-t border-white/[0.06]">
                <button
                  onClick={onOpenAdminPortal}
                  className="inline-flex items-center gap-1.5 text-[#dfba6c] hover:text-[#ebd8ab] transition-colors font-medium"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Admin Sign-Up / Login</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Hours & Dining */}
          <div className="space-y-3">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#dfba6c] block mb-4">
              Hours of Hospitality
            </span>
            <div className="space-y-1.5 text-xs font-light">
              <div className="flex justify-between">
                <span>Monday – Thursday:</span>
                <span className="text-white font-mono">12:00 PM – 10:30 PM</span>
              </div>
              <div className="flex justify-between">
                <span>Friday – Saturday:</span>
                <span className="text-white font-mono">12:00 PM – 11:30 PM</span>
              </div>
              <div className="flex justify-between">
                <span>Sunday:</span>
                <span className="text-white font-mono">1:00 PM – 10:00 PM</span>
              </div>
            </div>
            <div className="pt-2 text-[11px] text-[#71747e] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#dfba6c]" />
              <span>Delivery Orders: 12:00 PM – 11:00 PM</span>
            </div>
          </div>

          {/* Col 4: Location & Contact */}
          <div className="space-y-3">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#dfba6c] block mb-4">
              Palace Dining
            </span>
            <div className="space-y-2.5 text-xs font-light">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-3.5 h-3.5 text-[#dfba6c] shrink-0 mt-0.5" />
                <span>12-B, Main Zarghoon Road, Near Chaman Phatak, Quetta</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-3.5 h-3.5 text-[#dfba6c] shrink-0" />
                <span>+92 (81) 282-3392 · Courier: +923118427913</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail className="w-3.5 h-3.5 text-[#dfba6c] shrink-0" />
                <span>dastarkhwan@dewaan-dining.com</span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#636674] font-light">
          <div className="flex items-center gap-3">
            <span>© {new Date().getFullYear()} Dewaan Royal Cuisine Ltd.</span>
            <span aria-hidden="true" className="text-white/10">·</span>
            {onOpenSupabaseModal ? (
              <button
                type="button"
                onClick={onOpenSupabaseModal}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/40 hover:bg-emerald-950/70 border border-emerald-500/30 text-emerald-400 font-mono text-[10px] transition-colors cursor-pointer"
                title="Click to view Supabase backend connection & SQL schema"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Supabase Backend: khbmtvotbiztxadqhnaw</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 font-mono text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Supabase Backend: khbmtvotbiztxadqhnaw</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={onOpenAdminPortal}
              className="inline-flex items-center gap-1 text-[#8c8e96] hover:text-[#dfba6c] transition-colors"
            >
              <Lock className="w-3 h-3 text-[#dfba6c]" />
              <span>Admin Portal</span>
            </button>
            <span aria-hidden="true" className="text-white/10">·</span>
            <span>Authentic Awadhi & Mughlai Gastronomy</span>
            <span aria-hidden="true" className="text-white/10">·</span>
            <span>Real-Time GPS Thermal Delivery</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
