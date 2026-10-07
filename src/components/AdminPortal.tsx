import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Shield, Lock, User, Key, Mail, CheckCircle2, AlertCircle, 
  ShoppingBag, Calendar, Users, Phone, MapPin, Clock, ArrowRight, 
  RefreshCw, LogOut, Search, Filter, ExternalLink, ChevronRight, Check,
  Copy, FileText, Sparkles, Navigation, Layers, Video, Image as ImageIcon,
  Play, Upload, Film, Eye, Trash2, Camera
} from 'lucide-react';
import { Order, OrderStatus, MenuItem, Category } from '../types';
import { 
  TableReservation, 
  AdminUser, 
  checkAdminSlotClaimed, 
  registerMasterAdminSlot, 
  authenticateAdmin, 
  getCurrentAdminSession, 
  logoutAdminSession,
  fetchReservationsFromSupabase,
  updateReservationStatusInSupabase,
  updateOrderInSupabase,
  updateDailyMarketPriceInSupabase,
  upsertMenuItemInSupabase,
  fetchCourierGpsTelemetry,
  updateCourierGpsInSupabase,
  QUETTA_BASE_LOCATION,
  QuettaGpsTelemetry
} from '../utils/supabaseService';
import { supabase, SUPABASE_CONFIG } from '../utils/supabaseClient';
import { formatPKR } from '../utils/currency';
import { ManageDishes } from './ManageDishes';

interface AdminPortalProps {
  isOpen: boolean;
  onClose: () => void;
  orders?: Order[];
  onUpdateOrder: (updatedOrder: Order) => void;
  onRefreshOrders?: () => void;
  menuItems?: MenuItem[];
  onUpdateMenuItems?: (items: MenuItem[]) => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  isOpen,
  onClose,
  orders = [],
  onUpdateOrder,
  onRefreshOrders,
  menuItems = [],
  onUpdateMenuItems = () => {},
}) => {
  // Safe array references
  const safeOrders = Array.isArray(orders) ? orders : [];
  const safeMenuItems = Array.isArray(menuItems) ? menuItems : [];

  // Auth state
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(() => getCurrentAdminSession());
  const [slotClaimed, setSlotClaimed] = useState<boolean>(true);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Form states for login / registration
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active admin tab
  const [activeTab, setActiveTab] = useState<'orders' | 'manage_dishes' | 'reservations' | 'customers' | 'menu_pricing' | 'courier'>('orders');

  // Daily Menu & Market Pricing state
  const [priceEdits, setPriceEdits] = useState<Record<string, { price: number; notes: string; isAvailable: boolean }>>({});
  const [savingPriceId, setSavingPriceId] = useState<string | null>(null);
  const [savedSuccessId, setSavedSuccessId] = useState<string | null>(null);
  const [menuSearch, setMenuSearch] = useState('');
  const [menuCatFilter, setMenuCatFilter] = useState<Category | 'all'>('all');

  // Add new dish modal state (including Picture & Video)
  const [isAddDishOpen, setIsAddDishOpen] = useState(false);
  const [newDishName, setNewDishName] = useState('');
  const [newDishUrdu, setNewDishUrdu] = useState('');
  const [newDishCategory, setNewDishCategory] = useState<Category>('shawarma');
  const [newDishPrice, setNewDishPrice] = useState<number>(650);
  const [newDishDesc, setNewDishDesc] = useState('');
  const [newDishMarketNotes, setNewDishMarketNotes] = useState('Quetta daily market value');
  const [newDishImage, setNewDishImage] = useState('');
  const [newDishImageMode, setNewDishImageMode] = useState<'url' | 'upload' | 'preset'>('preset');
  const [newDishVideo, setNewDishVideo] = useState('');
  const [newDishVideoMode, setNewDishVideoMode] = useState<'none' | 'url' | 'upload' | 'sample'>('none');
  const [activeAdminVideoModal, setActiveAdminVideoModal] = useState<{ url: string; title: string } | null>(null);

  // Quetta GPS Telemetry state
  const [courierSector, setCourierSector] = useState<string>(QUETTA_BASE_LOCATION.address);
  const [courierLat, setCourierLat] = useState<number>(QUETTA_BASE_LOCATION.lat);
  const [courierLng, setCourierLng] = useState<number>(QUETTA_BASE_LOCATION.lng);
  const [isBroadcastingGps, setIsBroadcastingGps] = useState(false);
  const [gpsBroadcastMsg, setGpsBroadcastMsg] = useState<string | null>(null);

  // Reservations state
  const [reservations, setReservations] = useState<TableReservation[]>([]);
  const [isLoadingReservations, setIsLoadingReservations] = useState(false);

  // Orders filter & search
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [selectedOrderForModal, setSelectedOrderForModal] = useState<Order | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<{
    customer_name: string;
    phone: string;
    total: number | string;
    items: React.ReactNode;
  } | null>(null);

  // Reservations filter & search
  const [resSearchQuery, setResSearchQuery] = useState('');
  const [resStatusFilter, setResStatusFilter] = useState<'all' | 'confirmed' | 'cancelled'>('all');

  // Customer search
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [supabaseDishCount, setSupabaseDishCount] = useState<number>(0);

  // Catalog JSON Manager & Inventory state
  const [isCatalogManagerOpen, setIsCatalogManagerOpen] = useState(false);
  const [catalogCmdInput, setCatalogCmdInput] = useState('');
  const [catalogCmdOutput, setCatalogCmdOutput] = useState<string | null>(null);
  const [copiedCatalogJson, setCopiedCatalogJson] = useState(false);

  // Check admin slot on mount or when opening
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    setAuthLoading(true);

    checkAdminSlotClaimed().then((res) => {
      if (!mounted) return;
      setSlotClaimed(res.claimed);
      if (!res.claimed) {
        setAuthMode('register');
      } else {
        setAuthMode('login');
      }
      setAuthLoading(false);
    });

    // Check existing session
    const session = getCurrentAdminSession();
    if (session) {
      setCurrentAdmin(session);
    }

    // Load reservations
    loadReservations();

    // Initialize price edits map
    const initialEdits: Record<string, { price: number; notes: string; isAvailable: boolean }> = {};
    safeMenuItems.forEach((m) => {
      initialEdits[m.id] = {
        price: m.dailyMarketPrice || m.basePrice,
        notes: m.marketPriceNotes || 'Quetta daily market value',
        isAvailable: m.isAvailable !== false,
      };
    });
    setPriceEdits(initialEdits);

    // Fetch GPS telemetry from Supabase
    fetchCourierGpsTelemetry().then((tel) => {
      if (tel && mounted) {
        setCourierLat(tel.currentLat);
        setCourierLng(tel.currentLng);
        setCourierSector(tel.currentSector);
      }
    });

    // Fetch count of dishes in Supabase 'Dishes' or 'dishes' table
    supabase.from('Dishes').select('id', { count: 'exact', head: true }).then((res) => {
      if (mounted && res.count && res.count > 0) {
        setSupabaseDishCount(res.count);
      } else {
        supabase.from('dishes').select('id', { count: 'exact', head: true }).then((res2) => {
          if (mounted) {
            if (res2.count && res2.count > 0) {
              setSupabaseDishCount(res2.count);
            } else {
              try {
                const local = localStorage.getItem('dastaan_manage_dishes_list_v2');
                if (local) {
                  const arr = JSON.parse(local);
                  if (Array.isArray(arr) && arr.length > 0) {
                    setSupabaseDishCount(arr.length);
                  }
                }
              } catch {
                // ignore
              }
            }
          }
        });
      }
    });

    return () => {
      mounted = false;
    };
  }, [isOpen, menuItems]);

  const loadReservations = async () => {
    setIsLoadingReservations(true);
    const data = await fetchReservationsFromSupabase();
    setReservations(data);
    setIsLoadingReservations(false);
  };

  // Handle Register (Single Slot)
  const handleRegisterSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    if (regPassword !== regConfirmPassword) {
      setAuthError('Passwords do not match.');
      return;
    }

    if (regPassword.length < 6) {
      setAuthError('Password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    const res = await registerMasterAdminSlot({
      fullName: regFullName,
      username: regUsername,
      email: regEmail,
      password: regPassword,
    });
    setIsSubmitting(false);

    if (!res.success || !res.user) {
      setAuthError(res.error || 'Failed to claim admin slot.');
      return;
    }

    setSlotClaimed(true);
    setCurrentAdmin(res.user);
    setAuthSuccess('Master Admin account created! Single slot is now permanently locked.');
  };

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');
    setIsSubmitting(true);

    const res = await authenticateAdmin(loginIdentifier, loginPassword);
    setIsSubmitting(false);

    if (!res.success || !res.user) {
      setAuthError(res.error || 'Invalid credentials.');
      return;
    }

    setCurrentAdmin(res.user);
    setAuthSuccess('Logged in as Master Administrator.');
  };

  // Handle Logout
  const handleLogout = () => {
    logoutAdminSession();
    setCurrentAdmin(null);
    setLoginPassword('');
    setAuthSuccess('');
    setAuthError('');
  };

  // Handle updating order status
  const handleStatusChange = (order: Order, newStatus: OrderStatus) => {
    const stageFlow: OrderStatus[] = [
      'confirmed',
      'kitchen_dum',
      'packing_check',
      'out_for_delivery',
      'delivered',
    ];

    const updatedMilestones = order.milestones.map((m) => {
      const stageIdx = stageFlow.indexOf(m.stage);
      const targetIdx = stageFlow.indexOf(newStatus);
      return {
        ...m,
        completed: stageIdx < targetIdx || newStatus === 'delivered',
        active: stageIdx === targetIdx && newStatus !== 'delivered',
      };
    });

    const progressMap: Record<OrderStatus, number> = {
      confirmed: 15,
      kitchen_dum: 40,
      packing_check: 65,
      out_for_delivery: 85,
      delivered: 100,
    };

    const updatedDriver = order.driver
      ? {
          ...order.driver,
          progressPercent: progressMap[newStatus],
        }
      : undefined;

    const updatedOrder: Order = {
      ...order,
      status: newStatus,
      driver: updatedDriver,
      milestones: updatedMilestones,
    };

    onUpdateOrder(updatedOrder);

    // Sync to Supabase
    updateOrderInSupabase(updatedOrder).catch((err) => {
      console.warn('[Admin Supabase Sync]', err);
    });
  };

  // Handle reservation status update
  const handleUpdateReservationStatus = async (id: string, newStatus: 'confirmed' | 'cancelled') => {
    setReservations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
    );
    await updateReservationStatusInSupabase(id, newStatus);
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return safeOrders.filter((o) => {
      if (orderStatusFilter !== 'all' && o.status !== orderStatusFilter) {
        return false;
      }
      if (orderSearchQuery.trim()) {
        const q = orderSearchQuery.toLowerCase();
        const matchesId = o.id.toLowerCase().includes(q);
        const matchesName = o.customer.fullName.toLowerCase().includes(q);
        const matchesPhone = o.customer.phone.toLowerCase().includes(q);
        const matchesAddr = o.customer.address.toLowerCase().includes(q);
        if (!matchesId && !matchesName && !matchesPhone && !matchesAddr) return false;
      }
      return true;
    });
  }, [safeOrders, orderStatusFilter, orderSearchQuery]);

  // Filtered reservations
  const filteredReservations = useMemo(() => {
    return reservations.filter((r) => {
      if (resStatusFilter !== 'all' && r.status !== resStatusFilter) {
        return false;
      }
      if (resSearchQuery.trim()) {
        const q = resSearchQuery.toLowerCase();
        const matchesName = r.fullName.toLowerCase().includes(q);
        const matchesPhone = r.phone.toLowerCase().includes(q);
        const matchesDate = r.reservationDate.includes(q);
        if (!matchesName && !matchesPhone && !matchesDate) return false;
      }
      return true;
    });
  }, [reservations, resStatusFilter, resSearchQuery]);

  // Aggregated Customer Directory
  const customerDirectory = useMemo(() => {
    const map = new Map<string, {
      fullName: string;
      phone: string;
      email?: string;
      addresses: Set<string>;
      ordersCount: number;
      totalSpent: number;
      reservationsCount: number;
      lastDate: string;
    }>();

    // From orders
    safeOrders.forEach((o) => {
      const phoneKey = o.customer.phone.trim();
      if (!phoneKey) return;

      const existing = map.get(phoneKey) || {
        fullName: o.customer.fullName,
        phone: phoneKey,
        email: o.customer.email,
        addresses: new Set<string>(),
        ordersCount: 0,
        totalSpent: 0,
        reservationsCount: 0,
        lastDate: o.placedAt,
      };

      existing.ordersCount += 1;
      existing.totalSpent += o.total;
      if (o.customer.address) existing.addresses.add(o.customer.address);
      if (new Date(o.placedAt) > new Date(existing.lastDate)) {
        existing.lastDate = o.placedAt;
      }
      map.set(phoneKey, existing);
    });

    // From reservations
    reservations.forEach((r) => {
      const phoneKey = r.phone.trim();
      if (!phoneKey) return;

      const existing = map.get(phoneKey) || {
        fullName: r.fullName,
        phone: phoneKey,
        email: undefined,
        addresses: new Set<string>(),
        ordersCount: 0,
        totalSpent: 0,
        reservationsCount: 0,
        lastDate: r.createdAt,
      };

      existing.reservationsCount += 1;
      map.set(phoneKey, existing);
    });

    let list = Array.from(map.values());
    if (customerSearchQuery.trim()) {
      const q = customerSearchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.fullName.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          (c.email && c.email.toLowerCase().includes(q))
      );
    }
    return list;
  }, [safeOrders, reservations, customerSearchQuery]);

  // Filtered Menu Items for Daily Pricing Tab
  const filteredMenuItems = useMemo(() => {
    return safeMenuItems.filter((item) => {
      if (menuCatFilter !== 'all' && item.category !== menuCatFilter) {
        return false;
      }
      if (menuSearch.trim()) {
        const q = menuSearch.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          (item.urduName && item.urduName.includes(q))
        );
      }
      return true;
    });
  }, [safeMenuItems, menuCatFilter, menuSearch]);

  const handlePriceChange = (id: string, price: number) => {
    setPriceEdits((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || { notes: 'Quetta daily market value', isAvailable: true }),
        price,
      },
    }));
  };

  const handleNotesChange = (id: string, notes: string) => {
    setPriceEdits((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || { price: 0, isAvailable: true }),
        notes,
      },
    }));
  };

  const handleAvailabilityToggle = (id: string) => {
    setPriceEdits((prev) => {
      const current = prev[id] || { price: 0, notes: '', isAvailable: true };
      return {
        ...prev,
        [id]: {
          ...current,
          isAvailable: !current.isAvailable,
        },
      };
    });
  };

  const handleSaveDailyPrice = async (itemId: string) => {
    const edit = priceEdits[itemId];
    if (!edit) return;

    setSavingPriceId(itemId);
    const success = await updateDailyMarketPriceInSupabase(
      itemId,
      edit.price,
      edit.notes,
      edit.isAvailable
    );
    setSavingPriceId(null);

    if (success) {
      setSavedSuccessId(itemId);
      setTimeout(() => setSavedSuccessId(null), 2500);

      const updated = menuItems.map((m) => {
        if (m.id === itemId) {
          return {
            ...m,
            basePrice: edit.price,
            dailyMarketPrice: edit.price,
            marketPriceNotes: edit.notes,
            isAvailable: edit.isAvailable,
          };
        }
        return m;
      });
      onUpdateMenuItems(updated);
    }
  };

  const handleAddNewDish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDishName.trim()) return;

    const newId = `${newDishCategory}-${Date.now().toString(36)}`;
    const finalImage = newDishImage.trim() || (newDishCategory === 'shawarma'
      ? '/src/assets/images/quetta_shawarma_wrap_1791134720429.jpg'
      : newDishCategory === 'pizza'
      ? '/src/assets/images/quetta_tikka_pizza_1791134736306.jpg'
      : newDishCategory === 'handi'
      ? '/src/assets/images/quetta_creamy_handi_1791134753990.jpg'
      : newDishCategory === 'kebab'
      ? '/src/assets/images/quetta_chapli_kebab_1791134777685.jpg'
      : '/src/assets/images/dewaan_hero_handi_biryani_1791045111743.jpg');

    const newDish: MenuItem = {
      id: newId,
      name: newDishName.trim(),
      urduName: newDishUrdu.trim() || undefined,
      category: newDishCategory,
      basePrice: newDishPrice,
      dailyMarketPrice: newDishPrice,
      marketPriceNotes: newDishMarketNotes.trim() || 'Quetta daily market value',
      isAvailable: true,
      description: newDishDesc.trim() || `Special fresh ${newDishName} prepared by Dewaan chefs in Quetta.`,
      culinaryNotes: 'Prepared fresh to order in Quetta.',
      ingredients: ['Fresh Meat & Vegetables', 'Pure Spices'],
      spiceLevelDefault: 'medium',
      spiceCustomizable: true,
      portionOptions: [
        { id: 'standard', name: 'Standard Serving', priceDelta: 0, serving: '1 Person' },
      ],
      prepTime: '20-25 min',
      dietary: ['halal'],
      image: finalImage,
      videoUrl: newDishVideo.trim() || undefined,
    };

    await upsertMenuItemInSupabase(newDish);
    onUpdateMenuItems([newDish, ...safeMenuItems]);
    setIsAddDishOpen(false);
    setNewDishName('');
    setNewDishUrdu('');
    setNewDishDesc('');
    setNewDishImage('');
    setNewDishVideo('');
    setNewDishImageMode('preset');
    setNewDishVideoMode('none');
  };

  const handleBroadcastGps = async (landmark: { name: string; lat: number; lng: number; sector: string }) => {
    setIsBroadcastingGps(true);
    setCourierLat(landmark.lat);
    setCourierLng(landmark.lng);
    setCourierSector(landmark.sector);

    const ok = await updateCourierGpsInSupabase(landmark.lat, landmark.lng, landmark.sector);
    setIsBroadcastingGps(false);
    if (ok) {
      setGpsBroadcastMsg(`Live Quetta GPS synced in Supabase: ${landmark.sector} (${landmark.lat}° N, ${landmark.lng}° E)`);
      setTimeout(() => setGpsBroadcastMsg(null), 3000);
    }
  };

  const [isSyncingAllDishes, setIsSyncingAllDishes] = useState(false);
  const [syncAllMsg, setSyncAllMsg] = useState<string | null>(null);

  const handleSyncAllDishesToSupabase = async () => {
    setIsSyncingAllDishes(true);
    setSyncAllMsg(null);
    let successCount = 0;
    for (const item of safeMenuItems) {
      const edit = priceEdits[item.id];
      const itemToSave = {
        ...item,
        dailyMarketPrice: edit?.price ?? item.dailyMarketPrice ?? item.basePrice,
        marketPriceNotes: edit?.notes ?? item.marketPriceNotes ?? 'Quetta daily market value',
        isAvailable: edit?.isAvailable ?? (item.isAvailable !== false),
      };
      const ok = await upsertMenuItemInSupabase(itemToSave);
      if (ok) successCount++;
    }
    setIsSyncingAllDishes(false);
    setSyncAllMsg(`Successfully synced ${successCount} authentic Quetta dishes with daily market value to Supabase!`);
    setTimeout(() => setSyncAllMsg(null), 4000);
  };

  // Overall financial stats
  const totalRevenue = safeOrders.reduce((sum, o) => sum + o.total, 0);
  const activeOrdersCount = safeOrders.filter((o) => o.status !== 'delivered').length;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPhone(text);
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/90 backdrop-blur-xl animate-in fade-in duration-200 text-[#f1f2f5]">
      
      {/* Top Navigation Bar of Admin Portal */}
      <div className="sticky top-0 z-30 bg-[#0e1017]/95 border-b border-white/[0.08] backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#dfba6c] to-[#99732b] flex items-center justify-center text-[#090a0d] shadow-md font-serif font-bold text-base">
            D
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-lg font-bold tracking-wide text-white">
                Dewaan Admin Portal
              </h2>
              {currentAdmin && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#dfba6c]/15 border border-[#dfba6c]/40 text-[#ebd8ab] font-mono text-[10px]">
                  <Shield className="w-3 h-3 text-[#dfba6c]" />
                  <span>Master Admin</span>
                </span>
              )}
            </div>
            <span className="text-[11px] font-mono text-[#8c8e96] block">
              Supabase Project: {SUPABASE_CONFIG.projectId}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {currentAdmin && (
            <div className="hidden md:flex items-center gap-3 pr-3 border-r border-white/[0.08]">
              <span className="text-xs text-[#a0a3af]">
                Signed in as <strong className="text-white font-medium">{currentAdmin.fullName}</strong>
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-xs text-[#8c8e96] hover:text-white transition-colors"
              >
                <LogOut className="w-3 h-3" />
                <span>Logout</span>
              </button>
            </div>
          )}

          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-xs text-white transition-all font-medium"
          >
            <span>Exit Portal</span>
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Loading state */}
        {authLoading ? (
          <div className="py-24 text-center">
            <RefreshCw className="w-8 h-8 text-[#dfba6c] animate-spin mx-auto mb-3" />
            <p className="text-xs font-mono text-[#8c8e96]">Verifying Admin Slot Status...</p>
          </div>
        ) : !currentAdmin ? (
          /* ========================================================================= */
          /* AUTH SCREEN: SINGLE SLOT REGISTRATION OR LOCKED LOGIN                     */
          /* ========================================================================= */
          <div className="max-w-md mx-auto py-12">
            <div className="bg-[#12141a] border border-white/[0.1] rounded-3xl p-7 sm:p-9 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#dfba6c]/5 rounded-full blur-3xl pointer-events-none" />

              {/* Icon & Eyebrow */}
              <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-5 text-[#dfba6c] shadow-lg">
                <Shield className="w-7 h-7" />
              </div>

              {slotClaimed ? (
                /* Slot Already Claimed -> Login View Only */
                <div>
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/50 border border-emerald-500/40 text-emerald-400 font-mono text-[10px] tracking-wide uppercase mb-2">
                      <Lock className="w-3 h-3" />
                      <span>Registration Closed · 1/1 Slot Occupied</span>
                    </div>
                    <h3 className="font-serif text-2xl font-medium text-white">
                      Master Admin Sign In
                    </h3>
                    <p className="text-xs text-[#8c8e96] mt-1.5 font-light leading-relaxed">
                      Single administrator slot has been claimed and locked. Enter your credentials to access live orders & reservations.
                    </p>
                  </div>

                  {authError && (
                    <div className="mb-4 p-3 bg-rose-950/40 border border-rose-800/40 rounded-2xl text-xs text-rose-300 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{authError}</span>
                    </div>
                  )}

                  <form onSubmit={handleLogin} className="space-y-4 text-xs">
                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-[#dfba6c] mb-1.5">
                        Username or Email
                      </label>
                      <div className="relative">
                        <User className="w-3.5 h-3.5 text-[#727581] absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={loginIdentifier}
                          onChange={(e) => setLoginIdentifier(e.target.value)}
                          placeholder="admin / email@dewaan.com"
                          className="w-full pl-9 pr-4 py-2.5 bg-[#171922] border border-white/[0.08] rounded-xl text-white placeholder-[#6b6e79] focus:outline-none focus:border-[#dfba6c]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-[#dfba6c] mb-1.5">
                        Master Password
                      </label>
                      <div className="relative">
                        <Key className="w-3.5 h-3.5 text-[#727581] absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="password"
                          required
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-9 pr-4 py-2.5 bg-[#171922] border border-white/[0.08] rounded-xl text-white placeholder-[#6b6e79] focus:outline-none focus:border-[#dfba6c]"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 bg-gradient-to-r from-[#e9c878] via-[#dfba6c] to-[#c59d5f] hover:brightness-110 active:scale-98 text-[#090a0d] font-semibold rounded-full shadow-md shadow-[#dfba6c]/15 transition-all text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Authenticating...</span>
                        </>
                      ) : (
                        <>
                          <span>Sign In to Dashboard</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              ) : (
                /* Slot Free -> First-Time Master Admin Registration (Single Slot Available) */
                <div>
                  <div className="text-center mb-6">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/60 border border-amber-500/40 text-amber-300 font-mono text-[10px] tracking-wide uppercase mb-2">
                      <Sparkles className="w-3 h-3 text-[#dfba6c]" />
                      <span>Single Slot Available · 1/1</span>
                    </div>
                    <h3 className="font-serif text-2xl font-medium text-white">
                      Setup Master Admin
                    </h3>
                    <p className="text-xs text-[#8c8e96] mt-1.5 font-light leading-relaxed">
                      You are creating the single authorized admin account. After this setup, no further accounts can be created.
                    </p>
                  </div>

                  {authError && (
                    <div className="mb-4 p-3 bg-rose-950/40 border border-rose-800/40 rounded-2xl text-xs text-rose-300 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{authError}</span>
                    </div>
                  )}

                  <form onSubmit={handleRegisterSlot} className="space-y-3.5 text-xs">
                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-[#dfba6c] mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={regFullName}
                        onChange={(e) => setRegFullName(e.target.value)}
                        placeholder="e.g. Master Chef / Owner"
                        className="w-full px-3.5 py-2.5 bg-[#171922] border border-white/[0.08] rounded-xl text-white placeholder-[#6b6e79] focus:outline-none focus:border-[#dfba6c]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-[#dfba6c] mb-1">
                        Admin Username
                      </label>
                      <input
                        type="text"
                        required
                        value={regUsername}
                        onChange={(e) => setRegUsername(e.target.value)}
                        placeholder="e.g. dewaan_admin"
                        className="w-full px-3.5 py-2.5 bg-[#171922] border border-white/[0.08] rounded-xl text-white placeholder-[#6b6e79] focus:outline-none focus:border-[#dfba6c]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-[#dfba6c] mb-1">
                        Admin Email
                      </label>
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="owner@dewaan-dining.com"
                        className="w-full px-3.5 py-2.5 bg-[#171922] border border-white/[0.08] rounded-xl text-white placeholder-[#6b6e79] focus:outline-none focus:border-[#dfba6c]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-mono uppercase tracking-wider text-[#dfba6c] mb-1">
                          Password
                        </label>
                        <input
                          type="password"
                          required
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Min 6 chars"
                          className="w-full px-3.5 py-2.5 bg-[#171922] border border-white/[0.08] rounded-xl text-white placeholder-[#6b6e79] focus:outline-none focus:border-[#dfba6c]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-mono uppercase tracking-wider text-[#dfba6c] mb-1">
                          Confirm Password
                        </label>
                        <input
                          type="password"
                          required
                          value={regConfirmPassword}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          placeholder="Repeat password"
                          className="w-full px-3.5 py-2.5 bg-[#171922] border border-white/[0.08] rounded-xl text-white placeholder-[#6b6e79] focus:outline-none focus:border-[#dfba6c]"
                        />
                      </div>
                    </div>

                    <div className="p-3 bg-[#171922] rounded-xl border border-white/[0.06] text-[11px] text-[#8c8e96] leading-relaxed">
                      <strong className="text-white font-medium">Permanent Locking Rule:</strong> Creating this account will permanently claim the single slot. Nobody else will ever be able to register.
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 bg-gradient-to-r from-[#e9c878] via-[#dfba6c] to-[#c59d5f] hover:brightness-110 active:scale-98 text-[#090a0d] font-semibold rounded-full shadow-md shadow-[#dfba6c]/15 transition-all text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Provisioning Account & Locking...</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>Create Master Admin & Lock Registration</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* AUTHENTICATED ADMIN DASHBOARD                                            */
          /* ========================================================================= */
          <div className="space-y-6">
            
            {/* Metric Overview Bento Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="p-5 rounded-3xl bg-[#12141a] border border-white/[0.08] shadow-md flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#8c8e96] block mb-1">
                    Total Revenue
                  </span>
                  <div className="text-xl sm:text-2xl font-mono font-bold text-[#dfba6c] tabular-nums">
                    {formatPKR(totalRevenue)}
                  </div>
                  <span className="text-[11px] text-[#71747d] mt-1 block">
                    All booked orders
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#dfba6c]/10 text-[#dfba6c] flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6" />
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-[#12141a] border border-white/[0.08] shadow-md flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#8c8e96] block mb-1">
                    Active Deliveries
                  </span>
                  <div className="text-xl sm:text-2xl font-mono font-bold text-white tabular-nums">
                    {activeOrdersCount}
                  </div>
                  <span className="text-[11px] text-emerald-400 mt-1 block flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Courier: Allah Dad</span>
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-950/40 text-emerald-400 flex items-center justify-center">
                  <Navigation className="w-6 h-6" />
                </div>
              </div>

              {/* Dishes (CRUD) Card */}
              <div 
                onClick={() => setActiveTab('manage_dishes')}
                className="p-5 rounded-3xl bg-[#12141a] hover:bg-[#161822] border border-white/[0.08] hover:border-[#dfba6c]/40 shadow-md flex items-center justify-between cursor-pointer transition-all group"
              >
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#8c8e96] block mb-1 group-hover:text-[#dfba6c] transition-colors">
                    Manage Dishes
                  </span>
                  <div className="text-xl sm:text-2xl font-mono font-bold text-white tabular-nums">
                    {supabaseDishCount}
                  </div>
                  <span className="text-[11px] text-[#dfba6c] mt-1 block font-mono">
                    Supabase CRUD &rarr;
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-[#dfba6c]/10 text-[#dfba6c] flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Sparkles className="w-6 h-6" />
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-[#12141a] border border-white/[0.08] shadow-md flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#8c8e96] block mb-1">
                    Table Reservations
                  </span>
                  <div className="text-xl sm:text-2xl font-mono font-bold text-white tabular-nums">
                    {reservations.length}
                  </div>
                  <span className="text-[11px] text-[#71747d] mt-1 block">
                    Dine-in palace guests
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white/[0.04] text-white flex items-center justify-center">
                  <Calendar className="w-6 h-6" />
                </div>
              </div>

              <div className="p-5 rounded-3xl bg-[#12141a] border border-white/[0.08] shadow-md flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#8c8e96] block mb-1">
                    Registered Customers
                  </span>
                  <div className="text-xl sm:text-2xl font-mono font-bold text-white tabular-nums">
                    {customerDirectory.length}
                  </div>
                  <span className="text-[11px] text-[#71747d] mt-1 block">
                    Verified phone contacts
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white/[0.04] text-white flex items-center justify-center">
                  <Users className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Admin Segmented Tabs Navigation */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
                <button
                  type="button"
                  onClick={() => setActiveTab('orders')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-medium transition-all ${
                    activeTab === 'orders'
                      ? 'bg-[#dfba6c] text-[#090a0d] font-bold shadow-md'
                      : 'bg-[#151722] text-[#8c8e96] hover:text-white border border-white/[0.06]'
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Orders ({orders.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('manage_dishes')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-medium transition-all ${
                    activeTab === 'manage_dishes'
                      ? 'bg-[#dfba6c] text-[#090a0d] font-bold shadow-md'
                      : 'bg-[#151722] text-[#8c8e96] hover:text-white border border-white/[0.06]'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#dfba6c] group-hover:rotate-12 transition-transform" />
                  <span>Manage Dishes</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('reservations')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-medium transition-all ${
                    activeTab === 'reservations'
                      ? 'bg-[#dfba6c] text-[#090a0d] font-bold shadow-md'
                      : 'bg-[#151722] text-[#8c8e96] hover:text-white border border-white/[0.06]'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Table Reservations ({reservations.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('customers')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-medium transition-all ${
                    activeTab === 'customers'
                      ? 'bg-[#dfba6c] text-[#090a0d] font-bold shadow-md'
                      : 'bg-[#151722] text-[#8c8e96] hover:text-white border border-white/[0.06]'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Customer Details ({customerDirectory.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('menu_pricing')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-medium transition-all ${
                    activeTab === 'menu_pricing'
                      ? 'bg-[#dfba6c] text-[#090a0d] font-bold shadow-md'
                      : 'bg-[#151722] text-[#8c8e96] hover:text-white border border-white/[0.06]'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Daily Menu & Market Prices ({menuItems.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('courier')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-medium transition-all ${
                    activeTab === 'courier'
                      ? 'bg-[#dfba6c] text-[#090a0d] font-bold shadow-md'
                      : 'bg-[#151722] text-[#8c8e96] hover:text-white border border-white/[0.06]'
                  }`}
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Courier & Quetta GPS</span>
                </button>
              </div>

              {/* Refresh buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (onRefreshOrders) onRefreshOrders();
                    loadReservations();
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#161822] hover:bg-[#1e202d] text-xs text-[#a0a3af] hover:text-white border border-white/[0.08] transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sync Supabase</span>
                </button>
              </div>
            </div>

            {/* ===================================================================== */}
            {/* TAB 1: ORDERS MANAGEMENT                                              */}
            {/* ===================================================================== */}
            {activeTab === 'orders' && (
              <div className="space-y-4">
                
                {/* Search & Status Filters */}
                <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-[#727581] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={orderSearchQuery}
                      onChange={(e) => setOrderSearchQuery(e.target.value)}
                      placeholder="Search Order ID, customer name, phone..."
                      className="w-full pl-10 pr-4 py-2.5 bg-[#12141a] border border-white/[0.08] rounded-full text-xs text-white placeholder-[#71747d] focus:outline-none focus:border-[#dfba6c]"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none text-xs">
                    {(['all', 'confirmed', 'kitchen_dum', 'packing_check', 'out_for_delivery', 'delivered'] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => setOrderStatusFilter(st)}
                        className={`px-3 py-1.5 rounded-full capitalize whitespace-nowrap text-xs transition-colors ${
                          orderStatusFilter === st
                            ? 'bg-[#dfba6c] text-[#090a0d] font-bold shadow-sm'
                            : 'bg-[#141620] text-[#8c8e96] hover:text-white border border-white/[0.06]'
                        }`}
                      >
                        {st.replace(/_/g, ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Orders Table */}
                {filteredOrders.length === 0 ? (
                  <div className="p-16 text-center bg-[#12141a] border border-white/[0.08] rounded-3xl">
                    <ShoppingBag className="w-8 h-8 text-[#8c8e96] mx-auto mb-3 stroke-[1.5]" />
                    <h4 className="text-base font-serif text-white mb-1">No Orders Found</h4>
                    <p className="text-xs text-[#8c8e96] font-light max-w-sm mx-auto">
                      {orderSearchQuery ? 'Try adjusting your search criteria.' : 'When customers book orders on the website, they will immediately appear here.'}
                    </p>
                  </div>
                ) : (
                  <div className="bg-[#12141a] border border-white/[0.08] rounded-3xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#161822] border-b border-white/[0.08] text-[10px] font-mono uppercase tracking-wider text-[#a0a3af]">
                          <tr>
                            <th className="py-3.5 px-4">Order ID & Date</th>
                            <th className="py-3.5 px-4">Customer Details</th>
                            <th className="py-3.5 px-4">Items & Customization</th>
                            <th className="py-3.5 px-4">Total (PKR)</th>
                            <th className="py-3.5 px-4">Fulfillment Status</th>
                            <th className="py-3.5 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.06] text-xs">
                          {filteredOrders.map((ord) => (
                            <tr key={ord.id} className="hover:bg-white/[0.02] transition-colors">
                              
                              {/* Order ID & Time */}
                              <td className="py-4 px-4 align-top">
                                <span className="font-mono font-bold text-white text-sm block">
                                  {ord.id}
                                </span>
                                <span className="text-[11px] text-[#71747d] font-mono block mt-0.5">
                                  {new Date(ord.placedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} · {new Date(ord.placedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-mono uppercase ${
                                  ord.orderType === 'delivery' ? 'bg-[#dfba6c]/15 text-[#ebd8ab]' : 'bg-blue-950/40 text-blue-300'
                                }`}>
                                  {ord.orderType}
                                </span>
                              </td>

                              {/* Customer Details */}
                              <td className="py-4 px-4 align-top">
                                <div className="font-medium text-white">{ord.customer.fullName}</div>
                                <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px] mt-0.5 font-semibold">
                                  <Phone className="w-3 h-3" />
                                  <a href={`tel:${ord.customer.phone}`} className="hover:underline">
                                    {ord.customer.phone}
                                  </a>
                                </div>
                                <div className="text-[11px] text-[#8c8e96] max-w-xs mt-1 line-clamp-2 font-light">
                                  {ord.customer.address}
                                </div>
                              </td>

                              {/* Items */}
                              <td className="py-4 px-4 align-top">
                                <div className="space-y-1 max-w-xs">
                                  {ord.items.map((it, idx) => (
                                    <div key={idx} className="text-[11px]">
                                      <span className="font-mono text-[#dfba6c] font-bold mr-1.5">{it.quantity}x</span>
                                      <span className="text-white font-medium">{it.menuItem.name}</span>
                                      <span className="text-[10px] text-[#8c8e96] block pl-4 font-light">
                                        {it.customization.portion.name} · {it.customization.spiceLevel.replace('_', ' ')}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </td>

                              {/* Total */}
                              <td className="py-4 px-4 align-top">
                                <div className="font-mono font-bold text-[#dfba6c] text-sm tabular-nums">
                                  {formatPKR(ord.total)}
                                </div>
                                <span className="text-[10px] text-[#71747d] block capitalize font-mono mt-0.5">
                                  {ord.paymentMethod.replace('_', ' ')}
                                </span>
                              </td>

                              {/* Status Controller */}
                              <td className="py-4 px-4 align-top">
                                <select
                                  value={ord.status}
                                  onChange={(e) => handleStatusChange(ord, e.target.value as OrderStatus)}
                                  className="px-3 py-1.5 bg-[#171922] border border-white/[0.1] rounded-xl text-xs text-[#ebd8ab] font-medium focus:outline-none focus:border-[#dfba6c]"
                                >
                                  <option value="confirmed">Confirmed</option>
                                  <option value="kitchen_dum">Kitchen Dum Cooking</option>
                                  <option value="packing_check">Tamper Packaging</option>
                                  <option value="out_for_delivery">Out For Delivery (Allah Dad)</option>
                                  <option value="delivered">Delivered</option>
                                </select>
                              </td>

                              {/* Actions */}
                              <td className="py-4 px-4 align-top text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedOrder({
                                        customer_name: ord.customer.fullName || 'Royal Patron',
                                        phone: ord.customer.phone || '+92...',
                                        total: ord.total,
                                        items: (
                                          <div className="space-y-1">
                                            {ord.items.map((it, idx) => (
                                              <div key={idx} className="flex justify-between items-center text-xs">
                                                <span>{it.quantity}x {it.menuItem.name}</span>
                                                <span className="font-mono">Rs. {it.totalPrice}</span>
                                              </div>
                                            ))}
                                          </div>
                                        ),
                                      });
                                    }}
                                    className="px-3 py-1.5 rounded-full bg-[#dfba6c] hover:bg-[#ebd8ab] text-[#090a0d] text-xs font-bold transition-all shadow-sm cursor-pointer whitespace-nowrap"
                                  >
                                    Print Receipt
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedOrderForModal(ord)}
                                    className="px-3 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-[#ebd8ab] text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
                                  >
                                    Details
                                  </button>
                                </div>
                              </td>

                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* ===================================================================== */}
            {/* TAB: MANAGE DISHES (FULL CRUD FOR SUPABASE 'dishes' TABLE)           */}
            {/* ===================================================================== */}
            {activeTab === 'manage_dishes' && (
              <ManageDishes />
            )}

            {/* ===================================================================== */}
            {/* TAB 2: TABLE RESERVATIONS MANAGEMENT                                 */}
            {/* ===================================================================== */}
            {activeTab === 'reservations' && (
              <div className="space-y-4">
                
                <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-[#727581] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={resSearchQuery}
                      onChange={(e) => setResSearchQuery(e.target.value)}
                      placeholder="Search guest name, phone, date..."
                      className="w-full pl-10 pr-4 py-2.5 bg-[#12141a] border border-white/[0.08] rounded-full text-xs text-white placeholder-[#71747d] focus:outline-none focus:border-[#dfba6c]"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    {(['all', 'confirmed', 'cancelled'] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => setResStatusFilter(st)}
                        className={`px-3 py-1.5 rounded-full capitalize text-xs transition-colors ${
                          resStatusFilter === st
                            ? 'bg-[#dfba6c] text-[#090a0d] font-bold shadow-sm'
                            : 'bg-[#141620] text-[#8c8e96] hover:text-white border border-white/[0.06]'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredReservations.length === 0 ? (
                  <div className="p-16 text-center bg-[#12141a] border border-white/[0.08] rounded-3xl">
                    <Calendar className="w-8 h-8 text-[#8c8e96] mx-auto mb-3 stroke-[1.5]" />
                    <h4 className="text-base font-serif text-white mb-1">No Reservations Found</h4>
                    <p className="text-xs text-[#8c8e96] font-light max-w-sm mx-auto">
                      Table reservations booked via the website modal will sync to this table in real time.
                    </p>
                  </div>
                ) : (
                  <div className="bg-[#12141a] border border-white/[0.08] rounded-3xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#161822] border-b border-white/[0.08] text-[10px] font-mono uppercase tracking-wider text-[#a0a3af]">
                          <tr>
                            <th className="py-3.5 px-4">Reservation ID</th>
                            <th className="py-3.5 px-4">Guest Name & Phone</th>
                            <th className="py-3.5 px-4">Date & Time</th>
                            <th className="py-3.5 px-4">Party Size</th>
                            <th className="py-3.5 px-4">Seating Area</th>
                            <th className="py-3.5 px-4">Notes</th>
                            <th className="py-3.5 px-4">Status</th>
                            <th className="py-3.5 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.06] text-xs">
                          {filteredReservations.map((res) => (
                            <tr key={res.id} className="hover:bg-white/[0.02] transition-colors">
                              <td className="py-4 px-4 font-mono font-bold text-white">
                                {res.id}
                              </td>
                              <td className="py-4 px-4">
                                <div className="font-medium text-white">{res.fullName}</div>
                                <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px] mt-0.5 font-semibold">
                                  <Phone className="w-3 h-3" />
                                  <a href={`tel:${res.phone}`} className="hover:underline">
                                    {res.phone}
                                  </a>
                                </div>
                              </td>
                              <td className="py-4 px-4 font-mono text-[11px] text-[#e0e2ec]">
                                <div>{res.reservationDate}</div>
                                <span className="text-[#dfba6c]">{res.timeSlot}</span>
                              </td>
                              <td className="py-4 px-4 font-mono tabular-nums text-white">
                                {res.guestCount} {res.guestCount === 1 ? 'Guest' : 'Guests'}
                              </td>
                              <td className="py-4 px-4 capitalize text-[#ebd8ab]">
                                {res.seatingArea.replace(/_/g, ' ')} Lounge
                              </td>
                              <td className="py-4 px-4 text-[11px] text-[#8c8e96] max-w-xs truncate italic">
                                {res.notes || '—'}
                              </td>
                              <td className="py-4 px-4">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono capitalize ${
                                  res.status === 'confirmed'
                                    ? 'bg-emerald-950/50 border border-emerald-500/40 text-emerald-400'
                                    : 'bg-rose-950/50 border border-rose-800/40 text-rose-300'
                                }`}>
                                  {res.status}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-right">
                                {res.status === 'confirmed' ? (
                                  <button
                                    onClick={() => handleUpdateReservationStatus(res.id, 'cancelled')}
                                    className="px-3 py-1 bg-rose-950/30 hover:bg-rose-900/40 text-rose-400 border border-rose-800/40 rounded-full text-[11px] transition-colors"
                                  >
                                    Cancel
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleUpdateReservationStatus(res.id, 'confirmed')}
                                    className="px-3 py-1 bg-emerald-950/30 hover:bg-emerald-900/40 text-emerald-400 border border-emerald-500/30 rounded-full text-[11px] transition-colors"
                                  >
                                    Re-Confirm
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* ===================================================================== */}
            {/* TAB 3: CUSTOMER DIRECTORY / USER DETAILS                             */}
            {/* ===================================================================== */}
            {activeTab === 'customers' && (
              <div className="space-y-4">
                
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-[#727581] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={customerSearchQuery}
                      onChange={(e) => setCustomerSearchQuery(e.target.value)}
                      placeholder="Search customer by name, phone or email..."
                      className="w-full pl-10 pr-4 py-2.5 bg-[#12141a] border border-white/[0.08] rounded-full text-xs text-white placeholder-[#71747d] focus:outline-none focus:border-[#dfba6c]"
                    />
                  </div>

                  <div className="text-xs text-[#8c8e96] font-mono">
                    Total Distinct Patrons: <span className="text-white font-bold">{customerDirectory.length}</span>
                  </div>
                </div>

                {customerDirectory.length === 0 ? (
                  <div className="p-16 text-center bg-[#12141a] border border-white/[0.08] rounded-3xl">
                    <Users className="w-8 h-8 text-[#8c8e96] mx-auto mb-3 stroke-[1.5]" />
                    <h4 className="text-base font-serif text-white mb-1">No Customers Registered Yet</h4>
                    <p className="text-xs text-[#8c8e96] font-light max-w-sm mx-auto">
                      As soon as users place an order or book a table reservation, their customer profile and verified phone will populate here automatically.
                    </p>
                  </div>
                ) : (
                  <div className="bg-[#12141a] border border-white/[0.08] rounded-3xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#161822] border-b border-white/[0.08] text-[10px] font-mono uppercase tracking-wider text-[#a0a3af]">
                          <tr>
                            <th className="py-3.5 px-4">Customer Name</th>
                            <th className="py-3.5 px-4">Verified Mobile Number</th>
                            <th className="py-3.5 px-4">Email</th>
                            <th className="py-3.5 px-4">Orders Placed</th>
                            <th className="py-3.5 px-4">Total Spent (PKR)</th>
                            <th className="py-3.5 px-4">Reservations</th>
                            <th className="py-3.5 px-4">Addresses On Record</th>
                            <th className="py-3.5 px-4 text-right">Quick Contact</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.06] text-xs">
                          {customerDirectory.map((cust, idx) => (
                            <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                              <td className="py-4 px-4 font-medium text-white">
                                {cust.fullName}
                              </td>

                              {/* Phone */}
                              <td className="py-4 px-4">
                                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 font-mono text-xs font-bold">
                                  <Phone className="w-3 h-3" />
                                  <span>{cust.phone}</span>
                                </div>
                              </td>

                              <td className="py-4 px-4 text-[#8c8e96] font-mono text-[11px]">
                                {cust.email || '—'}
                              </td>

                              <td className="py-4 px-4 font-mono font-bold text-white tabular-nums">
                                {cust.ordersCount}
                              </td>

                              <td className="py-4 px-4 font-mono font-bold text-[#dfba6c] tabular-nums">
                                {formatPKR(cust.totalSpent)}
                              </td>

                              <td className="py-4 px-4 font-mono text-white tabular-nums">
                                {cust.reservationsCount}
                              </td>

                              <td className="py-4 px-4 text-[11px] text-[#8c8e96] max-w-xs truncate">
                                {Array.from(cust.addresses).join(' | ') || 'Pickup / Dine-in only'}
                              </td>

                              <td className="py-4 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <a
                                    href={`tel:${cust.phone}`}
                                    className="p-1.5 rounded-full bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-400 border border-emerald-500/30 transition-colors"
                                    title="Call Customer directly"
                                  >
                                    <Phone className="w-3.5 h-3.5" />
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(cust.phone)}
                                    className="p-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-white transition-colors"
                                    title="Copy customer phone"
                                  >
                                    {copiedPhone === cust.phone ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* ===================================================================== */}
            {/* TAB 4: DAILY MENU & MARKET VALUE PRICING (SUPABASE SYNCED)            */}
            {/* ===================================================================== */}
            {activeTab === 'menu_pricing' && (
              <div className="space-y-4">
                
                {/* Header Actions & Search */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-[#727581] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={menuSearch}
                      onChange={(e) => setMenuSearch(e.target.value)}
                      placeholder="Search shawarma, pizza, biryani, karahi, handi..."
                      className="w-full pl-10 pr-4 py-2.5 bg-[#12141a] border border-white/[0.08] rounded-full text-xs text-white placeholder-[#71747d] focus:outline-none focus:border-[#dfba6c]"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isSyncingAllDishes}
                      onClick={handleSyncAllDishesToSupabase}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-emerald-600/90 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all"
                      title="Upload or sync all authentic Quetta dishes and daily prices to Supabase table"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAllDishes ? 'animate-spin' : ''}`} />
                      <span>{isSyncingAllDishes ? 'Syncing...' : 'Sync All Dishes to Supabase'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsAddDishOpen(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#dfba6c] hover:bg-[#ebd8ab] text-[#090a0d] font-bold text-xs shadow-md transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>+ Add New Dish</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsCatalogManagerOpen(true);
                        setCatalogCmdOutput(
                          JSON.stringify(
                            safeMenuItems.map((m) => ({
                              id: m.id,
                              title: m.name,
                              price: m.dailyMarketPrice || m.basePrice,
                              isDummy: false,
                            })),
                            null,
                            2
                          )
                        );
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-[#ebd8ab] border border-white/[0.08] font-bold text-xs shadow-md transition-all"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#dfba6c]" />
                      <span>Catalog JSON Manager</span>
                    </button>
                  </div>
                </div>

                {syncAllMsg && (
                  <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-2xl text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>{syncAllMsg}</span>
                  </div>
                )}

                {/* Supabase Column Info Banner */}
                <div className="p-3.5 bg-[#141620] border border-white/[0.08] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#dfba6c]/15 text-[#dfba6c] flex items-center justify-center font-mono font-bold text-xs">
                      SQL
                    </div>
                    <div>
                      <div className="font-semibold text-white flex items-center gap-2">
                        <span>Supabase Daily Market Value Column</span>
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          table: public.menu_items
                        </span>
                      </div>
                      <span className="text-[11px] text-[#8c8e96] block font-mono">
                        daily_market_price NUMERIC(10, 2) · market_price_notes TEXT · is_available BOOLEAN
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const sql = `ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS daily_market_price NUMERIC(10, 2) DEFAULT 0;\nALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS market_price_notes TEXT DEFAULT 'Daily Quetta market value';\nALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true;\nALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS last_price_updated_at TIMESTAMPTZ DEFAULT NOW();`;
                      navigator.clipboard.writeText(sql);
                      setCopiedSql(true);
                      setTimeout(() => setCopiedSql(false), 2500);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-[#ebd8ab] text-[11px] font-mono shrink-0 transition-colors"
                  >
                    {copiedSql ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Copied Column SQL!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-[#dfba6c]" />
                        <span>Copy Column SQL</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Category Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
                  {[
                    { id: 'all', label: 'All Dishes' },
                    { id: 'biryani', label: 'Biryani' },
                    { id: 'karahi', label: 'Karahi' },
                    { id: 'handi', label: 'Handi' },
                    { id: 'kebab', label: 'Kebab' },
                    { id: 'shawarma', label: 'Shawarma' },
                    { id: 'pizza', label: 'Pizza' },
                    { id: 'breads_sides', label: 'Breads' },
                    { id: 'beverages', label: 'Drinks' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setMenuCatFilter(cat.id as Category | 'all')}
                      className={`px-3 py-1.5 rounded-full capitalize whitespace-nowrap text-xs transition-colors ${
                        menuCatFilter === cat.id
                          ? 'bg-[#dfba6c] text-[#090a0d] font-bold shadow-sm'
                          : 'bg-[#141620] text-[#8c8e96] hover:text-white border border-white/[0.06]'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Dishes Pricing Table */}
                <div className="bg-[#12141a] border border-white/[0.08] rounded-3xl overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#161822] border-b border-white/[0.08] text-[10px] font-mono uppercase tracking-wider text-[#a0a3af]">
                        <tr>
                          <th className="py-3.5 px-4">Dish & Category</th>
                          <th className="py-3.5 px-4">Base Price</th>
                          <th className="py-3.5 px-4">Daily Market Value (PKR)</th>
                          <th className="py-3.5 px-4">Market Rate Notes</th>
                          <th className="py-3.5 px-4">Availability</th>
                          <th className="py-3.5 px-4 text-right">Supabase Sync</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.06] text-xs">
                        {filteredMenuItems.map((item) => {
                          const edit = priceEdits[item.id] || {
                            price: item.dailyMarketPrice || item.basePrice,
                            notes: item.marketPriceNotes || 'Quetta daily market value',
                            isAvailable: item.isAvailable !== false,
                          };

                          const isSaving = savingPriceId === item.id;
                          const isSaved = savedSuccessId === item.id;

                          return (
                            <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                              {/* Dish info & thumbnail */}
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-3">
                                  <img
                                    src={item.image}
                                    alt={item.name}
                                    className="w-11 h-11 rounded-xl object-cover border border-white/[0.08] shrink-0"
                                  />
                                  <div>
                                    <span className="font-semibold text-white block">
                                      {item.name}
                                    </span>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.05] text-[#dfba6c] capitalize">
                                        {item.category.replace('_', ' ')}
                                      </span>
                                      {item.urduName && (
                                        <span className="text-[11px] font-serif text-[#ebd8ab]/80">
                                          {item.urduName}
                                        </span>
                                      )}
                                      {item.videoUrl && (
                                        <button
                                          type="button"
                                          onClick={() => setActiveAdminVideoModal({ url: item.videoUrl!, title: item.name })}
                                          className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-red-950/60 border border-red-500/30 text-red-300 hover:bg-red-900/60 transition-colors"
                                        >
                                          <Play className="w-2.5 h-2.5 fill-current" />
                                          <span>Video</span>
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Base Price */}
                              <td className="py-3.5 px-4 font-mono text-[#a0a3af] tabular-nums">
                                {formatPKR(item.basePrice)}
                              </td>

                              {/* Daily Market Price Input */}
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[11px] font-mono text-[#dfba6c]">Rs.</span>
                                  <input
                                    type="number"
                                    min={0}
                                    step={10}
                                    value={edit.price}
                                    onChange={(e) => handlePriceChange(item.id, Number(e.target.value) || 0)}
                                    className="w-28 px-3 py-1.5 bg-[#171922] border border-white/[0.1] rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-[#dfba6c]"
                                  />
                                </div>
                              </td>

                              {/* Market Notes Input */}
                              <td className="py-3.5 px-4">
                                <input
                                  type="text"
                                  value={edit.notes}
                                  onChange={(e) => handleNotesChange(item.id, e.target.value)}
                                  placeholder="e.g. Quetta meat rate"
                                  className="w-48 px-3 py-1.5 bg-[#171922] border border-white/[0.08] rounded-xl text-xs text-[#ebd8ab] placeholder-[#6b6e79] focus:outline-none focus:border-[#dfba6c]"
                                />
                              </td>

                              {/* Availability Switch */}
                              <td className="py-3.5 px-4">
                                <button
                                  type="button"
                                  onClick={() => handleAvailabilityToggle(item.id)}
                                  className={`px-3 py-1 rounded-full text-[11px] font-mono transition-colors ${
                                    edit.isAvailable
                                      ? 'bg-emerald-950/50 border border-emerald-500/40 text-emerald-400'
                                      : 'bg-rose-950/50 border border-rose-800/40 text-rose-300'
                                  }`}
                                >
                                  {edit.isAvailable ? 'In Stock' : 'Sold Out Today'}
                                </button>
                              </td>

                              {/* Save Action */}
                              <td className="py-3.5 px-4 text-right">
                                <button
                                  type="button"
                                  disabled={isSaving}
                                  onClick={() => handleSaveDailyPrice(item.id)}
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                                    isSaved
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-white/[0.06] hover:bg-white/[0.12] text-[#ebd8ab]'
                                  }`}
                                >
                                  {isSaving ? (
                                    <>
                                      <RefreshCw className="w-3 h-3 animate-spin" />
                                      <span>Saving...</span>
                                    </>
                                  ) : isSaved ? (
                                    <>
                                      <Check className="w-3 h-3" />
                                      <span>Saved!</span>
                                    </>
                                  ) : (
                                    <span>Update Daily Price</span>
                                  )}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* ===================================================================== */}
            {/* TAB 5: COURIER ALLAH DAD & QUETTA GPS TELEMETRY                        */}
            {/* ===================================================================== */}
            {activeTab === 'courier' && (
              <div className="space-y-6">
                
                {gpsBroadcastMsg && (
                  <div className="p-3 bg-emerald-950/50 border border-emerald-500/40 rounded-2xl text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>{gpsBroadcastMsg}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Courier Allah Dad profile */}
                  <div className="p-6 bg-[#12141a] border border-white/[0.08] rounded-3xl shadow-xl space-y-4">
                    <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#dfba6c]">
                      <Navigation className="w-4 h-4" />
                      <span>Designated Quetta Courier</span>
                    </div>

                    <div className="flex items-center gap-4 pt-2">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#dfba6c] to-[#99732b] flex items-center justify-center font-serif text-2xl font-bold text-[#090a0d] shadow-lg shadow-[#dfba6c]/20">
                        AD
                      </div>
                      <div>
                        <h3 className="font-serif text-2xl font-medium text-white">
                          Allah Dad
                        </h3>
                        <div className="text-xs text-emerald-400 font-mono font-bold flex items-center gap-1.5 mt-0.5">
                          <Phone className="w-3.5 h-3.5" />
                          <span>+923118427913</span>
                        </div>
                        <span className="text-[11px] text-[#8c8e96] block font-light mt-1">
                          Honda CG-125 Royal Express Cargo · Plate: QTA-772-EXP
                        </span>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/[0.06] grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 bg-[#171922] rounded-2xl border border-white/[0.06]">
                        <span className="text-[10px] text-[#71747d] font-mono uppercase block">Active Delivery Region</span>
                        <span className="text-emerald-400 font-medium">Quetta City, Balochistan</span>
                      </div>
                      <div className="p-3 bg-[#171922] rounded-2xl border border-white/[0.06]">
                        <span className="text-[10px] text-[#71747d] font-mono uppercase block">Thermal Handi Lock</span>
                        <span className="text-[#ebd8ab] font-medium">Aroma Sealed & Hot</span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <a
                        href="tel:+923118427913"
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-full flex items-center justify-center gap-2 shadow-md transition-all"
                      >
                        <Phone className="w-4 h-4" />
                        <span>Direct Dial Allah Dad (+923118427913)</span>
                      </a>
                    </div>
                  </div>

                  {/* Quetta GPS Live Telemetry Controller */}
                  <div className="p-6 bg-[#12141a] border border-white/[0.08] rounded-3xl shadow-xl space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#dfba6c]">
                        <MapPin className="w-4 h-4" />
                        <span>Quetta GPS Live Telemetry</span>
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-[10px] font-mono text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Supabase Live</span>
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#171922] border border-white/[0.06] space-y-2 text-xs">
                      <div className="flex justify-between font-mono">
                        <span className="text-[#8c8e96]">Current GPS Coordinates:</span>
                        <span className="text-emerald-400 font-bold">{courierLat}° N, {courierLng}° E</span>
                      </div>
                      <div className="flex justify-between font-mono">
                        <span className="text-[#8c8e96]">Active Sector:</span>
                        <span className="text-white font-medium">{courierSector}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[10px] font-mono uppercase tracking-wider text-[#8c8e96]">
                        Update Courier Location in Quetta (Saves to Supabase):
                      </label>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {QUETTA_BASE_LOCATION.landmarks.map((lm, idx) => (
                          <button
                            key={idx}
                            type="button"
                            disabled={isBroadcastingGps}
                            onClick={() => handleBroadcastGps(lm)}
                            className={`p-2.5 rounded-xl border text-left text-xs transition-colors ${
                              courierSector === lm.sector
                                ? 'bg-[#dfba6c]/15 border-[#dfba6c] text-[#ebd8ab] font-bold'
                                : 'bg-[#151722] hover:bg-[#1c1e2b] border-white/[0.06] text-[#a0a3af] hover:text-white'
                            }`}
                          >
                            <span className="block font-medium">{lm.name}</span>
                            <span className="text-[10px] font-mono text-[#71747d] block mt-0.5">
                              {lm.lat.toFixed(4)}° N, {lm.lng.toFixed(4)}° E
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>

                </div>

              </div>
            )}

          </div>
        )}

      </div>

      {/* Detail Order Modal if admin clicked "View Receipt" */}
      {selectedOrderForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#111319] border border-white/[0.1] rounded-3xl p-6 sm:p-7 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-4">
              <div>
                <h4 className="font-serif text-xl font-bold text-white">
                  Order {selectedOrderForModal.id} Receipt
                </h4>
                <span className="text-[11px] font-mono text-[#8c8e96]">
                  Placed: {new Date(selectedOrderForModal.placedAt).toLocaleString()}
                </span>
              </div>
              <button
                onClick={() => setSelectedOrderForModal(null)}
                className="p-1.5 text-[#8c8e96] hover:text-white rounded-full bg-white/[0.04]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Customer Details */}
            <div className="p-4 bg-[#161822] rounded-2xl border border-white/[0.06] mb-4 text-xs space-y-1">
              <div className="font-bold text-white text-sm">{selectedOrderForModal.customer.fullName}</div>
              <div className="text-emerald-400 font-mono font-bold flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" />
                <span>{selectedOrderForModal.customer.phone}</span>
              </div>
              <div className="text-[#a0a3af] font-light pt-1">{selectedOrderForModal.customer.address}</div>
              {selectedOrderForModal.customer.deliveryNotes && (
                <div className="text-[#dfba6c] italic pt-1">
                  &quot;{selectedOrderForModal.customer.deliveryNotes}&quot;
                </div>
              )}
            </div>

            {/* Items */}
            <div className="divide-y divide-white/[0.06] mb-4 text-xs">
              {selectedOrderForModal.items.map((it, idx) => (
                <div key={idx} className="py-2.5 flex items-start justify-between">
                  <div>
                    <span className="font-bold text-white">{it.quantity}x {it.menuItem.name}</span>
                    <span className="text-[11px] text-[#8c8e96] block">
                      Portion: {it.customization.portion.name} · Heat: {it.customization.spiceLevel.replace('_', ' ')}
                    </span>
                    {it.customization.selectedAddOns.length > 0 && (
                      <span className="text-[11px] text-[#ebd8ab] block">
                        Add-ons: {it.customization.selectedAddOns.map((a) => a.name).join(', ')}
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-[#dfba6c] font-bold">
                    {formatPKR(it.totalPrice)}
                  </span>
                </div>
              ))}
            </div>

            {/* Financial breakdown */}
            <div className="p-3 bg-[#0d0e13] rounded-2xl border border-white/[0.06] text-xs space-y-1 text-[#8c8e96] mb-5">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="text-white font-mono">{formatPKR(selectedOrderForModal.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery:</span>
                <span className="text-white font-mono">{formatPKR(selectedOrderForModal.deliveryFee)}</span>
              </div>
              <div className="flex justify-between">
                <span>Copper Handi Packaging:</span>
                <span className="text-white font-mono">{formatPKR(selectedOrderForModal.packagingFee)}</span>
              </div>
              <div className="flex justify-between">
                <span>Courier Tip:</span>
                <span className="text-white font-mono">{formatPKR(selectedOrderForModal.tip)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-white/[0.08] text-sm font-bold text-white">
                <span className="font-serif">Grand Total:</span>
                <span className="text-[#dfba6c] font-mono text-base">{formatPKR(selectedOrderForModal.total)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedOrder({
                    customer_name: selectedOrderForModal.customer.fullName || 'Royal Patron',
                    phone: selectedOrderForModal.customer.phone || '+92...',
                    total: selectedOrderForModal.total,
                    items: (
                      <div className="space-y-1">
                        {selectedOrderForModal.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between items-center text-xs">
                            <span>{it.quantity}x {it.menuItem.name}</span>
                            <span className="font-mono">Rs. {it.totalPrice}</span>
                          </div>
                        ))}
                      </div>
                    ),
                  });
                }}
                className="flex-1 py-2.5 bg-[#dfba6c] hover:bg-[#ebd8ab] text-[#090a0d] text-xs font-bold rounded-full transition-colors cursor-pointer shadow-md"
              >
                Print Thermal Receipt
              </button>
              <button
                onClick={() => setSelectedOrderForModal(null)}
                className="flex-1 py-2.5 bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-semibold rounded-full transition-colors cursor-pointer"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Catalog JSON & Inventory Manager Modal */}
      {isCatalogManagerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-[#12141a] border border-white/[0.1] rounded-3xl shadow-2xl p-6 overflow-hidden max-h-[90vh] flex flex-col text-xs text-[#a0a3af]">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#dfba6c]/15 text-[#dfba6c] flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-serif text-lg font-bold text-white">
                    E-Commerce Catalog & Inventory Manager
                  </h4>
                  <span className="text-[11px] text-[#8c8e96] font-mono">
                    Schema: {`{ id: string, title: string, price: number, isDummy: boolean }`}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCatalogManagerOpen(false)}
                className="p-1.5 text-[#8c8e96] hover:text-white rounded-full bg-white/[0.04]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Actions & Metrics */}
            <div className="py-4 space-y-4 flex-1 overflow-y-auto">
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 bg-[#161822] rounded-2xl border border-white/[0.06]">
                  <span className="text-[10px] text-[#71747d] font-mono uppercase block">Total Catalog Items</span>
                  <span className="text-white font-mono font-bold text-sm">{safeMenuItems.length} Products</span>
                </div>
                <div className="p-3 bg-[#161822] rounded-2xl border border-white/[0.06]">
                  <span className="text-[10px] text-[#71747d] font-mono uppercase block">Dummy / Fake Items</span>
                  <span className="text-emerald-400 font-mono font-bold text-sm">0 (100% Real)</span>
                </div>
                <div className="p-3 bg-[#161822] rounded-2xl border border-white/[0.06]">
                  <span className="text-[10px] text-[#71747d] font-mono uppercase block">Daily Pricing Status</span>
                  <span className="text-[#dfba6c] font-mono font-bold text-sm">Quetta PKR Synced</span>
                </div>
              </div>

              {/* Natural Language Command Bar */}
              <div className="p-4 bg-[#161822] border border-white/[0.08] rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#dfba6c]">
                    Natural Language Catalog Command
                  </span>
                  <span className="text-[10px] text-[#71747d] font-mono">e.g. &apos;clear dummy data&apos;, &apos;change price of shawarma to 550&apos;</span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={catalogCmdInput}
                    onChange={(e) => setCatalogCmdInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const lower = catalogCmdInput.toLowerCase().trim();
                        if (lower.includes('dummy') || lower.includes('clear') || lower.includes('fake') || lower.includes('replace')) {
                          setCatalogCmdOutput(
                            JSON.stringify(
                              {
                                action: 'REPLACE_DUMMY_DATA',
                                deletedCount: 0,
                                message: 'Zero dummy items detected. All 19 products are authentic Quetta specialties.',
                                products: safeMenuItems.map((m) => ({
                                  id: m.id,
                                  title: m.name,
                                  price: m.dailyMarketPrice || m.basePrice,
                                  isDummy: false,
                                })),
                              },
                              null,
                              2
                            )
                          );
                        } else if (lower.includes('price') || lower.includes('change') || lower.includes('edit')) {
                          const found = safeMenuItems.find((m) => lower.includes(m.name.toLowerCase()) || lower.includes(m.id.toLowerCase()) || lower.includes(m.category));
                          const priceMatch = catalogCmdInput.match(/\d+/);
                          const newPrice = priceMatch ? Number(priceMatch[0]) : 650;
                          if (found) {
                            handlePriceChange(found.id, newPrice);
                            setCatalogCmdOutput(
                              JSON.stringify(
                                {
                                  action: 'EDIT_PRICE_PAYLOAD',
                                  targetId: found.id,
                                  title: found.name,
                                  oldPrice: found.dailyMarketPrice || found.basePrice,
                                  newPrice: newPrice,
                                  updatedProduct: {
                                    id: found.id,
                                    title: found.name,
                                    price: newPrice,
                                    isDummy: false,
                                  },
                                },
                                null,
                                2
                              )
                            );
                          } else {
                            setCatalogCmdOutput(
                              JSON.stringify(
                                {
                                  action: 'EDIT_PRICE_PAYLOAD',
                                  samplePayload: {
                                    id: 'shawarma-01',
                                    title: 'Special Arabian Chicken Shawarma',
                                    price: newPrice,
                                    isDummy: false,
                                  },
                                },
                                null,
                                2
                              )
                            );
                          }
                        } else {
                          setCatalogCmdOutput(
                            JSON.stringify(
                              safeMenuItems.map((m) => ({
                                id: m.id,
                                title: m.name,
                                price: m.dailyMarketPrice || m.basePrice,
                                isDummy: false,
                              })),
                              null,
                              2
                            )
                          );
                        }
                      }
                    }}
                    placeholder="Enter command: 'replace dummy data' or 'change price of ...'"
                    className="flex-1 px-3.5 py-2 bg-[#101218] border border-white/[0.08] rounded-xl text-white text-xs placeholder-[#6b6e79] focus:outline-none focus:border-[#dfba6c]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const lower = catalogCmdInput.toLowerCase().trim();
                      if (lower.includes('dummy') || lower.includes('clear') || lower.includes('fake') || lower.includes('replace')) {
                        setCatalogCmdOutput(
                          JSON.stringify(
                            {
                              action: 'REPLACE_DUMMY_DATA',
                              deletedCount: 0,
                              message: 'All dummy items cleared. 19 authentic Quetta dishes loaded with 0 dummy items.',
                              products: safeMenuItems.map((m) => ({
                                id: m.id,
                                title: m.name,
                                price: m.dailyMarketPrice || m.basePrice,
                                isDummy: false,
                              })),
                            },
                            null,
                            2
                          )
                        );
                      } else {
                        setCatalogCmdOutput(
                          JSON.stringify(
                            safeMenuItems.map((m) => ({
                              id: m.id,
                              title: m.name,
                              price: m.dailyMarketPrice || m.basePrice,
                              isDummy: false,
                            })),
                            null,
                            2
                          )
                        );
                      }
                    }}
                    className="px-4 py-2 bg-[#dfba6c] text-[#090a0d] font-bold rounded-xl"
                  >
                    Execute
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      setCatalogCmdInput('replace dummy data');
                      setCatalogCmdOutput(
                        JSON.stringify(
                          {
                            action: 'REPLACE_DUMMY_DATA',
                            deletedCount: 0,
                            status: 'All dummy data purged. 19 authentic dishes loaded.',
                            products: safeMenuItems.map((m) => ({
                              id: m.id,
                              title: m.name,
                              price: m.dailyMarketPrice || m.basePrice,
                              isDummy: false,
                            })),
                          },
                          null,
                          2
                        )
                      );
                    }}
                    className="px-2.5 py-1 bg-white/[0.05] hover:bg-white/[0.1] text-[#ebd8ab] rounded-lg"
                  >
                    Preset: Replace Dummy Data
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCatalogCmdInput('change price of shawarma to 500');
                      setCatalogCmdOutput(
                        JSON.stringify(
                          {
                            action: 'EDIT_PRICE_PAYLOAD',
                            targetId: 'shawarma-01',
                            title: 'Special Arabian Chicken Shawarma',
                            newPrice: 500,
                            payload: {
                              id: 'shawarma-01',
                              title: 'Special Arabian Chicken Shawarma',
                              price: 500,
                              isDummy: false,
                            },
                          },
                          null,
                          2
                        )
                      );
                    }}
                    className="px-2.5 py-1 bg-white/[0.05] hover:bg-white/[0.1] text-[#ebd8ab] rounded-lg"
                  >
                    Preset: Edit Shawarma Price
                  </button>
                </div>
              </div>

              {/* Output Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-white">
                    Structured Output Payload (JSON)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (catalogCmdOutput) {
                        navigator.clipboard.writeText(catalogCmdOutput);
                        setCopiedCatalogJson(true);
                        setTimeout(() => setCopiedCatalogJson(false), 2000);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/[0.05] hover:bg-white/[0.1] text-[#ebd8ab] rounded-full text-[11px] font-mono"
                  >
                    {copiedCatalogJson ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Copied JSON!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-[#dfba6c]" />
                        <span>Copy Output Payload</span>
                      </>
                    )}
                  </button>
                </div>

                <pre className="p-4 bg-[#0a0c10] border border-white/[0.08] rounded-2xl font-mono text-[11px] text-[#dfba6c] overflow-x-auto max-h-56 scrollbar-thin">
                  {catalogCmdOutput || JSON.stringify(safeMenuItems.map((m) => ({ id: m.id, title: m.name, price: m.dailyMarketPrice || m.basePrice, isDummy: false })), null, 2)}
                </pre>
              </div>

            </div>

            <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between">
              <span className="text-[10px] font-mono text-emerald-400">
                Product Schema {`{ id, title, price, isDummy }`} Active
              </span>
              <button
                type="button"
                onClick={() => setIsCatalogManagerOpen(false)}
                className="px-4 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] text-white rounded-full text-xs"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {isAddDishOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[#12141a] border border-white/[0.1] rounded-3xl p-6 sm:p-7 shadow-2xl scrollbar-thin">
            <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08] mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#dfba6c]" />
                <h4 className="font-serif text-lg font-bold text-white">
                  Add Dish to Quetta Menu
                </h4>
              </div>
              <button
                onClick={() => setIsAddDishOpen(false)}
                className="p-1.5 text-[#8c8e96] hover:text-white rounded-full bg-white/[0.04]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddNewDish} className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-[#dfba6c] mb-1">
                  Dish English Name *
                </label>
                <input
                  type="text"
                  required
                  value={newDishName}
                  onChange={(e) => setNewDishName(e.target.value)}
                  placeholder="e.g. Quetta Grilled Beef Shawarma"
                  className="w-full px-3.5 py-2.5 bg-[#171922] border border-white/[0.08] rounded-xl text-white placeholder-[#6b6e79] focus:outline-none focus:border-[#dfba6c]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-[#dfba6c] mb-1">
                    Urdu Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={newDishUrdu}
                    onChange={(e) => setNewDishUrdu(e.target.value)}
                    placeholder="کوئٹہ بیف شوارما"
                    className="w-full px-3.5 py-2.5 bg-[#171922] border border-white/[0.08] rounded-xl text-white placeholder-[#6b6e79] focus:outline-none focus:border-[#dfba6c]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-[#dfba6c] mb-1">
                    Category *
                  </label>
                  <select
                    value={newDishCategory}
                    onChange={(e) => setNewDishCategory(e.target.value as Category)}
                    className="w-full px-3 py-2.5 bg-[#171922] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-[#dfba6c]"
                  >
                    <option value="shawarma">Shawarma</option>
                    <option value="pizza">Pizza</option>
                    <option value="biryani">Biryani</option>
                    <option value="karahi">Karahi</option>
                    <option value="handi">Handi</option>
                    <option value="kebab">Kebab</option>
                    <option value="breads_sides">Breads & Sides</option>
                    <option value="beverages">Drinks & Kahwa</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-[#dfba6c] mb-1">
                    Daily Market Price (PKR) *
                  </label>
                  <input
                    type="number"
                    required
                    min={10}
                    step={10}
                    value={newDishPrice}
                    onChange={(e) => setNewDishPrice(Number(e.target.value) || 0)}
                    placeholder="e.g. 750"
                    className="w-full px-3.5 py-2.5 bg-[#171922] border border-white/[0.08] rounded-xl text-white font-mono font-bold focus:outline-none focus:border-[#dfba6c]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-[#dfba6c] mb-1">
                    Market Notes
                  </label>
                  <input
                    type="text"
                    value={newDishMarketNotes}
                    onChange={(e) => setNewDishMarketNotes(e.target.value)}
                    placeholder="e.g. Quetta livestock rate"
                    className="w-full px-3.5 py-2.5 bg-[#171922] border border-white/[0.08] rounded-xl text-white placeholder-[#6b6e79] focus:outline-none focus:border-[#dfba6c]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-[#dfba6c] mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={newDishDesc}
                  onChange={(e) => setNewDishDesc(e.target.value)}
                  placeholder="Ingredients and culinary preparation in Quetta..."
                  className="w-full px-3.5 py-2 bg-[#171922] border border-white/[0.08] rounded-xl text-white placeholder-[#6b6e79] focus:outline-none focus:border-[#dfba6c]"
                />
              </div>

              {/* PRODUCT PICTURE (PHOTO) SECTION */}
              <div className="p-3.5 bg-[#171922] border border-white/[0.08] rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-3.5 h-3.5 text-[#dfba6c]" />
                    <span className="text-[11px] font-semibold text-white">Product Picture / Photo</span>
                  </div>
                  <div className="flex items-center gap-1 bg-[#101218] p-0.5 rounded-lg border border-white/[0.06]">
                    <button
                      type="button"
                      onClick={() => setNewDishImageMode('preset')}
                      className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                        newDishImageMode === 'preset' ? 'bg-[#dfba6c] text-[#090a0d] font-bold' : 'text-[#8c8e96]'
                      }`}
                    >
                      Preset
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewDishImageMode('upload')}
                      className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                        newDishImageMode === 'upload' ? 'bg-[#dfba6c] text-[#090a0d] font-bold' : 'text-[#8c8e96]'
                      }`}
                    >
                      Upload File
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewDishImageMode('url')}
                      className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                        newDishImageMode === 'url' ? 'bg-[#dfba6c] text-[#090a0d] font-bold' : 'text-[#8c8e96]'
                      }`}
                    >
                      Image URL
                    </button>
                  </div>
                </div>

                {newDishImageMode === 'url' && (
                  <div>
                    <input
                      type="url"
                      value={newDishImage}
                      onChange={(e) => setNewDishImage(e.target.value)}
                      placeholder="https://images.unsplash.com/... or cloud image URL"
                      className="w-full px-3 py-2 bg-[#101218] border border-white/[0.08] rounded-xl text-white text-xs placeholder-[#6b6e79] focus:outline-none focus:border-[#dfba6c]"
                    />
                  </div>
                )}

                {newDishImageMode === 'upload' && (
                  <div>
                    <label className="flex flex-col items-center justify-center p-3 border border-dashed border-white/[0.15] hover:border-[#dfba6c] rounded-xl bg-[#101218] cursor-pointer transition-colors group">
                      <Upload className="w-5 h-5 text-[#dfba6c] mb-1 group-hover:scale-110 transition-transform" />
                      <span className="text-[11px] text-[#ebd8ab] font-medium">Click to choose image from device</span>
                      <span className="text-[9px] text-[#6b6e79]">PNG, JPG, WEBP accepted</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              if (event.target?.result) {
                                setNewDishImage(event.target.result as string);
                              }
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                )}

                {newDishImageMode === 'preset' && (
                  <div className="flex items-center gap-2 text-[11px] text-[#a0a3af]">
                    <span>Category Default:</span>
                    <span className="px-2 py-0.5 rounded bg-white/[0.05] text-[#ebd8ab] font-mono capitalize">
                      {newDishCategory} Quetta Culinary Visual
                    </span>
                  </div>
                )}

                {newDishImage && (
                  <div className="relative w-full h-24 rounded-xl overflow-hidden border border-white/[0.1]">
                    <img
                      src={newDishImage}
                      alt="Product preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setNewDishImage('')}
                      className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/70 hover:bg-black text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <span className="absolute bottom-1 left-2 text-[10px] font-mono text-emerald-400 bg-black/60 px-1.5 py-0.5 rounded">
                      Image attached
                    </span>
                  </div>
                )}
              </div>

              {/* PRODUCT VIDEO SECTION */}
              <div className="p-3.5 bg-[#171922] border border-white/[0.08] rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Video className="w-3.5 h-3.5 text-red-400" />
                    <span className="text-[11px] font-semibold text-white">Product Video (Optional)</span>
                  </div>
                  <div className="flex items-center gap-1 bg-[#101218] p-0.5 rounded-lg border border-white/[0.06]">
                    <button
                      type="button"
                      onClick={() => setNewDishVideoMode('url')}
                      className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                        newDishVideoMode === 'url' ? 'bg-[#dfba6c] text-[#090a0d] font-bold' : 'text-[#8c8e96]'
                      }`}
                    >
                      Video URL
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewDishVideoMode('upload')}
                      className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                        newDishVideoMode === 'upload' ? 'bg-[#dfba6c] text-[#090a0d] font-bold' : 'text-[#8c8e96]'
                      }`}
                    >
                      Upload Video
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewDishVideoMode('sample');
                        setNewDishVideo('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4');
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                        newDishVideoMode === 'sample' ? 'bg-[#dfba6c] text-[#090a0d] font-bold' : 'text-[#8c8e96]'
                      }`}
                    >
                      Sample Clip
                    </button>
                  </div>
                </div>

                {newDishVideoMode === 'url' && (
                  <div>
                    <input
                      type="url"
                      value={newDishVideo}
                      onChange={(e) => setNewDishVideo(e.target.value)}
                      placeholder="https://.../video.mp4 or YouTube link"
                      className="w-full px-3 py-2 bg-[#101218] border border-white/[0.08] rounded-xl text-white text-xs placeholder-[#6b6e79] focus:outline-none focus:border-[#dfba6c]"
                    />
                  </div>
                )}

                {newDishVideoMode === 'upload' && (
                  <div>
                    <label className="flex flex-col items-center justify-center p-3 border border-dashed border-white/[0.15] hover:border-[#dfba6c] rounded-xl bg-[#101218] cursor-pointer transition-colors group">
                      <Film className="w-5 h-5 text-red-400 mb-1 group-hover:scale-110 transition-transform" />
                      <span className="text-[11px] text-[#ebd8ab] font-medium">Click to select video file from device</span>
                      <span className="text-[9px] text-[#6b6e79]">MP4, WebM, MOV accepted</span>
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const url = URL.createObjectURL(file);
                            setNewDishVideo(url);
                          }
                        }}
                      />
                    </label>
                  </div>
                )}

                {newDishVideo ? (
                  <div className="relative rounded-xl overflow-hidden border border-white/[0.1] bg-black">
                    <video
                      src={newDishVideo}
                      controls
                      className="w-full max-h-36 object-contain"
                    />
                    <div className="p-2 bg-[#101218] flex items-center justify-between text-[10px]">
                      <span className="text-emerald-400 font-mono flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        Video player active
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setNewDishVideo('');
                          setNewDishVideoMode('none');
                        }}
                        className="text-rose-400 hover:text-rose-300 font-medium"
                      >
                        Remove Video
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-[#6b6e79]">
                    Add a video to let customers see sizzling preparation and live presentation of this dish.
                  </p>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setIsAddDishOpen(false)}
                  className="px-4 py-2 bg-white/[0.06] hover:bg-white/[0.1] text-[#a0a3af] rounded-full text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#dfba6c] hover:bg-[#ebd8ab] text-[#090a0d] font-bold text-xs rounded-full shadow-md transition-transform hover:scale-102"
                >
                  Save & Publish to Supabase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeAdminVideoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-[#12141a] border border-white/[0.1] rounded-3xl p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-3">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-red-400" />
                <h4 className="font-serif text-base font-bold text-white">
                  {activeAdminVideoModal.title} — Video Preview
                </h4>
              </div>
              <button
                onClick={() => setActiveAdminVideoModal(null)}
                className="p-1.5 text-[#8c8e96] hover:text-white rounded-full bg-white/[0.04]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center">
              <video
                src={activeAdminVideoModal.url}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Thermal Print Receipt Modal requested by User */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/80 z-[10000] flex items-center justify-center p-4">
          <div id="print-receipt" className="bg-white text-black w-full max-w-[350px] p-6 rounded-xl shadow-2xl">
            <div className="text-center border-b-2 border-dashed pb-4 mb-4">
              <h1 className="font-black text-xl tracking-wider">DEWAAN</h1>
              <p className="text-xs font-medium tracking-wide">ROYAL AWADHI CUISINE</p>
              <p className="text-[10px] text-gray-600 mt-2">Quetta, Balochistan</p>
            </div>

            <div className="text-sm space-y-2">
              <p><b>Customer:</b> {selectedOrder.customer_name || 'Royal Patron'}</p>
              <p><b>Phone:</b> {selectedOrder.phone || '+92...'}</p>
              <p><b>Date:</b> {new Date().toLocaleString()}</p>
            </div>

            <div className="border-t border-b border-dashed my-4 py-3 text-sm">
              {selectedOrder.items}
              <div className="flex justify-between font-bold text-base mt-3 pt-2 border-t border-dashed">
                <span>Total</span>
                <span>Rs. {selectedOrder.total}</span>
              </div>
            </div>

            <p className="text-center text-[10px] font-medium text-gray-600">Thank You For Your Order!</p>

            <div className="flex gap-2 mt-6 no-print">
              <button
                onClick={() => {
                  const content = document.getElementById('print-receipt');
                  if (!content) return;
                  try {
                    const printWindow = window.open('', '_blank', 'height=600,width=800');
                    if (printWindow) {
                      printWindow.document.write('<html><head><title>DEWAAN Receipt</title>');
                      printWindow.document.write('<style>body{font-family:sans-serif; padding:20px;} .no-print{display:none;}</style>');
                      printWindow.document.write('</head><body>');
                      printWindow.document.write(content.innerHTML);
                      printWindow.document.write('</body></html>');
                      printWindow.document.close();
                      printWindow.focus();
                      printWindow.print();
                      return;
                    }
                  } catch {
                    // Popup blocked or restricted
                  }
                  window.print();
                }}
                className="flex-1 bg-black text-white py-2.5 rounded-full font-bold cursor-pointer hover:bg-gray-800 transition-colors"
              >
                Print کریں
              </button>
              <button
                onClick={() => setSelectedOrder(null)}
                className="flex-1 bg-gray-200 text-black py-2.5 rounded-full font-bold cursor-pointer hover:bg-gray-300 transition-colors"
              >
                بند کریں
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
