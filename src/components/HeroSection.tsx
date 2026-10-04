import React from 'react';
import { ArrowRight, Flame, ShieldCheck, Clock, MapPin, Sparkles } from 'lucide-react';
import heroBiryaniImg from '../assets/images/dewaan_hero_handi_biryani_1791045111743.jpg';

interface HeroSectionProps {
  onExploreMenu: () => void;
  onTrackOrder: () => void;
  hasActiveDelivery: boolean;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onExploreMenu,
  onTrackOrder,
  hasActiveDelivery,
}) => {
  return (
    <section className="relative overflow-hidden bg-[#090a0d] border-b border-white/[0.08]">
      {/* Background with Ambient Radial Glow and Image Scrim */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#dfba6c]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <img
          src={heroBiryaniImg}
          alt="Dewaan Royal Awadhi Handi Biryani with Saffron and Spices"
          className="w-full h-full object-cover object-center opacity-25 filter brightness-90 contrast-110 transform scale-105 transition-transform duration-1000"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#090a0d] via-[#090a0d]/90 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#090a0d] via-transparent to-black/60" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-32">
        <div className="max-w-2xl">
          
          {/* Modern eyebrow badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.1] backdrop-blur-md text-xs font-medium text-[#ebd8ab] mb-6">
            <Sparkles className="w-3.5 h-3.5 text-[#dfba6c]" />
            <span>Michelin-Honored Awadhi & Mughlai Gastronomy</span>
          </div>

          <h1 className="font-serif text-4xl sm:text-6xl font-medium tracking-tight text-white leading-[1.1] mb-6 [text-wrap:balance]">
            Slow-Cooked Dum Handis, Delivered Hot to Your Doorstep.
          </h1>

          <p className="text-base sm:text-lg text-[#a6a9b6] leading-relaxed mb-10 max-w-xl font-light">
            Indulge in 200-year-old royal recipes simmered under dough seals with 32 hand-ground spices, 
            tender bone-in goat shanks, and Kashmiri saffron. Customized to your exact heat preference.
          </p>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center gap-4 mb-14">
            <button
              onClick={onExploreMenu}
              className="inline-flex items-center gap-2 px-7 py-3.5 text-sm font-semibold text-[#090a0d] bg-gradient-to-r from-[#e9c878] via-[#dfba6c] to-[#c59d5f] hover:brightness-110 active:scale-98 rounded-full transition-all shadow-lg shadow-[#dfba6c]/20 group focus:outline-none"
            >
              <span>Explore Cuisine Menu</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={onTrackOrder}
              className="inline-flex items-center gap-2.5 px-6 py-3.5 text-sm font-medium text-[#f1f2f5] bg-[#14161f]/80 hover:bg-[#1a1d28] border border-white/[0.1] rounded-full backdrop-blur-md transition-all focus:outline-none"
            >
              <Clock className="w-4 h-4 text-[#dfba6c]" />
              <span>{hasActiveDelivery ? 'Track Active Delivery' : 'Live Delivery Tracker'}</span>
            </button>
          </div>

          {/* Modern Bento Metric Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-md">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#f1f2f5] mb-1">
                <Flame className="w-4 h-4 text-[#dfba6c]" />
                <span>Dum Pukht Technique</span>
              </div>
              <p className="text-xs text-[#8c8f9b] leading-relaxed font-light">
                Slow-braised inside sealed earthen & copper vessels.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-md">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#f1f2f5] mb-1">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>100% Certified Halal</span>
              </div>
              <p className="text-xs text-[#8c8f9b] leading-relaxed font-light">
                Hand-cut cuts with zero artificial flavorings or MSG.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-md">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#f1f2f5] mb-1">
                <MapPin className="w-4 h-4 text-[#dfba6c]" />
                <span>Thermal Handi GPS</span>
              </div>
              <p className="text-xs text-[#8c8f9b] leading-relaxed font-light">
                Real-time temperature check & live courier telemetry.
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
