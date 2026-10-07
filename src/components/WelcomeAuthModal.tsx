import React from 'react';
import { Sparkles, ShieldCheck, User, ArrowRight, X, Phone, MapPin } from 'lucide-react';

interface WelcomeAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSignIn: () => void;
  onOpenSignUp: () => void;
}

export const WelcomeAuthModal: React.FC<WelcomeAuthModalProps> = ({
  isOpen,
  onClose,
  onOpenSignIn,
  onOpenSignUp,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#111319] border border-[#dfba6c]/30 rounded-3xl shadow-2xl p-6 sm:p-8 overflow-hidden text-[#f1f2f5] text-center">
        
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-60 h-60 bg-[#dfba6c]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#8c8e96] hover:text-white rounded-full bg-white/[0.04] transition-colors"
          aria-label="Dismiss welcome prompt"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Crown / Monogram Badge */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#dfba6c] to-[#99732b] flex items-center justify-center mx-auto mb-4 text-[#090a0d] shadow-lg shadow-[#dfba6c]/20 font-serif font-bold text-2xl">
          D
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#dfba6c]/10 border border-[#dfba6c]/30 text-[10px] font-mono tracking-wider uppercase text-[#ebd8ab] mb-3">
          <Sparkles className="w-3 h-3 text-[#dfba6c]" />
          <span>Dewaan Quetta Dastarkhwan</span>
        </div>

        <h2 className="font-serif text-2xl sm:text-3xl font-medium text-white mb-2">
          Welcome to Dewaan
        </h2>

        <p className="text-xs text-[#a4a7b5] max-w-sm mx-auto leading-relaxed mb-6 font-light">
          Sign in or register with Supabase for instant one-touch checkout in Quetta, live courier tracking with Allah Dad, and saved delivery locations.
        </p>

        {/* Features Preview */}
        <div className="grid grid-cols-2 gap-2.5 mb-6 text-left">
          <div className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-2xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-white mb-0.5">
              <MapPin className="w-3.5 h-3.5 text-[#dfba6c]" />
              <span>Quetta Delivery</span>
            </div>
            <p className="text-[10px] text-[#8c8e96] font-light">
              Save your address in Model Town, Cantt, or Zarghoon Rd.
            </p>
          </div>

          <div className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-2xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-white mb-0.5">
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Allah Dad Courier</span>
            </div>
            <p className="text-[10px] text-[#8c8e96] font-light">
              Direct tracking & call line (+923118427913).
            </p>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="space-y-2.5">
          <button
            onClick={() => {
              onClose();
              onOpenSignIn();
            }}
            className="w-full py-3 bg-gradient-to-r from-[#dfba6c] to-[#c59d5f] hover:brightness-110 active:scale-98 text-[#090a0d] font-bold text-xs rounded-full shadow-lg shadow-[#dfba6c]/20 transition-all flex items-center justify-center gap-2"
          >
            <User className="w-3.5 h-3.5" />
            <span>Sign In to Your Account</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenSignUp();
            }}
            className="w-full py-2.5 bg-white/[0.06] hover:bg-white/[0.1] text-[#ebd8ab] border border-white/[0.08] font-semibold text-xs rounded-full transition-colors"
          >
            Create New Royal Account
          </button>

          <div className="pt-2">
            <button
              onClick={onClose}
              className="text-xs text-[#71747d] hover:text-white transition-colors underline"
            >
              Continue as Guest (Browse Menu)
            </button>
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-white/[0.06] flex items-center justify-center gap-1.5 text-[10px] font-mono text-emerald-400">
          <ShieldCheck className="w-3 h-3" />
          <span>Connected with Supabase Authentication</span>
        </div>

      </div>
    </div>
  );
};
