import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { MenuList } from './components/MenuList';
import { LiveDeliveryTracker } from './components/LiveDeliveryTracker';
import { HeritageSection } from './components/HeritageSection';
import { MealCustomizerModal } from './components/MealCustomizerModal';
import { CartCheckoutDrawer } from './components/CartCheckoutDrawer';
import { TableReservationModal } from './components/TableReservationModal';
import { SupabaseStatusModal } from './components/SupabaseStatusModal';
import { AdminPortal } from './components/AdminPortal';
import { CustomerAuthModal } from './components/CustomerAuthModal';
import { WelcomeAuthModal } from './components/WelcomeAuthModal';
import CustomOrderForm from './components/CustomOrderForm';
import FloatingButtons from './components/FloatingButtons';
import WhatsAppCenterButton from './components/WhatsAppCenterButton';
import { Footer } from './components/Footer';

import { MENU_ITEMS } from './data/menuData';
import { MenuItem, CartItem, Order } from './types';
import { getSavedOrders, saveOrders } from './utils/orderStorage';
import { fetchOrdersFromSupabase, updateOrderInSupabase, fetchMenuItemsFromSupabase, CustomerUser, getCurrentCustomerSession } from './utils/supabaseService';
import { Check, Clock, ChevronRight } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'menu' | 'track' | 'heritage' | 'reserve'>('menu');
  const [menuItems, setMenuItems] = useState<MenuItem[]>(MENU_ITEMS);
  const [currentUser, setCurrentUser] = useState<CustomerUser | null>(() => getCurrentCustomerSession());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup' | 'profile'>('signin');
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem('dewaan_cart_v1');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [orders, setOrders] = useState<Order[]>(() => getSavedOrders());
  const [activeOrderId, setActiveOrderId] = useState<string>(() => {
    const list = getSavedOrders();
    return list[0]?.id || '';
  });

  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isReservationOpen, setIsReservationOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isAdminPortalOpen, setIsAdminPortalOpen] = useState(false);
  const [isCustomOrderOpen, setIsCustomOrderOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('dewaan_cart_v1', JSON.stringify(cartItems));
    } catch (e) {
      console.error(e);
    }
  }, [cartItems]);

  // Check visitor session on initial arrival
  useEffect(() => {
    try {
      const hasSeen = sessionStorage.getItem('dewaan_welcome_seen_v1');
      const session = getCurrentCustomerSession();
      if (!session && !hasSeen) {
        const timer = setTimeout(() => {
          setIsWelcomeModalOpen(true);
          sessionStorage.setItem('dewaan_welcome_seen_v1', 'true');
        }, 800);
        return () => clearTimeout(timer);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Purge any stale dummy DW-8942 order and fetch real orders from Supabase on startup
  useEffect(() => {
    try {
      const stored = localStorage.getItem('dewaan_orders_v1');
      if (stored && stored.includes('DW-8942')) {
        localStorage.removeItem('dewaan_orders_v1');
        setOrders([]);
        setActiveOrderId('');
      }
    } catch (e) {
      console.error(e);
    }

    // Fetch orders from Supabase backend (Project: khbmtvotbiztxadqhnaw)
    fetchOrdersFromSupabase().then((supabaseOrders) => {
      if (supabaseOrders && supabaseOrders.length > 0) {
        setOrders((prev) => {
          const map = new Map<string, Order>();
          supabaseOrders.forEach((o) => map.set(o.id, o));
          prev.forEach((o) => {
            if (!map.has(o.id)) map.set(o.id, o);
          });
          const merged = Array.from(map.values());
          return merged;
        });
        setActiveOrderId((prevId) => prevId || supabaseOrders[0].id);
      }
    }).catch((err) => {
      console.warn('[Supabase Fetch]', err);
    });

    // Fetch dynamic menu items and daily market prices from Supabase
    fetchMenuItemsFromSupabase().then((supabaseItems) => {
      if (supabaseItems && supabaseItems.length > 0) {
        setMenuItems((prev) => {
          const map = new Map<string, MenuItem>();
          prev.forEach((item) => map.set(item.id, item));
          supabaseItems.forEach((item) => {
            const existing = map.get(item.id);
            if (existing) {
              map.set(item.id, {
                ...existing,
                ...item,
                dailyMarketPrice: item.dailyMarketPrice || item.basePrice,
                marketPriceNotes: item.marketPriceNotes || existing.marketPriceNotes,
                isAvailable: item.isAvailable !== false,
              });
            } else {
              map.set(item.id, item);
            }
          });
          return Array.from(map.values());
        });
      }
    }).catch((err) => {
      console.warn('[Supabase Menu Fetch]', err);
    });
  }, []);

  // Sync orders to storage
  useEffect(() => {
    saveOrders(orders);
  }, [orders]);

  // Active delivery check
  const activeOrder = orders.find((o) => o.id === activeOrderId) || orders[0];
  const hasActiveDelivery = Boolean(
    activeOrder && activeOrder.status !== 'delivered'
  );

  // Cart operations
  const handleAddToCart = (newItem: CartItem) => {
    setCartItems((prev) => [...prev, newItem]);
    setToastMessage(`Added "${newItem.menuItem.name}" to your Dastarkhwan Bag`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleUpdateQuantity = (cartItemId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(cartItemId);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) =>
        item.cartItemId === cartItemId
          ? {
              ...item,
              quantity: newQty,
              totalPrice: item.unitPrice * newQty,
            }
          : item
      )
    );
  };

  const handleRemoveItem = (cartItemId: string) => {
    setCartItems((prev) => prev.filter((i) => i.cartItemId !== cartItemId));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  const handleOrderPlaced = (newOrder: Order) => {
    const updated = [newOrder, ...orders.filter((o) => o.id !== newOrder.id)];
    setOrders(updated);
    setActiveOrderId(newOrder.id);
    setActiveTab('track');
    setToastMessage(`Royal Order ${newOrder.id} Placed & Saved to Supabase!`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleUpdateOrder = (updatedOrder: Order) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
    );

    // Sync live stage/chat update with Supabase
    updateOrderInSupabase(updatedOrder).catch((err) => {
      console.warn('[Supabase Update]', err);
    });
  };

  const cartTotal = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen flex flex-col bg-[#090a0d] text-[#f4f5f8] font-sans antialiased selection:bg-[#dfba6c] selection:text-[#090a0d]">
      
      {/* Active Order Modern Glass Mini Banner if order in transit */}
      {hasActiveDelivery && activeTab !== 'track' && (
        <div className="bg-[#10131a]/90 backdrop-blur-md border-b border-white/[0.08] py-2.5 px-4 text-xs">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[#a4a7b5] font-light">
                Royal Order <span className="font-mono text-[#dfba6c] font-semibold">{activeOrder.id}</span> is en route with courier Allah Dad
              </span>
            </div>
            <button
              onClick={() => setActiveTab('track')}
              className="flex items-center gap-1.5 text-[#dfba6c] hover:text-[#ebd8ab] font-medium text-xs focus:outline-none transition-colors"
            >
              <span>Track Live Telemetry</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Top Bar Contract Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === 'reserve') {
            setIsReservationOpen(true);
          } else {
            setActiveTab(tab);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }}
        cartCount={cartCount}
        cartTotal={cartTotal}
        openCart={() => setIsCartOpen(true)}
        hasActiveDelivery={hasActiveDelivery}
        activeOrderId={activeOrder?.id}
        currentUser={currentUser}
        onOpenAuthModal={() => {
          setAuthModalMode(currentUser ? 'profile' : 'signin');
          setIsAuthModalOpen(true);
        }}
        onOpenCustomOrder={() => setIsCustomOrderOpen(true)}
      />

      {/* Main Content Areas */}
      <main className="flex-1">
        {activeTab === 'menu' && (
          <>
            <HeroSection
              onExploreMenu={() => {
                const el = document.getElementById('menu-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              onTrackOrder={() => setActiveTab('track')}
              hasActiveDelivery={hasActiveDelivery}
            />

            <MenuList
              items={menuItems}
              onOpenCustomizer={(item) => setCustomizingItem(item)}
            />

            {/* Custom Order Form Section */}
            <section id="custom-order-section" className="py-12 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
              <CustomOrderForm />
            </section>

            <HeritageSection
              onReserveTable={() => setIsReservationOpen(true)}
              onExploreMenu={() => {
                const el = document.getElementById('menu-section');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
            />
          </>
        )}

        {activeTab === 'track' && (
          <LiveDeliveryTracker
            orders={orders}
            activeOrderId={activeOrderId}
            onSelectOrder={(id) => setActiveOrderId(id)}
            onUpdateOrder={handleUpdateOrder}
            onBackToMenu={() => setActiveTab('menu')}
          />
        )}

        {activeTab === 'heritage' && (
          <div className="pt-6">
            <HeritageSection
              onReserveTable={() => setIsReservationOpen(true)}
              onExploreMenu={() => setActiveTab('menu')}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <Footer
        onNavClick={(tab) => {
          if (tab === 'reserve') {
            setIsReservationOpen(true);
          } else {
            setActiveTab(tab);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        onOpenAdminPortal={() => setIsAdminPortalOpen(true)}
      />

      {/* Meal Customization Modal */}
      {customizingItem && (
        <MealCustomizerModal
          item={customizingItem}
          onClose={() => setCustomizingItem(null)}
          onAddToCart={handleAddToCart}
        />
      )}

      {/* Cart & Checkout Drawer */}
      {isCartOpen && (
        <CartCheckoutDrawer
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          items={cartItems}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onClearCart={handleClearCart}
          onOrderPlaced={handleOrderPlaced}
          currentUser={currentUser}
          onOpenAuthModal={() => {
            setAuthModalMode(currentUser ? 'profile' : 'signin');
            setIsAuthModalOpen(true);
          }}
        />
      )}

      {/* Table Reservation Modal */}
      {isReservationOpen && (
        <TableReservationModal
          isOpen={isReservationOpen}
          onClose={() => setIsReservationOpen(false)}
        />
      )}

      {/* Supabase Status & SQL Schema Modal */}
      {isSupabaseModalOpen && (
        <SupabaseStatusModal
          isOpen={isSupabaseModalOpen}
          onClose={() => setIsSupabaseModalOpen(false)}
          orderCount={orders.length}
        />
      )}

      {/* Master Admin Portal */}
      {isAdminPortalOpen && (
        <AdminPortal
          isOpen={isAdminPortalOpen}
          onClose={() => setIsAdminPortalOpen(false)}
          orders={orders}
          onUpdateOrder={handleUpdateOrder}
          onRefreshOrders={() => {
            fetchOrdersFromSupabase().then((supabaseOrders) => {
              if (supabaseOrders && supabaseOrders.length > 0) {
                setOrders(supabaseOrders);
              }
            });
          }}
          menuItems={menuItems}
          onUpdateMenuItems={setMenuItems}
        />
      )}

      {/* Customer User Authentication Modal */}
      {isAuthModalOpen && (
        <CustomerAuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          currentUser={currentUser}
          onUserChange={(user) => {
            setCurrentUser(user);
            if (user) {
              setToastMessage(`Signed in as ${user.fullName}`);
              setTimeout(() => setToastMessage(null), 3000);
            } else {
              setToastMessage('Signed out successfully.');
              setTimeout(() => setToastMessage(null), 3000);
            }
          }}
          orders={orders}
          onSelectOrder={(id) => {
            setActiveOrderId(id);
            setActiveTab('track');
          }}
          initialMode={authModalMode}
        />
      )}

      {/* Visitor Arrival Welcome & Auth Prompt */}
      {isWelcomeModalOpen && !currentUser && (
        <WelcomeAuthModal
          isOpen={isWelcomeModalOpen}
          onClose={() => setIsWelcomeModalOpen(false)}
          onOpenSignIn={() => {
            setAuthModalMode('signin');
            setIsAuthModalOpen(true);
          }}
          onOpenSignUp={() => {
            setAuthModalMode('signup');
            setIsAuthModalOpen(true);
          }}
        />
      )}

      {/* Custom Order Modal */}
      {isCustomOrderOpen && (
        <div 
          onClick={() => setIsCustomOrderOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg cursor-default"
          >
            <CustomOrderForm isModal onClose={() => setIsCustomOrderOpen(false)} />
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-24 right-6 z-50 flex items-center gap-3 px-5 py-3 bg-[#14161f]/95 border border-[#dfba6c]/40 backdrop-blur-xl text-[#f1f2f5] text-xs font-medium rounded-full shadow-2xl shadow-[#dfba6c]/10 animate-in slide-in-from-bottom-3 duration-200">
          <div className="w-5 h-5 rounded-full bg-[#dfba6c] text-[#090a0d] flex items-center justify-center shrink-0 shadow-sm">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          </div>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Floating Buttons: Chatbot on bottom-left, WhatsApp on bottom-center */}
      <FloatingButtons />
      <WhatsAppCenterButton />

    </div>
  );
}
