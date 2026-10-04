import React, { useState } from 'react';
import { ShoppingBag, Clock, Menu as MenuIcon, X, Sparkles } from 'lucide-react';
import { formatPKR } from '../utils/currency';

interface HeaderProps {
  activeTab: 'menu' | 'track' | 'heritage' | 'reserve';
  setActiveTab: (tab: 'menu' | 'track' | 'heritage' | 'reserve') => void;
  cartCount: number;
  cartTotal: number;
  openCart: () => void;
  hasActiveDelivery: boolean;
  activeOrderId?: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  cartCount,
  cartTotal,
  openCart,
  hasActiveDelivery,
  activeOrderId,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (tab: 'menu' | 'track' | 'heritage' | 'reserve') => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#090a0d]/90 backdrop-blur-xl border-b border-white/[0.08] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Zone 1: Single text element modern brand wordmark */}
          <button
            onClick={() => handleNavClick('menu')}
            className="flex items-center gap-3 group text-left focus:outline-none"
            aria-label="Dewaan Home"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#dfba6c] to-[#99732b] flex items-center justify-center text-[#090a0d] shadow-lg shadow-[#dfba6c]/10 group-hover:scale-105 transition-transform duration-200">
              <span className="font-serif font-bold text-xl">D</span>
            </div>
            <div>
              <span className="font-serif text-2xl font-bold tracking-wider gold-gradient-text block leading-none">
                DEWAAN
              </span>
              <span className="text-[10px] font-sans font-medium tracking-[0.25em] text-[#a4a7b4] uppercase block mt-1">
                Royal Awadhi Cuisine
              </span>
            </div>
          </button>

          {/* Zone 2: Clean Modern Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-[#12141a]/80 p-1.5 rounded-full border border-white/[0.06] backdrop-blur-md">
            <button
              onClick={() => handleNavClick('menu')}
              className={`px-4 py-2 text-xs font-medium rounded-full transition-all duration-200 focus:outline-none ${
                activeTab === 'menu'
                  ? 'bg-[#dfba6c] text-[#090a0d] font-semibold shadow-sm'
                  : 'text-[#9c9ea6] hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              Cuisine Menu
            </button>

            <button
              onClick={() => handleNavClick('track')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-full transition-all duration-200 focus:outline-none ${
                activeTab === 'track'
                  ? 'bg-[#dfba6c] text-[#090a0d] font-semibold shadow-sm'
                  : 'text-[#9c9ea6] hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <span>Track Delivery</span>
              {hasActiveDelivery && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              )}
            </button>

            <button
              onClick={() => handleNavClick('heritage')}
              className={`px-4 py-2 text-xs font-medium rounded-full transition-all duration-200 focus:outline-none ${
                activeTab === 'heritage'
                  ? 'bg-[#dfba6c] text-[#090a0d] font-semibold shadow-sm'
                  : 'text-[#9c9ea6] hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              Culinary Heritage
            </button>

            <button
              onClick={() => handleNavClick('reserve')}
              className={`px-4 py-2 text-xs font-medium rounded-full transition-all duration-200 focus:outline-none ${
                activeTab === 'reserve'
                  ? 'bg-[#dfba6c] text-[#090a0d] font-semibold shadow-sm'
                  : 'text-[#9c9ea6] hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              Dine-In Reservation
            </button>
          </nav>

          {/* Zone 3: Modern Primary Actions */}
          <div className="flex items-center gap-3">
            {hasActiveDelivery && activeTab !== 'track' && (
              <button
                onClick={() => handleNavClick('track')}
                className="hidden lg:flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 rounded-full hover:bg-emerald-900/40 transition-colors shadow-sm"
                title={`Active order ${activeOrderId || ''}`}
              >
                <Clock className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
                <span className="font-mono tabular-nums">Delivery in Progress</span>
              </button>
            )}

            <button
              onClick={openCart}
              className="relative flex items-center gap-2.5 px-4 sm:px-5 py-2.5 text-xs font-semibold text-[#090a0d] bg-[#dfba6c] hover:bg-[#ebd8ab] active:scale-95 rounded-full transition-all duration-150 shadow-md shadow-[#dfba6c]/15 focus:outline-none"
              aria-label={`View cart with ${cartCount} items`}
            >
              <ShoppingBag className="w-4 h-4 stroke-[2.2]" />
              <span className="hidden sm:inline font-sans">Dastarkhwan Bag</span>
              <span className="w-5 h-5 rounded-full bg-[#090a0d] text-[#dfba6c] text-[11px] font-mono flex items-center justify-center font-bold">
                {cartCount}
              </span>
              {cartTotal > 0 && (
                <span className="hidden sm:inline-block border-l border-[#090a0d]/30 pl-2 font-mono tabular-nums text-xs font-semibold">
                  {formatPKR(cartTotal)}
                </span>
              )}
            </button>

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-[#9c9ea6] hover:text-white focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile nav dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/[0.08] bg-[#0d0f14] px-4 pt-3 pb-6 space-y-2">
          <button
            onClick={() => handleNavClick('menu')}
            className={`w-full text-left py-2.5 px-4 rounded-xl text-sm ${
              activeTab === 'menu' ? 'bg-[#dfba6c] text-[#090a0d] font-semibold' : 'text-[#9c9ea6]'
            }`}
          >
            Cuisine Menu
          </button>
          <button
            onClick={() => handleNavClick('track')}
            className={`w-full text-left py-2.5 px-4 rounded-xl text-sm flex items-center justify-between ${
              activeTab === 'track' ? 'bg-[#dfba6c] text-[#090a0d] font-semibold' : 'text-[#9c9ea6]'
            }`}
          >
            <span>Live Delivery Tracking</span>
            {hasActiveDelivery && (
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-500/30">
                Active Order
              </span>
            )}
          </button>
          <button
            onClick={() => handleNavClick('heritage')}
            className={`w-full text-left py-2.5 px-4 rounded-xl text-sm ${
              activeTab === 'heritage' ? 'bg-[#dfba6c] text-[#090a0d] font-semibold' : 'text-[#9c9ea6]'
            }`}
          >
            Culinary Heritage & Dum Pukht
          </button>
          <button
            onClick={() => handleNavClick('reserve')}
            className={`w-full text-left py-2.5 px-4 rounded-xl text-sm ${
              activeTab === 'reserve' ? 'bg-[#dfba6c] text-[#090a0d] font-semibold' : 'text-[#9c9ea6]'
            }`}
          >
            Dine-In Table Reservation
          </button>
        </div>
      )}
    </header>
  );
};
