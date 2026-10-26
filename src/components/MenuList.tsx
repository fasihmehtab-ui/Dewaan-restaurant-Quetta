import React, { useState, useMemo } from 'react';
import { Search, Flame, Clock, Sparkles, Filter, Plus, ArrowRight, Video, Play, X, MessageCircle, MapPin, Phone, User, CheckCircle2 } from 'lucide-react';
import { MenuItem, Category, DietaryTag, Order, CartItem } from '../types';
import { CATEGORIES } from '../data/menuData';
import { formatPKR } from '../utils/currency';
import { CustomerUser } from '../utils/supabaseService';
import { createAndDispatchWhatsAppOrder } from '../utils/whatsappOrderService';

interface MenuListProps {
  items: MenuItem[];
  onOpenCustomizer: (item: MenuItem) => void;
  onOrderPlaced?: (order: Order) => void;
  currentUser?: CustomerUser | null;
}

export const MenuList: React.FC<MenuListProps> = ({ 
  items, 
  onOpenCustomizer,
  onOrderPlaced,
  currentUser,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<Category>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDietaryFilter, setActiveDietaryFilter] = useState<DietaryTag | 'all'>('all');
  const [activeVideoModal, setActiveVideoModal] = useState<{ url: string; title: string } | null>(null);

  // Quick WhatsApp Order states
  const [quickWhatsAppDish, setQuickWhatsAppDish] = useState<MenuItem | null>(null);
  const [waQty, setWaQty] = useState(1);
  const [waName, setWaName] = useState('');
  const [waPhone, setWaPhone] = useState('');
  const [waAddress, setWaAddress] = useState('');
  const [waNotes, setWaNotes] = useState('');
  const [isDispatchingWA, setIsDispatchingWA] = useState(false);
  const [waSuccessNotice, setWaSuccessNotice] = useState<string | null>(null);

  const handleOpenQuickWhatsApp = (dish: MenuItem) => {
    setQuickWhatsAppDish(dish);
    setWaQty(1);
    setWaName(currentUser?.fullName || '');
    setWaPhone(currentUser?.phone || '');
    setWaAddress(currentUser?.deliveryAddress || '');
    setWaNotes('');
  };

  const handleDispatchQuickWhatsApp = async () => {
    if (!quickWhatsAppDish) return;
    setIsDispatchingWA(true);

    const unitPrice = quickWhatsAppDish.basePrice;
    const totalPrice = unitPrice * waQty;

    const cartItem: CartItem = {
      cartItemId: `${quickWhatsAppDish.id}-${Date.now()}`,
      menuItem: quickWhatsAppDish,
      quantity: waQty,
      customization: {
        portion: (quickWhatsAppDish.portionOptions && quickWhatsAppDish.portionOptions[0]) || { id: 'std', name: 'Standard Serving', priceDelta: 0, serving: '1 Person' },
        spiceLevel: quickWhatsAppDish.spiceLevelDefault || 'medium',
        selectedAddOns: [],
        specialInstructions: waNotes.trim() || undefined,
      },
      unitPrice,
      totalPrice,
    };

    try {
      const placedOrder = await createAndDispatchWhatsAppOrder(
        {
          items: [cartItem],
          customer: {
            fullName: waName.trim() || currentUser?.fullName || 'Royal Patron',
            phone: waPhone.trim() || currentUser?.phone || '+92 311 8427913',
            address: waAddress.trim() || currentUser?.deliveryAddress || 'Address to be confirmed via WhatsApp',
            deliveryNotes: waNotes.trim() ? `[Menu Direct WA] ${waNotes.trim()}` : '[Menu Direct WhatsApp Order]',
          },
          currentUser,
          orderType: 'delivery',
          orderSource: 'whatsapp',
        },
        onOrderPlaced
      );

      setWaSuccessNotice(`Royal Order #${placedOrder.id} logged in Supabase & sent to WhatsApp!`);
      setTimeout(() => setWaSuccessNotice(null), 6000);
      setQuickWhatsAppDish(null);
    } catch (err) {
      console.warn('Error in quick WhatsApp order:', err);
    } finally {
      setIsDispatchingWA(false);
    }
  };

  // Filter logic
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Category match
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      // Dietary filter match
      if (activeDietaryFilter !== 'all' && (!item.dietary || !item.dietary.includes(activeDietaryFilter))) {
        return false;
      }
      // Search query match
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesDesc = (item.description || '').toLowerCase().includes(query);
        const matchesIng = (item.ingredients || []).some((ing) => ing.toLowerCase().includes(query));
        const matchesUrdu = item.urduName?.toLowerCase().includes(query);
        if (!matchesName && !matchesDesc && !matchesIng && !matchesUrdu) {
          return false;
        }
      }
      return true;
    });
  }, [items, selectedCategory, activeDietaryFilter, searchQuery]);

  return (
    <section id="menu-section" className="py-16 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Modern Section Header */}
      <div className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6 border-b border-white/[0.08] pb-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] font-mono tracking-wider uppercase text-[#dfba6c] mb-3">
            <Sparkles className="w-3 h-3" />
            <span>Dewaan Quetta Dastarkhwan</span>
          </div>
          <h2 className="font-serif text-3xl sm:text-5xl text-white font-medium [text-wrap:balance]">
            Authentic Quetta Dishes & Menu
          </h2>
          <p className="text-sm text-[#9c9ea6] mt-3 max-w-xl leading-relaxed font-light">
            Cooked fresh to order in Quetta: Arabian Shawarma, Artisan Pizza, Dum Biryani, Chapli Kebabs, Shinwari Karahi & Sealed Handi.
          </p>
        </div>

        {/* Modern Search bar */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#727581]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search biryani, karahi, kebabs..."
            className="w-full pl-11 pr-4 py-3 bg-[#13151c]/90 border border-white/[0.08] rounded-full text-sm text-[#f1f2f5] placeholder-[#727581] focus:outline-none focus:border-[#dfba6c] focus:ring-1 focus:ring-[#dfba6c]/30 transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#8c8e96] hover:text-white"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Modern Category Segmented Filter Tabs */}
      <div className="space-y-4 mb-10">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2.5 text-xs font-medium rounded-full transition-all duration-200 whitespace-nowrap focus:outline-none ${
                  isSelected
                    ? 'bg-[#dfba6c] text-[#090a0d] font-semibold shadow-md shadow-[#dfba6c]/20 scale-100'
                    : 'bg-[#13151c] text-[#9c9ea6] hover:text-white hover:bg-[#1a1d26] border border-white/[0.05]'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Dietary Filters */}
        <div className="flex items-center gap-2 flex-wrap text-xs text-[#8c8e96]">
          <span className="flex items-center gap-1.5 mr-1 text-[#b8bac2] font-medium">
            <Filter className="w-3.5 h-3.5 text-[#dfba6c]" />
            <span>Dietary Preference:</span>
          </span>
          {[
            { id: 'all', label: 'All Dishes' },
            { id: 'halal', label: '100% Halal' },
            { id: 'chef_signature', label: "Chef's Signature" },
            { id: 'vegetarian', label: 'Vegetarian Only' },
            { id: 'gluten_free', label: 'Gluten-Free' },
          ].map((diet) => {
            const isSelected = activeDietaryFilter === diet.id;
            return (
              <button
                key={diet.id}
                onClick={() => setActiveDietaryFilter(diet.id as DietaryTag | 'all')}
                className={`px-3 py-1.5 rounded-full transition-colors text-xs focus:outline-none ${
                  isSelected
                    ? 'bg-[#dfba6c]/15 text-[#ebd8ab] border border-[#dfba6c]/50 font-medium'
                    : 'text-[#8c8e96] hover:text-white hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                {diet.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Best Shawarma in Quetta Category Banner */}
      {(selectedCategory === 'shawarma' || searchQuery.toLowerCase().includes('shawarma') || searchQuery.includes('شوارما')) && (
        <div className="mb-8 p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-[#dfba6c]/20 via-[#1e1410] to-[#141620] border border-[#dfba6c]/35 shadow-2xl animate-in fade-in duration-200">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#dfba6c]/15 text-[#dfba6c] text-[11px] font-mono mb-2.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>کوئٹہ کا نمبر 1 شوارما مرکز | Best Shawarma in Quetta</span>
              </div>
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-white mb-1.5">
                کوئٹہ میں سب سے بیسٹ شوارما صرف دیوان ریسٹورنٹ پر!
              </h3>
              <p className="text-xs sm:text-sm text-[#ebd8ab] leading-relaxed font-light">
                اگر آپ کوئٹہ میں شوارما کے شوقین ہیں تو دیوان آپ کے لیے بہترین جگہ ہے۔ ہمارے پاس شوارما کی کئی مختلف اقسام ہیں جو اپنے ذائقے میں سب سے الگ ہیں۔
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-xs text-[#ebd8ab] font-medium font-mono">
                Fresh Charcoal Spits
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 font-medium font-mono">
                Authentic Toum Garlic
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Modern Grid of Dishes */}
      {filteredItems.length === 0 ? (
        <div className="p-16 text-center bg-[#13151c]/60 border border-white/[0.06] rounded-3xl">
          <p className="font-serif text-2xl text-[#ebd8ab] mb-2">No royal dishes match your search</p>
          <p className="text-xs text-[#8c8e96] max-w-sm mx-auto mb-6">
            Try adjusting your search keywords or resetting your dietary filters.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
              setActiveDietaryFilter('all');
            }}
            className="px-5 py-2.5 text-xs text-[#090a0d] bg-[#dfba6c] hover:bg-[#ebd8ab] rounded-full font-semibold transition-all"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="group bg-[#12141a] border border-white/[0.08] rounded-3xl overflow-hidden flex flex-col hover:border-[#dfba6c]/40 hover:-translate-y-1 transition-all duration-300 shadow-lg hover:shadow-2xl hover:shadow-[#dfba6c]/5"
            >
              {/* Product Image Slot with modern aspect ratio */}
              <div className="relative aspect-[16/11] w-full bg-[#171922] overflow-hidden">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover object-center group-hover:scale-108 transition-transform duration-700 ease-out"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-[#171922] p-4 text-center">
                    <Sparkles className="w-8 h-8 text-[#dfba6c]/40 mb-2" />
                    <span className="font-serif text-sm text-[#ebd8ab]">{item.name}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#12141a] via-transparent to-black/30" />

                {/* Modern subtle status badges */}
                <div className="absolute top-3.5 left-3.5 flex items-center gap-2">
                  <span className="text-[10px] font-mono tracking-wider uppercase text-[#ebd8ab] bg-[#090a0d]/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/[0.08]">
                    {item.isPopular ? 'Chef Signature' : item.category.replace('_', ' ')}
                  </span>
                </div>

                <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5 text-[10px] font-mono text-zinc-200 bg-[#090a0d]/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/[0.08]">
                  <Clock className="w-3 h-3 text-[#dfba6c]" />
                  <span>{item.prepTime}</span>
                </div>

                {/* Modern subtle Urdu name */}
                {item.urduName && (
                  <div className="absolute bottom-2.5 left-4 text-xs font-serif text-[#ebd8ab]/90 font-light pointer-events-none">
                    {item.urduName}
                  </div>
                )}

                {/* Video Play Badge if Video URL is provided */}
                {item.videoUrl && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveVideoModal({ url: item.videoUrl!, title: item.name });
                    }}
                    className="absolute bottom-2.5 right-3.5 flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600/90 hover:bg-red-500 text-white text-[11px] font-semibold shadow-lg backdrop-blur-md transition-all hover:scale-105 z-10"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Watch Video</span>
                  </button>
                )}
              </div>

              {/* Card Body */}
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  {/* Clean unboxed metadata with separators */}
                  <div className="flex items-center gap-2 text-[11px] text-[#8c8f9b] mb-2 font-medium">
                    {(item.dietary || []).slice(0, 2).map((d, idx) => (
                      <React.Fragment key={d}>
                        {idx > 0 && <span aria-hidden="true" className="text-white/20">·</span>}
                        <span className="capitalize">{d.replace('_', ' ')}</span>
                      </React.Fragment>
                    ))}
                    {item.calories && (
                      <>
                        <span aria-hidden="true" className="text-white/20">·</span>
                        <span className="font-mono tabular-nums">{item.calories} kcal</span>
                      </>
                    )}
                  </div>

                  {/* Title & Price Header */}
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div>
                      <h3 className="font-serif text-xl font-medium text-white group-hover:text-[#dfba6c] transition-colors leading-snug">
                        {item.name}
                      </h3>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono text-lg font-bold text-[#dfba6c] tabular-nums block">
                        {formatPKR(item.basePrice)}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-[#a0a3af] leading-relaxed line-clamp-2 mb-3.5 font-light">
                    {item.description}
                  </p>

                  {/* Ingredients Preview */}
                  <div className="text-[11px] text-[#717482] mb-5 line-clamp-1">
                    <span className="text-[#a4a7b5] font-medium">Key Notes:</span> {(item.ingredients || []).join(', ') || 'Authentic Quetta spices'}
                  </div>
                </div>

                {/* Card Action Button */}
                <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-[#9c9ea6]">
                    {item.isAvailable === false ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-950/60 border border-rose-800/40 text-rose-300 text-[10px] font-mono">
                        Sold Out Today
                      </span>
                    ) : item.spiceCustomizable ? (
                      <span className="flex items-center gap-1 text-[#dfba6c] font-medium">
                        <Flame className="w-3.5 h-3.5" />
                        <span>Custom Spice</span>
                      </span>
                    ) : (
                      <span className="text-[#8c8f9b]">Heritage Recipe</span>
                    )}
                  </div>

                  {item.isAvailable === false ? (
                    <button
                      type="button"
                      disabled
                      className="px-4 py-2 text-xs font-semibold text-[#717482] bg-white/[0.04] rounded-full cursor-not-allowed whitespace-nowrap"
                    >
                      Sold Out
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenQuickWhatsApp(item);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#25D366] hover:text-white bg-[#25D366]/10 hover:bg-[#25D366] border border-[#25D366]/30 rounded-full transition-all whitespace-nowrap cursor-pointer shadow-sm active:scale-95"
                        title="Order this dish on WhatsApp (saves to Supabase & Admin Panel)"
                      >
                        <MessageCircle className="w-3.5 h-3.5 fill-current" />
                        <span className="hidden sm:inline">WhatsApp</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenCustomizer(item)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#090a0d] bg-[#dfba6c] hover:bg-[#ebd8ab] active:scale-95 rounded-full transition-all duration-150 shadow-sm focus:outline-none whitespace-nowrap cursor-pointer"
                      >
                        <span>Customize</span>
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Customer Video Player Modal */}
      {activeVideoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#12141a] border border-white/[0.1] rounded-3xl p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-3">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-red-400" />
                <h4 className="font-serif text-base font-bold text-white">
                  {activeVideoModal.title} — Video Presentation
                </h4>
              </div>
              <button
                onClick={() => setActiveVideoModal(null)}
                className="p-1.5 text-[#8c8e96] hover:text-white rounded-full bg-white/[0.04]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center">
              <video
                src={activeVideoModal.url}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
      {/* Toast Notification for WhatsApp Order */}
      {waSuccessNotice && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#12141a] border border-[#25D366]/40 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div className="w-8 h-8 rounded-full bg-[#25D366]/20 text-[#25D366] flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-white">{waSuccessNotice}</p>
            <p className="text-[11px] text-[#25D366] font-mono">Visible immediately in Admin Panel & Supabase</p>
          </div>
        </div>
      )}

      {/* Quick WhatsApp Order Modal */}
      {quickWhatsAppDish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#12141a] border border-white/[0.1] rounded-3xl p-5 sm:p-6 shadow-2xl text-white">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#25D366]/20 text-[#25D366] flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 fill-current" />
                </div>
                <div>
                  <h4 className="font-serif text-base font-bold text-white leading-tight">
                    Quick WhatsApp Order
                  </h4>
                  <span className="text-[10px] text-[#25D366] font-mono">
                    Auto-Saved to Supabase & Admin Panel
                  </span>
                </div>
              </div>
              <button
                onClick={() => setQuickWhatsAppDish(null)}
                className="p-1.5 text-[#8c8e96] hover:text-white rounded-full bg-white/[0.04] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Dish Card Summary */}
            <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] mb-4">
              <img
                src={quickWhatsAppDish.image}
                alt={quickWhatsAppDish.name}
                className="w-16 h-16 rounded-xl object-cover shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h5 className="font-serif text-sm font-bold text-white truncate">
                  {quickWhatsAppDish.name}
                </h5>
                {quickWhatsAppDish.urduName && (
                  <p className="font-serif text-xs text-[#dfba6c]">{quickWhatsAppDish.urduName}</p>
                )}
                <div className="flex items-center justify-between mt-1.5">
                  <span className="font-mono text-xs font-semibold text-[#dfba6c]">
                    {formatPKR(quickWhatsAppDish.basePrice)} each
                  </span>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-2 bg-[#181a24] border border-white/[0.08] rounded-full px-2 py-0.5">
                    <button
                      type="button"
                      onClick={() => setWaQty(Math.max(1, waQty - 1))}
                      disabled={waQty <= 1}
                      className="text-xs text-[#8c8e96] hover:text-white disabled:opacity-30 cursor-pointer"
                    >
                      -
                    </button>
                    <span className="font-mono text-xs font-bold text-white px-1">
                      {waQty}
                    </span>
                    <button
                      type="button"
                      onClick={() => setWaQty(waQty + 1)}
                      className="text-xs text-[#8c8e96] hover:text-white cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Details Form */}
            <div className="space-y-3 mb-4 text-xs">
              <div>
                <label className="block text-[11px] text-[#8c8e96] mb-1 flex items-center gap-1">
                  <User className="w-3 h-3 text-[#dfba6c]" />
                  <span>Customer Name</span>
                </label>
                <input
                  type="text"
                  value={waName}
                  onChange={(e) => setWaName(e.target.value)}
                  placeholder="e.g. Fasih Mehtab / Royal Patron"
                  className="w-full px-3 py-2 bg-[#181a24] border border-white/[0.08] rounded-xl text-white placeholder-[#5d606d] focus:outline-none focus:border-[#25D366]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#8c8e96] mb-1 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-[#25D366]" />
                  <span>WhatsApp Phone</span>
                </label>
                <input
                  type="tel"
                  value={waPhone}
                  onChange={(e) => setWaPhone(e.target.value)}
                  placeholder="e.g. +92 311 8427913"
                  className="w-full px-3 py-2 bg-[#181a24] border border-white/[0.08] rounded-xl text-white placeholder-[#5d606d] focus:outline-none focus:border-[#25D366]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#8c8e96] mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-red-400" />
                  <span>Delivery Address in Quetta</span>
                </label>
                <input
                  type="text"
                  value={waAddress}
                  onChange={(e) => setWaAddress(e.target.value)}
                  placeholder="e.g. Main Zarghoon Road / Jinnah Town, Quetta"
                  className="w-full px-3 py-2 bg-[#181a24] border border-white/[0.08] rounded-xl text-white placeholder-[#5d606d] focus:outline-none focus:border-[#25D366]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#8c8e96] mb-1">
                  Special Kitchen Notes (Optional)
                </label>
                <input
                  type="text"
                  value={waNotes}
                  onChange={(e) => setWaNotes(e.target.value)}
                  placeholder="e.g. Extra raita, less spice, warm naan"
                  className="w-full px-3 py-2 bg-[#181a24] border border-white/[0.08] rounded-xl text-white placeholder-[#5d606d] focus:outline-none focus:border-[#25D366]"
                />
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="bg-[#181a24] rounded-2xl p-3 border border-white/[0.06] mb-4 space-y-1.5 text-xs text-[#a0a3af]">
              <div className="flex justify-between">
                <span>Subtotal ({waQty}x):</span>
                <span className="font-mono text-white">{formatPKR(quickWhatsAppDish.basePrice * waQty)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span>Royal Packaging Fee:</span>
                <span className="font-mono text-white">{formatPKR(120)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span>Quetta Home Delivery:</span>
                <span className="font-mono text-white">{formatPKR(180)}</span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-white/[0.08] font-bold text-white text-sm">
                <span>Grand Total (COD):</span>
                <span className="font-mono text-[#dfba6c]">
                  {formatPKR(quickWhatsAppDish.basePrice * waQty + 120 + 180 + Math.round((quickWhatsAppDish.basePrice * waQty) * 0.05))}
                </span>
              </div>
            </div>

            {/* CTAs */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleDispatchQuickWhatsApp}
                disabled={isDispatchingWA}
                className="w-full py-3.5 px-4 bg-[#25D366] hover:bg-[#20ba5a] active:scale-98 text-white font-bold text-xs sm:text-sm rounded-full transition-all shadow-lg shadow-[#25D366]/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <MessageCircle className="w-4 h-4 fill-current shrink-0" />
                <span>{isDispatchingWA ? 'Saving & Opening WhatsApp...' : 'Confirm Order on WhatsApp (Save & Dispatch)'}</span>
              </button>

              <button
                type="button"
                onClick={() => setQuickWhatsAppDish(null)}
                className="w-full py-1 text-center text-xs text-[#71747d] hover:text-white cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
