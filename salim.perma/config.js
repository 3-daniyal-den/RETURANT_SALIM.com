/**
 * Sweet Salim Restaurant & Confectionery - Client Configuration
 * 
 * IMPORTANT:
 * 1. Only frontend-safe, public configuration belongs here.
 * 2. NEVER put your Supabase service_role key, database passwords, or Resend API keys here.
 * 3. Replace the placeholder values with your real project keys from Supabase Dashboard.
 */

const CONFIG = {
  // Brand & Business Details
  BRAND: {
    name: 'Sweet Salim',
    tagline: 'Royal Confections & Authentic Cuisine',
    established: '1984',
    phone: '+92 300 1234567',
    whatsapp: '+923001234567',
    email: 'sweetsalim99@gmail.com',
    supportEmail: 'sweetsalim99@gmail.com',
    address: '14-Gulberg Main Boulevard, Lahore, Pakistan',
    openingHours: 'Monday - Sunday: 10:00 AM - 11:30 PM',
    currency: 'PKR',
    currencySymbol: 'Rs. '
  },

  // Supabase Public Configuration (Safe for browser)
  // Retrieve these from: Supabase Dashboard -> Project Settings -> API
  SUPABASE: {
    // Replace with your project URL, e.g. "https://abcdefghijkl.supabase.co"
    url: 'https://YOUR_PROJECT_ID.supabase.co',
    
    // Replace with your anon (public) key
    anonKey: 'YOUR_SUPABASE_ANON_PUBLIC_KEY',
    
    // Edge Functions base URL (usually automatically derived from project url)
    get functionsUrl() {
      if (this.url && !this.url.includes('YOUR_PROJECT_ID')) {
        return `${this.url}/functions/v1`;
      }
      return '';
    }
  },

  // E-Commerce & Checkout Settings
  COMMERCE: {
    deliveryFee: 200,                // Standard delivery in PKR
    freeDeliveryThreshold: 2500,     // Orders at or above this amount get free delivery
    estimatedDeliveryTime: '35 - 45 mins',
    taxRate: 0.05,                   // 5% sales tax (already included or added depending on settings)
    taxIncluded: true,
    acceptedPaymentMethods: [
      { id: 'cod', name: 'Cash on Delivery (COD)', description: 'Pay cash when your royal feast arrives.' },
      { id: 'bank_transfer', name: 'Direct Bank Transfer / Raast', description: 'Instant transfer via Raast ID or Bank Account.' },
      { id: 'card_on_delivery', name: 'Card Machine on Delivery', description: 'Rider brings POS machine (Visa / Mastercard / PayPak).' }
    ],
    // Sample active discount codes
    activePromos: {
      'SWEET10': { type: 'percent', value: 10, description: '10% Off Royal Feast' },
      'ROYAL500': { type: 'fixed', value: 500, minOrder: 3000, description: 'Rs. 500 off on orders above Rs. 3,000' },
      'WELCOME': { type: 'percent', value: 15, description: '15% Off Your First Order' }
    }
  },

  // Local Storage Keys
  STORAGE_KEYS: {
    cart: 'sweetsalim_cart_v1',
    lastOrder: 'sweetsalim_last_order',
    adminToken: 'sweetsalim_admin_session',
    demoOrders: 'sweetsalim_demo_orders',
    customerFeedback: 'sweetsalim_customer_feedback'
  },

  // Demo / Offline Mode Indicator
  // When true or when Supabase keys are placeholder, the website smoothly operates in demo mode
  // allowing full end-to-end testing (cart, checkout, tracking, admin) without requiring immediate cloud setup.
  isConfigured: function () {
    return this.SUPABASE.url && 
           !this.SUPABASE.url.includes('YOUR_PROJECT_ID') && 
           this.SUPABASE.anonKey && 
           !this.SUPABASE.anonKey.includes('YOUR_SUPABASE_ANON_PUBLIC_KEY');
  }
};

// Freeze config to prevent accidental runtime mutations
if (typeof Object.freeze === 'function') {
  Object.freeze(CONFIG.BRAND);
  Object.freeze(CONFIG.COMMERCE);
  Object.freeze(CONFIG.STORAGE_KEYS);
}

// Make accessible to window
if (typeof window !== 'undefined') {
  window.CONFIG = CONFIG;
}
