import React, { useState } from 'react';
import { X, Database, Check, Copy, ExternalLink, ShieldCheck, Terminal, Layers } from 'lucide-react';
import { SUPABASE_CONFIG } from '../utils/supabaseClient';
import { SUPABASE_SCHEMA_SQL } from '../utils/supabaseService';

interface SupabaseStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderCount: number;
}

export const SupabaseStatusModal: React.FC<SupabaseStatusModalProps> = ({
  isOpen,
  onClose,
  orderCount,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#111319] border border-white/[0.1] rounded-3xl shadow-2xl p-6 sm:p-8 overflow-hidden max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-md">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-xl font-medium text-white">
                  Supabase Backend Integration
                </h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 font-mono text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active
                </span>
              </div>
              <p className="text-xs text-[#8c8e96] font-light mt-0.5">
                Connected with real-time order & reservation persistence.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[#8c8e96] hover:text-white rounded-full bg-white/[0.04] focus:outline-none transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto py-5 space-y-5 text-xs text-[#a0a3af]">
          
          {/* Project Details Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-[#161822] border border-white/[0.08] space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#dfba6c] block">
                Project ID
              </span>
              <div className="font-mono text-white text-sm font-semibold select-all">
                {SUPABASE_CONFIG.projectId}
              </div>
              <span className="text-[11px] text-[#71747d] block font-light">
                Backend database & API instance
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#161822] border border-white/[0.08] space-y-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#dfba6c] block">
                Synced Orders in App
              </span>
              <div className="font-mono text-emerald-400 text-sm font-bold">
                {orderCount} {orderCount === 1 ? 'Active Order' : 'Active Orders'}
              </div>
              <span className="text-[11px] text-[#71747d] block font-light">
                Auto-saved on order placement
              </span>
            </div>
          </div>

          {/* Database Tables Information */}
          <div className="p-4 rounded-2xl bg-[#161822] border border-white/[0.08] space-y-3">
            <div className="flex items-center gap-2 text-white font-medium">
              <Layers className="w-4 h-4 text-[#dfba6c]" />
              <span>Configured Supabase Tables</span>
            </div>
            
            <div className="space-y-2 text-xs">
              <div className="flex items-start justify-between p-3 rounded-xl bg-[#111319] border border-white/[0.06]">
                <div>
                  <div className="font-mono text-white font-semibold">public.orders</div>
                  <div className="text-[11px] text-[#7e8290] mt-0.5 font-light">
                    Stores order ID, customer details, delivery address, dishes (JSONB), fees, driver telemetry & chat messages.
                  </div>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Ready
                </span>
              </div>

              <div className="flex items-start justify-between p-3 rounded-xl bg-[#111319] border border-white/[0.06]">
                <div>
                  <div className="font-mono text-white font-semibold">public.reservations</div>
                  <div className="text-[11px] text-[#7e8290] mt-0.5 font-light">
                    Stores guest name, party size, dining date, timeslot, seating lounge & special occasion notes.
                  </div>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Ready
                </span>
              </div>

              <div className="flex items-start justify-between p-3 rounded-xl bg-[#111319] border border-white/[0.06]">
                <div>
                  <div className="font-mono text-white font-semibold flex items-center gap-2">
                    <span>public.menu_items</span>
                    <span className="text-[10px] text-[#dfba6c] font-normal">Daily Market Value Column</span>
                  </div>
                  <div className="text-[11px] text-[#7e8290] mt-0.5 font-light">
                    Stores dishes (Shawarma, Pizza, Biryani, Kabab, Karahi, Handi) with daily_market_price, market_price_notes, and availability.
                  </div>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Ready
                </span>
              </div>

              <div className="flex items-start justify-between p-3 rounded-xl bg-[#111319] border border-white/[0.06]">
                <div>
                  <div className="font-mono text-white font-semibold flex items-center gap-2">
                    <span>public.courier_telemetry</span>
                    <span className="text-[10px] text-[#dfba6c] font-normal">Quetta GPS Backend</span>
                  </div>
                  <div className="text-[11px] text-[#7e8290] mt-0.5 font-light">
                    Stores real-time GPS coordinates (lat, lng), Quetta sector, and telemetry for courier Allah Dad (+923118427913).
                  </div>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Ready
                </span>
              </div>
            </div>
          </div>

          {/* SQL Editor Instructions & Copy Schema */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-medium">
                <Terminal className="w-4 h-4 text-[#dfba6c]" />
                <span>Supabase SQL Table Schema</span>
              </div>
              <button
                type="button"
                onClick={handleCopySql}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-[#090a0d] bg-[#dfba6c] hover:bg-[#ebd8ab] rounded-full transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy SQL Schema</span>
                  </>
                )}
              </button>
            </div>
            
            <p className="text-[11px] text-[#8c8e96] font-light">
              If you haven&apos;t run the table definitions in your Supabase project yet, paste this into your{' '}
              <a
                href={`https://supabase.com/dashboard/project/${SUPABASE_CONFIG.projectId}/sql`}
                target="_blank"
                rel="noreferrer"
                className="text-[#dfba6c] underline hover:text-[#ebd8ab]"
              >
                Supabase SQL Editor
              </a>{' '}
              and click &quot;Run&quot;.
            </p>

            <pre className="p-4 bg-[#0a0b0e] rounded-2xl border border-white/[0.08] font-mono text-[11px] text-[#dfba6c]/90 overflow-x-auto max-h-48 scrollbar-thin">
              {SUPABASE_SCHEMA_SQL.trim()}
            </pre>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between">
          <div className="text-[11px] text-[#71747d] font-mono flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>RLS Enabled & Public API Ready</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.12] text-white rounded-full transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
