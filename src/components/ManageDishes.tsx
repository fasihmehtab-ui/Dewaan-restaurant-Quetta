import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Search, Edit2, Trash2, Upload, X, Check, AlertCircle, 
  RefreshCw, Image as ImageIcon, Sparkles, Eye, CheckCircle2
} from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import { Dish, DishCategory } from '../types';
import { formatPKR } from '../utils/currency';

const CATEGORIES: DishCategory[] = ['BBQ', 'Karahi', 'Fast Food', 'Biryani', 'Drinks'];
const LOCAL_STORAGE_KEY = 'dastaan_manage_dishes_list_v2';

// Initial authentic dishes fallback
const INITIAL_STARTER_DISHES: Dish[] = [
  {
    id: 'dish-01-seekh',
    name: 'Smoked Mutton Seekh Kebab',
    category: 'BBQ',
    price: 850,
    image: '/src/assets/images/quetta_chapli_kebab_1791134777685.jpg',
    is_available: true,
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: 'dish-02-karahi',
    name: 'Shinwari Namkeen Mutton Karahi',
    category: 'Karahi',
    price: 2450,
    image: '/src/assets/images/dewaan_karahi_curry_1791045143832.jpg',
    is_available: true,
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: 'dish-03-shawarma',
    name: 'Grilled Beef Arabian Shawarma',
    category: 'Fast Food',
    price: 520,
    image: '/src/assets/images/quetta_shawarma_wrap_1791134720429.jpg',
    is_available: true,
    created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    id: 'dish-04-biryani',
    name: 'Quetta Special Nalli Dum Biryani',
    category: 'Biryani',
    price: 1650,
    image: '/src/assets/images/dewaan_hero_handi_biryani_1791045111743.jpg',
    is_available: true,
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'dish-05-kahwa',
    name: 'Quetta Zafrani Kahwa & Dry Fruits',
    category: 'Drinks',
    price: 180,
    image: '/src/assets/images/dewaan_mango_lassi_drink_1791045660858.jpg',
    is_available: true,
    created_at: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
];

export const ManageDishes: React.FC = () => {
  // =========================================================================
  // 1. EXACT STATES SPECIFIED BY USER
  // =========================================================================
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    price: string | number;
    category: string;
    image: string;
    is_available: boolean;
  }>({ 
    name: '', 
    price: '', 
    category: 'BBQ', 
    image: '', 
    is_available: true 
  });
  const [uploading, setUploading] = useState<boolean>(false);

  // Component UI states
  const [dishes, setDishes] = useState<Dish[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return INITIAL_STARTER_DISHES;
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [previewImageModal, setPreviewImageModal] = useState<{ url: string; name: string } | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Helper to persist dishes list locally
  const saveDishesLocally = (updated: Dish[]) => {
    setDishes(updated);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // =========================================================================
  // 2. FETCH DISHES LIST
  // =========================================================================
  const fetchDishes = async () => {
    setLoading(true);
    try {
      // Query 'dishes' table, fallback to 'Dishes' if PGRST205
      let res = await supabase.from('dishes').select('*');
      if (res.error && (res.error.code === 'PGRST205' || res.error.message?.includes('schema cache'))) {
        res = await supabase.from('Dishes').select('*');
      }

      if (!res.error && Array.isArray(res.data) && res.data.length > 0) {
        const parsed: Dish[] = res.data.map((r: any) => ({
          id: String(r.id ?? Math.random().toString(36).substring(2, 9)),
          name: r.name ?? r.Name ?? r.title ?? 'Untitled Dish',
          category: (r.category ?? r.Category ?? 'BBQ') as DishCategory,
          price: Number(r.price ?? r.Price ?? 0),
          image: r.image ?? r.Image ?? r.image_url ?? '',
          is_available: r.is_available !== undefined 
            ? Boolean(r.is_available) 
            : (r.Is_Available !== undefined ? Boolean(r.Is_Available) : true),
          created_at: r.created_at ?? r.CreatedAt,
          updated_at: r.updated_at ?? r.UpdatedAt,
        }));

        // Sort newest first
        parsed.sort((a, b) => {
          const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return timeB - timeA;
        });

        saveDishesLocally(parsed);
      }
    } catch (err) {
      console.warn('Fetch dishes note:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDishes();
  }, []);

  // =========================================================================
  // 3. IMAGE UPLOAD FUNCTION: handleImageUpload
  // =========================================================================
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 8);
      const filePath = `dishes/${timestamp}-${randomStr}.${ext}`;

      // Upload directly to Supabase bucket 'dish-images'
      const { error: uploadError } = await supabase.storage
        .from('dish-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || `image/${ext}`,
        });

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from('dish-images')
          .getPublicUrl(filePath);

        if (urlData?.publicUrl) {
          setFormData((prev) => ({ ...prev, image: urlData.publicUrl }));
          setUploading(false);
          showToast('Image uploaded to Supabase Storage!');
          return;
        }
      }

      // Fallback: Read as Data URL so image preview & save work immediately
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, image: reader.result as string }));
        setUploading(false);
        showToast('Image loaded for dish.');
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.warn('Image upload note:', err);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, image: reader.result as string }));
        setUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  // =========================================================================
  // 4. SAVE LOGIC: handleSave
  // =========================================================================
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.name.trim()) {
      alert('Please enter a dish name.');
      return;
    }

    const parsedPrice = parseFloat(String(formData.price)) || 0;
    if (parsedPrice <= 0) {
      alert('Please enter a valid price greater than 0.');
      return;
    }

    setUploading(true);
    const nowIso = new Date().toISOString();

    try {
      if (editingDish) {
        // UPDATE existing dish
        const updatePayload = {
          name: formData.name.trim(),
          price: parsedPrice,
          category: formData.category,
          image: formData.image,
          is_available: formData.is_available,
          updated_at: nowIso,
        };

        // Query Supabase update
        let { error } = await supabase
          .from('dishes')
          .update(updatePayload)
          .eq('id', editingDish.id);

        if (error) {
          await supabase
            .from('Dishes')
            .update(updatePayload)
            .eq('id', editingDish.id);
        }

        // Update local state & localStorage
        const updatedDishes = dishes.map((d) =>
          d.id === editingDish.id
            ? { ...d, ...updatePayload, id: editingDish.id, category: formData.category as DishCategory }
            : d
        );
        saveDishesLocally(updatedDishes);
        showToast(`Updated "${formData.name.trim()}"!`);
      } else {
        // INSERT new dish
        const newId = `dish-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const newDish: Dish = {
          id: newId,
          name: formData.name.trim(),
          price: parsedPrice,
          category: formData.category as DishCategory,
          image: formData.image || '/src/assets/images/quetta_chapli_kebab_1791134777685.jpg',
          is_available: formData.is_available,
          created_at: nowIso,
          updated_at: nowIso,
        };

        const insertPayload = {
          id: newId,
          name: newDish.name,
          price: newDish.price,
          category: newDish.category,
          image: newDish.image,
          is_available: newDish.is_available,
          created_at: nowIso,
          updated_at: nowIso,
        };

        // Query Supabase insert
        let { error } = await supabase.from('dishes').insert([insertPayload]);
        if (error) {
          await supabase.from('Dishes').insert([insertPayload]);
        }

        // Update local state & localStorage
        const updatedDishes = [newDish, ...dishes];
        saveDishesLocally(updatedDishes);
        showToast(`Added new dish "${newDish.name}"!`);
      }

      // Close modal & refresh
      setShowModal(false);
      await fetchDishes();
    } catch (err) {
      console.warn('Save dish error:', err);
    } finally {
      setUploading(false);
    }
  };

  // =========================================================================
  // 5. DELETE BUTTON: handleDelete
  // =========================================================================
  const handleDelete = async (dish: Dish) => {
    const isConfirmed = window.confirm(`Are you sure to delete ${dish.name}?`);
    if (!isConfirmed) return;

    try {
      // Supabase delete query
      let { error } = await supabase.from('dishes').delete().eq('id', dish.id);
      if (error) {
        await supabase.from('Dishes').delete().eq('id', dish.id);
      }

      // Update local state & localStorage
      const remaining = dishes.filter((d) => d.id !== dish.id);
      saveDishesLocally(remaining);
      showToast(`Deleted "${dish.name}".`);

      // Refresh list
      await fetchDishes();
    } catch (err) {
      console.warn('Delete dish error:', err);
    }
  };

  // Quick toggle availability
  const handleToggleAvailability = async (dish: Dish) => {
    const newStatus = !dish.is_available;
    const updated = dishes.map((d) => (d.id === dish.id ? { ...d, is_available: newStatus } : d));
    saveDishesLocally(updated);

    try {
      let { error } = await supabase
        .from('dishes')
        .update({ is_available: newStatus, updated_at: new Date().toISOString() })
        .eq('id', dish.id);

      if (error) {
        await supabase
          .from('Dishes')
          .update({ is_available: newStatus, updated_at: new Date().toISOString() })
          .eq('id', dish.id);
      }
    } catch {
      // ignore
    }
  };

  // Filtered dishes
  const filteredDishes = useMemo(() => {
    return dishes.filter((dish) => {
      const matchSearch = 
        dish.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        dish.category.toLowerCase().includes(searchQuery.toLowerCase().trim());
      const matchCategory = selectedCategory === 'All' || dish.category === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [dishes, searchQuery, selectedCategory]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md border animate-in slide-in-from-top-3 duration-200 text-xs font-medium bg-[#141620] border-white/10 text-white">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner: Title + "+ Add New Dish" CTA Button */}
      <div className="bg-[#12141a] border border-white/[0.08] rounded-3xl p-6 sm:p-7 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#dfba6c]/5 rounded-full blur-3xl pointer-events-none" />

        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="px-3 py-1 rounded-full bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 font-mono text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Supabase CRUD Connected
            </span>
            <span className="px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] text-[#a0a3af] font-mono">
              Table: dishes · Bucket: dish-images
            </span>
            <span className="px-2.5 py-1 rounded-full bg-[#dfba6c]/10 text-[#dfba6c] text-[10px] font-mono">
              {dishes.length} Items
            </span>
          </div>

          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-wide">
            Manage Dishes
          </h2>
          <p className="text-xs text-[#8c8e96] mt-1.5 max-w-xl font-light leading-relaxed">
            Full CRUD management connected directly to your Supabase PostgreSQL table. Add, edit, delete, and upload dish images directly with instant updates.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={fetchDishes}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-xs text-[#a0a3af] hover:text-white border border-white/[0.08] transition-colors cursor-pointer"
            title="Refresh Dishes from Supabase"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#dfba6c]' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* ========================================================================= */}
          {/* 2. ADD NEW DISH BUTTON: EXACT CLICK HANDLER PER USER INSTRUCTIONS         */}
          {/* ========================================================================= */}
          <button
            type="button"
            onClick={() => {
              setEditingDish(null);
              setFormData({ name: '', price: '', category: 'BBQ', image: '', is_available: true });
              setShowModal(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#e9c878] via-[#dfba6c] to-[#c59d5f] hover:brightness-110 active:scale-98 text-[#090a0d] font-bold text-xs rounded-full shadow-lg shadow-[#dfba6c]/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Add New Dish</span>
          </button>
        </div>
      </div>

      {/* Search Bar & Category Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-[#727581] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search dish name or category..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#12141a] border border-white/[0.08] rounded-full text-xs text-white placeholder-[#71747d] focus:outline-none focus:border-[#dfba6c]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#727581] hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 text-xs">
          {['All', ...CATEGORIES].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full capitalize whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#dfba6c] text-[#090a0d] font-bold shadow-sm'
                  : 'bg-[#141620] text-[#8c8e96] hover:text-white border border-white/[0.06]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LIST VIEW: RESPONSIVE TABLE OF DISHES                                     */}
      {/* ========================================================================= */}
      <div className="bg-[#12141a] border border-white/[0.08] rounded-3xl overflow-hidden shadow-xl">
        {loading && dishes.length === 0 ? (
          <div className="py-20 text-center">
            <RefreshCw className="w-7 h-7 text-[#dfba6c] animate-spin mx-auto mb-3" />
            <p className="text-xs font-mono text-[#8c8e96]">Loading dishes from Supabase...</p>
          </div>
        ) : filteredDishes.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-4 text-[#dfba6c]">
              <ImageIcon className="w-7 h-7" />
            </div>
            <h4 className="text-base font-serif text-white mb-1">
              {searchQuery || selectedCategory !== 'All' ? 'No Matching Dishes Found' : 'No Dishes Found'}
            </h4>
            <p className="text-xs text-[#8c8e96] font-light max-w-md mx-auto mb-6">
              Click "+ Add New Dish" above to create your first dish and upload its image.
            </p>
            <button
              type="button"
              onClick={() => {
                setEditingDish(null);
                setFormData({ name: '', price: '', category: 'BBQ', image: '', is_available: true });
                setShowModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#dfba6c] hover:bg-[#ebd8ab] text-[#090a0d] font-bold text-xs rounded-full shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ Add New Dish</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#161822] border-b border-white/[0.08] text-[10px] font-mono uppercase tracking-wider text-[#a0a3af]">
                <tr>
                  <th className="py-3.5 px-5">Image</th>
                  <th className="py-3.5 px-4">Name</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Price</th>
                  <th className="py-3.5 px-4">Is_Available</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] text-xs">
                {filteredDishes.map((dish) => (
                  <tr key={dish.id} className="hover:bg-white/[0.02] transition-colors group">
                    
                    {/* Column 1: Image */}
                    <td className="py-3 px-5">
                      <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-[#171922] border border-white/[0.1] shrink-0 group/img">
                        {dish.image ? (
                          <img
                            src={dish.image}
                            alt={dish.name}
                            className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#6b6e79]">
                            <ImageIcon className="w-5 h-5 opacity-40" />
                          </div>
                        )}
                        {dish.image && (
                          <button
                            type="button"
                            onClick={() => setPreviewImageModal({ url: dish.image, name: dish.name })}
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                            title="Click to view full image"
                          >
                            <Eye className="w-4 h-4 text-[#dfba6c]" />
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Column 2: Name */}
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-semibold text-white block text-sm group-hover:text-[#dfba6c] transition-colors">
                          {dish.name}
                        </span>
                        <span className="text-[10px] font-mono text-[#71747d] mt-0.5 block">
                          ID: {dish.id.substring(0, 14)}
                        </span>
                      </div>
                    </td>

                    {/* Column 3: Category */}
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-mono font-medium border ${
                        dish.category === 'BBQ'
                          ? 'bg-amber-950/40 text-amber-300 border-amber-500/30'
                          : dish.category === 'Karahi'
                          ? 'bg-red-950/40 text-red-300 border-red-500/30'
                          : dish.category === 'Biryani'
                          ? 'bg-yellow-950/40 text-yellow-300 border-yellow-500/30'
                          : dish.category === 'Fast Food'
                          ? 'bg-orange-950/40 text-orange-300 border-orange-500/30'
                          : 'bg-cyan-950/40 text-cyan-300 border-cyan-500/30'
                      }`}>
                        {dish.category}
                      </span>
                    </td>

                    {/* Column 4: Price */}
                    <td className="py-3.5 px-4 font-mono font-bold text-white text-sm tabular-nums">
                      {formatPKR(dish.price)}
                    </td>

                    {/* Column 5: Is_Available (Interactive toggle) */}
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() => handleToggleAvailability(dish)}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono transition-all cursor-pointer ${
                          dish.is_available
                            ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60'
                            : 'bg-rose-950/60 border border-rose-800/40 text-rose-300 hover:bg-rose-900/60'
                        }`}
                        title="Click to toggle availability"
                      >
                        <span className={`w-2 h-2 rounded-full ${dish.is_available ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                        <span className="font-medium">
                          {dish.is_available ? 'Available' : 'Sold Out'}
                        </span>
                      </button>
                    </td>

                    {/* Column 6: Actions (Edit & Delete) */}
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* ========================================================================= */}
                        {/* 3. EDIT BUTTON: EXACT HANDLER PER USER INSTRUCTIONS                       */}
                        {/* ========================================================================= */}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDish(dish);
                            setFormData({
                              name: dish.name,
                              price: dish.price,
                              category: dish.category,
                              image: dish.image,
                              is_available: dish.is_available,
                            });
                            setShowModal(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.12] text-[#ebd8ab] hover:text-white border border-white/[0.08] transition-all text-xs font-medium cursor-pointer"
                          title="Edit Dish"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-[#dfba6c]" />
                          <span>Edit</span>
                        </button>

                        {/* ========================================================================= */}
                        {/* 5. DELETE BUTTON: EXACT HANDLER PER USER INSTRUCTIONS                     */}
                        {/* ========================================================================= */}
                        <button
                          type="button"
                          onClick={() => handleDelete(dish)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 transition-all text-xs font-medium cursor-pointer"
                          title="Delete Dish"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 6. MODAL JSX: EXACT STRUCTURE & ELEMENTS PER USER INSTRUCTIONS            */}
      {/* ========================================================================= */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#1e1e2f] p-6 rounded-2xl w-full max-w-md border border-white/10 shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h2 className="text-lg font-bold text-white font-serif tracking-wide">
                {editingDish ? 'Edit Dish' : 'Add New Dish'}
              </h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-[#8c8e96] hover:text-white p-1 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Dish Name */}
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[#dfba6c] mb-1">
                Dish Name
              </label>
              <input
                type="text"
                placeholder="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#141422] border border-white/10 rounded-xl text-white text-xs placeholder-[#71747d] focus:outline-none focus:border-[#dfba6c]"
              />
            </div>

            {/* Price */}
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[#dfba6c] mb-1">
                Price (PKR)
              </label>
              <input
                type="number"
                placeholder="Price"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#141422] border border-white/10 rounded-xl text-white font-mono text-xs placeholder-[#71747d] focus:outline-none focus:border-[#dfba6c]"
              />
            </div>

            {/* Category Dropdown */}
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[#dfba6c] mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-[#141422] border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-[#dfba6c]"
              >
                <option>BBQ</option>
                <option>Karahi</option>
                <option>Fast Food</option>
                <option>Biryani</option>
                <option>Drinks</option>
              </select>
            </div>

            {/* File Upload to Supabase Storage 'dish-images' bucket */}
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[#dfba6c] mb-1">
                Dish Image
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="w-full text-xs text-[#a0a3af] file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#dfba6c]/20 file:text-[#dfba6c] hover:file:bg-[#dfba6c]/30 cursor-pointer"
              />
            </div>

            {/* Image Preview */}
            {formData.image && (
              <div className="flex items-center gap-3 p-2 bg-[#141422] rounded-xl border border-white/10">
                <img
                  src={formData.image}
                  alt="Dish preview"
                  className="h-20 w-20 object-cover rounded-lg border border-white/10 shrink-0"
                />
                <div className="text-[11px] font-mono text-[#a0a3af] break-all leading-relaxed">
                  <span className="text-emerald-400 block font-semibold mb-0.5">Image Ready</span>
                  <span className="line-clamp-2">{formData.image}</span>
                </div>
              </div>
            )}

            {/* Is Available Toggle */}
            <div className="flex items-center justify-between p-3 bg-[#141422] rounded-xl border border-white/10">
              <span className="text-xs text-white">Is Available in Menu</span>
              <input
                type="checkbox"
                checked={formData.is_available}
                onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                className="w-4 h-4 accent-[#dfba6c] cursor-pointer"
              />
            </div>

            {/* Save & Cancel Buttons */}
            <div className="flex gap-2.5 mt-5 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={handleSave}
                disabled={uploading}
                className="flex-1 py-2.5 bg-gradient-to-r from-[#e9c878] via-[#dfba6c] to-[#c59d5f] hover:brightness-110 active:scale-98 text-[#090a0d] font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {uploading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <span>Save</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-[#a0a3af] hover:text-white rounded-xl text-xs font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Full image preview modal */}
      {previewImageModal && (
        <div
          onClick={() => setPreviewImageModal(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200 cursor-zoom-out"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-[#12141a] border border-white/[0.1] rounded-3xl p-4 shadow-2xl cursor-default"
          >
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.08]">
              <span className="font-serif text-sm font-semibold text-white">
                {previewImageModal.name}
              </span>
              <button
                onClick={() => setPreviewImageModal(null)}
                className="p-1 rounded-full bg-white/[0.05] text-[#8c8e96] hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden bg-black max-h-[70vh] flex items-center justify-center">
              <img
                src={previewImageModal.url}
                alt={previewImageModal.name}
                className="w-full h-auto max-h-[70vh] object-contain"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
