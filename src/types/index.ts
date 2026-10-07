export type SpiceLevel = 'mild' | 'medium' | 'hot' | 'desi_fiery';

export type Category = 
  | 'all'
  | 'biryani'
  | 'karahi'
  | 'handi'
  | 'kebab'
  | 'shawarma'
  | 'pizza'
  | 'breads_sides'
  | 'beverages';

export type DietaryTag = 
  | 'halal'
  | 'vegetarian'
  | 'gluten_free'
  | 'chef_signature'
  | 'contains_nuts';

export type DishCategory = 'BBQ' | 'Karahi' | 'Fast Food' | 'Biryani' | 'Drinks';

export interface Dish {
  id: string;
  name: string;
  category: DishCategory;
  price: number;
  image: string;
  is_available: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PortionOption {
  id: string;
  name: string;
  priceDelta: number;
  serving: string;
}

export interface ProteinOption {
  id: string;
  name: string;
  priceDelta: number;
}

export interface AccompanimentOption {
  id: string;
  name: string;
  priceDelta: number;
}

export interface AddOnOption {
  id: string;
  name: string;
  price: number;
}

export interface MenuItem {
  id: string;
  name: string;
  urduName?: string;
  category: Category;
  basePrice: number;
  dailyMarketPrice?: number; // Daily market value updated by admin in Supabase
  marketPriceNotes?: string; // Reason or daily market rate notes (e.g. Quetta livestock rate)
  isAvailable?: boolean; // Real-time availability
  image: string;
  videoUrl?: string; // Product/dish video (MP4, YouTube embed, or direct video stream)
  fallbackGradient?: string;
  description: string;
  culinaryNotes: string;
  ingredients: string[];
  spiceLevelDefault: SpiceLevel;
  spiceCustomizable: boolean;
  portionOptions: PortionOption[];
  proteinOptions?: ProteinOption[];
  accompanimentOptions?: AccompanimentOption[];
  addOnOptions?: AddOnOption[];
  prepTime: string;
  dietary: DietaryTag[];
  calories?: number;
  isPopular?: boolean;
}

export interface CartCustomization {
  portion: PortionOption;
  spiceLevel: SpiceLevel;
  protein?: ProteinOption;
  accompaniment?: AccompanimentOption;
  selectedAddOns: AddOnOption[];
  specialInstructions?: string;
}

export interface CartItem {
  cartItemId: string;
  menuItem: MenuItem;
  customization: CartCustomization;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

export type OrderStatus = 
  | 'confirmed'
  | 'kitchen_dum'
  | 'packing_check'
  | 'out_for_delivery'
  | 'delivered';

export interface OrderMilestone {
  stage: OrderStatus;
  title: string;
  subtitle: string;
  timestamp: string;
  completed: boolean;
  active: boolean;
}

export interface DeliveryDriver {
  name: string;
  phone: string;
  rating: number;
  tripsCount: number;
  vehicle: string;
  plateNumber: string;
  avatarText: string;
  currentLat: number;
  currentLng: number;
  progressPercent: number; // 0 to 100
}

export interface Order {
  id: string;
  placedAt: string;
  status: OrderStatus;
  orderType: 'delivery' | 'pickup';
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  packagingFee: number;
  tax: number;
  tip: number;
  discount: number;
  promoCode?: string;
  total: number;
  customer: {
    fullName: string;
    phone: string;
    email: string;
    address: string;
    aptSuite?: string;
    deliveryNotes?: string;
  };
  paymentMethod: 'card' | 'cod' | 'apple_pay';
  estimatedDeliveryMinutes: number;
  estimatedArrivalTimestamp: string;
  driver?: DeliveryDriver;
  milestones: OrderMilestone[];
  chatMessages: {
    sender: 'customer' | 'driver' | 'restaurant';
    text: string;
    time: string;
  }[];
}
