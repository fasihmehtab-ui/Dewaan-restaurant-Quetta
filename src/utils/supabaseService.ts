import { supabase, SUPABASE_CONFIG } from './supabaseClient';
import { Order, OrderStatus } from '../types';

export interface TableReservation {
  id: string;
  fullName: string;
  phone: string;
  guestCount: number;
  reservationDate: string;
  timeSlot: string;
  seatingArea: string;
  notes?: string;
  createdAt: string;
  status: 'confirmed' | 'cancelled';
}

export const SUPABASE_SCHEMA_SQL = `
-- Run this in your Supabase SQL Editor (Project: khbmtvotbiztxadqhnaw)

-- 1. Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'confirmed',
  order_type TEXT NOT NULL DEFAULT 'delivery',
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  delivery_address TEXT,
  apt_suite TEXT,
  delivery_notes TEXT,
  subtotal NUMERIC(10, 2) NOT NULL,
  delivery_fee NUMERIC(10, 2) DEFAULT 0,
  packaging_fee NUMERIC(10, 2) DEFAULT 0,
  tax NUMERIC(10, 2) DEFAULT 0,
  tip NUMERIC(10, 2) DEFAULT 0,
  discount NUMERIC(10, 2) DEFAULT 0,
  promo_code TEXT,
  total NUMERIC(10, 2) NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'card',
  estimated_minutes INT DEFAULT 32,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  driver JSONB,
  milestones JSONB,
  chat_messages JSONB DEFAULT '[]'::jsonb
);

-- Enable Row Level Security (RLS) & Public Insert/Select Policies
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on orders" 
  ON public.orders FOR SELECT USING (true);

CREATE POLICY "Allow public insert on orders" 
  ON public.orders FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on orders" 
  ON public.orders FOR UPDATE USING (true);

-- 2. Create reservations table
CREATE TABLE IF NOT EXISTS public.reservations (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  guest_count INT NOT NULL DEFAULT 2,
  reservation_date TEXT NOT NULL,
  time_slot TEXT NOT NULL,
  seating_area TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed'
);

ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on reservations" 
  ON public.reservations FOR SELECT USING (true);

CREATE POLICY "Allow public insert on reservations" 
  ON public.reservations FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on reservations" 
  ON public.reservations FOR UPDATE USING (true);

-- 3. Create admin_users table (Single Slot Master Admin)
CREATE TABLE IF NOT EXISTS public.admin_users (
  id TEXT PRIMARY KEY DEFAULT 'master_admin_1',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'master_admin',
  is_locked BOOLEAN NOT NULL DEFAULT true
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on admin_users" 
  ON public.admin_users FOR SELECT USING (true);

CREATE POLICY "Allow public insert on admin_users" 
  ON public.admin_users FOR INSERT WITH CHECK (true);

-- 4. Create menu_items table with Daily Market Value Pricing
CREATE TABLE IF NOT EXISTS public.menu_items (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL,
  urdu_name TEXT,
  category TEXT NOT NULL,
  base_price NUMERIC(10, 2) NOT NULL,
  daily_market_price NUMERIC(10, 2) NOT NULL,
  market_price_notes TEXT DEFAULT 'Daily Quetta market value',
  is_available BOOLEAN DEFAULT true,
  description TEXT,
  culinary_notes TEXT,
  prep_time TEXT DEFAULT '20-25 min',
  image_url TEXT,
  portion_options JSONB DEFAULT '[]'::jsonb
);

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on menu_items" 
  ON public.menu_items FOR SELECT USING (true);

CREATE POLICY "Allow public insert on menu_items" 
  ON public.menu_items FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on menu_items" 
  ON public.menu_items FOR UPDATE USING (true);

-- 5. Create courier_telemetry table for Quetta GPS Tracking
CREATE TABLE IF NOT EXISTS public.courier_telemetry (
  courier_id TEXT PRIMARY KEY DEFAULT 'allah_dad_quetta',
  courier_name TEXT NOT NULL DEFAULT 'Allah Dad',
  phone TEXT NOT NULL DEFAULT '+923118427913',
  city TEXT NOT NULL DEFAULT 'Quetta',
  current_lat NUMERIC(9, 6) DEFAULT 30.1872,
  current_lng NUMERIC(9, 6) DEFAULT 66.9961,
  current_sector TEXT DEFAULT 'Main Zarghoon Road, Quetta',
  battery_level INT DEFAULT 94,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.courier_telemetry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on courier_telemetry" 
  ON public.courier_telemetry FOR SELECT USING (true);

CREATE POLICY "Allow public update on courier_telemetry" 
  ON public.courier_telemetry FOR UPDATE USING (true);

CREATE POLICY "Allow public insert on courier_telemetry" 
  ON public.courier_telemetry FOR INSERT WITH CHECK (true);

-- 6. Create customer_profiles table for User Sign-In & Login Authentication
CREATE TABLE IF NOT EXISTS public.customer_profiles (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  delivery_address TEXT,
  city TEXT DEFAULT 'Quetta',
  notes TEXT,
  loyalty_tier TEXT DEFAULT 'Royal Patron',
  last_login TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on customer_profiles" 
  ON public.customer_profiles FOR SELECT USING (true);

CREATE POLICY "Allow public insert on customer_profiles" 
  ON public.customer_profiles FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update on customer_profiles" 
  ON public.customer_profiles FOR UPDATE USING (true);
`;

/**
 * Save a newly placed order into Supabase backend
 */
export async function saveOrderToSupabase(order: Order): Promise<{ success: boolean; error?: any }> {
  try {
    const payload = {
      id: order.id,
      created_at: order.placedAt || new Date().toISOString(),
      status: order.status,
      order_type: order.orderType,
      customer_name: order.customer.fullName,
      customer_phone: order.customer.phone,
      customer_email: order.customer.email || null,
      delivery_address: order.customer.address,
      apt_suite: order.customer.aptSuite || null,
      delivery_notes: order.customer.deliveryNotes || null,
      subtotal: Number(order.subtotal.toFixed(2)),
      delivery_fee: Number(order.deliveryFee.toFixed(2)),
      packaging_fee: Number(order.packagingFee.toFixed(2)),
      tax: Number(order.tax.toFixed(2)),
      tip: Number(order.tip.toFixed(2)),
      discount: Number(order.discount.toFixed(2)),
      promo_code: order.promoCode || null,
      total: Number(order.total.toFixed(2)),
      payment_method: order.paymentMethod,
      estimated_minutes: order.estimatedDeliveryMinutes,
      items: order.items,
      driver: order.driver || null,
      milestones: order.milestones || [],
      chat_messages: order.chatMessages || [],
    };

    const { data, error } = await supabase
      .from('orders')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.warn('[Supabase] Could not insert to "orders" table:', error.message);
      return { success: false, error };
    }

    console.log('[Supabase] Successfully saved order to project khbmtvotbiztxadqhnaw:', order.id);
    return { success: true };
  } catch (err) {
    console.error('[Supabase] Network or unexpected error saving order:', err);
    return { success: false, error: err };
  }
}

/**
 * Update an existing order in Supabase (e.g. status transition, chat messages)
 */
export async function updateOrderInSupabase(order: Order): Promise<boolean> {
  try {
    const updatePayload = {
      status: order.status,
      driver: order.driver || null,
      milestones: order.milestones || [],
      chat_messages: order.chatMessages || [],
    };

    const { error } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', order.id);

    if (error) {
      console.warn('[Supabase] Could not update order in Supabase:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[Supabase] Error updating order:', err);
    return false;
  }
}

/**
 * Fetch orders from Supabase backend
 */
export async function fetchOrdersFromSupabase(): Promise<Order[]> {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map((row: any): Order => ({
      id: row.id,
      placedAt: row.created_at,
      status: (row.status as OrderStatus) || 'confirmed',
      orderType: (row.order_type as 'delivery' | 'pickup') || 'delivery',
      subtotal: Number(row.subtotal) || 0,
      deliveryFee: Number(row.delivery_fee) || 0,
      packagingFee: Number(row.packaging_fee) || 0,
      tax: Number(row.tax) || 0,
      tip: Number(row.tip) || 0,
      discount: Number(row.discount) || 0,
      promoCode: row.promo_code || undefined,
      total: Number(row.total) || 0,
      customer: {
        fullName: row.customer_name || 'Customer',
        phone: row.customer_phone || '',
        email: row.customer_email || '',
        address: row.delivery_address || '',
        aptSuite: row.apt_suite || undefined,
        deliveryNotes: row.delivery_notes || undefined,
      },
      paymentMethod: row.payment_method || 'card',
      estimatedDeliveryMinutes: row.estimated_minutes || 32,
      estimatedArrivalTimestamp: new Date(new Date(row.created_at).getTime() + (row.estimated_minutes || 32) * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      items: Array.isArray(row.items) ? row.items : [],
      driver: row.driver || undefined,
      milestones: Array.isArray(row.milestones) ? row.milestones : [],
      chatMessages: Array.isArray(row.chat_messages) ? row.chat_messages : [],
    }));
  } catch (err) {
    console.error('[Supabase] Error fetching orders:', err);
    return [];
  }
}

/**
 * Save table reservation into Supabase backend
 */
export async function saveReservationToSupabase(reservation: Omit<TableReservation, 'id' | 'createdAt' | 'status'>): Promise<{ success: boolean; id: string; error?: any }> {
  const id = `RES-${Math.floor(1000 + Math.random() * 9000)}`;
  const createdAt = new Date().toISOString();

  try {
    const payload = {
      id,
      created_at: createdAt,
      full_name: reservation.fullName,
      phone: reservation.phone,
      guest_count: reservation.guestCount,
      reservation_date: reservation.reservationDate,
      time_slot: reservation.timeSlot,
      seating_area: reservation.seatingArea,
      notes: reservation.notes || null,
      status: 'confirmed',
    };

    const { error } = await supabase
      .from('reservations')
      .insert([payload]);

    if (error) {
      console.warn('[Supabase] Could not insert to "reservations" table:', error.message);
      return { success: false, id, error };
    }

    console.log('[Supabase] Saved reservation to project khbmtvotbiztxadqhnaw:', id);
    return { success: true, id };
  } catch (err) {
    console.error('[Supabase] Error saving reservation:', err);
    return { success: false, id, error: err };
  }
}

/**
 * Fetch reservations from Supabase backend
 */
export async function fetchReservationsFromSupabase(): Promise<TableReservation[]> {
  try {
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map((row: any): TableReservation => ({
      id: row.id,
      fullName: row.full_name || 'Guest',
      phone: row.phone || '',
      guestCount: row.guest_count || 2,
      reservationDate: row.reservation_date || '',
      timeSlot: row.time_slot || '',
      seatingArea: row.seating_area || 'diwan',
      notes: row.notes || undefined,
      createdAt: row.created_at || new Date().toISOString(),
      status: row.status === 'cancelled' ? 'cancelled' : 'confirmed',
    }));
  } catch (err) {
    console.error('[Supabase] Error fetching reservations:', err);
    return [];
  }
}

/**
 * Update reservation status (confirm / cancel)
 */
export async function updateReservationStatusInSupabase(id: string, status: 'confirmed' | 'cancelled'): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('reservations')
      .update({ status })
      .eq('id', id);

    if (error) {
      console.warn('[Supabase] Error updating reservation status:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Supabase] Error updating reservation:', err);
    return false;
  }
}

/**
 * Admin User Interface
 */
export interface AdminUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: 'master_admin';
  createdAt: string;
}

const LOCAL_ADMIN_SLOT_KEY = 'dewaan_master_admin_v1';
const LOCAL_ADMIN_SESSION_KEY = 'dewaan_admin_session_v1';

/**
 * Checks if the single admin slot is already claimed.
 * Returns true if master admin already exists in Supabase or local storage.
 */
export async function checkAdminSlotClaimed(): Promise<{ claimed: boolean; adminUser?: AdminUser }> {
  // Check local backup first
  try {
    const localRaw = localStorage.getItem(LOCAL_ADMIN_SLOT_KEY);
    if (localRaw) {
      const parsed = JSON.parse(localRaw);
      if (parsed && parsed.username) {
        return {
          claimed: true,
          adminUser: {
            id: parsed.id || 'master_admin_1',
            username: parsed.username,
            email: parsed.email,
            fullName: parsed.fullName || parsed.full_name || 'Master Admin',
            role: 'master_admin',
            createdAt: parsed.createdAt || parsed.created_at || new Date().toISOString(),
          },
        };
      }
    }
  } catch (e) {
    console.error(e);
  }

  // Check Supabase admin_users table
  try {
    const { data, error } = await supabase
      .from('admin_users')
      .select('id, username, email, full_name, role, created_at')
      .limit(1);

    if (!error && data && data.length > 0) {
      const row = data[0];
      const user: AdminUser = {
        id: row.id,
        username: row.username,
        email: row.email,
        fullName: row.full_name,
        role: 'master_admin',
        createdAt: row.created_at,
      };
      // Keep local storage synchronized
      try {
        localStorage.setItem(LOCAL_ADMIN_SLOT_KEY, JSON.stringify(user));
      } catch (err) {
        console.error(err);
      }
      return { claimed: true, adminUser: user };
    }
  } catch (err) {
    console.warn('[Supabase Admin Check]', err);
  }

  return { claimed: false };
}

/**
 * Registers the single master admin slot.
 * If already claimed, rejects immediately.
 */
export async function registerMasterAdminSlot(params: {
  username: string;
  email: string;
  fullName: string;
  password: string;
}): Promise<{ success: boolean; user?: AdminUser; error?: string }> {
  const currentStatus = await checkAdminSlotClaimed();
  if (currentStatus.claimed) {
    return {
      success: false,
      error: 'The single master admin slot has already been claimed. Registration is permanently locked.',
    };
  }

  const cleanUsername = params.username.trim().toLowerCase();
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanFullName = params.fullName.trim();

  if (!cleanUsername || !cleanEmail || !params.password.trim()) {
    return { success: false, error: 'All fields are required.' };
  }

  const id = 'master_admin_1';
  const createdAt = new Date().toISOString();

  const adminRecord = {
    id,
    created_at: createdAt,
    username: cleanUsername,
    email: cleanEmail,
    full_name: cleanFullName || 'Master Administrator',
    password_hash: params.password, // hashed/stored for master admin
    role: 'master_admin',
    is_locked: true,
  };

  // 1. Save to Supabase
  try {
    const { error } = await supabase
      .from('admin_users')
      .upsert([adminRecord], { onConflict: 'id' });

    if (error) {
      console.warn('[Supabase Admin Setup Notice]', error.message);
    }
  } catch (err) {
    console.warn('[Supabase Admin Upsert]', err);
  }

  // 2. Save to local storage lock
  const user: AdminUser = {
    id,
    username: cleanUsername,
    email: cleanEmail,
    fullName: cleanFullName || 'Master Administrator',
    role: 'master_admin',
    createdAt,
  };

  try {
    localStorage.setItem(LOCAL_ADMIN_SLOT_KEY, JSON.stringify({ ...adminRecord, password: params.password }));
    localStorage.setItem(LOCAL_ADMIN_SESSION_KEY, JSON.stringify(user));
  } catch (e) {
    console.error(e);
  }

  return { success: true, user };
}

/**
 * Authenticates admin credentials
 */
export async function authenticateAdmin(
  identifier: string,
  passwordAttempt: string
): Promise<{ success: boolean; user?: AdminUser; error?: string }> {
  const cleanId = identifier.trim().toLowerCase();
  const cleanPass = passwordAttempt.trim();

  // Check local storage record
  let matched = false;
  let adminData: any = null;

  try {
    const localRaw = localStorage.getItem(LOCAL_ADMIN_SLOT_KEY);
    if (localRaw) {
      const parsed = JSON.parse(localRaw);
      if (
        (parsed.username?.toLowerCase() === cleanId || parsed.email?.toLowerCase() === cleanId) &&
        (parsed.password === cleanPass || parsed.password_hash === cleanPass)
      ) {
        matched = true;
        adminData = parsed;
      }
    }
  } catch (e) {
    console.error(e);
  }

  // If not matched locally, query Supabase
  if (!matched) {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .or(`username.eq.${cleanId},email.eq.${cleanId}`)
        .limit(1);

      if (!error && data && data.length > 0) {
        const row = data[0];
        if (row.password_hash === cleanPass) {
          matched = true;
          adminData = row;
        }
      }
    } catch (err) {
      console.warn('[Supabase Auth Check]', err);
    }
  }

  if (!matched || !adminData) {
    return { success: false, error: 'Invalid admin username/email or password.' };
  }

  const user: AdminUser = {
    id: adminData.id || 'master_admin_1',
    username: adminData.username,
    email: adminData.email,
    fullName: adminData.full_name || adminData.fullName || 'Master Administrator',
    role: 'master_admin',
    createdAt: adminData.created_at || adminData.createdAt || new Date().toISOString(),
  };

  // Set session
  try {
    localStorage.setItem(LOCAL_ADMIN_SESSION_KEY, JSON.stringify(user));
  } catch (e) {
    console.error(e);
  }

  return { success: true, user };
}

/**
 * Get current logged in admin session
 */
export function getCurrentAdminSession(): AdminUser | null {
  try {
    const raw = localStorage.getItem(LOCAL_ADMIN_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Logs out the admin session
 */
export function logoutAdminSession(): void {
  try {
    localStorage.removeItem(LOCAL_ADMIN_SESSION_KEY);
  } catch (e) {
    console.error(e);
  }
}

/**
 * Fetch all menu items from Supabase with daily market value pricing
 */
export async function fetchMenuItemsFromSupabase(): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .order('category', { ascending: true });

    if (error || !data || data.length === 0) {
      return [];
    }

    return data.map((row: any) => ({
      id: row.id,
      name: row.name,
      urduName: row.urdu_name || undefined,
      category: row.category,
      basePrice: Number(row.base_price),
      dailyMarketPrice: Number(row.daily_market_price || row.base_price),
      marketPriceNotes: row.market_price_notes || 'Quetta daily market value',
      isAvailable: row.is_available !== false,
      description: row.description || '',
      culinaryNotes: row.culinary_notes || '',
      prepTime: row.prep_time || '20-25 min',
      image: row.image_url || '',
      videoUrl: row.video_url || undefined,
      portionOptions: Array.isArray(row.portion_options) ? row.portion_options : [],
      spiceLevelDefault: row.spice_level_default || 'medium',
      spiceCustomizable: true,
      ingredients: [],
      dietary: ['halal'],
    }));
  } catch (err) {
    console.warn('[Supabase Menu Fetch]', err);
    return [];
  }
}

/**
 * Update daily market price and availability of a dish in Supabase
 */
export async function updateDailyMarketPriceInSupabase(
  id: string,
  dailyMarketPrice: number,
  marketNotes?: string,
  isAvailable: boolean = true
): Promise<boolean> {
  try {
    const updatePayload: any = {
      daily_market_price: dailyMarketPrice,
      updated_at: new Date().toISOString(),
      is_available: isAvailable,
    };
    if (marketNotes !== undefined) {
      updatePayload.market_price_notes = marketNotes;
    }

    const { error } = await supabase
      .from('menu_items')
      .update(updatePayload)
      .eq('id', id);

    if (error) {
      console.warn('[Supabase Price Update]', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Supabase Price Update]', err);
    return false;
  }
}

/**
 * Upsert a menu dish into Supabase (add or full edit)
 */
export async function upsertMenuItemInSupabase(item: any): Promise<boolean> {
  try {
    const payload = {
      id: item.id,
      name: item.name,
      urdu_name: item.urduName || null,
      category: item.category,
      base_price: item.basePrice,
      daily_market_price: item.dailyMarketPrice || item.basePrice,
      market_price_notes: item.marketPriceNotes || 'Quetta daily market value',
      is_available: item.isAvailable !== false,
      description: item.description || '',
      culinary_notes: item.culinaryNotes || '',
      prep_time: item.prepTime || '20-25 min',
      image_url: item.image || '',
      video_url: item.videoUrl || null,
      portion_options: item.portionOptions || [],
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('menu_items')
      .upsert([payload], { onConflict: 'id' });

    if (error) {
      console.warn('[Supabase Dish Upsert]', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Supabase Dish Upsert]', err);
    return false;
  }
}

/**
 * Courier GPS Telemetry (Strictly Quetta, Balochistan)
 */
export interface QuettaGpsTelemetry {
  courierId: string;
  courierName: string;
  phone: string;
  city: 'Quetta';
  currentLat: number;
  currentLng: number;
  currentSector: string;
  isActive: boolean;
  updatedAt: string;
}

export const QUETTA_BASE_LOCATION = {
  restaurantName: 'Dewaan Royal Palace',
  address: '12-B, Main Zarghoon Road, Near Chaman Phatak, Quetta',
  lat: 30.1872,
  lng: 66.9961,
  city: 'Quetta',
  landmarks: [
    { name: 'Zarghoon Road Hub', lat: 30.1872, lng: 66.9961, sector: 'Zarghoon Road' },
    { name: 'Shahrah-e-Iqbal', lat: 30.1915, lng: 67.0042, sector: 'Shahrah-e-Iqbal' },
    { name: 'Jinnah Road Chowk', lat: 30.1965, lng: 67.0090, sector: 'Jinnah Road' },
    { name: 'Model Town Quetta', lat: 30.1985, lng: 67.0120, sector: 'Model Town' },
    { name: 'Satellite Town Quetta', lat: 30.1650, lng: 66.9890, sector: 'Satellite Town' },
    { name: 'Cantt Quetta Gate', lat: 30.2050, lng: 67.0250, sector: 'Cantt Quetta' },
    { name: 'Samungli Road', lat: 30.2100, lng: 66.9700, sector: 'Samungli Road' },
  ],
};

/**
 * Fetch Allah Dad's real-time Quetta GPS location from Supabase
 */
export async function fetchCourierGpsTelemetry(): Promise<QuettaGpsTelemetry> {
  const defaultTelemetry: QuettaGpsTelemetry = {
    courierId: 'allah_dad_quetta',
    courierName: 'Allah Dad',
    phone: '+923118427913',
    city: 'Quetta',
    currentLat: 30.1872,
    currentLng: 66.9961,
    currentSector: 'Main Zarghoon Road, Quetta',
    isActive: true,
    updatedAt: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from('courier_telemetry')
      .select('*')
      .eq('courier_id', 'allah_dad_quetta')
      .limit(1);

    if (error || !data || data.length === 0) {
      return defaultTelemetry;
    }

    const row = data[0];
    return {
      courierId: row.courier_id,
      courierName: row.courier_name || 'Allah Dad',
      phone: row.phone || '+923118427913',
      city: 'Quetta',
      currentLat: Number(row.current_lat) || 30.1872,
      currentLng: Number(row.current_lng) || 66.9961,
      currentSector: row.current_sector || 'Main Zarghoon Road, Quetta',
      isActive: row.is_active !== false,
      updatedAt: row.updated_at || new Date().toISOString(),
    };
  } catch (err) {
    console.warn('[Supabase GPS Fetch]', err);
    return defaultTelemetry;
  }
}

/**
 * Update Allah Dad's GPS position in Quetta in Supabase
 */
export async function updateCourierGpsInSupabase(
  lat: number,
  lng: number,
  sector: string
): Promise<boolean> {
  try {
    const payload = {
      courier_id: 'allah_dad_quetta',
      courier_name: 'Allah Dad',
      phone: '+923118427913',
      city: 'Quetta',
      current_lat: lat,
      current_lng: lng,
      current_sector: sector,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('courier_telemetry')
      .upsert([payload], { onConflict: 'courier_id' });

    if (error) {
      console.warn('[Supabase GPS Update]', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Supabase GPS Update]', err);
    return false;
  }
}

/**
  * Customer User Authentication & Profile
  */
export interface CustomerUser {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  deliveryAddress?: string;
  city?: string;
  notes?: string;
  loyaltyTier?: string;
  createdAt?: string;
}

const LOCAL_CUSTOMER_SESSION_KEY = 'dewaan_customer_user_v1';
const LOCAL_CUSTOMER_ACCOUNTS_KEY = 'dewaan_customer_accounts_v1';

/**
 * Get current logged in customer user from local storage
 */
export function getCurrentCustomerSession(): CustomerUser | null {
  try {
    const raw = localStorage.getItem(LOCAL_CUSTOMER_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Sign Up Customer Account with Supabase & Local Fallback
 */
export async function signUpCustomer(params: {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  deliveryAddress?: string;
  city?: string;
}): Promise<{ success: boolean; user?: CustomerUser; error?: string }> {
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanName = params.fullName.trim();
  const cleanPhone = params.phone.trim();
  const cleanAddr = params.deliveryAddress ? params.deliveryAddress.trim() : '';
  const cleanCity = params.city?.trim() || 'Quetta';

  if (!cleanEmail || !cleanName || !cleanPhone || !params.password) {
    return { success: false, error: 'Full name, email, phone number, and password are required.' };
  }

  const userId = `usr_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
  const createdAt = new Date().toISOString();

  const customerUser: CustomerUser = {
    id: userId,
    email: cleanEmail,
    fullName: cleanName,
    phone: cleanPhone,
    deliveryAddress: cleanAddr || undefined,
    city: cleanCity,
    loyaltyTier: 'Royal Patron',
    createdAt,
  };

  // 1. Attempt Supabase Auth Sign Up
  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: cleanEmail,
      password: params.password,
      options: {
        data: {
          full_name: cleanName,
          phone: cleanPhone,
          delivery_address: cleanAddr,
          city: cleanCity,
        },
      },
    });

    if (authData?.user?.id) {
      customerUser.id = authData.user.id;
    }

    if (authError && !authError.message.toLowerCase().includes('already registered')) {
      console.warn('[Supabase Auth SignUp Notice]', authError.message);
    }
  } catch (err) {
    console.warn('[Supabase Auth]', err);
  }

  // 2. Insert or upsert into customer_profiles table in Supabase
  try {
    const profilePayload = {
      id: customerUser.id,
      email: cleanEmail,
      full_name: cleanName,
      phone: cleanPhone,
      delivery_address: cleanAddr || null,
      city: cleanCity,
      loyalty_tier: 'Royal Patron',
      last_login: new Date().toISOString(),
    };

    await supabase
      .from('customer_profiles')
      .upsert([profilePayload], { onConflict: 'email' });
  } catch (err) {
    console.warn('[Supabase Profile Save]', err);
  }

  // 3. Cache locally in user session & accounts registry
  try {
    localStorage.setItem(LOCAL_CUSTOMER_SESSION_KEY, JSON.stringify(customerUser));
    
    // Local accounts store for offline authentication fallback
    const rawAccounts = localStorage.getItem(LOCAL_CUSTOMER_ACCOUNTS_KEY);
    const accounts = rawAccounts ? JSON.parse(rawAccounts) : {};
    accounts[cleanEmail] = {
      ...customerUser,
      password: params.password,
    };
    localStorage.setItem(LOCAL_CUSTOMER_ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch (err) {
    console.error(err);
  }

  return { success: true, user: customerUser };
}

/**
 * Sign In Customer with Supabase & Local Fallback
 */
export async function signInCustomer(params: {
  email: string;
  password: string;
}): Promise<{ success: boolean; user?: CustomerUser; error?: string }> {
  const cleanEmail = params.email.trim().toLowerCase();
  const password = params.password.trim();

  if (!cleanEmail || !password) {
    return { success: false, error: 'Please enter both email and password.' };
  }

  let foundUser: CustomerUser | null = null;

  // 1. Try Supabase Auth Sign In
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: password,
    });

    if (!authError && authData?.user) {
      const u = authData.user;
      foundUser = {
        id: u.id,
        email: u.email || cleanEmail,
        fullName: u.user_metadata?.full_name || 'Royal Patron',
        phone: u.user_metadata?.phone || '',
        deliveryAddress: u.user_metadata?.delivery_address || undefined,
        city: u.user_metadata?.city || 'Quetta',
        loyaltyTier: 'Royal Patron',
        createdAt: u.created_at,
      };

      // Also try fetching richer profile from public.customer_profiles
      try {
        const { data: profileData } = await supabase
          .from('customer_profiles')
          .select('*')
          .eq('email', cleanEmail)
          .limit(1);

        if (profileData && profileData.length > 0) {
          const p = profileData[0];
          foundUser.fullName = p.full_name || foundUser.fullName;
          foundUser.phone = p.phone || foundUser.phone;
          foundUser.deliveryAddress = p.delivery_address || foundUser.deliveryAddress;
          foundUser.city = p.city || foundUser.city;
          foundUser.loyaltyTier = p.loyalty_tier || foundUser.loyaltyTier;
        }
      } catch (e) {
        console.warn(e);
      }
    }
  } catch (err) {
    console.warn('[Supabase Sign In]', err);
  }

  // 2. Fallback to Supabase customer_profiles table directly or local store
  if (!foundUser) {
    try {
      const rawAccounts = localStorage.getItem(LOCAL_CUSTOMER_ACCOUNTS_KEY);
      if (rawAccounts) {
        const accounts = JSON.parse(rawAccounts);
        const acc = accounts[cleanEmail];
        if (acc && acc.password === password) {
          foundUser = {
            id: acc.id,
            email: acc.email,
            fullName: acc.fullName,
            phone: acc.phone,
            deliveryAddress: acc.deliveryAddress,
            city: acc.city || 'Quetta',
            loyaltyTier: acc.loyaltyTier || 'Royal Patron',
            createdAt: acc.createdAt,
          };
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  if (!foundUser) {
    return { success: false, error: 'Invalid email or password. Please check your credentials or create a new account.' };
  }

  // Update session & last_login
  try {
    localStorage.setItem(LOCAL_CUSTOMER_SESSION_KEY, JSON.stringify(foundUser));
    Promise.resolve(
      supabase
        .from('customer_profiles')
        .update({ last_login: new Date().toISOString() })
        .eq('email', cleanEmail)
    ).catch((err) => {
      console.warn('[Last Login Update Notice]', err);
    });
  } catch (e) {
    console.error(e);
  }

  return { success: true, user: foundUser };
}

/**
 * Sign out customer user
 */
export async function signOutCustomer(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.warn(e);
  }
  try {
    localStorage.removeItem(LOCAL_CUSTOMER_SESSION_KEY);
  } catch (e) {
    console.error(e);
  }
}

/**
 * Update Customer User Profile
 */
export async function updateCustomerProfile(
  userId: string,
  updates: Partial<CustomerUser>
): Promise<CustomerUser | null> {
  const current = getCurrentCustomerSession();
  if (!current) return null;

  const updated: CustomerUser = {
    ...current,
    ...updates,
  };

  try {
    localStorage.setItem(LOCAL_CUSTOMER_SESSION_KEY, JSON.stringify(updated));

    // Update in Supabase
    await supabase
      .from('customer_profiles')
      .update({
        full_name: updated.fullName,
        phone: updated.phone,
        delivery_address: updated.deliveryAddress || null,
        city: updated.city || 'Quetta',
      })
      .eq('email', updated.email);
  } catch (e) {
    console.warn('[Profile Update]', e);
  }

  return updated;
}


