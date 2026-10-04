import React, { useState } from 'react';
import { X, Flame, Plus, Minus, Check, Clock, Sparkles } from 'lucide-react';
import { MenuItem, PortionOption, ProteinOption, AccompanimentOption, AddOnOption, SpiceLevel, CartItem } from '../types';
import { formatPKR, formatPKRDelta } from '../utils/currency';

interface MealCustomizerModalProps {
  item: MenuItem | null;
  onClose: () => void;
  onAddToCart: (cartItem: CartItem) => void;
}

export const MealCustomizerModal: React.FC<MealCustomizerModalProps> = ({
  item,
  onClose,
  onAddToCart,
}) => {
  if (!item) return null;

  // Customization states
  const [selectedPortion, setSelectedPortion] = useState<PortionOption>(
    item.portionOptions[0] || { id: 'default', name: 'Standard Serving', priceDelta: 0, serving: '1 Person' }
  );

  const [selectedSpice, setSelectedSpice] = useState<SpiceLevel>(item.spiceLevelDefault);

  const [selectedProtein, setSelectedProtein] = useState<ProteinOption | undefined>(
    item.proteinOptions && item.proteinOptions.length > 0 ? item.proteinOptions[0] : undefined
  );

  const [selectedAccompaniment, setSelectedAccompaniment] = useState<AccompanimentOption | undefined>(
    item.accompanimentOptions && item.accompanimentOptions.length > 0 ? item.accompanimentOptions[0] : undefined
  );

  const [selectedAddOns, setSelectedAddOns] = useState<AddOnOption[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [quantity, setQuantity] = useState(1);

  // Toggle add-on
  const toggleAddOn = (addon: AddOnOption) => {
    if (selectedAddOns.some((a) => a.id === addon.id)) {
      setSelectedAddOns(selectedAddOns.filter((a) => a.id !== addon.id));
    } else {
      setSelectedAddOns([...selectedAddOns, addon]);
    }
  };

  // Calculate unit price based on customization
  const activeBasePrice = item.dailyMarketPrice || item.basePrice;
  const unitPrice =
    activeBasePrice +
    selectedPortion.priceDelta +
    (selectedProtein ? selectedProtein.priceDelta : 0) +
    (selectedAccompaniment ? selectedAccompaniment.priceDelta : 0) +
    selectedAddOns.reduce((sum, add) => sum + add.price, 0);

  const totalPrice = unitPrice * quantity;

  const handleAdd = () => {
    const cartItemId = `${item.id}-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newCartItem: CartItem = {
      cartItemId,
      menuItem: item,
      customization: {
        portion: selectedPortion,
        spiceLevel: selectedSpice,
        protein: selectedProtein,
        accompaniment: selectedAccompaniment,
        selectedAddOns,
        specialInstructions: specialInstructions.trim() ? specialInstructions.trim() : undefined,
      },
      unitPrice,
      quantity,
      totalPrice,
    };

    onAddToCart(newCartItem);
    onClose();
  };

  const spiceLabels: Record<SpiceLevel, { title: string; desc: string; color: string; flameCount: number }> = {
    mild: {
      title: 'Mild Aromatic',
      desc: 'Infused with green cardamom, saffron, and sweet rose water; minimal chili.',
      color: 'text-emerald-400',
      flameCount: 1,
    },
    medium: {
      title: 'Medium Shahi',
      desc: 'The traditional Nawabi royal balance. Warm, savory spices with gentle heat.',
      color: 'text-[#dfba6c]',
      flameCount: 2,
    },
    hot: {
      title: 'Tandoori Hot',
      desc: 'Cracked black peppercorns, fresh green chilies, and aromatic ginger fond.',
      color: 'text-amber-500',
      flameCount: 3,
    },
    desi_fiery: {
      title: 'Desi Fiery Teekha',
      desc: 'High-heat wild bird’s eye chilies and heavy fresh ginger for spicy connoisseurs.',
      color: 'text-rose-500',
      flameCount: 4,
    },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-[#111319] border border-white/[0.1] rounded-3xl shadow-2xl overflow-hidden my-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with image banner */}
        <div className="relative h-48 sm:h-56 w-full bg-[#181b24] overflow-hidden">
          {item.image ? (
            <img
              src={item.image}
              alt={item.name}
              className="w-full h-full object-cover object-center filter brightness-95"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#181b24]">
              <Sparkles className="w-10 h-10 text-[#dfba6c]/40" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#111319] via-[#111319]/60 to-transparent" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2.5 rounded-full bg-black/60 text-white/80 hover:text-white hover:bg-black/90 transition-all focus:outline-none backdrop-blur-md border border-white/10"
            aria-label="Close customizer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Item title in banner */}
          <div className="absolute bottom-4 left-6 right-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#dfba6c] bg-[#090a0d]/80 px-2.5 py-0.5 rounded-full border border-white/[0.08] inline-block mb-1.5">
                  {item.category.replace('_', ' ')}
                </span>
                <h2 className="font-serif text-2xl sm:text-3xl font-medium text-white leading-tight">
                  {item.name}
                </h2>
                {item.urduName && (
                  <p className="text-xs font-serif text-[#ebd8ab]/80 font-light mt-0.5">
                    {item.urduName}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <span className="text-[11px] text-[#9c9ea6] block">Base price</span>
                <span className="font-mono text-xl sm:text-2xl text-[#dfba6c] tabular-nums font-bold">
                  {formatPKR(item.basePrice)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal body scrollable */}
        <div className="p-6 max-h-[calc(85vh-16rem)] overflow-y-auto space-y-6 text-sm text-[#e4e5e7]">
          
          {/* Dish Description & Prep Info */}
          <div className="border-b border-white/[0.06] pb-4">
            <p className="text-[#a4a6ae] leading-relaxed text-xs sm:text-sm mb-3 font-light">
              {item.description}
            </p>
            <div className="flex items-center gap-3 text-xs text-[#8c8e96] flex-wrap">
              <span className="flex items-center gap-1.5 text-zinc-300">
                <Clock className="w-3.5 h-3.5 text-[#dfba6c]" />
                <span>Prep: {item.prepTime}</span>
              </span>
              {item.calories && (
                <span>· approx. {item.calories} kcal</span>
              )}
              {item.dietary.map((d) => (
                <span key={d} className="capitalize">
                  · {d.replace('_', ' ')}
                </span>
              ))}
            </div>
          </div>

          {/* 1. Portion Choice */}
          {item.portionOptions && item.portionOptions.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-semibold tracking-wider uppercase text-[#ebd8ab]">
                  1. Select Portion & Vessel
                </label>
                <span className="text-[11px] text-[#8c8e96]">Required</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {item.portionOptions.map((portion) => {
                  const isSelected = selectedPortion.id === portion.id;
                  return (
                    <button
                      key={portion.id}
                      type="button"
                      onClick={() => setSelectedPortion(portion)}
                      className={`text-left p-3.5 rounded-2xl border transition-all duration-150 ${
                        isSelected
                          ? 'border-[#dfba6c] bg-[#dfba6c]/10 text-white shadow-sm'
                          : 'border-white/[0.08] bg-[#15171f] hover:border-white/[0.15] text-[#d0d2d8]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-medium ${isSelected ? 'text-[#ebd8ab]' : 'text-[#f1f2f5]'}`}>
                          {portion.name}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-[#dfba6c]" />}
                      </div>
                      <span className="text-[11px] text-[#8c8e96] block mb-1 font-light">
                        {portion.serving}
                      </span>
                      <span className="text-xs font-mono tabular-nums text-[#dfba6c] font-semibold">
                        {formatPKRDelta(portion.priceDelta)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Spice Level Customization */}
          {item.spiceCustomizable && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-semibold tracking-wider uppercase text-[#ebd8ab]">
                  2. Customize Spice Intensity
                </label>
                <span className="text-[11px] text-[#8c8e96]">4 Royal Heat Levels</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {(['mild', 'medium', 'hot', 'desi_fiery'] as SpiceLevel[]).map((level) => {
                  const info = spiceLabels[level];
                  const isSelected = selectedSpice === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setSelectedSpice(level)}
                      className={`p-3 text-left rounded-2xl border transition-all duration-150 ${
                        isSelected
                          ? 'border-[#dfba6c] bg-[#dfba6c]/10'
                          : 'border-white/[0.08] bg-[#15171f] hover:border-white/[0.15]'
                      }`}
                    >
                      <div className="flex items-center gap-1 mb-1.5">
                        {Array.from({ length: info.flameCount }).map((_, i) => (
                          <Flame key={i} className={`w-3.5 h-3.5 ${info.color}`} />
                        ))}
                      </div>
                      <div className={`text-xs font-medium ${isSelected ? 'text-[#ebd8ab]' : 'text-[#f1f2f5]'}`}>
                        {info.title}
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-[#8c8e96] mt-2 italic font-light">
                {spiceLabels[selectedSpice].desc}
              </p>
            </div>
          )}

          {/* 3. Protein Selection if applicable */}
          {item.proteinOptions && item.proteinOptions.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-semibold tracking-wider uppercase text-[#ebd8ab]">
                  3. Select Meat Cut or Protein
                </label>
                <span className="text-[11px] text-[#8c8e96]">Select one</span>
              </div>
              <div className="space-y-2">
                {item.proteinOptions.map((protein) => {
                  const isSelected = selectedProtein?.id === protein.id;
                  return (
                    <button
                      key={protein.id}
                      type="button"
                      onClick={() => setSelectedProtein(protein)}
                      className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? 'border-[#dfba6c] bg-[#dfba6c]/10'
                          : 'border-white/[0.08] bg-[#15171f] hover:border-white/[0.15]'
                      }`}
                    >
                      <span className={`text-xs ${isSelected ? 'text-[#ebd8ab] font-medium' : 'text-[#d0d2d8]'}`}>
                        {protein.name}
                      </span>
                      <span className="font-mono text-xs tabular-nums text-[#dfba6c] font-semibold">
                        {formatPKRDelta(protein.priceDelta)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 4. Accompaniment Pairing */}
          {item.accompanimentOptions && item.accompanimentOptions.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-semibold tracking-wider uppercase text-[#ebd8ab]">
                  {item.proteinOptions ? '4.' : '3.'} Bread or Accompaniment
                </label>
                <span className="text-[11px] text-[#8c8e96]">Freshly made</span>
              </div>
              <div className="space-y-2">
                {item.accompanimentOptions.map((acc) => {
                  const isSelected = selectedAccompaniment?.id === acc.id;
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => setSelectedAccompaniment(acc)}
                      className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? 'border-[#dfba6c] bg-[#dfba6c]/10'
                          : 'border-white/[0.08] bg-[#15171f] hover:border-white/[0.15]'
                      }`}
                    >
                      <span className={`text-xs ${isSelected ? 'text-[#ebd8ab] font-medium' : 'text-[#d0d2d8]'}`}>
                        {acc.name}
                      </span>
                      <span className="font-mono text-xs tabular-nums text-[#dfba6c] font-semibold">
                        {formatPKRDelta(acc.priceDelta)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 5. Gourmet Add-ons */}
          {item.addOnOptions && item.addOnOptions.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-semibold tracking-wider uppercase text-[#ebd8ab]">
                  Gourmet Add-ons & Extra Rogan
                </label>
                <span className="text-[11px] text-[#8c8e96]">Optional</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {item.addOnOptions.map((addon) => {
                  const isChecked = selectedAddOns.some((a) => a.id === addon.id);
                  return (
                    <button
                      key={addon.id}
                      type="button"
                      onClick={() => toggleAddOn(addon)}
                      className={`flex items-center justify-between p-3 rounded-2xl border text-left transition-all ${
                        isChecked
                          ? 'border-[#dfba6c] bg-[#dfba6c]/10'
                          : 'border-white/[0.08] bg-[#15171f] hover:border-white/[0.15]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-4 h-4 rounded-md flex items-center justify-center border transition-colors ${
                            isChecked
                              ? 'border-[#dfba6c] bg-[#dfba6c] text-[#090a0d]'
                              : 'border-white/20 bg-transparent'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className={`text-xs ${isChecked ? 'text-[#ebd8ab] font-medium' : 'text-[#d0d2d8]'}`}>
                          {addon.name}
                        </span>
                      </div>
                      <span className="font-mono text-xs tabular-nums text-[#dfba6c] shrink-0 ml-2 font-semibold">
                        +{formatPKR(addon.price)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Special Cooking & Dietary Note */}
          <div>
            <label className="block text-xs font-semibold tracking-wider uppercase text-[#ebd8ab] mb-2">
              Special Culinary Note or Allergies
            </label>
            <input
              type="text"
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="e.g. Extra crispy naan, less oil in gravy, please provide extra lime"
              className="w-full px-4 py-3 bg-[#15171f] border border-white/[0.08] rounded-2xl text-xs text-[#f1f2f5] placeholder-[#6b6e79] focus:outline-none focus:border-[#dfba6c] transition-colors"
              maxLength={150}
            />
          </div>

        </div>

        {/* Modal Footer with quantity & add to cart */}
        <div className="p-4 sm:p-6 bg-[#0c0d12] border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Quantity Stepper */}
          <div className="flex items-center gap-3 bg-[#15171f] border border-white/[0.08] rounded-full px-4 py-2">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              className="p-1 text-[#a4a6ae] hover:text-white disabled:opacity-30 focus:outline-none"
              aria-label="Decrease quantity"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-sm font-semibold tabular-nums text-white w-6 text-center">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              className="p-1 text-[#a4a6ae] hover:text-white focus:outline-none"
              aria-label="Increase quantity"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Add to Cart CTA */}
          <button
            type="button"
            onClick={handleAdd}
            className="w-full sm:w-auto flex-1 flex items-center justify-between sm:justify-center gap-4 px-6 py-3.5 text-xs sm:text-sm font-semibold text-[#090a0d] bg-gradient-to-r from-[#e9c878] via-[#dfba6c] to-[#c59d5f] hover:brightness-110 active:scale-98 rounded-full transition-all shadow-md shadow-[#dfba6c]/20 focus:outline-none"
          >
            <span>Add to Royal Dastarkhwan</span>
            <span className="font-mono tabular-nums text-sm border-l border-[#090a0d]/30 pl-3 font-bold">
              {formatPKR(totalPrice)}
            </span>
          </button>
        </div>

      </div>
    </div>
  );
};
