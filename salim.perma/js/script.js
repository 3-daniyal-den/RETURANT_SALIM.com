/**
 * Sweet Salim Restaurant & Confectionery - Global UI Script
 * Handles navigation toggles, Quick View modal, global toasts, and scroll interactions.
 */

// Global Toast Notification Helper
function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✓';
  if (type === 'error') icon = '✕';

  toast.innerHTML = `
    <span style="font-weight: bold; color: var(--gold-400);">${icon}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(50px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3800);
}

window.showToast = showToast;

// Quick View Modal Controller
const QuickViewModal = {
  currentProductId: null,

  init() {
    this.createModalDOM();
    this.bindEvents();
  },

  createModalDOM() {
    if (document.getElementById('quickViewModalOverlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'quickViewModalOverlay';
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-box">
        <button class="modal-close-btn" id="closeQuickViewBtn">&times;</button>
        <div class="quickview-grid" id="quickViewContent">
          <!-- Dynamic Content Loaded Here -->
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  },

  open(productId) {
    if (!window.ProductsEngine) return;
    const product = window.ProductsEngine.getById(productId);
    if (!product) return;

    this.currentProductId = productId;
    const content = document.getElementById('quickViewContent');
    const currency = (window.CONFIG && window.CONFIG.BRAND.currencySymbol) || 'Rs. ';

    content.innerHTML = `
      <div class="quickview-image">
        <img src="${product.image_url}" alt="${product.name}" />
      </div>
      <div class="quickview-content">
        <span class="product-category-meta">${product.category}</span>
        <h2 style="font-family: var(--font-serif); font-size: 1.6rem; color: var(--burgundy-900); margin-bottom: 8px;">
          ${product.name}
        </h2>
        <div style="font-size: 1.35rem; font-weight: 700; color: var(--burgundy-800); margin-bottom: 16px;">
          ${currency}${product.price.toLocaleString()}
          ${product.original_price ? `<span style="font-size: 0.9rem; text-decoration: line-through; color: #888; margin-left: 8px;">${currency}${product.original_price.toLocaleString()}</span>` : ''}
        </div>
        <p style="font-size: 0.9375rem; color: var(--charcoal-700); line-height: 1.6; margin-bottom: 20px;">
          ${product.description}
        </p>

        <div style="background: var(--cream-100); border: 1px solid var(--cream-300); padding: 14px; border-radius: var(--border-radius-sm); margin-bottom: 24px; font-size: 0.8125rem;">
          <p style="margin-bottom: 6px;"><strong>Portion / Weight:</strong> ${product.weight_or_portion || 'Standard Portion'}</p>
          <p style="margin-bottom: 6px;"><strong>Preparation:</strong> ${product.preparation_time || 'Fresh upon order'}</p>
          <p style="margin: 0; color: #7B341E;"><strong>Allergen Advisory:</strong> ${product.allergens || 'None reported'}</p>
        </div>

        <div style="display: flex; gap: 14px; align-items: center; margin-top: auto;">
          <div class="qty-stepper" style="padding: 4px;">
            <button class="qty-btn" id="modalQtyMinus">-</button>
            <span class="qty-value" id="modalQtyVal">1</span>
            <button class="qty-btn" id="modalQtyPlus">+</button>
          </div>
          <button class="btn btn-primary btn-block" id="modalAddToCartBtn" ${!product.in_stock ? 'disabled' : ''}>
            ${product.in_stock ? 'Add to Royal Order' : 'Temporarily Sold Out'}
          </button>
        </div>
      </div>
    `;

    let qty = 1;
    const minusBtn = document.getElementById('modalQtyMinus');
    const plusBtn = document.getElementById('modalQtyPlus');
    const valSpan = document.getElementById('modalQtyVal');
    const addBtn = document.getElementById('modalAddToCartBtn');

    minusBtn.addEventListener('click', () => {
      if (qty > 1) {
        qty--;
        valSpan.textContent = qty;
      }
    });

    plusBtn.addEventListener('click', () => {
      qty++;
      valSpan.textContent = qty;
    });

    addBtn.addEventListener('click', () => {
      if (window.Cart) {
        window.Cart.addItem(productId, qty);
        QuickViewModal.close();
      }
    });

    const overlay = document.getElementById('quickViewModalOverlay');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  },

  close() {
    const overlay = document.getElementById('quickViewModalOverlay');
    if (overlay) {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
      this.currentProductId = null;
    }
  },

  bindEvents() {
    document.addEventListener('click', (e) => {
      const qvBtn = e.target.closest('[data-action="quickview"]');
      if (qvBtn) {
        e.preventDefault();
        const id = qvBtn.getAttribute('data-product-id');
        this.open(id);
      }

      if (e.target.closest('#closeQuickViewBtn') || e.target.id === 'quickViewModalOverlay') {
        this.close();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.close();
      }
    });
  }
};

// Global App Initialization
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initialize Products & Cart
  if (window.ProductsEngine) {
    await window.ProductsEngine.init();
  }
  if (window.Cart) {
    window.Cart.init();
  }

  // 2. Initialize Quick View Modal
  QuickViewModal.init();

  // 3. Mobile Hamburger Menu Toggle
  const menuToggle = document.getElementById('mobileMenuToggle');
  const navMenu = document.getElementById('mainNavMenu');

  if (menuToggle && navMenu) {
    menuToggle.addEventListener('click', () => {
      navMenu.classList.toggle('active');
    });

    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!navMenu.contains(e.target) && !menuToggle.contains(e.target) && navMenu.classList.contains('active')) {
        navMenu.classList.remove('active');
      }
    });
  }

  // 4. Highlight current page in navigation
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });

  // 5. Sticky header elevation effect
  const mainHeader = document.querySelector('.main-header');
  if (mainHeader) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 40) {
        mainHeader.style.boxShadow = '0 8px 24px rgba(34, 3, 7, 0.25)';
      } else {
        mainHeader.style.boxShadow = '';
      }
    });
  }
});
