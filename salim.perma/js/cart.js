/**
 * Sweet Salim Restaurant & Confectionery - Shopping Cart Engine
 * Manages cart state, localStorage persistence, price calculations, and drawer UI.
 */

const Cart = {
  items: [], // Array of { productId, quantity }

  init() {
    this.loadFromStorage();
    this.setupDrawerEvents();
    this.updateBadges();
    this.renderDrawer();
  },

  loadFromStorage() {
    try {
      const key = (window.CONFIG && window.CONFIG.STORAGE_KEYS.cart) || 'sweetsalim_cart_v1';
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Validate stored structure
          this.items = parsed.filter(i => i.productId && Number(i.quantity) > 0);
        }
      }
    } catch (e) {
      console.error('Error loading cart from localStorage:', e);
      this.items = [];
    }
  },

  saveToStorage() {
    try {
      const key = (window.CONFIG && window.CONFIG.STORAGE_KEYS.cart) || 'sweetsalim_cart_v1';
      localStorage.setItem(key, JSON.stringify(this.items));
    } catch (e) {
      console.error('Error saving cart to localStorage:', e);
    }
    this.updateBadges();
    this.renderDrawer();
    window.dispatchEvent(new CustomEvent('cart:updated', { detail: { items: this.items } }));
  },

  addItem(productId, quantity = 1) {
    if (!productId) return;
    const qty = Math.max(1, Math.floor(Number(quantity) || 1));
    const existing = this.items.find(i => i.productId === productId);

    if (existing) {
      existing.quantity += qty;
    } else {
      this.items.push({ productId, quantity: qty });
    }

    this.saveToStorage();

    // Trigger visual feedback toast
    const product = window.ProductsEngine ? window.ProductsEngine.getById(productId) : null;
    const name = product ? product.name : 'Item';
    if (window.showToast) {
      window.showToast(`Added ${qty}x "${name}" to your royal cart.`, 'success');
    }
  },

  updateQuantity(productId, quantity) {
    const qty = Math.floor(Number(quantity));
    if (qty <= 0) {
      this.removeItem(productId);
      return;
    }

    const item = this.items.find(i => i.productId === productId);
    if (item) {
      item.quantity = qty;
      this.saveToStorage();
    }
  },

  removeItem(productId) {
    const initialLen = this.items.length;
    this.items = this.items.filter(i => i.productId !== productId);
    if (this.items.length !== initialLen) {
      this.saveToStorage();
      if (window.showToast) {
        window.showToast('Item removed from cart.', 'info');
      }
    }
  },

  clear() {
    this.items = [];
    this.saveToStorage();
  },

  getCount() {
    return this.items.reduce((acc, item) => acc + item.quantity, 0);
  },

  getItemsWithDetails() {
    if (!window.ProductsEngine) return [];
    return this.items.map(item => {
      const product = window.ProductsEngine.getById(item.productId);
      return {
        ...item,
        product: product || {
          id: item.productId,
          name: 'Traditional Delicacy',
          price: 0,
          image_url: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?auto=format&fit=crop&w=400&q=80',
          category: 'mithai'
        }
      };
    });
  },

  calculateTotals(promoCode = '') {
    const detailed = this.getItemsWithDetails();
    const subtotal = detailed.reduce((acc, item) => {
      const unit = Number(item.product.price) || 0;
      return acc + (unit * item.quantity);
    }, 0);

    const threshold = (window.CONFIG && window.CONFIG.COMMERCE.freeDeliveryThreshold) || 2500;
    const baseFee = (window.CONFIG && window.CONFIG.COMMERCE.deliveryFee) || 200;
    const deliveryFee = subtotal >= threshold || subtotal === 0 ? 0 : baseFee;

    let discount = 0;
    if (promoCode && window.CONFIG && window.CONFIG.COMMERCE.activePromos) {
      const promo = window.CONFIG.COMMERCE.activePromos[promoCode.trim().toUpperCase()];
      if (promo) {
        if (!promo.minOrder || subtotal >= promo.minOrder) {
          if (promo.type === 'percent') {
            discount = Math.round((subtotal * promo.value) / 100);
          } else if (promo.type === 'fixed') {
            discount = Math.min(subtotal, promo.value);
          }
        }
      }
    }

    const total = Math.max(0, subtotal + deliveryFee - discount);

    return {
      subtotal,
      deliveryFee,
      discount,
      total,
      freeDeliveryThreshold: threshold,
      amountNeededForFreeDelivery: Math.max(0, threshold - subtotal)
    };
  },

  updateBadges() {
    const badges = document.querySelectorAll('.cart-badge');
    const count = this.getCount();
    badges.forEach(badge => {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    });
  },

  renderDrawer() {
    const listContainer = document.getElementById('cartDrawerItems');
    const footerContainer = document.getElementById('cartDrawerFooter');
    const freeDeliveryContainer = document.getElementById('cartFreeDeliveryTracker');
    if (!listContainer || !footerContainer) return;

    const detailed = this.getItemsWithDetails();
    const currency = (window.CONFIG && window.CONFIG.BRAND.currencySymbol) || 'Rs. ';
    const totals = this.calculateTotals();

    // 1. Free delivery bar
    if (freeDeliveryContainer) {
      if (detailed.length === 0) {
        freeDeliveryContainer.style.display = 'none';
      } else {
        freeDeliveryContainer.style.display = 'block';
        if (totals.amountNeededForFreeDelivery <= 0) {
          freeDeliveryContainer.innerHTML = `
            <div style="color: #15803D; font-weight: 600;">
              ✨ Royal Privilege unlocked: You have FREE Express Delivery!
            </div>
            <div class="delivery-progress-bar">
              <div class="delivery-progress-fill" style="width: 100%; background: #15803D;"></div>
            </div>
          `;
        } else {
          const percent = Math.min(100, Math.round((totals.subtotal / totals.freeDeliveryThreshold) * 100));
          freeDeliveryContainer.innerHTML = `
            <div>
              Add <strong>${currency}${totals.amountNeededForFreeDelivery.toLocaleString()}</strong> more to get <strong>FREE Express Delivery</strong>!
            </div>
            <div class="delivery-progress-bar">
              <div class="delivery-progress-fill" style="width: ${percent}%;"></div>
            </div>
          `;
        }
      }
    }

    // 2. Items list
    if (detailed.length === 0) {
      listContainer.innerHTML = `
        <div class="cart-empty-state">
          <div class="cart-empty-icon">🛍️</div>
          <h4 style="font-family: var(--font-serif); font-size: 1.25rem; margin-bottom: 8px;">Your Royal Cart is Empty</h4>
          <p style="font-size: 0.875rem; margin-bottom: 24px;">Explore our artisan mithai, rich savory feasts, and fresh celebration cakes.</p>
          <a href="menu.html" class="btn btn-primary btn-sm" onclick="Cart.closeDrawer()">Explore Menu</a>
        </div>
      `;
      footerContainer.style.display = 'none';
      return;
    }

    footerContainer.style.display = 'block';

    listContainer.innerHTML = detailed.map(item => `
      <div class="cart-item" data-id="${item.productId}">
        <img class="cart-item-img" src="${item.product.image_url}" alt="${item.product.name}" />
        <div class="cart-item-info">
          <h4 class="cart-item-title">${item.product.name}</h4>
          <div class="cart-item-price">${currency}${(item.product.price * item.quantity).toLocaleString()}</div>
          <div class="cart-item-controls">
            <div class="qty-stepper">
              <button class="qty-btn" onclick="Cart.updateQuantity('${item.productId}', ${item.quantity - 1})">-</button>
              <span class="qty-value">${item.quantity}</span>
              <button class="qty-btn" onclick="Cart.updateQuantity('${item.productId}', ${item.quantity + 1})">+</button>
            </div>
            <button class="cart-item-remove" onclick="Cart.removeItem('${item.productId}')">Remove</button>
          </div>
        </div>
      </div>
    `).join('');

    // 3. Footer totals & checkout trigger
    footerContainer.innerHTML = `
      <div class="cart-summary-line">
        <span>Subtotal</span>
        <span>${currency}${totals.subtotal.toLocaleString()}</span>
      </div>
      <div class="cart-summary-line">
        <span>Delivery Fee</span>
        <span>${totals.deliveryFee === 0 ? '<strong style="color: #15803D;">FREE</strong>' : currency + totals.deliveryFee}</span>
      </div>
      <div class="cart-summary-total">
        <span>Estimated Total</span>
        <span>${currency}${totals.total.toLocaleString()}</span>
      </div>
      <a href="checkout.html" class="btn btn-primary btn-block btn-lg" onclick="Cart.closeDrawer()">
        Proceed to Checkout
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="5" y1="12" x2="19" y2="12"></line>
          <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
      </a>
      <p style="text-align: center; font-size: 0.75rem; color: var(--charcoal-500); margin-top: 10px;">
        Prices verified securely by kitchen backend upon order submission.
      </p>
    `;
  },

  openDrawer() {
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartDrawerOverlay');
    if (drawer && overlay) {
      this.renderDrawer();
      drawer.classList.add('active');
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  },

  closeDrawer() {
    const drawer = document.getElementById('cartDrawer');
    const overlay = document.getElementById('cartDrawerOverlay');
    if (drawer && overlay) {
      drawer.classList.remove('active');
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  setupDrawerEvents() {
    document.addEventListener('click', (e) => {
      // Open drawer triggers
      if (e.target.closest('.cart-trigger-btn') || e.target.closest('#openCartBtn')) {
        e.preventDefault();
        this.openDrawer();
      }
      // Close drawer triggers
      if (e.target.closest('#closeCartBtn') || e.target.closest('#cartDrawerOverlay')) {
        this.closeDrawer();
      }
      // Add to cart action buttons on product cards
      const addBtn = e.target.closest('[data-action="add-to-cart"]');
      if (addBtn) {
        e.preventDefault();
        const prodId = addBtn.getAttribute('data-product-id');
        this.addItem(prodId, 1);
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeDrawer();
      }
    });
  }
};

window.Cart = Cart;
