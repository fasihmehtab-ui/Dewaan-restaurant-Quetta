import React, { useState, useMemo } from 'react';
import { Search, Flame, Clock, Sparkles, Filter, Plus, ArrowRight } from 'lucide-react';
import { MenuItem, Category, DietaryTag } from '../types';
import { CATEGORIES } from '../data/menuData';
import { formatPKR } from '../utils/currency';

interface MenuListProps {
  items: MenuItem[];
  onOpenCustomizer: (item: MenuItem) => void;
}

export const MenuList: React.FC<MenuListProps> = ({ items, onOpenCustomizer }) => {
  const [selectedCategory, setSelectedCategory] = useState<Category>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDietaryFilter, setActiveDietaryFilter] = useState<DietaryTag | 'all'>('all');

  // Filter logic
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Category match
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      // Dietary filter match
      if (activeDietaryFilter !== 'all' && !item.dietary.includes(activeDietaryFilter)) {
        return false;
      }
      // Search query match
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesDesc = item.description.toLowerCase().includes(query);
        const matchesIng = item.ingredients.some((ing) => ing.toLowerCase().includes(query));
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
            Authentic Quetta Dishes & Daily Market Prices
          </h2>
          <p className="text-sm text-[#9c9ea6] mt-3 max-w-xl leading-relaxed font-light">
            Cooked fresh to order in Quetta: Arabian Shawarma, Artisan Pizza, Dum Biryani, Chapli Kebabs, Shinwari Karahi & Sealed Handi. Prices updated daily with local market value.
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
              </div>

              {/* Card Body */}
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  {/* Clean unboxed metadata with separators */}
                  <div className="flex items-center gap-2 text-[11px] text-[#8c8f9b] mb-2 font-medium">
                    {item.dietary.slice(0, 2).map((d, idx) => (
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
                      {item.marketPriceNotes && (
                        <span className="text-[10px] text-emerald-400 font-mono block mt-0.5">
                          {item.marketPriceNotes}
                        </span>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono text-lg font-bold text-[#dfba6c] tabular-nums block">
                        {formatPKR(item.dailyMarketPrice || item.basePrice)}
                      </span>
                      <span className="text-[9px] font-mono text-[#8c8f9b] uppercase tracking-wider block">
                        Daily Market Rate
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-[#a0a3af] leading-relaxed line-clamp-2 mb-3.5 font-light">
                    {item.description}
                  </p>

                  {/* Ingredients Preview */}
                  <div className="text-[11px] text-[#717482] mb-5 line-clamp-1">
                    <span className="text-[#a4a7b5] font-medium">Key Notes:</span> {item.ingredients.join(', ')}
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
                    <button
                      type="button"
                      onClick={() => onOpenCustomizer(item)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#090a0d] bg-[#dfba6c] hover:bg-[#ebd8ab] active:scale-95 rounded-full transition-all duration-150 shadow-sm focus:outline-none whitespace-nowrap"
                    >
                      <span>Customize</span>
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
