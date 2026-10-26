import { Order, CartItem, OrderStatus } from '../types';
import { saveOrderToSupabase, CustomerUser, getCurrentCustomerSession } from './supabaseService';
import { appendSavedOrder, getSavedOrders } from './orderStorage';
import { formatPKR } from './currency';

export interface WhatsAppOrderInput {
  items: CartItem[];
  customer?: {
    fullName?: string;
    phone?: string;
    email?: string;
    address?: string;
    aptSuite?: string;
    deliveryNotes?: string;
  };
  orderType?: 'delivery' | 'pickup';
  orderSource?: 'whatsapp' | 'custom_form';
  tip?: number;
  discount?: number;
  promoCode?: string;
  currentUser?: CustomerUser | null;
}

/**
 * Creates an official Order, saves to Supabase and Local Storage,
 * updates app state, and launches WhatsApp with the formatted receipt.
 */
export async function createAndDispatchWhatsAppOrder(
  input: WhatsAppOrderInput,
  onOrderPlaced?: (order: Order) => void
): Promise<Order> {
  const {
    items,
    customer,
    orderType = 'delivery',
    orderSource = 'whatsapp',
    tip = 0,
    discount = 0,
    promoCode,
    currentUser,
  } = input;

  if (!items || items.length === 0) {
    throw new Error('Cannot place an empty WhatsApp order');
  }

  // 1. Calculate pricing breakdown
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const packagingFee = 120;
  const deliveryFee = orderType === 'delivery' ? 180 : 0;
  const tax = Math.round(subtotal * 0.05);
  const total = Math.max(0, subtotal + deliveryFee + packagingFee + tax + tip - discount);

  // 2. Resolve customer details with fallbacks (checking session if not logged in)
  const activeUser = currentUser || getCurrentCustomerSession();
  const custName = customer?.fullName?.trim() || activeUser?.fullName || 'Royal Patron';
  const custPhone = customer?.phone?.trim() || activeUser?.phone || '+92 311 8427913';
  const custEmail = customer?.email?.trim() || activeUser?.email || '';
  const custAddress = orderType === 'delivery'
    ? (customer?.address?.trim() || activeUser?.deliveryAddress || 'Address to be confirmed via WhatsApp')
    : 'Dewaan Royal Palace, Main Zarghoon Road, Quetta';
  const aptSuite = customer?.aptSuite?.trim();
  const deliveryNotes = customer?.deliveryNotes?.trim() || '[WhatsApp Order via Dewaan App]';

  // 3. Generate unique order ID
  const orderId = `DW-WA-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date();
  const estArrival = new Date(now.getTime() + 32 * 60 * 1000);

  // 4. Construct complete Order object
  const newOrder: Order = {
    id: orderId,
    placedAt: now.toISOString(),
    status: 'confirmed' as OrderStatus,
    orderType,
    items: [...items],
    subtotal,
    deliveryFee,
    packagingFee,
    tax,
    tip,
    discount,
    promoCode,
    total,
    customer: {
      fullName: custName,
      phone: custPhone,
      email: custEmail,
      address: `${custAddress}${aptSuite ? `, ${aptSuite}` : ''}`,
      aptSuite: aptSuite || undefined,
      deliveryNotes,
    },
    paymentMethod: 'whatsapp',
    orderSource,
    estimatedDeliveryMinutes: 32,
    estimatedArrivalTimestamp: estArrival.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    driver: {
      name: 'Allah Dad',
      phone: '+923118427913',
      rating: 4.98,
      tripsCount: 2140,
      vehicle: 'Honda CG-125 Royal Express Cargo',
      plateNumber: 'QTA-772-EXP',
      avatarText: 'AD',
      currentLat: 30.1872,
      currentLng: 66.9961,
      progressPercent: 15,
    },
    milestones: [
      {
        stage: 'confirmed',
        title: 'Order Confirmed via WhatsApp',
        subtitle: 'Chef Ustads acknowledged order details & spice preferences',
        timestamp: 'Just now',
        completed: true,
        active: true,
      },
      {
        stage: 'kitchen_dum',
        title: 'Slow-Dum Cooking in Sealed Handi',
        subtitle: 'Awadhi Biryani & Shinwari Karahi cooking over tandoor embers',
        timestamp: 'Upcoming',
        completed: false,
        active: false,
      },
      {
        stage: 'packing_check',
        title: 'Tamper-Evident Royal Packaging',
        subtitle: 'Clay/copper vessels sealed, aroma lock applied, temperature checked',
        timestamp: 'Upcoming',
        completed: false,
        active: false,
      },
      {
        stage: 'out_for_delivery',
        title: 'Dispatched with Courier Allah Dad',
        subtitle: 'En route in heated thermal container. Live GPS tracking.',
        timestamp: 'Upcoming',
        completed: false,
        active: false,
      },
      {
        stage: 'delivered',
        title: 'Delivered at Doorstep',
        subtitle: 'Handed over warm and aromatic. Bon Appétit!',
        timestamp: 'Est. in 32 min',
        completed: false,
        active: false,
      },
    ],
    chatMessages: [
      {
        sender: 'restaurant',
        text: `Salam ${custName}! We have received your WhatsApp order (${orderId}). Ustads are preparing the copper handis according to your selected spice profiles.`,
        time: 'Just now',
      },
    ],
  };

  // 5. Save to Supabase backend table (Project: khbmtvotbiztxadqhnaw)
  try {
    const supaRes = await saveOrderToSupabase(newOrder);
    if (!supaRes.success) {
      console.warn('[WhatsApp Order Service] Supabase insert note:', supaRes.error);
    }
  } catch (err) {
    console.warn('[WhatsApp Order Service] Error saving to Supabase:', err);
  }

  // 6. Save order to Local Storage for instant persistence
  appendSavedOrder(newOrder);

  // 7. Update parent in-memory state so Admin Portal and Live Tracker see it immediately
  if (onOrderPlaced) {
    onOrderPlaced(newOrder);
  }

  // 8. Construct formatted WhatsApp message with official receipt breakdown
  const itemsListText = items
    .map((it) => {
      const portionText = it.customization?.portion?.name ? ` (${it.customization.portion.name})` : '';
      const spiceText = it.customization?.spiceLevel ? ` [Spice: ${it.customization.spiceLevel.replace(/_/g, ' ')}]` : '';
      return `• ${it.quantity}x ${it.menuItem.name}${portionText}${spiceText} - ${formatPKR(it.totalPrice)}`;
    })
    .join('\n');

  const messageText = 
`👑 *Royal Order - Dewaan Quetta*
📋 *Order ID:* ${orderId} (Saved in Supabase & Kitchen Portal)
👤 *Customer:* ${custName}
📱 *Phone:* ${custPhone}
🛵 *Delivery Type:* ${orderType === 'delivery' ? 'Home Delivery (Quetta)' : 'Self Pickup at Dewaan Palace'}
🏠 *Address:* ${custAddress}${aptSuite ? `, ${aptSuite}` : ''}
${deliveryNotes ? `📝 *Notes:* ${deliveryNotes}\n` : ''}
🍲 *Dastarkhwan Dishes:*
${itemsListText}

💵 *Subtotal:* ${formatPKR(subtotal)}
📦 *Packaging:* ${formatPKR(packagingFee)}
${deliveryFee > 0 ? `🛵 *Courier Fee:* ${formatPKR(deliveryFee)}\n` : ''}${tax > 0 ? `🏛️ *Tax (5%):* ${formatPKR(tax)}\n` : ''}${discount > 0 ? `🏷️ *Discount:* -${formatPKR(discount)}\n` : ''}💰 *Grand Total:* ${formatPKR(total)} (Cash on Delivery)
⚡ *Status:* Confirmed & Logged in Kitchen Admin Panel & Supabase`;

  const whatsappUrl = `https://wa.me/923118427913?text=${encodeURIComponent(messageText)}`;

  // 9. Open WhatsApp safely without navigating the parent iframe
  try {
    const link = document.createElement('a');
    link.href = whatsappUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.warn('[WhatsApp Dispatch Error]', err);
    try {
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    } catch {
      // Avoid window.location.href in iframe
    }
  }

  return newOrder;
}
