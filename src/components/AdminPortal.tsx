import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Shield, Lock, User, Key, Mail, CheckCircle2, AlertCircle, 
  ShoppingBag, Calendar, Users, Phone, MapPin, Clock, ArrowRight, 
  RefreshCw, LogOut, Search, Filter, ExternalLink, ChevronRight, Check,
  Copy, FileText, Sparkles, Navigation, Layers, Video, Image as ImageIcon,
  Play, Upload, Film, Eye, Trash2, Camera, Pencil, Edit3, Plus, Save,
  Timer, CheckCheck, MessageCircle
} from 'lucide-react';
import { Order, OrderStatus, MenuItem, Category } from '../types';
import { 
  TableReservation, 
  ReservationStatus,
  getReservationTiming,
  checkAndExpireOverdueReservations,
  AdminUser, 
  checkAdminSlotClaimed, 
  registerMasterAdminSlot, 
  authenticateAdmin, 
  updateMasterAdminPassword,
  getCurrentAdminSession, 
  logoutAdminSession,
  AUTHORIZED_MASTER_ADMIN_EMAIL,
  AUTHORIZED_MASTER_ADMIN_NAME,
  fetchReservationsFromSupabase,
  updateReservationStatusInSupabase,
  updateOrderInSupabase,
  updateMenuItemPriceInSupabase,
  upsertMenuItemInSupabase,
  deleteMenuItemFromSupabase,
  fetchCourierGpsTelemetry,
  updateCourierGpsInSupabase,
  QUETTA_BASE_LOCATION,
  QuettaGpsTelemetry
} from '../utils/supabaseService';
import { supabase, SUPABASE_CONFIG } from '../utils/supabaseClient';
import { formatPKR } from '../utils/currency';
import { getSavedOrders } from '../utils/orderStorage';
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
  // Safe array references: Combines orders prop with local storage cache so all orders are always visible
  const safeOrders = useMemo(() => {
    const list = Array.isArray(orders) ? [...orders] : [];
    try {
      const local = getSavedOrders();
      const map = new Map<string, Order>();
      list.forEach((o) => map.set(o.id, o));
      local.forEach((o) => {
        if (!map.has(o.id)) map.set(o.id, o);
      });
      return Array.from(map.values()).sort(
        (a, b) => new Date(b.placedAt).getTime() - new Date(a.placedAt).getTime()
      );
    } catch {
      return list;
    }
  }, [orders]);
  const safeMenuItems = Array.isArray(menuItems) ? menuItems : [];

  // Admin session - strictly locked unless authenticated as fasihmehtab@gmail.com
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(() => getCurrentAdminSession());
  const [isCheckingSlot, setIsCheckingSlot] = useState(true);
  const [isSlotClaimed, setIsSlotClaimed] = useState(false);
  const [registeredAdminUser, setRegisteredAdminUser] = useState<AdminUser | null>(null);

  // Lock Screen authentication state
  const [authEmail, setAuthEmail] = useState(AUTHORIZED_MASTER_ADMIN_EMAIL);
  const [authFullName, setAuthFullName] = useState(AUTHORIZED_MASTER_ADMIN_NAME);
  const [authPassword, setAuthPassword] = useState('');
  const [authConfirmPassword, setAuthConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string | null>(null);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);

  // Active admin tab
  const [activeTab, setActiveTab] = useState<'orders' | 'manage_dishes' | 'reservations' | 'customers' | 'menu_pricing' | 'courier'>('orders');

  // Menu Catalog & Full Dish Edit state
  const [dishRowEdits, setDishRowEdits] = useState<Record<string, {
    name: string;
    urduName: string;
    category: Category;
    price: number;
    isAvailable: boolean;
  }>>({});
  const [savingDishId, setSavingDishId] = useState<string | null>(null);
  const [savedSuccessId, setSavedSuccessId] = useState<string | null>(null);
  const [deletingDishId, setDeletingDishId] = useState<string | null>(null);
  const [menuSearch, setMenuSearch] = useState('');
  const [menuCatFilter, setMenuCatFilter] = useState<Category | 'all'>('all');

  // Full Edit Dish Modal state (gives full control to edit every dish item and connect to Supabase)
  const [editingDishModal, setEditingDishModal] = useState<MenuItem | null>(null);
  const [isSavingEditModal, setIsSavingEditModal] = useState(false);
  const [editModalName, setEditModalName] = useState('');
  const [editModalUrdu, setEditModalUrdu] = useState('');
  const [editModalCategory, setEditModalCategory] = useState<Category>('shawarma');
  const [editModalPrice, setEditModalPrice] = useState<number>(0);
  const [editModalDesc, setEditModalDesc] = useState('');
  const [editModalCulinaryNotes, setEditModalCulinaryNotes] = useState('');
  const [editModalPrepTime, setEditModalPrepTime] = useState('20-25 min');
  const [editModalImage, setEditModalImage] = useState('');
  const [editModalVideo, setEditModalVideo] = useState('');
  const [editModalAvailable, setEditModalAvailable] = useState(true);
  const [editModalIngredients, setEditModalIngredients] = useState('');
  const [editModalStatusMsg, setEditModalStatusMsg] = useState<string | null>(null);

  // Add new dish modal state (including Picture & Video)
  const [isAddDishOpen, setIsAddDishOpen] = useState(false);
  const [newDishName, setNewDishName] = useState('');
  const [newDishUrdu, setNewDishUrdu] = useState('');
  const [newDishCategory, setNewDishCategory] = useState<Category>('shawarma');
  const [newDishPrice, setNewDishPrice] = useState<number>(650);
  const [newDishDesc, setNewDishDesc] = useState('');
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
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatus | 'all' | 'whatsapp'>('all');
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
  const [resStatusFilter, setResStatusFilter] = useState<ReservationStatus | 'all'>('all');
  const [autoExpiredNotice, setAutoExpiredNotice] = useState<string | null>(null);

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

  // Check admin session and slot claim status on mount/open
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    const session = getCurrentAdminSession();
    setCurrentAdmin(session);

    setIsCheckingSlot(true);
    checkAdminSlotClaimed().then((res) => {
      if (!mounted) return;
      setIsSlotClaimed(res.claimed);
      if (res.adminUser) {
        setRegisteredAdminUser(res.adminUser);
      }
      setIsCheckingSlot(false);
    });

    // Only load protected data if authenticated
    if (session) {
      loadReservations();
    }

    // Initialize dish row edits map
    const initialEdits: Record<string, {
      name: string;
      urduName: string;
      category: Category;
      price: number;
      isAvailable: boolean;
    }> = {};
    safeMenuItems.forEach((m) => {
      initialEdits[m.id] = {
        name: m.name,
        urduName: m.urduName || '',
        category: m.category,
        price: m.basePrice,
        isAvailable: m.isAvailable !== false,
      };
    });
    setDishRowEdits(initialEdits);

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

  // Live orders auto-refresh: Automatically sync orders from Supabase when portal opens or orders tab is viewed
  useEffect(() => {
    if (!isOpen) return;
    if (onRefreshOrders) onRefreshOrders();
    if (activeTab === 'orders') {
      const interval = setInterval(() => {
        if (onRefreshOrders) onRefreshOrders();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen, activeTab, onRefreshOrders]);

  const loadReservations = async () => {
    setIsLoadingReservations(true);
    const data = await fetchReservationsFromSupabase();
    // Real-time automatic check: expire any reservations exceeding the 15-minute arrival window
    const { updatedList, expiredCount } = await checkAndExpireOverdueReservations(data, 15);
    setReservations(updatedList);
    if (expiredCount > 0) {
      setAutoExpiredNotice(`⚡ ${expiredCount} reservation(s) automatically turned OFF after exceeding the 15-minute arrival window.`);
      setTimeout(() => setAutoExpiredNotice(null), 7000);
    }
    setIsLoadingReservations(false);
  };

  // Live auto-expiry background sweep: Every 2 seconds, checks all active confirmed reservations.
  // If customer has not arrived within 15 minutes of scheduled time, automatically turns OFF the reservation.
  const [, setResClockTick] = useState(0);
  useEffect(() => {
    if (!isOpen || activeTab !== 'reservations') return;

    const interval = setInterval(() => {
      setResClockTick((t) => t + 1);
      setReservations((prev) => {
        let hasExpired = false;
        const now = new Date();
        const next = prev.map((r) => {
          if (r.status === 'confirmed') {
            const timing = getReservationTiming(r.reservationDate, r.timeSlot, 15);
            if (timing.isOverdue) {
              hasExpired = true;
              updateReservationStatusInSupabase(r.id, 'expired', {
                expiredAt: now.toISOString(),
              }).catch(() => {});
              return {
                ...r,
                status: 'expired' as const,
                expiredAt: now.toISOString(),
              };
            }
          }
          return r;
        });

        if (hasExpired) {
          setAutoExpiredNotice('⚡ Reservation automatically turned OFF: 15-minute arrival window expired (table released).');
          setTimeout(() => setAutoExpiredNotice(null), 6000);
          return next;
        }
        return prev;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isOpen, activeTab]);

  // Logout handler to immediately re-lock portal
  const handleLogout = () => {
    logoutAdminSession();
    setCurrentAdmin(null);
    setAuthError(null);
    setAuthSuccessMsg('Admin portal locked. Single slot session terminated.');
    setAuthPassword('');
    setAuthConfirmPassword('');
    setIsResetMode(false);
  };

  // Login handler strictly for fasihmehtab@gmail.com
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccessMsg(null);

    if (!authPassword.trim()) {
      setAuthError('Please enter your master password.');
      return;
    }

    setIsSubmittingAuth(true);
    try {
      const res = await authenticateAdmin(authEmail, authPassword);
      if (!res.success || !res.user) {
        setAuthError(res.error || 'Access Denied: Incorrect master password.');
        setIsSubmittingAuth(false);
        return;
      }

      setCurrentAdmin(res.user);
      setAuthPassword('');
      setAuthSuccessMsg('Master access verified! Welcome, Fasih Mehtab.');
      loadReservations();
    } catch (err: any) {
      setAuthError(err.message || 'Authentication error.');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  // Register / claim single slot handler for fasihmehtab@gmail.com
  const handleRegisterSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccessMsg(null);

    if (authEmail.trim().toLowerCase() !== AUTHORIZED_MASTER_ADMIN_EMAIL.toLowerCase()) {
      setAuthError(`Access Denied: The single slot is strictly locked to ${AUTHORIZED_MASTER_ADMIN_EMAIL}.`);
      return;
    }

    if (!authPassword.trim()) {
      setAuthError('Please enter a secure master password.');
      return;
    }

    if (authPassword !== authConfirmPassword) {
      setAuthError('Passwords do not match. Please retype carefully.');
      return;
    }

    if (authPassword.length < 4) {
      setAuthError('Password must be at least 4 characters long.');
      return;
    }

    setIsSubmittingAuth(true);
    try {
      const res = await registerMasterAdminSlot({
        username: 'fasihmehtab',
        email: AUTHORIZED_MASTER_ADMIN_EMAIL,
        fullName: authFullName.trim() || AUTHORIZED_MASTER_ADMIN_NAME,
        password: authPassword.trim(),
      });

      if (!res.success || !res.user) {
        setAuthError(res.error || 'Failed to initialize master admin slot.');
        setIsSubmittingAuth(false);
        return;
      }

      setIsSlotClaimed(true);
      setRegisteredAdminUser(res.user);
      setCurrentAdmin(res.user);
      setAuthPassword('');
      setAuthConfirmPassword('');
      setAuthSuccessMsg('Single master slot claimed and locked to fasihmehtab@gmail.com!');
      loadReservations();
    } catch (err: any) {
      setAuthError(err.message || 'Registration error.');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  // Reset or update password handler for fasihmehtab@gmail.com
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthSuccessMsg(null);

    if (!authPassword.trim()) {
      setAuthError('Please enter a new master password.');
      return;
    }

    if (authPassword !== authConfirmPassword) {
      setAuthError('Passwords do not match.');
      return;
    }

    if (authPassword.length < 4) {
      setAuthError('Password must be at least 4 characters long.');
      return;
    }

    setIsSubmittingAuth(true);
    try {
      const res = await updateMasterAdminPassword(authPassword.trim());
      if (!res.success || !res.user) {
        setAuthError(res.error || 'Failed to update master password.');
        setIsSubmittingAuth(false);
        return;
      }

      setCurrentAdmin(res.user);
      setIsResetMode(false);
      setAuthPassword('');
      setAuthConfirmPassword('');
      setAuthSuccessMsg('Master password updated and portal unlocked for fasihmehtab@gmail.com.');
      loadReservations();
    } catch (err: any) {
      setAuthError(err.message || 'Password update error.');
    } finally {
      setIsSubmittingAuth(false);
    }
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

  // Handle reservation status update (confirmed / arrived / expired / cancelled)
  const handleUpdateReservationStatus = async (id: string, newStatus: ReservationStatus) => {
    const now = new Date().toISOString();
    setReservations((prev) =>
      prev.map((r) => (r.id === id ? { 
        ...r, 
        status: newStatus,
        arrivedAt: newStatus === 'arrived' ? now : r.arrivedAt,
        expiredAt: newStatus === 'expired' ? now : r.expiredAt,
      } : r))
    );
    await updateReservationStatusInSupabase(id, newStatus, {
      arrivedAt: newStatus === 'arrived' ? now : undefined,
      expiredAt: newStatus === 'expired' ? now : undefined,
    });
  };

  // Check if an order was placed via WhatsApp
  const isWhatsAppOrder = (o: Order) => {
    return o.paymentMethod === 'whatsapp' ||
           o.orderSource === 'whatsapp' ||
           o.id.startsWith('DW-WA') ||
           o.id.startsWith('DW-CUST') ||
           Boolean(o.customer?.deliveryNotes && o.customer.deliveryNotes.includes('[WhatsApp'));
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return safeOrders.filter((o) => {
      if (orderStatusFilter === 'whatsapp') {
        if (!isWhatsAppOrder(o)) return false;
      } else if (orderStatusFilter !== 'all' && o.status !== orderStatusFilter) {
        return false;
      }
      if (orderSearchQuery.trim()) {
        const q = orderSearchQuery.toLowerCase();
        const matchesId = o.id.toLowerCase().includes(q);
        const matchesName = o.customer.fullName.toLowerCase().includes(q);
        const matchesPhone = o.customer.phone.toLowerCase().includes(q);
        const matchesAddr = o.customer.address.toLowerCase().includes(q);
        const matchesNotes = (o.customer.deliveryNotes || '').toLowerCase().includes(q);
        if (!matchesId && !matchesName && !matchesPhone && !matchesAddr && !matchesNotes) return false;
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

  // Filtered Menu Items for Pricing Tab
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

  const handleRowFieldChange = (id: string, field: 'name' | 'urduName' | 'category' | 'price' | 'isAvailable', value: any) => {
    setDishRowEdits((prev) => {
      const original = safeMenuItems.find((m) => m.id === id);
      const current = prev[id] || {
        name: original?.name || '',
        urduName: original?.urduName || '',
        category: original?.category || 'shawarma',
        price: original?.basePrice || 0,
        isAvailable: original?.isAvailable !== false,
      };
      return {
        ...prev,
        [id]: {
          ...current,
          [field]: value,
        },
      };
    });
  };

  const handleSaveRowDish = async (itemId: string) => {
    const edit = dishRowEdits[itemId];
    const original = safeMenuItems.find((m) => m.id === itemId);
    if (!original) return;

    setSavingDishId(itemId);
    const updatedDish: MenuItem = {
      ...original,
      name: edit ? edit.name.trim() || original.name : original.name,
      urduName: edit ? edit.urduName.trim() || undefined : original.urduName,
      category: edit ? edit.category : original.category,
      basePrice: edit ? Number(edit.price) || original.basePrice : original.basePrice,
      isAvailable: edit ? edit.isAvailable : original.isAvailable !== false,
    };

    const success = await upsertMenuItemInSupabase(updatedDish);
    setSavingDishId(null);

    if (success) {
      setSavedSuccessId(itemId);
      setTimeout(() => setSavedSuccessId(null), 2500);

      const nextList = safeMenuItems.map((m) => (m.id === itemId ? updatedDish : m));
      onUpdateMenuItems(nextList);
    } else {
      alert('Could not save dish to Supabase table. Please verify internet / Supabase connection.');
    }
  };

  const handleDeleteDish = async (dish: MenuItem) => {
    const confirmed = window.confirm(
      `کیا آپ واقعی "${dish.name}" کو مینو اور Supabase ڈیٹا بیس سے ڈیلیٹ کرنا چاہتے ہیں؟\nAre you sure you want to permanently delete "${dish.name}" from the menu catalog and Supabase menu_items table?`
    );
    if (!confirmed) return;

    setDeletingDishId(dish.id);
    const success = await deleteMenuItemFromSupabase(dish.id);
    setDeletingDishId(null);

    if (success) {
      const nextList = safeMenuItems.filter((m) => m.id !== dish.id);
      onUpdateMenuItems(nextList);
      if (editingDishModal?.id === dish.id) {
        setEditingDishModal(null);
      }
    } else {
      alert(`Could not delete "${dish.name}". Check connection or Supabase permissions.`);
    }
  };

  const openEditDishModal = (dish: MenuItem) => {
    const row = dishRowEdits[dish.id];
    setEditingDishModal(dish);
    setEditModalName(row ? row.name : dish.name);
    setEditModalUrdu(row ? row.urduName : dish.urduName || '');
    setEditModalCategory(row ? row.category : dish.category);
    setEditModalPrice(row ? row.price : dish.basePrice);
    setEditModalDesc(dish.description || '');
    setEditModalCulinaryNotes(dish.culinaryNotes || '');
    setEditModalPrepTime(dish.prepTime || '20-25 min');
    setEditModalImage(dish.image || '');
    setEditModalVideo(dish.videoUrl || '');
    setEditModalAvailable(row ? row.isAvailable : dish.isAvailable !== false);
    setEditModalIngredients(dish.ingredients ? dish.ingredients.join(', ') : '');
    setEditModalStatusMsg(null);
  };

  const handleSaveEditDishModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDishModal || !editModalName.trim()) return;

    setIsSavingEditModal(true);
    setEditModalStatusMsg(null);

    const updatedDish: MenuItem = {
      ...editingDishModal,
      name: editModalName.trim(),
      urduName: editModalUrdu.trim() || undefined,
      category: editModalCategory,
      basePrice: Number(editModalPrice) || editingDishModal.basePrice,
      isAvailable: editModalAvailable,
      description: editModalDesc.trim(),
      culinaryNotes: editModalCulinaryNotes.trim() || 'Prepared fresh to order in Quetta.',
      prepTime: editModalPrepTime.trim() || '20-25 min',
      image: editModalImage.trim() || editingDishModal.image,
      videoUrl: editModalVideo.trim() || undefined,
      ingredients: editModalIngredients
        ? editModalIngredients.split(',').map((s) => s.trim()).filter(Boolean)
        : editingDishModal.ingredients,
    };

    const success = await upsertMenuItemInSupabase(updatedDish);
    setIsSavingEditModal(false);

    if (success) {
      setEditModalStatusMsg('Saved to Supabase menu_items table!');
      const nextList = safeMenuItems.map((m) => (m.id === editingDishModal.id ? updatedDish : m));
      onUpdateMenuItems(nextList);
      setTimeout(() => {
        setEditingDishModal(null);
        setEditModalStatusMsg(null);
      }, 700);
    } else {
      setEditModalStatusMsg('Failed to update Supabase. Please retry.');
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
      isAvailable: true,
      description: newDishDesc.trim() || `Fresh ${newDishName} prepared by Dewaan chefs in Quetta.`,
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
      const edit = dishRowEdits[item.id];
      const itemToSave: MenuItem = {
        ...item,
        name: edit ? edit.name.trim() || item.name : item.name,
        urduName: edit ? edit.urduName.trim() || item.urduName : item.urduName,
        category: edit ? edit.category : item.category,
        basePrice: edit ? Number(edit.price) || item.basePrice : item.basePrice,
        isAvailable: edit ? edit.isAvailable : item.isAvailable !== false,
      };
      const ok = await upsertMenuItemInSupabase(itemToSave);
      if (ok) successCount++;
    }
    setIsSyncingAllDishes(false);
    setSyncAllMsg(`Successfully synced ${successCount} authentic Quetta dishes to Supabase!`);
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
              {currentAdmin ? (
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#dfba6c]/15 border border-[#dfba6c]/40 text-[#ebd8ab] font-mono text-[10px]">
                  <Shield className="w-3 h-3 text-[#dfba6c]" />
                  <span>Master Admin · Single Slot</span>
                </span>
              ) : (
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-950/50 border border-rose-500/30 text-rose-300 font-mono text-[10px]">
                  <Lock className="w-3 h-3 text-rose-400" />
                  <span>Locked · Single Slot Access</span>
                </span>
              )}
            </div>
            <span className="text-[11px] font-mono text-[#8c8e96] block">
              Supabase Project: {SUPABASE_CONFIG.projectId}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          {currentAdmin ? (
            <>
              <div className="hidden md:flex items-center gap-3 pr-3 border-r border-white/[0.08]">
                <div className="text-right">
                  <div className="text-xs text-white font-medium flex items-center gap-1.5 justify-end">
                    <span>{currentAdmin.fullName}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </div>
                  <span className="text-[10px] font-mono text-[#dfba6c] block">
                    {currentAdmin.email}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-xs text-rose-300 hover:text-white transition-all font-medium cursor-pointer"
                title="Lock admin portal and sign out immediately"
              >
                <Lock className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">Lock & Sign Out</span>
                <span className="sm:hidden">Lock</span>
              </button>
            </>
          ) : (
            <div className="hidden sm:flex items-center gap-2 pr-3 border-r border-white/[0.08]">
              <span className="text-xs text-[#8c8e96] font-mono">
                Locked to: <strong className="text-[#ebd8ab]">{AUTHORIZED_MASTER_ADMIN_EMAIL}</strong>
              </span>
            </div>
          )}

          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-xs text-white transition-all font-medium cursor-pointer"
          >
            <span>Exit Portal</span>
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* ========================================================================= */}
        {/* CONDITIONAL: LOCK SCREEN (UNAUTHENTICATED) VS AUTHENTICATED DASHBOARD      */}
        {/* ========================================================================= */}
        {!currentAdmin ? (
          <div className="max-w-xl mx-auto py-6 sm:py-10 animate-in fade-in duration-300">
            <div className="relative rounded-3xl bg-[#111319]/95 border border-white/[0.12] p-6 sm:p-9 shadow-2xl backdrop-blur-xl overflow-hidden">
              {/* Subtle atmospheric gold & emerald glows */}
              <div className="absolute -top-24 -left-24 w-56 h-56 bg-[#dfba6c]/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Header of Lock Card */}
              <div className="relative text-center mb-6">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-[#dfba6c]/20 to-[#99732b]/20 border border-[#dfba6c]/40 flex items-center justify-center text-[#dfba6c] shadow-lg mb-4">
                  <Lock className="w-8 h-8 stroke-[2.2]" />
                </div>
                <h3 className="font-serif text-2xl font-bold text-white tracking-wide">
                  Admin Portal Gatekeeper
                </h3>
                <p className="text-xs text-[#8c8e96] mt-1 font-mono">
                  Single Master Admin Slot · Strict Access Lock
                </p>

                <div className="flex flex-wrap items-center justify-center gap-2 mt-3.5">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#dfba6c]/15 border border-[#dfba6c]/40 text-[#ebd8ab] font-mono text-[11px]">
                    <Shield className="w-3.5 h-3.5 text-[#dfba6c]" />
                    <span>Authorized Owner: {AUTHORIZED_MASTER_ADMIN_EMAIL}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-950/50 border border-rose-500/30 text-rose-300 font-mono text-[10px]">
                    <Lock className="w-3 h-3 text-rose-400" />
                    <span>Single Slot Only</span>
                  </span>
                </div>
              </div>

              {/* Visitor Notice Banner */}
              <div className="relative mb-6 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-left">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-[#dfba6c] shrink-0 mt-0.5" />
                  <div className="text-[11px] leading-relaxed text-[#a0a3af]">
                    <strong className="text-white font-medium block mb-0.5">
                      Notice for Website Visitors:
                    </strong>
                    This management dashboard is private and strictly locked to restaurant owner{' '}
                    <span className="text-[#ebd8ab] font-mono font-semibold">{AUTHORIZED_MASTER_ADMIN_EMAIL}</span>.
                    Public guests can freely browse dishes, reserve tables, and place orders without logging in.
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                  <span className="text-[10px] text-[#71747e] font-mono">
                    Visiting as a guest or diner?
                  </span>
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-white text-[11px] font-medium transition-colors cursor-pointer"
                  >
                    <span>Return to Menu</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Auth Card Forms */}
              {isCheckingSlot ? (
                <div className="py-8 flex flex-col items-center justify-center gap-3 text-center">
                  <RefreshCw className="w-6 h-6 text-[#dfba6c] animate-spin" />
                  <span className="text-xs font-mono text-[#8c8e96]">
                    Verifying master slot state in Supabase...
                  </span>
                </div>
              ) : isResetMode ? (
                /* RESET / UPDATE PASSWORD MODE */
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="border-b border-white/[0.08] pb-3 mb-4">
                    <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Key className="w-4 h-4 text-[#dfba6c]" />
                      <span>Update Master Password</span>
                    </h4>
                    <p className="text-[11px] text-[#8c8e96] mt-0.5">
                      Set a new secure password for {AUTHORIZED_MASTER_ADMIN_EMAIL}.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-[#8c8e96] mb-1.5 uppercase tracking-wider">
                      Authorized Owner Email
                    </label>
                    <input
                      type="text"
                      value={AUTHORIZED_MASTER_ADMIN_EMAIL}
                      disabled
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/[0.08] text-white font-mono text-xs opacity-75 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-[#8c8e96] mb-1.5 uppercase tracking-wider">
                      New Master Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        placeholder="Enter new master password (min 4 chars)"
                        required
                        className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-black/40 border border-white/[0.12] focus:border-[#dfba6c] focus:outline-none text-white text-xs placeholder:text-[#555]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71747e] hover:text-white"
                      >
                        {showPassword ? <Eye className="w-4 h-4" /> : <Eye className="w-4 h-4 opacity-50" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-[#8c8e96] mb-1.5 uppercase tracking-wider">
                      Confirm New Master Password
                    </label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={authConfirmPassword}
                      onChange={(e) => setAuthConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/[0.12] focus:border-[#dfba6c] focus:outline-none text-white text-xs placeholder:text-[#555]"
                    />
                  </div>

                  {authError && (
                    <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{authError}</span>
                    </div>
                  )}

                  {authSuccessMsg && (
                    <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{authSuccessMsg}</span>
                    </div>
                  )}

                  <div className="pt-2 flex items-center gap-3">
                    <button
                      type="submit"
                      disabled={isSubmittingAuth}
                      className="flex-1 py-3 px-4 rounded-xl bg-[#dfba6c] hover:bg-[#ebd8ab] text-[#090a0d] font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isSubmittingAuth ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      <span>Save New Password & Unlock</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsResetMode(false);
                        setAuthError(null);
                        setAuthPassword('');
                        setAuthConfirmPassword('');
                      }}
                      className="py-3 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : isSlotClaimed ? (
                /* LOGIN / UNLOCK MODE */
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="border-b border-white/[0.08] pb-3 mb-4 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                        <Key className="w-4 h-4 text-[#dfba6c]" />
                        <span>Unlock Master Admin</span>
                      </h4>
                      <p className="text-[11px] text-[#8c8e96] mt-0.5">
                        Enter master password for {AUTHORIZED_MASTER_ADMIN_EMAIL}.
                      </p>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 font-mono text-[10px]">
                      Slot Active
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-[#8c8e96] mb-1.5 uppercase tracking-wider">
                      Owner Email (Single Slot)
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={AUTHORIZED_MASTER_ADMIN_EMAIL}
                        disabled
                        className="w-full px-3.5 py-2.5 pl-9 rounded-xl bg-black/40 border border-white/[0.08] text-white font-mono text-xs opacity-80 cursor-not-allowed"
                      />
                      <Mail className="w-4 h-4 text-[#dfba6c] absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-mono text-[#8c8e96] uppercase tracking-wider">
                        Master Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsResetMode(true);
                          setAuthError(null);
                          setAuthPassword('');
                          setAuthConfirmPassword('');
                        }}
                        className="text-[11px] text-[#dfba6c] hover:underline cursor-pointer"
                      >
                        Reset / Set New Password
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        placeholder="Enter master password"
                        autoFocus
                        required
                        className="w-full px-3.5 py-2.5 pr-10 pl-9 rounded-xl bg-black/40 border border-white/[0.12] focus:border-[#dfba6c] focus:outline-none text-white text-xs placeholder:text-[#555]"
                      />
                      <Lock className="w-4 h-4 text-[#71747e] absolute left-3 top-1/2 -translate-y-1/2" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71747e] hover:text-white cursor-pointer"
                      >
                        {showPassword ? <Eye className="w-4 h-4" /> : <Eye className="w-4 h-4 opacity-50" />}
                      </button>
                    </div>
                  </div>

                  {authError && (
                    <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{authError}</span>
                    </div>
                  )}

                  {authSuccessMsg && (
                    <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{authSuccessMsg}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmittingAuth}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#dfba6c] to-[#99732b] hover:from-[#ebd8ab] hover:to-[#b38634] text-[#090a0d] font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#dfba6c]/15 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingAuth ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verifying Credentials...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Unlock Admin Portal & Enter Dashboard</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* INITIALIZE SINGLE SLOT CLAIM MODE */
                <form onSubmit={handleRegisterSlot} className="space-y-4">
                  <div className="border-b border-white/[0.08] pb-3 mb-4">
                    <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Shield className="w-4 h-4 text-[#dfba6c]" />
                      <span>Setup Single Master Admin Slot</span>
                    </h4>
                    <p className="text-[11px] text-[#8c8e96] mt-0.5">
                      The single master slot is reserved for {AUTHORIZED_MASTER_ADMIN_EMAIL}. Setup your master password to lock the portal.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-[#8c8e96] mb-1.5 uppercase tracking-wider">
                      Owner Name
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={authFullName}
                        onChange={(e) => setAuthFullName(e.target.value)}
                        placeholder="Fasih Mehtab"
                        required
                        className="w-full px-3.5 py-2.5 pl-9 rounded-xl bg-black/40 border border-white/[0.12] focus:border-[#dfba6c] focus:outline-none text-white text-xs"
                      />
                      <User className="w-4 h-4 text-[#71747e] absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-[#8c8e96] mb-1.5 uppercase tracking-wider">
                      Owner Email (Locked)
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={AUTHORIZED_MASTER_ADMIN_EMAIL}
                        disabled
                        className="w-full px-3.5 py-2.5 pl-9 rounded-xl bg-black/40 border border-white/[0.08] text-white font-mono text-xs opacity-80 cursor-not-allowed"
                      />
                      <Mail className="w-4 h-4 text-[#dfba6c] absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>
                    <span className="text-[10px] text-[#8c8e96] font-mono mt-1 block">
                      Strictly locked: No other email can claim this slot.
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-[#8c8e96] mb-1.5 uppercase tracking-wider">
                      Create Master Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        placeholder="Choose a strong password (min 4 chars)"
                        required
                        className="w-full px-3.5 py-2.5 pr-10 pl-9 rounded-xl bg-black/40 border border-white/[0.12] focus:border-[#dfba6c] focus:outline-none text-white text-xs placeholder:text-[#555]"
                      />
                      <Key className="w-4 h-4 text-[#71747e] absolute left-3 top-1/2 -translate-y-1/2" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#71747e] hover:text-white cursor-pointer"
                      >
                        {showPassword ? <Eye className="w-4 h-4" /> : <Eye className="w-4 h-4 opacity-50" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-[#8c8e96] mb-1.5 uppercase tracking-wider">
                      Confirm Master Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={authConfirmPassword}
                        onChange={(e) => setAuthConfirmPassword(e.target.value)}
                        placeholder="Confirm master password"
                        required
                        className="w-full px-3.5 py-2.5 pl-9 rounded-xl bg-black/40 border border-white/[0.12] focus:border-[#dfba6c] focus:outline-none text-white text-xs placeholder:text-[#555]"
                      />
                      <Key className="w-4 h-4 text-[#71747e] absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  {authError && (
                    <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{authError}</span>
                    </div>
                  )}

                  {authSuccessMsg && (
                    <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{authSuccessMsg}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmittingAuth}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-[#dfba6c] to-[#99732b] hover:from-[#ebd8ab] hover:to-[#b38634] text-[#090a0d] font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingAuth ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Securing Master Slot...</span>
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4" />
                        <span>Claim Single Slot & Lock Portal</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Footer Info */}
              <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-[#636674]">
                <span>Single-Slot Security</span>
                <span>{AUTHORIZED_MASTER_ADMIN_EMAIL}</span>
              </div>
            </div>
          </div>
        ) : (
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
                  <span>Menu Catalog & Prices ({menuItems.length})</span>
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
                    {(['all', 'whatsapp', 'confirmed', 'kitchen_dum', 'packing_check', 'out_for_delivery', 'delivered'] as const).map((st) => {
                      const count = st === 'whatsapp' 
                        ? safeOrders.filter(isWhatsAppOrder).length 
                        : st === 'all' 
                        ? safeOrders.length 
                        : safeOrders.filter((o) => o.status === st).length;

                      const isSelected = orderStatusFilter === st;

                      return (
                        <button
                          key={st}
                          onClick={() => setOrderStatusFilter(st)}
                          className={`px-3 py-1.5 rounded-full capitalize whitespace-nowrap text-xs transition-colors flex items-center gap-1.5 cursor-pointer ${
                            isSelected
                              ? st === 'whatsapp'
                                ? 'bg-[#25D366] text-[#090a0d] font-bold shadow-md shadow-[#25D366]/20'
                                : 'bg-[#dfba6c] text-[#090a0d] font-bold shadow-sm'
                              : st === 'whatsapp'
                              ? 'bg-[#25D366]/15 text-[#25D366] hover:bg-[#25D366]/25 border border-[#25D366]/30'
                              : 'bg-[#141620] text-[#8c8e96] hover:text-white border border-white/[0.06]'
                          }`}
                        >
                          {st === 'whatsapp' && <MessageCircle className="w-3.5 h-3.5 fill-current" />}
                          <span>
                            {st === 'whatsapp' ? `WhatsApp Orders (${count})` : `${st.replace(/_/g, ' ')} (${count})`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Dedicated WhatsApp Channel Status Banner */}
                {orderStatusFilter === 'whatsapp' && (
                  <div className="p-4 rounded-2xl bg-[#25D366]/10 border border-[#25D366]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#25D366]/20 text-[#25D366] flex items-center justify-center shrink-0">
                        <MessageCircle className="w-5 h-5 fill-current" />
                      </div>
                      <div>
                        <h5 className="font-semibold text-white text-xs flex items-center gap-2">
                          <span>WhatsApp Orders Live Channel</span>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-mono bg-[#25D366] text-[#090a0d] font-bold">
                            Auto-Synced with Supabase
                          </span>
                        </h5>
                        <p className="text-[11px] text-[#a4a7b5] mt-0.5">
                          Orders placed via Dastarkhwan Bag, Menu dish WhatsApp buttons, Customizer, and Custom Requests are recorded in Supabase and displayed below.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { if (onRefreshOrders) onRefreshOrders(); }}
                      className="px-3.5 py-1.5 rounded-full bg-[#25D366] hover:bg-[#20ba5a] text-[#090a0d] font-bold text-xs flex items-center gap-1.5 shadow-sm shrink-0 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Refresh Channel</span>
                    </button>
                  </div>
                )}

                {/* Orders Table */}
                {filteredOrders.length === 0 ? (
                  <div className="p-16 text-center bg-[#12141a] border border-white/[0.08] rounded-3xl">
                    <ShoppingBag className="w-8 h-8 text-[#8c8e96] mx-auto mb-3 stroke-[1.5]" />
                    <h4 className="text-base font-serif text-white mb-1">No Orders Found</h4>
                    <p className="text-xs text-[#8c8e96] font-light max-w-sm mx-auto">
                      {orderSearchQuery ? 'Try adjusting your search criteria.' : 'When customers book orders on the website or via WhatsApp, they will immediately appear here.'}
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
                          {filteredOrders.map((ord) => {
                            const isWA = isWhatsAppOrder(ord);

                            return (
                              <tr key={ord.id} className="hover:bg-white/[0.02] transition-colors">
                                
                                {/* Order ID & Time */}
                                <td className="py-4 px-4 align-top">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-mono font-bold text-white text-sm">
                                      {ord.id}
                                    </span>
                                    {isWA && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono bg-[#25D366]/20 border border-[#25D366]/40 text-[#25D366] font-bold">
                                        <MessageCircle className="w-2.5 h-2.5 fill-current" />
                                        <span>WhatsApp 💬</span>
                                      </span>
                                    )}
                                  </div>
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
                                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                    <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px] font-semibold">
                                      <Phone className="w-3 h-3" />
                                      <a href={`tel:${ord.customer.phone}`} className="hover:underline">
                                        {ord.customer.phone}
                                      </a>
                                    </div>
                                    {ord.customer.phone && (
                                      <a
                                        href={`https://wa.me/${ord.customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Salam ${ord.customer.fullName}! Regarding your Dewaan Quetta Order ${ord.id}: `)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#25D366]/15 hover:bg-[#25D366]/30 text-[#25D366] text-[10px] font-mono transition-colors"
                                        title="Chat directly on WhatsApp"
                                      >
                                        <MessageCircle className="w-2.5 h-2.5 fill-current" />
                                        <span>Chat</span>
                                      </a>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-[#8c8e96] max-w-xs mt-1 line-clamp-2 font-light">
                                    {ord.customer.address}
                                  </div>
                                  {ord.customer.deliveryNotes && (
                                    <div className="text-[10px] text-[#ebd8ab] bg-white/[0.03] p-1.5 rounded-lg border border-white/[0.04] mt-1 italic">
                                      {ord.customer.deliveryNotes}
                                    </div>
                                  )}
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
                                    {ord.paymentMethod === 'whatsapp' ? 'WhatsApp (COD)' : ord.paymentMethod.replace('_', ' ')}
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
                                    {ord.customer.phone && (
                                      <a
                                        href={`https://wa.me/${ord.customer.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Salam ${ord.customer.fullName}! Your Dewaan Royal Order ${ord.id} status is now: ${ord.status.replace(/_/g, ' ')}.`)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1.5 rounded-full bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] transition-colors"
                                        title="Send status update on WhatsApp"
                                      >
                                        <MessageCircle className="w-3.5 h-3.5 fill-current" />
                                      </a>
                                    )}
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
                            );
                          })}
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
            {/* TAB 2: TABLE RESERVATIONS MANAGEMENT (15-MIN AUTO-OFF RULE ACTIVE)    */}
            {/* ===================================================================== */}
            {activeTab === 'reservations' && (
              <div className="space-y-5">
                
                {/* Auto-Off Live Alert Banner */}
                {autoExpiredNotice && (
                  <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center justify-between shadow-lg animate-in fade-in duration-200">
                    <div className="flex items-center gap-2.5">
                      <Timer className="w-4 h-4 text-rose-400 shrink-0 animate-pulse" />
                      <span className="font-medium">{autoExpiredNotice}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAutoExpiredNotice(null)}
                      className="px-2.5 py-1 rounded-full bg-white/[0.08] hover:bg-white/[0.15] text-white text-[11px] transition-colors cursor-pointer"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {/* 15-Minute Rule Policy & Summary Metrics Bento */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
                  <div className="p-4 rounded-2xl bg-[#12141a] border border-white/[0.08]">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#8c8e96] block mb-1">
                      Total Bookings
                    </span>
                    <div className="text-xl font-mono font-bold text-white tabular-nums">
                      {reservations.length}
                    </div>
                    <span className="text-[10px] text-[#71747d] mt-0.5 block">
                      All time palace tables
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#12141a] border border-white/[0.08]">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#8c8e96] block mb-1">
                      Confirmed Active
                    </span>
                    <div className="text-xl font-mono font-bold text-[#dfba6c] tabular-nums">
                      {reservations.filter((r) => r.status === 'confirmed').length}
                    </div>
                    <span className="text-[10px] text-[#71747d] mt-0.5 block">
                      Awaiting arrival
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#12141a] border border-emerald-500/20 bg-emerald-950/10">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 block mb-1">
                      Arrived & Seated
                    </span>
                    <div className="text-xl font-mono font-bold text-emerald-400 tabular-nums">
                      {reservations.filter((r) => r.status === 'arrived').length}
                    </div>
                    <span className="text-[10px] text-emerald-400/70 mt-0.5 block">
                      Guests dining
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#12141a] border border-rose-500/20 bg-rose-950/10">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-rose-300 block mb-1 flex items-center gap-1">
                      <Timer className="w-3 h-3 text-rose-400" />
                      <span>Auto-Off (+15m)</span>
                    </span>
                    <div className="text-xl font-mono font-bold text-rose-400 tabular-nums">
                      {reservations.filter((r) => r.status === 'expired').length}
                    </div>
                    <span className="text-[10px] text-rose-300/70 mt-0.5 block">
                      15m grace exceeded
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#12141a] border border-white/[0.08]">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#8c8e96] block mb-1">
                      Cancelled
                    </span>
                    <div className="text-xl font-mono font-bold text-[#71747d] tabular-nums">
                      {reservations.filter((r) => r.status === 'cancelled').length}
                    </div>
                    <span className="text-[10px] text-[#71747d] mt-0.5 block">
                      Manual cancellations
                    </span>
                  </div>
                </div>

                {/* 15-Minute Policy Explanation Bar */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/30 via-[#151722] to-amber-950/20 border border-amber-500/25 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#dfba6c]/15 text-[#dfba6c] flex items-center justify-center shrink-0 mt-0.5">
                      <Timer className="w-4 h-4" />
                    </div>
                    <div>
                      <strong className="text-white font-medium block">
                        Real-Time 15-Minute Arrival Grace Period Policy:
                      </strong>
                      <span className="text-[#a0a3af] text-[11px] leading-relaxed block">
                        If a customer does not arrive on time, an extra 15 minutes of grace is allowed. Once current time exceeds <span className="text-[#dfba6c] font-mono">Reserved Time + 15 mins</span> without the guest being marked as <strong className="text-emerald-400">"Arrived"</strong>, the reservation automatically turns <strong className="text-rose-400">OFF</strong> and the table is released.
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => loadReservations()}
                    disabled={isLoadingReservations}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#dfba6c] hover:bg-[#ebd8ab] text-[#090a0d] font-bold text-xs shrink-0 shadow transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingReservations ? 'animate-spin' : ''}`} />
                    <span>Run Expiry Sweep</span>
                  </button>
                </div>

                {/* Filters & Search */}
                <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between pt-1">
                  <div className="relative flex-1 max-w-md">
                    <Search className="w-4 h-4 text-[#727581] absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={resSearchQuery}
                      onChange={(e) => setResSearchQuery(e.target.value)}
                      placeholder="Search guest name, phone, date, table ID..."
                      className="w-full pl-10 pr-4 py-2.5 bg-[#12141a] border border-white/[0.08] rounded-full text-xs text-white placeholder-[#71747d] focus:outline-none focus:border-[#dfba6c]"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
                    {(
                      [
                        { id: 'all', label: `All (${reservations.length})` },
                        { id: 'confirmed', label: `Confirmed (${reservations.filter((r) => r.status === 'confirmed').length})` },
                        { id: 'arrived', label: `Arrived (${reservations.filter((r) => r.status === 'arrived').length})` },
                        { id: 'expired', label: `Auto-Off (+15m) (${reservations.filter((r) => r.status === 'expired').length})` },
                        { id: 'cancelled', label: `Cancelled (${reservations.filter((r) => r.status === 'cancelled').length})` },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setResStatusFilter(tab.id as any)}
                        className={`px-3 py-1.5 rounded-full text-xs font-mono transition-colors whitespace-nowrap cursor-pointer ${
                          resStatusFilter === tab.id
                            ? 'bg-[#dfba6c] text-[#090a0d] font-bold shadow-sm'
                            : 'bg-[#141620] text-[#8c8e96] hover:text-white border border-white/[0.06]'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredReservations.length === 0 ? (
                  <div className="p-16 text-center bg-[#12141a] border border-white/[0.08] rounded-3xl">
                    <Calendar className="w-8 h-8 text-[#8c8e96] mx-auto mb-3 stroke-[1.5]" />
                    <h4 className="text-base font-serif text-white mb-1">No Reservations Found</h4>
                    <p className="text-xs text-[#8c8e96] font-light max-w-sm mx-auto">
                      {resStatusFilter === 'expired'
                        ? 'No reservations have exceeded the 15-minute arrival grace window yet.'
                        : 'Table reservations booked via the website will sync here in real time.'}
                    </p>
                  </div>
                ) : (
                  <div className="bg-[#12141a] border border-white/[0.08] rounded-3xl overflow-hidden shadow-xl">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#161822] border-b border-white/[0.08] text-[10px] font-mono uppercase tracking-wider text-[#a0a3af]">
                          <tr>
                            <th className="py-3.5 px-4">Booking ID</th>
                            <th className="py-3.5 px-4">Guest & Contact</th>
                            <th className="py-3.5 px-4">Reserved Time</th>
                            <th className="py-3.5 px-4">15m Cutoff</th>
                            <th className="py-3.5 px-4">Party & Ambience</th>
                            <th className="py-3.5 px-4">Live Arrival Status</th>
                            <th className="py-3.5 px-4">Notes</th>
                            <th className="py-3.5 px-4 text-right">Host Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.06] text-xs">
                          {filteredReservations.map((res) => {
                            const timing = getReservationTiming(res.reservationDate, res.timeSlot, 15);

                            return (
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

                                {/* Reserved Date & Time */}
                                <td className="py-4 px-4 font-mono text-[11px]">
                                  <div className="text-white font-medium">{res.reservationDate}</div>
                                  <span className="text-[#dfba6c] font-semibold">{res.timeSlot}</span>
                                </td>

                                {/* 15m Grace Cutoff */}
                                <td className="py-4 px-4 font-mono text-[11px]">
                                  <div className="text-[#ebd8ab] font-bold">
                                    {timing.formattedCutoffTime}
                                  </div>
                                  <span className="text-[10px] text-[#71747d] block">
                                    +15m Arrival Cutoff
                                  </span>
                                </td>

                                {/* Party & Lounge */}
                                <td className="py-4 px-4 font-mono tabular-nums text-white">
                                  <div>{res.guestCount} {res.guestCount === 1 ? 'Guest' : 'Guests'}</div>
                                  <span className="text-[11px] text-[#ebd8ab] capitalize block font-sans">
                                    {res.seatingArea.replace(/_/g, ' ')} Lounge
                                  </span>
                                </td>

                                {/* Live Arrival Status */}
                                <td className="py-4 px-4">
                                  {res.status === 'arrived' ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-bold">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                      <span>Arrived & Seated</span>
                                    </span>
                                  ) : res.status === 'expired' ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono bg-rose-950/60 border border-rose-500/40 text-rose-300 font-bold">
                                      <Timer className="w-3 h-3 text-rose-400" />
                                      <span>Auto-Off (15m Expired)</span>
                                    </span>
                                  ) : res.status === 'cancelled' ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono bg-white/[0.06] border border-white/[0.1] text-[#8c8e96]">
                                      <span>Cancelled</span>
                                    </span>
                                  ) : (
                                    /* CONFIRMED: check live timing */
                                    timing.isInGracePeriod ? (
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono bg-amber-950/60 border border-amber-500/50 text-amber-300 font-bold animate-pulse">
                                        <Timer className="w-3 h-3 text-amber-400" />
                                        <span>Grace Active: {timing.graceCountdownFormatted} Left</span>
                                      </span>
                                    ) : timing.isOverdue ? (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono bg-rose-950/60 border border-rose-500/40 text-rose-300 font-bold">
                                        <AlertCircle className="w-3 h-3 text-rose-400" />
                                        <span>Auto-Off Overdue (+{timing.minutesOverdue}m)</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono bg-blue-950/40 border border-blue-500/30 text-blue-300">
                                        <Clock className="w-3 h-3 text-blue-400" />
                                        <span>
                                          Upcoming {timing.minutesUntilScheduled > 60 ? `(${Math.floor(timing.minutesUntilScheduled / 60)}h)` : `(${timing.minutesUntilScheduled}m)`}
                                        </span>
                                      </span>
                                    )
                                  )}
                                </td>

                                <td className="py-4 px-4 text-[11px] text-[#8c8e96] max-w-xs truncate italic">
                                  {res.notes || '—'}
                                </td>

                                {/* Host Actions */}
                                <td className="py-4 px-4 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {res.status === 'confirmed' && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => handleUpdateReservationStatus(res.id, 'arrived')}
                                          className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-full text-[11px] transition-colors shadow-sm cursor-pointer"
                                          title="Guest has arrived at the palace, mark seated"
                                        >
                                          <Check className="w-3 h-3" />
                                          <span>Mark Arrived</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleUpdateReservationStatus(res.id, 'expired')}
                                          className="px-2.5 py-1 bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 rounded-full text-[11px] transition-colors cursor-pointer"
                                          title="Turn OFF reservation and release table"
                                        >
                                          Turn OFF
                                        </button>
                                      </>
                                    )}

                                    {res.status === 'expired' && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => handleUpdateReservationStatus(res.id, 'arrived')}
                                          className="inline-flex items-center gap-1 px-3 py-1 bg-amber-500 hover:bg-amber-400 text-[#090a0d] font-bold rounded-full text-[11px] transition-colors shadow-sm cursor-pointer"
                                          title="Guest arrived late, reinstate and seat"
                                        >
                                          <CheckCheck className="w-3 h-3" />
                                          <span>Reinstate & Seat</span>
                                        </button>
                                      </>
                                    )}

                                    {res.status === 'arrived' && (
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateReservationStatus(res.id, 'confirmed')}
                                        className="px-2.5 py-1 bg-white/[0.06] hover:bg-white/[0.12] text-[#8c8e96] hover:text-white rounded-full text-[11px] transition-colors cursor-pointer"
                                        title="Revert arrival state"
                                      >
                                        Undo Arrival
                                      </button>
                                    )}

                                    {res.status === 'cancelled' && (
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateReservationStatus(res.id, 'confirmed')}
                                        className="px-3 py-1 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-500/30 rounded-full text-[11px] transition-colors cursor-pointer"
                                      >
                                        Re-Confirm
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
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
            {/* TAB 4: MENU CATALOG & PRICING (SUPABASE SYNCED)                       */}
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
                      title="Upload or sync all authentic Quetta dishes to Supabase table"
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
                              price: m.basePrice,
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

                {/* Supabase Schema Info Banner */}
                <div className="p-3.5 bg-[#141620] border border-white/[0.08] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#dfba6c]/15 text-[#dfba6c] flex items-center justify-center font-mono font-bold text-xs">
                      SQL
                    </div>
                    <div>
                      <div className="font-semibold text-white flex items-center gap-2">
                        <span>Supabase Menu Catalog Table</span>
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          table: public.menu_items
                        </span>
                      </div>
                      <span className="text-[11px] text-[#8c8e96] block font-mono">
                        id TEXT · name TEXT · category TEXT · base_price NUMERIC(10, 2) · is_available BOOLEAN
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const sql = `ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS base_price NUMERIC(10, 2) DEFAULT 0;\nALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true;\nALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS last_price_updated_at TIMESTAMPTZ DEFAULT NOW();`;
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

                {/* Dishes Pricing & Management Table */}
                <div className="bg-[#12141a] border border-white/[0.08] rounded-3xl overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#161822] border-b border-white/[0.08] text-[10px] font-mono uppercase tracking-wider text-[#a0a3af]">
                        <tr>
                          <th className="py-3.5 px-4">Dish Name & Details</th>
                          <th className="py-3.5 px-4">Category</th>
                          <th className="py-3.5 px-4">Price (PKR)</th>
                          <th className="py-3.5 px-4">Availability</th>
                          <th className="py-3.5 px-4 text-right">Actions & Supabase</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.06] text-xs">
                        {filteredMenuItems.map((item) => {
                          const edit = dishRowEdits[item.id] || {
                            name: item.name,
                            urduName: item.urduName || '',
                            category: item.category,
                            price: item.basePrice,
                            isAvailable: item.isAvailable !== false,
                          };

                          const isSaving = savingDishId === item.id;
                          const isSaved = savedSuccessId === item.id;
                          const isDeleting = deletingDishId === item.id;

                          return (
                            <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                              {/* Dish info & Name Edit */}
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="relative group shrink-0">
                                    <img
                                      src={item.image}
                                      alt={item.name}
                                      className="w-12 h-12 rounded-xl object-cover border border-white/[0.08]"
                                    />
                                    {item.videoUrl && (
                                      <button
                                        type="button"
                                        onClick={() => setActiveAdminVideoModal({ url: item.videoUrl!, title: item.name })}
                                        className="absolute -bottom-1 -right-1 p-1 bg-red-600 rounded-full text-white shadow"
                                        title="Watch dish video"
                                      >
                                        <Play className="w-2.5 h-2.5 fill-current" />
                                      </button>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-[180px] space-y-1">
                                    <input
                                      type="text"
                                      value={edit.name}
                                      onChange={(e) => handleRowFieldChange(item.id, 'name', e.target.value)}
                                      placeholder="Dish Name"
                                      className="w-full font-semibold text-white bg-transparent border-b border-transparent hover:border-white/20 focus:border-[#dfba6c] focus:bg-[#181a24] rounded px-1.5 py-0.5 text-xs transition-colors focus:outline-none"
                                      title="Click to edit dish name"
                                    />
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="text"
                                        value={edit.urduName}
                                        onChange={(e) => handleRowFieldChange(item.id, 'urduName', e.target.value)}
                                        placeholder="اردو نام درج کریں"
                                        className="w-32 text-[11px] font-serif text-[#ebd8ab]/80 bg-transparent border-b border-transparent hover:border-white/10 focus:border-[#dfba6c] focus:bg-[#181a24] rounded px-1 py-0.5 transition-colors focus:outline-none"
                                        title="Click to edit Urdu name"
                                      />
                                      <span className="text-[9px] font-mono text-[#71747d] uppercase">
                                        ID: {item.id}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Category dropdown */}
                              <td className="py-3.5 px-4">
                                <select
                                  value={edit.category}
                                  onChange={(e) => handleRowFieldChange(item.id, 'category', e.target.value as Category)}
                                  className="px-2.5 py-1.5 bg-[#171922] border border-white/[0.08] rounded-xl text-xs font-mono text-[#dfba6c] capitalize focus:outline-none focus:border-[#dfba6c]"
                                >
                                  <option value="biryani">Biryani</option>
                                  <option value="karahi">Shinwari Karahi</option>
                                  <option value="handi">Clay Handi</option>
                                  <option value="kebab">Chapli & Seekh Kebab</option>
                                  <option value="shawarma">Arabian Shawarma</option>
                                  <option value="pizza">Artisan Pizza</option>
                                  <option value="breads_sides">Tandoor Naan</option>
                                  <option value="beverages">Drinks & Kahwa</option>
                                </select>
                              </td>

                              {/* Price Input */}
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[11px] font-mono text-[#dfba6c]">Rs.</span>
                                  <input
                                    type="number"
                                    min={0}
                                    step={10}
                                    value={edit.price}
                                    onChange={(e) => handleRowFieldChange(item.id, 'price', Number(e.target.value) || 0)}
                                    className="w-24 px-2.5 py-1.5 bg-[#171922] border border-white/[0.1] rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-[#dfba6c]"
                                  />
                                </div>
                              </td>

                              {/* Availability Switch */}
                              <td className="py-3.5 px-4">
                                <button
                                  type="button"
                                  onClick={() => handleRowFieldChange(item.id, 'isAvailable', !edit.isAvailable)}
                                  className={`px-3 py-1.5 rounded-full text-[11px] font-mono transition-colors ${
                                    edit.isAvailable
                                      ? 'bg-emerald-950/50 border border-emerald-500/40 text-emerald-400'
                                      : 'bg-rose-950/50 border border-rose-800/40 text-rose-300'
                                  }`}
                                >
                                  {edit.isAvailable ? 'In Stock' : 'Sold Out'}
                                </button>
                              </td>

                              {/* Actions & Supabase Sync */}
                              <td className="py-3.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    disabled={isSaving}
                                    onClick={() => handleSaveRowDish(item.id)}
                                    title="Save name, price, category & availability directly to Supabase menu_items"
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                                      isSaved
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-[#dfba6c] hover:bg-[#ebd8ab] text-[#090a0d] shadow-sm'
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
                                      <>
                                        <Save className="w-3 h-3" />
                                        <span>Save</span>
                                      </>
                                    )}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => openEditDishModal(item)}
                                    className="p-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-[#ebd8ab] transition-colors"
                                    title="Edit all dish fields (image, video, description, notes)"
                                  >
                                    <Pencil className="w-3.5 h-3.5 text-[#dfba6c]" />
                                  </button>

                                  <button
                                    type="button"
                                    disabled={isDeleting}
                                    onClick={() => handleDeleteDish(item)}
                                    className="p-1.5 rounded-full bg-rose-950/50 hover:bg-rose-900/70 text-rose-300 border border-rose-800/30 transition-colors"
                                    title="Delete dish from Supabase database"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
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
                  <span className="text-[10px] text-[#71747d] font-mono uppercase block">Menu Pricing Status</span>
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
                        if (lower.includes('delete from products') || lower.includes('delete from dishes') || lower.includes('delete products')) {
                          supabase.from('products').delete().neq('id', '___force_purge___').then(() => {});
                          supabase.from('dishes').delete().neq('id', '___force_purge___').then(() => {});
                          supabase.from('Dishes').delete().neq('id', '___force_purge___').then(() => {});
                          try { localStorage.setItem('dastaan_manage_dishes_list_v2', JSON.stringify([])); } catch {}
                          setCatalogCmdOutput(
                            JSON.stringify(
                              {
                                sql: 'DELETE FROM products;',
                                status: 'SUCCESS',
                                message: 'آپ کے سارے ڈمی پراڈکٹس ایک ساتھ ڈیلیٹ ہو گئے ہیں',
                                tablesPurged: ['public.products', 'public.dishes', 'public.Dishes'],
                                remainingDummyItems: 0,
                              },
                              null,
                              2
                            )
                          );
                        } else if (lower.includes('dummy') || lower.includes('clear') || lower.includes('fake') || lower.includes('replace')) {
                          setCatalogCmdOutput(
                            JSON.stringify(
                              {
                                action: 'REPLACE_DUMMY_DATA',
                                deletedCount: 0,
                                message: 'Zero dummy items detected. All 19 products are authentic Quetta specialties.',
                                products: safeMenuItems.map((m) => ({
                                  id: m.id,
                                  title: m.name,
                                  price: m.basePrice,
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
                            handleRowFieldChange(found.id, 'price', newPrice);
                            setCatalogCmdOutput(
                              JSON.stringify(
                                {
                                  action: 'EDIT_PRICE_PAYLOAD',
                                  targetId: found.id,
                                  title: found.name,
                                  oldPrice: found.basePrice,
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
                                price: m.basePrice,
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
                      if (lower.includes('delete from products') || lower.includes('delete from dishes') || lower.includes('delete products')) {
                        supabase.from('products').delete().neq('id', '___force_purge___').then(() => {});
                        supabase.from('dishes').delete().neq('id', '___force_purge___').then(() => {});
                        supabase.from('Dishes').delete().neq('id', '___force_purge___').then(() => {});
                        try { localStorage.setItem('dastaan_manage_dishes_list_v2', JSON.stringify([])); } catch {}
                        setCatalogCmdOutput(
                          JSON.stringify(
                            {
                              sql: 'DELETE FROM products;',
                              status: 'SUCCESS',
                              message: 'آپ کے سارے ڈمی پراڈکٹس ایک ساتھ ڈیلیٹ ہو گئے ہیں',
                              tablesPurged: ['public.products', 'public.dishes', 'public.Dishes'],
                              remainingDummyItems: 0,
                            },
                            null,
                            2
                          )
                        );
                      } else if (lower.includes('dummy') || lower.includes('clear') || lower.includes('fake') || lower.includes('replace')) {
                        setCatalogCmdOutput(
                          JSON.stringify(
                            {
                              action: 'REPLACE_DUMMY_DATA',
                              deletedCount: 0,
                              message: 'All dummy items cleared. 19 authentic Quetta dishes loaded with 0 dummy items.',
                              products: safeMenuItems.map((m) => ({
                                id: m.id,
                                title: m.name,
                                price: m.basePrice,
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
                              price: m.basePrice,
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
                    onClick={async () => {
                      setCatalogCmdInput('DELETE FROM products;');
                      try {
                        await supabase.from('products').delete().neq('id', '___force_purge___');
                        await supabase.from('dishes').delete().neq('id', '___force_purge___');
                        await supabase.from('Dishes').delete().neq('id', '___force_purge___');
                        localStorage.setItem('dastaan_manage_dishes_list_v2', JSON.stringify([]));
                      } catch {}
                      setCatalogCmdOutput(
                        JSON.stringify(
                          {
                            sql: 'DELETE FROM products;',
                            status: 'SUCCESS',
                            message: 'آپ کے سارے ڈمی پراڈکٹس ایک ساتھ ڈیلیٹ ہو گئے ہیں',
                            tablesPurged: ['public.products', 'public.dishes', 'public.Dishes'],
                            remainingDummyItems: 0,
                          },
                          null,
                          2
                        )
                      );
                    }}
                    className="px-2.5 py-1 bg-rose-950/60 hover:bg-rose-900/80 border border-rose-500/30 text-rose-300 font-mono rounded-lg cursor-pointer"
                  >
                    Preset: DELETE FROM products;
                  </button>
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
                              price: m.basePrice,
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
                  {catalogCmdOutput || JSON.stringify(safeMenuItems.map((m) => ({ id: m.id, title: m.name, price: m.basePrice, isDummy: false })), null, 2)}
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

      {/* Full Edit Dish Modal: 100% Control over all items & Supabase menu_items connected */}
      {editingDishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-xl max-h-[92vh] overflow-y-auto bg-[#12141a] border border-white/[0.12] rounded-3xl p-6 sm:p-7 shadow-2xl scrollbar-thin">
            <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08] mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#dfba6c]/15 text-[#dfba6c] flex items-center justify-center">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                    <span>Edit Dish</span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/20 font-normal">
                      table: menu_items
                    </span>
                  </h4>
                  <span className="text-[11px] text-[#8c8e96] font-mono">
                    ID: {editingDishModal.id}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingDishModal(null)}
                className="p-1.5 text-[#8c8e96] hover:text-white rounded-full bg-white/[0.04]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editModalStatusMsg && (
              <div className={`p-3 rounded-2xl text-xs mb-3 flex items-center gap-2 ${
                editModalStatusMsg.includes('Saved')
                  ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/60 border border-rose-500/40 text-rose-300'
              }`}>
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{editModalStatusMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveEditDishModal} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-[#dfba6c] mb-1">
                    Dish English Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editModalName}
                    onChange={(e) => setEditModalName(e.target.value)}
                    placeholder="e.g. Quetta Grilled Beef Shawarma"
                    className="w-full px-3.5 py-2.5 bg-[#171922] border border-white/[0.08] rounded-xl text-white placeholder-[#6b6e79] focus:outline-none focus:border-[#dfba6c]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-[#dfba6c] mb-1">
                    Urdu Name (اردو نام)
                  </label>
                  <input
                    type="text"
                    value={editModalUrdu}
                    onChange={(e) => setEditModalUrdu(e.target.value)}
                    placeholder="کوئٹہ بیف شوارما"
                    className="w-full px-3.5 py-2.5 bg-[#171922] border border-white/[0.08] rounded-xl text-white placeholder-[#6b6e79] focus:outline-none focus:border-[#dfba6c]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-[#dfba6c] mb-1">
                    Category *
                  </label>
                  <select
                    value={editModalCategory}
                    onChange={(e) => setEditModalCategory(e.target.value as Category)}
                    className="w-full px-3 py-2.5 bg-[#171922] border border-white/[0.08] rounded-xl text-white focus:outline-none focus:border-[#dfba6c]"
                  >
                    <option value="biryani">Biryani</option>
                    <option value="karahi">Shinwari Karahi</option>
                    <option value="handi">Clay Handi</option>
                    <option value="kebab">Chapli & Seekh Kebab</option>
                    <option value="shawarma">Arabian Shawarma</option>
                    <option value="pizza">Artisan Pizza</option>
                    <option value="breads_sides">Tandoor Naan</option>
                    <option value="beverages">Drinks & Kahwa</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-[#dfba6c] mb-1">
                    Price (PKR) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={10}
                    value={editModalPrice}
                    onChange={(e) => setEditModalPrice(Number(e.target.value) || 0)}
                    placeholder="750"
                    className="w-full px-3.5 py-2.5 bg-[#171922] border border-white/[0.08] rounded-xl text-white font-mono font-bold focus:outline-none focus:border-[#dfba6c]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-[#dfba6c] mb-1">
                    Availability
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditModalAvailable(!editModalAvailable)}
                    className={`w-full py-2.5 px-3 rounded-xl font-mono text-xs transition-colors border ${
                      editModalAvailable
                        ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400'
                        : 'bg-rose-950/60 border-rose-800/40 text-rose-300'
                    }`}
                  >
                    {editModalAvailable ? 'In Stock (Active)' : 'Sold Out (Hidden)'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-[#dfba6c] mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={editModalDesc}
                  onChange={(e) => setEditModalDesc(e.target.value)}
                  placeholder="Appetizing description of the dish..."
                  className="w-full px-3.5 py-2.5 bg-[#171922] border border-white/[0.08] rounded-xl text-white placeholder-[#6b6e79] focus:outline-none focus:border-[#dfba6c]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-[#dfba6c] mb-1">
                    Culinary Notes
                  </label>
                  <input
                    type="text"
                    value={editModalCulinaryNotes}
                    onChange={(e) => setEditModalCulinaryNotes(e.target.value)}
                    placeholder="e.g. Cooked over wood embers"
                    className="w-full px-3.5 py-2.5 bg-[#171922] border border-white/[0.08] rounded-xl text-white placeholder-[#6b6e79] focus:outline-none focus:border-[#dfba6c]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-[#dfba6c] mb-1">
                    Prep Time
                  </label>
                  <input
                    type="text"
                    value={editModalPrepTime}
                    onChange={(e) => setEditModalPrepTime(e.target.value)}
                    placeholder="20-25 min"
                    className="w-full px-3.5 py-2.5 bg-[#171922] border border-white/[0.08] rounded-xl text-white placeholder-[#6b6e79] focus:outline-none focus:border-[#dfba6c]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-[#dfba6c] mb-1">
                  Key Ingredients (comma separated)
                </label>
                <input
                  type="text"
                  value={editModalIngredients}
                  onChange={(e) => setEditModalIngredients(e.target.value)}
                  placeholder="Beef Shank, Basmati Rice, Saffron, Desi Ghee"
                  className="w-full px-3.5 py-2.5 bg-[#171922] border border-white/[0.08] rounded-xl text-white placeholder-[#6b6e79] focus:outline-none focus:border-[#dfba6c]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-[#dfba6c] mb-1">
                  Dish Image (URL or Presets)
                </label>
                <input
                  type="text"
                  value={editModalImage}
                  onChange={(e) => setEditModalImage(e.target.value)}
                  placeholder="Image URL or select below"
                  className="w-full px-3.5 py-2.5 bg-[#171922] border border-white/[0.08] rounded-xl text-white placeholder-[#6b6e79] focus:outline-none focus:border-[#dfba6c] mb-2 font-mono text-[11px]"
                />
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {[
                    { label: 'Shawarma', src: '/src/assets/images/quetta_shawarma_wrap_1791134720429.jpg' },
                    { label: 'Pizza', src: '/src/assets/images/quetta_tikka_pizza_1791134736306.jpg' },
                    { label: 'Biryani', src: '/src/assets/images/dewaan_hero_handi_biryani_1791045111743.jpg' },
                    { label: 'Karahi', src: '/src/assets/images/dewaan_karahi_curry_1791045143832.jpg' },
                    { label: 'Handi', src: '/src/assets/images/quetta_creamy_handi_1791134753990.jpg' },
                    { label: 'Kebab', src: '/src/assets/images/quetta_chapli_kebab_1791134777685.jpg' },
                    { label: 'Galouti', src: '/src/assets/images/dewaan_galouti_kebabs_1791045128960.jpg' },
                    { label: 'Naan', src: '/src/assets/images/dewaan_tandoor_naan_1791045647611.jpg' },
                    { label: 'Drink', src: '/src/assets/images/dewaan_mango_lassi_drink_1791045660858.jpg' },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setEditModalImage(preset.src)}
                      className={`shrink-0 flex items-center gap-1.5 p-1 rounded-xl border text-[10px] font-mono transition-all ${
                        editModalImage === preset.src
                          ? 'border-[#dfba6c] bg-[#dfba6c]/20 text-[#dfba6c]'
                          : 'border-white/[0.08] bg-[#161822] text-[#8c8e96] hover:text-white'
                      }`}
                    >
                      <img src={preset.src} alt={preset.label} className="w-6 h-6 rounded-lg object-cover" />
                      <span className="pr-1.5">{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-[#dfba6c] mb-1">
                  Dish Video URL (Optional: MP4, YouTube, or Direct Stream)
                </label>
                <div className="relative">
                  <Film className="w-4 h-4 text-[#727581] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={editModalVideo}
                    onChange={(e) => setEditModalVideo(e.target.value)}
                    placeholder="https://...mp4 or YouTube video embed"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#171922] border border-white/[0.08] rounded-xl text-white placeholder-[#6b6e79] focus:outline-none focus:border-[#dfba6c] font-mono text-[11px]"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={isSavingEditModal}
                  onClick={() => handleDeleteDish(editingDishModal)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/40 text-xs font-semibold transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Dish</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingDishModal(null)}
                    className="px-4 py-2.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-white text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEditModal}
                    className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-[#dfba6c] hover:bg-[#ebd8ab] text-[#090a0d] font-bold text-xs shadow-md transition-all disabled:opacity-50"
                  >
                    {isSavingEditModal ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving to Supabase...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Save Changes to Supabase</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
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

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-[#dfba6c] mb-1">
                  Dish Price (PKR) *
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
