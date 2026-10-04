import React from 'react';
import { Flame, ShieldCheck, Sparkles, ArrowRight } from 'lucide-react';
import karahiImg from '../assets/images/dewaan_karahi_curry_1791045143832.jpg';
import kebabsImg from '../assets/images/dewaan_galouti_kebabs_1791045128960.jpg';

interface HeritageSectionProps {
  onReserveTable: () => void;
  onExploreMenu: () => void;
}

export const HeritageSection: React.FC<HeritageSectionProps> = ({
  onReserveTable,
  onExploreMenu,
}) => {
  return (
    <section className="py-20 sm:py-28 bg-[#0b0c10] border-t border-white/[0.08] relative overflow-hidden">
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-[#dfba6c]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        
        {/* Heritage Story Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center mb-24">
          
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] font-mono uppercase tracking-widest text-[#dfba6c]">
              <Sparkles className="w-3 h-3" />
              <span>Awadhi Lineage</span>
            </div>
            
            <h2 className="font-serif text-3xl sm:text-5xl text-white font-medium leading-[1.15] [text-wrap:balance]">
              Dum Pukht: The Ancient Mastery of Royal Steam.
            </h2>

            <p className="text-sm text-[#a4a6ae] leading-relaxed font-light">
              In 1784, the Nawab of Awadh established a cooking philosophy centered around patience:
              food enclosed inside heavy copper handis with wheat dough seals,
              simmered for hours over gentle wood charcoal embers so the natural juices braise
              the meat in its own trapped aromatics.
            </p>

            <p className="text-sm text-[#a4a6ae] leading-relaxed font-light">
              At Dewaan, our Ustads honor this 240-year culinary discipline. Zero meat tenderizers,
              zero cornstarch bases, and no pre-made gravies. Every handi of Biryani, Nihari,
              and Shinwari Karahi is prepared fresh with pure clarified desi ghee and 32 stone-crushed whole spices.
            </p>

            <div className="pt-4 flex flex-wrap gap-4">
              <button
                onClick={onReserveTable}
                className="px-6 py-3.5 bg-gradient-to-r from-[#e9c878] via-[#dfba6c] to-[#c59d5f] hover:brightness-110 active:scale-98 text-[#090a0d] font-semibold text-xs rounded-full transition-all shadow-md shadow-[#dfba6c]/15"
              >
                Reserve a Table
              </button>
              <button
                onClick={onExploreMenu}
                className="px-6 py-3.5 bg-white/[0.04] hover:bg-white/[0.08] text-[#ebd8ab] border border-white/[0.08] font-medium text-xs rounded-full transition-colors"
              >
                Browse Royal Menu
              </button>
            </div>
          </div>

          {/* Visual Bento Showcase */}
          <div className="lg:col-span-6 grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="aspect-[4/3] rounded-3xl overflow-hidden border border-white/[0.08] shadow-lg">
                <img
                  src={karahiImg}
                  alt="Shinwari Karahi sizzling in cast iron wok"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="p-5 bg-[#12141a] border border-white/[0.08] rounded-3xl shadow-md">
                <span className="font-serif text-lg text-[#ebd8ab] font-medium block mb-1">
                  Cast-Iron Karahis
                </span>
                <p className="text-xs text-[#8c8e96] leading-relaxed font-light">
                  High-flame wok reduction with fresh plum tomatoes, wild green chilies, and cracked black pepper.
                </p>
              </div>
            </div>

            <div className="space-y-4 pt-8">
              <div className="p-5 bg-[#12141a] border border-white/[0.08] rounded-3xl shadow-md">
                <span className="font-serif text-lg text-[#ebd8ab] font-medium block mb-1">
                  Smoked Dhungar
                </span>
                <p className="text-xs text-[#8c8e96] leading-relaxed font-light">
                  Melt-in-mouth Galouti kebabs infused with charcoal clove smoke and 32 heritage potli spices.
                </p>
              </div>
              <div className="aspect-[4/3] rounded-3xl overflow-hidden border border-white/[0.08] shadow-lg">
                <img
                  src={kebabsImg}
                  alt="Melt-in-mouth Galouti kebabs with mint chutney"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </div>

        </div>

        {/* 3 Core Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 border-t border-white/[0.08]">
          <div className="p-6 rounded-3xl bg-[#12141a] border border-white/[0.08] space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#ebd8ab]">
              <Flame className="w-4 h-4 text-[#dfba6c]" />
              <span>Slow-Embers Technique</span>
            </div>
            <p className="text-xs text-[#8c8e96] leading-relaxed font-light">
              Our Dal Bukhara simmers for 18 continuous hours over dying clay tandoor embers, yielding an unctuous natural smokiness.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-[#12141a] border border-white/[0.08] space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#ebd8ab]">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Certified Hand-Cut Halal</span>
            </div>
            <p className="text-xs text-[#8c8e96] leading-relaxed font-light">
              All poultry, baby goat, and spring lamb are 100% strictly certified hand-slaughtered Halal with transparent provenance.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-[#12141a] border border-white/[0.08] space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#ebd8ab]">
              <Sparkles className="w-4 h-4 text-[#dfba6c]" />
              <span>Sealed Thermal Delivery</span>
            </div>
            <p className="text-xs text-[#8c8e96] leading-relaxed font-light">
              Delivered in specialized food-grade sealed copper & clay vessels inside heated thermal bike boxes with live courier tracking.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
};
