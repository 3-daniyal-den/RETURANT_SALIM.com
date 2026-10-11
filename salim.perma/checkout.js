/**
 * Sweet Salim Restaurant & Confectionery - Checkout Controller
 * Validates customer information, promo codes, interacts with place-order backend,
 * preserves cart items upon errors, and handles order confirmation states.
 */

(function () {
  let appliedPromo = '';

  function getCart() {
    if (window.Cart) {
      // Ensure storage is loaded
      if (!window.Cart.items || window.Cart.items.length === 0) {
        window.Cart.loadFromStorage();
      }
      return window.Cart;
    }
    return null;
  }

  function displayCheckoutError(message) {
    const errorBox = document.getElementById('checkoutErrorBox');
    if (errorBox) {
      errorBox.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 8px;">
          <span style="font-size: 1.1rem; line-height: 1;">⚠️</span>
          <div>
            <strong>Unable to place order:</strong>
            <p style="margin: 4px 0 0; font-size: 0.8125rem;">${message}</p>
            <p style="margin: 4px 0 0; font-size: 0.75rem; color: #7F1D1D;">Your cart items have been safely preserved. Please review details and try again.</p>
          </div>
        </div>
      `;
      errorBox.style.display = 'block';
    }
    if (window.showToast) {
      window.showToast(message, 'error');
    }
  }

  function clearCheckoutError() {
    const errorBox = document.getElementById('checkoutErrorBox');
    if (errorBox) {
      errorBox.innerHTML = '';
      errorBox.style.display = 'none';
    }
  }

  // Render initial checkout items and summary
  function renderCheckoutSummary() {
    const cart = getCart();
    const checkoutItemsContainer = document.getElementById('checkoutOrderItems');
    const checkoutSubtotalEl = document.getElementById('checkoutSubtotal');
    const checkoutDeliveryFeeEl = document.getElementById('checkoutDeliveryFee');
    const checkoutDiscountRow = document.getElementById('checkoutDiscountRow');
    const checkoutDiscountEl = document.getElementById('checkoutDiscount');
    const checkoutGrandTotalEl = document.getElementById('checkoutGrandTotal');
    const placeOrderBtn = document.getElementById('placeOrderBtn');

    if (!cart) return;

    const items = cart.getItemsWithDetails();
    const currency = (window.CONFIG && window.CONFIG.BRAND && window.CONFIG.BRAND.currencySymbol) || 'Rs. ';

    if (!items || items.length === 0) {
      if (checkoutItemsContainer) {
        checkoutItemsContainer.innerHTML = `
          <div style="text-align: center; padding: 30px 10px; color: var(--charcoal-500);">
            <div style="font-size: 2.2rem; margin-bottom: 8px;">🛍️</div>
            <p style="font-weight: 600; color: var(--charcoal-700);">Your cart is currently empty.</p>
            <p style="font-size: 0.8125rem; margin-top: 4px;">Add your favorite royal sweets and delicacies to proceed.</p>
            <a href="menu.html" class="btn btn-primary btn-sm" style="margin-top: 14px;">Explore Royal Menu</a>
          </div>
        `;
      }
      if (checkoutSubtotalEl) checkoutSubtotalEl.textContent = `${currency}0`;
      if (checkoutDeliveryFeeEl) checkoutDeliveryFeeEl.textContent = `${currency}0`;
      if (checkoutGrandTotalEl) checkoutGrandTotalEl.textContent = `${currency}0`;
      if (checkoutDiscountRow) checkoutDiscountRow.style.display = 'none';
      if (placeOrderBtn) placeOrderBtn.disabled = true;
      return;
    }

    if (placeOrderBtn) placeOrderBtn.disabled = false;

    // Render items list
    if (checkoutItemsContainer) {
      checkoutItemsContainer.innerHTML = items.map(item => {
        const itemLineTotal = (Number(item.product.price) || 0) * item.quantity;
        return `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--cream-300);">
            <div style="display: flex; align-items: center; gap: 12px;">
              <img src="${item.product.image_url}" alt="${item.product.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; border: 1px solid var(--cream-300);" />
              <div>
                <h4 style="font-size: 0.9375rem; margin-bottom: 2px; color: var(--burgundy-900); font-weight: 600;">${item.product.name}</h4>
                <div style="font-size: 0.8125rem; color: var(--charcoal-500);">
                  ${currency}${Number(item.product.price).toLocaleString()} &times; ${item.quantity}
                </div>
              </div>
            </div>
            <span style="font-weight: 700; color: var(--burgundy-900); font-size: 0.95rem;">
              ${currency}${itemLineTotal.toLocaleString()}
            </span>
          </div>
        `;
      }).join('');
    }

    // Update totals
    const totals = cart.calculateTotals(appliedPromo);
    if (checkoutSubtotalEl) checkoutSubtotalEl.textContent = `${currency}${totals.subtotal.toLocaleString()}`;
    if (checkoutDeliveryFeeEl) {
      checkoutDeliveryFeeEl.innerHTML = totals.deliveryFee === 0 
        ? '<strong style="color: #15803D;">FREE</strong>' 
        : `${currency}${totals.deliveryFee}`;
    }

    if (totals.discount > 0) {
      if (checkoutDiscountRow) checkoutDiscountRow.style.display = 'flex';
      if (checkoutDiscountEl) checkoutDiscountEl.textContent = `-${currency}${totals.discount.toLocaleString()}`;
    } else {
      if (checkoutDiscountRow) checkoutDiscountRow.style.display = 'none';
    }

    if (checkoutGrandTotalEl) checkoutGrandTotalEl.textContent = `${currency}${totals.total.toLocaleString()}`;
  }

  function initCheckout() {
    const checkoutForm = document.getElementById('checkoutForm');
    const placeOrderBtn = document.getElementById('placeOrderBtn');
    const promoInput = document.getElementById('promoCodeInput');
    const applyPromoBtn = document.getElementById('applyPromoBtn');
    const promoFeedback = document.getElementById('promoFeedback');

    renderCheckoutSummary();

    // Listen to live cart changes (from drawer, storage, or script initialization)
    window.addEventListener('cart:updated', () => {
      renderCheckoutSummary();
    });

    window.addEventListener('storage', (e) => {
      const key = (window.CONFIG && window.CONFIG.STORAGE_KEYS && window.CONFIG.STORAGE_KEYS.cart) || 'sweetsalim_cart_v1';
      if (e.key === key) {
        if (window.Cart) window.Cart.loadFromStorage();
        renderCheckoutSummary();
      }
    });

    // Handle promo code application
    if (applyPromoBtn && promoInput) {
      applyPromoBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const code = promoInput.value.trim().toUpperCase();
        if (!code) return;

        const validPromos = (window.CONFIG && window.CONFIG.COMMERCE && window.CONFIG.COMMERCE.activePromos) || {};
        if (validPromos[code]) {
          appliedPromo = code;
          if (promoFeedback) {
            promoFeedback.innerHTML = `<span style="color: #15803D; font-size: 0.8125rem;">✓ Coupon '${code}' applied successfully!</span>`;
          }
          renderCheckoutSummary();
        } else {
          if (promoFeedback) {
            promoFeedback.innerHTML = `<span style="color: #B91C1C; font-size: 0.8125rem;">✕ Invalid promo code. Try 'SWEET10'</span>`;
          }
        }
      });
    }

    // Payment method card selection
    const paymentCards = document.querySelectorAll('.payment-method-card');
    paymentCards.forEach(card => {
      card.addEventListener('click', () => {
        paymentCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        const radio = card.querySelector('input[type="radio"]');
        if (radio) radio.checked = true;
      });
    });

    // Order Submission Handler
    if (checkoutForm) {
      checkoutForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearCheckoutError();

        const cart = getCart();
        if (!cart || !cart.items || cart.items.length === 0) {
          displayCheckoutError('Your cart is empty. Please select food items from the menu before placing an order.');
          return;
        }

        // Collect and trim form inputs
        const name = document.getElementById('custName')?.value.trim();
        const email = document.getElementById('custEmail')?.value.trim();
        const phone = document.getElementById('custPhone')?.value.trim();
        const address = document.getElementById('custAddress')?.value.trim();
        const city = document.getElementById('custCity')?.value.trim() || 'Lahore';
        const notes = document.getElementById('custNotes')?.value.trim();
        const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value || 'cod';

        // Validation
        if (!name) {
          displayCheckoutError('Please provide your full name.');
          return;
        }
        if (!phone || phone.length < 8) {
          displayCheckoutError('Please provide a valid contact phone number.');
          return;
        }
        if (!address) {
          displayCheckoutError('Please provide your delivery street address.');
          return;
        }

        // Prevent duplicate submissions
        if (placeOrderBtn) {
          placeOrderBtn.disabled = true;
          var originalBtnText = placeOrderBtn.innerHTML;
          placeOrderBtn.innerHTML = `
            <svg style="animation: spin 1s linear infinite; margin-right: 8px; vertical-align: middle;" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
              <path d="M12 2a10 10 0 0 1 10 10"></path>
            </svg>
            Securing Royal Feast...
          `;
        }

        // Prepare rich item payload
        const detailedItems = cart.getItemsWithDetails();
        const orderItemsPayload = detailedItems.map(item => ({
          productId: item.productId,
          slug: item.slug || item.product.slug || item.productId,
          productName: item.product.name,
          unitPrice: Number(item.product.price) || 0,
          quantity: item.quantity
        }));

        const orderPayload = {
          customer: { name, email, phone, address, city, notes },
          items: orderItemsPayload,
          deliveryType: 'standard',
          paymentMethod,
          promoCode: appliedPromo
        };

        try {
          let orderResult = null;

          // If Supabase Edge Function is configured, send to server
          if (window.CONFIG && window.CONFIG.isConfigured() && window.CONFIG.SUPABASE && window.CONFIG.SUPABASE.functionsUrl) {
            const res = await fetch(`${window.CONFIG.SUPABASE.functionsUrl}/place-order`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': window.CONFIG.SUPABASE.anonKey
              },
              body: JSON.stringify(orderPayload)
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
              throw new Error(data.error || 'Server was unable to process order. Please verify your details.');
            }
            orderResult = data.order;
          } else {
            // Demo Simulation Mode (when Supabase credentials are placeholder)
            const totals = cart.calculateTotals(appliedPromo);
            const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
            const year = new Date().getFullYear();
            let randomSuffix = '';
            for (let i = 0; i < 5; i++) {
              randomSuffix += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            const mockTracking = `SSL-${year}-${randomSuffix}`;
            const mockId = 'ord-' + Date.now();

            orderResult = {
              id: mockId,
              tracking_code: mockTracking,
              customer_name: name,
              customer_email: email,
              customer_phone: phone,
              delivery_address: address,
              city,
              notes,
              delivery_type: 'standard',
              payment_method: paymentMethod,
              total_amount: totals.total,
              subtotal: totals.subtotal,
              delivery_fee: totals.deliveryFee,
              discount: totals.discount,
              promo_code: appliedPromo || null,
              status: 'received',
              created_at: new Date().toISOString(),
              items: detailedItems.map(item => ({
                product_name: item.product.name,
                quantity: item.quantity,
                unit_price: Number(item.product.price),
                total_price: Number(item.product.price) * item.quantity
              }))
            };

            // Save to demo orders for live order tracking and admin portal
            const demoKey = (window.CONFIG && window.CONFIG.STORAGE_KEYS && window.CONFIG.STORAGE_KEYS.demoOrders) || 'sweetsalim_demo_orders';
            const existing = JSON.parse(localStorage.getItem(demoKey) || '[]');
            existing.unshift(orderResult);
            localStorage.setItem(demoKey, JSON.stringify(existing));
          }

          // Persist last order reference for tracking redirect
          const lastOrderKey = (window.CONFIG && window.CONFIG.STORAGE_KEYS && window.CONFIG.STORAGE_KEYS.lastOrder) || 'sweetsalim_last_order';
          localStorage.setItem(lastOrderKey, JSON.stringify(orderResult));

          // SUCCESS: Clear the cart only after backend / order confirmation is guaranteed
          cart.clear();

          // Render confirmed receipt
          renderConfirmationView(orderResult);

        } catch (err) {
          console.error('Order placement failed:', err);
          
          // PRESERVE CART: Never discard items on failure
          displayCheckoutError(err.message || 'We could not submit your order. Please check your connection or contact our concierge.');
          
          if (placeOrderBtn) {
            placeOrderBtn.disabled = false;
            placeOrderBtn.innerHTML = originalBtnText || 'Confirm & Place Royal Order';
          }
        }
      });
    }
  }

  function renderConfirmationView(order) {
    const mainSection = document.getElementById('checkoutMainSection');
    if (!mainSection) return;

    const currency = (window.CONFIG && window.CONFIG.BRAND && window.CONFIG.BRAND.currencySymbol) || 'Rs. ';

    mainSection.innerHTML = `
      <div style="max-width: 680px; margin: 40px auto; background: #FFFFFF; border-radius: var(--border-radius-lg); border: 1px solid rgba(212, 175, 55, 0.4); padding: 40px 32px; box-shadow: var(--shadow-xl); text-align: center;">
        <div style="width: 72px; height: 72px; background: #DCFCE7; color: #15803D; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 0 auto 20px;">
          ✓
        </div>
        <span class="section-tag">Royal Order Confirmed</span>
        <h2 style="font-family: var(--font-serif); font-size: 2.2rem; color: var(--burgundy-900); margin-bottom: 12px;">
          Thank You, ${order.customer_name}!
        </h2>
        <p style="color: var(--charcoal-700); font-size: 1rem; line-height: 1.6; margin-bottom: 24px;">
          Your order has been officially received by our master kitchen. We are preparing your feast with authentic care.
        </p>

        <div style="background: var(--cream-100); border: 2px dashed var(--gold-500); border-radius: var(--border-radius-md); padding: 20px; margin-bottom: 30px;">
          <p style="font-size: 0.8125rem; color: var(--charcoal-500); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Tracking Reference Code</p>
          <div style="font-size: 1.8rem; font-weight: 800; color: var(--burgundy-800); letter-spacing: 2px;">
            ${order.tracking_code}
          </div>
          <p style="font-size: 0.8125rem; color: var(--charcoal-500); margin-top: 8px;">
            Save this code to check real-time dispatch progress.
          </p>
        </div>

        <div style="text-align: left; background: #FAFAFA; border-radius: var(--border-radius-sm); padding: 20px; margin-bottom: 30px; font-size: 0.875rem;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: var(--charcoal-500);">Amount to Pay:</span>
            <strong style="font-size: 1.1rem; color: var(--burgundy-900);">${currency}${Number(order.total_amount).toLocaleString()}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
            <span style="color: var(--charcoal-500);">Payment Method:</span>
            <span style="text-transform: uppercase; font-weight: 600;">${(order.payment_method || 'cod').replace(/_/g, ' ')}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--charcoal-500);">Destination:</span>
            <span>${order.delivery_address || ''}, ${order.city || 'Lahore'}</span>
          </div>
        </div>

        <div style="display: flex; gap: 14px; justify-content: center; flex-wrap: wrap;">
          <a href="track-order.html?track=${order.tracking_code}" class="btn btn-primary btn-lg">
            Track Order Live
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14"></path>
              <path d="M12 5l7 7-7 7"></path>
            </svg>
          </a>
          <a href="contact.html?order=${order.tracking_code}#feedbackSection" class="btn btn-outline-gold btn-lg">
            Share Feedback
          </a>
          <a href="index.html" class="btn btn-outline-burgundy btn-lg">
            Back to Home
          </a>
        </div>
      </div>
    `;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Trigger init on DOM ready or immediately if document is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCheckout);
  } else {
    initCheckout();
  }
})();
