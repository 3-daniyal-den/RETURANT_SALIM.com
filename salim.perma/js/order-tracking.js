/**
 * Sweet Salim Restaurant & Confectionery - Order Tracking Controller
 * Allows customers to track their order using tracking code and phone/email verification.
 */

document.addEventListener('DOMContentLoaded', () => {
  const trackingForm = document.getElementById('trackingSearchForm');
  const trackingCodeInput = document.getElementById('trackingCodeInput');
  const verificationInput = document.getElementById('trackingVerificationInput');
  const trackingResultSection = document.getElementById('trackingResultSection');

  // Check URL query parameters: e.g. track-order.html?track=SSL-2026-XXXXX
  const urlParams = new URLSearchParams(window.location.search);
  const codeFromUrl = urlParams.get('track');
  if (codeFromUrl && trackingCodeInput) {
    trackingCodeInput.value = codeFromUrl.trim().toUpperCase();
    // Auto-lookup if last order matches in storage
    const lastOrderKey = (window.CONFIG && window.CONFIG.STORAGE_KEYS.lastOrder) || 'sweetsalim_last_order';
    try {
      const lastOrder = JSON.parse(localStorage.getItem(lastOrderKey) || 'null');
      if (lastOrder && lastOrder.tracking_code === codeFromUrl) {
        if (verificationInput && (lastOrder.customer_phone || lastOrder.customer_email)) {
          verificationInput.value = lastOrder.customer_phone || lastOrder.customer_email;
          fetchAndRenderTracking(codeFromUrl, verificationInput.value);
        }
      }
    } catch (e) {}
  }

  if (trackingForm) {
    trackingForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const code = trackingCodeInput.value.trim().toUpperCase();
      const verification = verificationInput ? verificationInput.value.trim() : '';

      if (!code) {
        if (window.showToast) window.showToast('Please enter your tracking code.', 'error');
        return;
      }

      fetchAndRenderTracking(code, verification);
    });
  }

  async function fetchAndRenderTracking(trackingCode, verification) {
    if (!trackingResultSection) return;

    trackingResultSection.innerHTML = `
      <div style="text-align: center; padding: 40px 20px;">
        <svg style="animation: spin 1s linear infinite; margin-bottom: 12px; color: var(--gold-500);" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
          <path d="M12 2a10 10 0 0 1 10 10"></path>
        </svg>
        <p style="color: var(--charcoal-700);">Fetching live kitchen status...</p>
      </div>
    `;

    try {
      let order = null;

      // 1. If Supabase configured, call RPC get_order_tracking
      if (window.CONFIG && window.CONFIG.isConfigured() && window.supabase) {
        const client = window.supabase.createClient(
          window.CONFIG.SUPABASE.url,
          window.CONFIG.SUPABASE.anonKey
        );

        const { data, error } = await client.rpc('get_order_tracking', {
          p_tracking_code: trackingCode,
          p_verification: verification
        });

        if (error || !data || !data.success) {
          throw new Error(data?.message || 'Order not found. Please verify tracking code and contact details.');
        }

        order = data.order;
      } else {
        // 2. Demo mode lookup from local storage
        const demoKey = (window.CONFIG && window.CONFIG.STORAGE_KEYS.demoOrders) || 'sweetsalim_demo_orders';
        const demoOrders = JSON.parse(localStorage.getItem(demoKey) || '[]');
        order = demoOrders.find(o => o.tracking_code.toLowerCase() === trackingCode.toLowerCase());

        if (!order) {
          // Check last order as well
          const lastOrderKey = (window.CONFIG && window.CONFIG.STORAGE_KEYS.lastOrder) || 'sweetsalim_last_order';
          const lastOrder = JSON.parse(localStorage.getItem(lastOrderKey) || 'null');
          if (lastOrder && lastOrder.tracking_code.toLowerCase() === trackingCode.toLowerCase()) {
            order = lastOrder;
          }
        }

        if (!order) {
          throw new Error(`Order '${trackingCode}' was not found. Please check your reference code.`);
        }
      }

      renderOrderTrackingTimeline(order);

    } catch (err) {
      trackingResultSection.innerHTML = `
        <div style="background: #FEF2F2; border: 1px solid #FCA5A5; border-radius: var(--border-radius-md); padding: 24px; text-align: center; color: #991B1B;">
          <h4 style="font-family: var(--font-serif); font-size: 1.15rem; margin-bottom: 6px;">Tracking Lookup Notice</h4>
          <p style="font-size: 0.9375rem;">${err.message}</p>
        </div>
      `;
    }
  }

  function renderOrderTrackingTimeline(order) {
    const currency = (window.CONFIG && window.CONFIG.BRAND.currencySymbol) || 'Rs. ';

    const stages = [
      { key: 'received', label: 'Order Received', icon: '📝' },
      { key: 'preparing', label: 'Preparing', icon: '🍳' },
      { key: 'ready_for_dispatch', label: 'Ready for Dispatch', icon: '📦' },
      { key: 'on_the_way', label: 'On The Way', icon: '🛵' },
      { key: 'delivered', label: 'Delivered', icon: '🎉' }
    ];

    const currentStatus = order.status || 'received';
    const isCancelled = currentStatus === 'cancelled';

    let activeStageIndex = stages.findIndex(s => s.key === currentStatus);
    if (activeStageIndex === -1 && !isCancelled) activeStageIndex = 0;

    const timelineHtml = isCancelled ? `
      <div style="background: #FEE2E2; border: 1px solid #EF4444; border-radius: var(--border-radius-md); padding: 18px; margin: 24px 0; text-align: center; color: #991B1B;">
        <h4 style="font-size: 1.1rem; margin-bottom: 4px;">⚠️ Order Cancelled</h4>
        <p style="font-size: 0.875rem;">This order has been cancelled. For inquiries, please reach out to customer concierge at +92 300 1234567.</p>
      </div>
    ` : `
      <div class="timeline-tracker">
        ${stages.map((stage, idx) => {
          let stateClass = '';
          if (idx < activeStageIndex) stateClass = 'completed';
          else if (idx === activeStageIndex) stateClass = 'active';

          return `
            <div class="timeline-step ${stateClass}">
              <div class="timeline-node">
                ${idx < activeStageIndex ? '✓' : stage.icon}
              </div>
              <div class="timeline-step-label">${stage.label}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    trackingResultSection.innerHTML = `
      <div style="background: #FFFFFF; border-radius: var(--border-radius-md); border: 1px solid var(--cream-300); padding: 32px; box-shadow: var(--shadow-md);">
        
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--cream-300); padding-bottom: 18px; flex-wrap: wrap; gap: 12px;">
          <div>
            <span style="font-size: 0.8125rem; color: var(--charcoal-500); text-transform: uppercase; letter-spacing: 1px;">Tracking Reference</span>
            <h3 style="font-family: var(--font-serif); font-size: 1.6rem; color: var(--burgundy-900); margin-top: 2px;">
              ${order.tracking_code}
            </h3>
          </div>
          <button id="refreshTrackingBtn" class="btn btn-outline-burgundy btn-sm" title="Refresh Live Status">
            ↻ Refresh Status
          </button>
        </div>

        ${timelineHtml}

        <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 30px; margin-top: 36px; padding-top: 24px; border-top: 1px solid var(--cream-200);">
          <!-- Order items breakdown -->
          <div>
            <h4 style="font-family: var(--font-serif); font-size: 1.15rem; color: var(--burgundy-900); margin-bottom: 16px;">
              Royal Feast Summary
            </h4>
            <div style="background: var(--cream-100); border-radius: var(--border-radius-sm); padding: 16px;">
              ${(order.items || []).map(i => `
                <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed var(--cream-300); font-size: 0.875rem;">
                  <span>${i.product_name} <strong style="color: var(--burgundy-800);">x${i.quantity}</strong></span>
                  <span style="font-weight: 600;">${currency}${Number(i.total_price).toLocaleString()}</span>
                </div>
              `).join('')}
              <div style="display: flex; justify-content: space-between; margin-top: 14px; font-weight: 700; font-size: 1.05rem; color: var(--burgundy-900);">
                <span>Total Amount:</span>
                <span>${currency}${Number(order.total_amount).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <!-- Delivery metadata -->
          <div>
            <h4 style="font-family: var(--font-serif); font-size: 1.15rem; color: var(--burgundy-900); margin-bottom: 16px;">
              Delivery Information
            </h4>
            <div style="font-size: 0.875rem; color: var(--charcoal-700); line-height: 1.8;">
              <p><strong>Customer:</strong> ${order.customer_name}</p>
              <p><strong>Destination:</strong> ${order.delivery_address}, ${order.city || 'Lahore'}</p>
              <p><strong>Payment Method:</strong> ${(order.payment_method || 'cod').toUpperCase()}</p>
              <p><strong>Order Time:</strong> ${new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}</p>
            </div>

            ${currentStatus === 'received' ? `
              <div style="margin-top: 20px;">
                <button id="cancelOrderCustomerBtn" class="btn btn-outline-burgundy btn-sm" style="color: #991B1B; border-color: #EF4444;">
                  Request Order Cancellation
                </button>
              </div>
            ` : ''}
          </div>
        </div>

      </div>
    `;

    // Refresh handler
    const refreshBtn = document.getElementById('refreshTrackingBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        fetchAndRenderTracking(order.tracking_code, order.customer_phone || order.customer_email || '');
      });
    }

    // Cancellation handler
    const cancelBtn = document.getElementById('cancelOrderCustomerBtn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to cancel this order?')) {
          cancelOrder(order.id, order.tracking_code);
        }
      });
    }
  }

  async function cancelOrder(orderId, trackingCode) {
    if (window.showToast) window.showToast('Cancelling order...', 'info');

    try {
      if (window.CONFIG && window.CONFIG.isConfigured() && window.CONFIG.SUPABASE.functionsUrl) {
        await fetch(`${window.CONFIG.SUPABASE.functionsUrl}/update-order-status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': window.CONFIG.SUPABASE.anonKey
          },
          body: JSON.stringify({
            orderId,
            newStatus: 'cancelled',
            note: 'Cancelled by customer via tracking page.'
          })
        });
      } else {
        const demoKey = (window.CONFIG && window.CONFIG.STORAGE_KEYS.demoOrders) || 'sweetsalim_demo_orders';
        const demoOrders = JSON.parse(localStorage.getItem(demoKey) || '[]');
        const target = demoOrders.find(o => o.id === orderId || o.tracking_code === trackingCode);
        if (target) {
          target.status = 'cancelled';
          localStorage.setItem(demoKey, JSON.stringify(demoOrders));
        }
      }

      fetchAndRenderTracking(trackingCode, '');
      if (window.showToast) window.showToast('Order was successfully cancelled.', 'success');
    } catch (err) {
      if (window.showToast) window.showToast('Failed to cancel order: ' + err.message, 'error');
    }
  }
});
