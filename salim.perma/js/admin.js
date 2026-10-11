/**
 * Sweet Salim Restaurant & Confectionery - Admin & Kitchen Management Portal
 * Handles authentication, live orders view, status transitions, and inventory management.
 */

document.addEventListener('DOMContentLoaded', () => {
  const authWrapper = document.getElementById('adminAuthWrapper');
  const dashboardWrapper = document.getElementById('adminDashboardWrapper');
  const loginForm = document.getElementById('adminLoginForm');
  const loginFeedback = document.getElementById('adminLoginFeedback');
  const logoutBtn = document.getElementById('adminLogoutBtn');
  const adminUserEmailEl = document.getElementById('adminUserEmail');

  const ordersTableBody = document.getElementById('adminOrdersTableBody');
  const orderSearchInput = document.getElementById('adminOrderSearch');
  const orderStatusFilter = document.getElementById('adminStatusFilter');
  const productsTableBody = document.getElementById('adminProductsTableBody');

  // Metrics elements
  const metricRevenueEl = document.getElementById('metricRevenue');
  const metricOrdersEl = document.getElementById('metricTotalOrders');
  const metricKitchenEl = document.getElementById('metricInKitchen');
  const metricTransitEl = document.getElementById('metricInTransit');

  // State
  let currentAdminSession = null;
  let cachedOrders = [];
  let cachedProducts = [];

  // Check existing session
  checkAuth();

  function checkAuth() {
    const sessionToken = sessionStorage.getItem('sweetsalim_admin_auth');
    if (sessionToken) {
      currentAdminSession = JSON.parse(sessionToken);
      showDashboard();
    } else {
      showAuth();
    }
  }

  function showAuth() {
    if (authWrapper) authWrapper.style.display = 'flex';
    if (dashboardWrapper) dashboardWrapper.style.display = 'none';
  }

  function showDashboard() {
    if (authWrapper) authWrapper.style.display = 'none';
    if (dashboardWrapper) dashboardWrapper.style.display = 'block';
    if (adminUserEmailEl && currentAdminSession) {
      adminUserEmailEl.textContent = currentAdminSession.email;
    }
    loadData();
  }

  // Login handler
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('adminEmail')?.value.trim();
      const password = document.getElementById('adminPassword')?.value.trim();

      if (!email || !password) return;

      loginFeedback.innerHTML = '<span style="color: #666;">Authenticating...</span>';

      try {
        // 1. If Supabase configured, attempt Supabase Auth
        if (window.CONFIG && window.CONFIG.isConfigured() && window.supabase) {
          const client = window.supabase.createClient(
            window.CONFIG.SUPABASE.url,
            window.CONFIG.SUPABASE.anonKey
          );

          const { data, error } = await client.auth.signInWithPassword({ email, password });
          if (error) throw error;

          currentAdminSession = {
            email: data.user.email,
            token: data.session.access_token,
            id: data.user.id
          };
        } else {
          // 2. Demo credentials check
          // Default test credentials: admin@sweetsalim.com / salim1984
          if (email.toLowerCase() === 'admin@sweetsalim.com' && password === 'salim1984') {
            currentAdminSession = {
              email: 'admin@sweetsalim.com',
              role: 'Master Chef Admin',
              demo: true
            };
          } else {
            throw new Error('Invalid credentials. Use demo: admin@sweetsalim.com / salim1984');
          }
        }

        sessionStorage.setItem('sweetsalim_admin_auth', JSON.stringify(currentAdminSession));
        loginFeedback.innerHTML = '';
        showDashboard();

      } catch (err) {
        loginFeedback.innerHTML = `<span style="color: #DC2626; font-size: 0.8125rem;">✕ ${err.message}</span>`;
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem('sweetsalim_admin_auth');
      currentAdminSession = null;
      showAuth();
    });
  }

  // Load orders and products data
  async function loadData() {
    await fetchOrders();
    await fetchProducts();
    updateMetrics();
    renderOrders();
    renderProducts();
  }

  async function fetchOrders() {
    if (window.CONFIG && window.CONFIG.isConfigured() && window.supabase && currentAdminSession?.token) {
      try {
        const client = window.supabase.createClient(
          window.CONFIG.SUPABASE.url,
          window.CONFIG.SUPABASE.anonKey
        );
        const { data, error } = await client
          .from('orders')
          .select('*, order_items(*)')
          .order('created_at', { ascending: false });

        if (!error && data) {
          cachedOrders = data;
          return;
        }
      } catch (e) {
        console.warn('Failed to load orders from Supabase:', e);
      }
    }

    // Fallback demo orders from local storage
    const demoKey = (window.CONFIG && window.CONFIG.STORAGE_KEYS.demoOrders) || 'sweetsalim_demo_orders';
    const stored = JSON.parse(localStorage.getItem(demoKey) || '[]');
    cachedOrders = stored;
  }

  async function fetchProducts() {
    if (window.ProductsEngine) {
      cachedProducts = window.ProductsEngine.getAll();
    }
  }

  function updateMetrics() {
    const totalOrders = cachedOrders.length;
    const revenue = cachedOrders.reduce((acc, o) => acc + (Number(o.total_amount) || 0), 0);
    const inKitchen = cachedOrders.filter(o => o.status === 'received' || o.status === 'preparing').length;
    const inTransit = cachedOrders.filter(o => o.status === 'on_the_way' || o.status === 'ready_for_dispatch').length;

    const currency = (window.CONFIG && window.CONFIG.BRAND.currencySymbol) || 'Rs. ';

    if (metricRevenueEl) metricRevenueEl.textContent = `${currency}${revenue.toLocaleString()}`;
    if (metricOrdersEl) metricOrdersEl.textContent = totalOrders;
    if (metricKitchenEl) metricKitchenEl.textContent = inKitchen;
    if (metricTransitEl) metricTransitEl.textContent = inTransit;
  }

  function renderOrders() {
    if (!ordersTableBody) return;

    const searchTerm = orderSearchInput ? orderSearchInput.value.trim().toLowerCase() : '';
    const statusFilter = orderStatusFilter ? orderStatusFilter.value : 'all';
    const currency = (window.CONFIG && window.CONFIG.BRAND.currencySymbol) || 'Rs. ';

    let filtered = cachedOrders.filter(order => {
      const matchSearch = !searchTerm ||
        (order.tracking_code && order.tracking_code.toLowerCase().includes(searchTerm)) ||
        (order.customer_name && order.customer_name.toLowerCase().includes(searchTerm)) ||
        (order.customer_phone && order.customer_phone.includes(searchTerm));

      const matchStatus = statusFilter === 'all' || order.status === statusFilter;

      return matchSearch && matchStatus;
    });

    if (filtered.length === 0) {
      ordersTableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 40px; color: #888;">
            No orders match the current filter criteria.
          </td>
        </tr>
      `;
      return;
    }

    ordersTableBody.innerHTML = filtered.map(order => {
      const dateFormatted = new Date(order.created_at).toLocaleTimeString([], {
        hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric'
      });

      return `
        <tr>
          <td>
            <strong style="color: var(--burgundy-900);">${order.tracking_code}</strong>
            <div style="font-size: 0.75rem; color: #888;">${dateFormatted}</div>
          </td>
          <td>
            <div><strong>${order.customer_name}</strong></div>
            <div style="font-size: 0.8rem; color: #666;">${order.customer_phone}</div>
          </td>
          <td>
            <span style="font-size: 0.8125rem; color: #444;">
              ${(order.items || order.order_items || []).map(i => `${i.product_name} (x${i.quantity})`).join(', ') || 'Delicacies'}
            </span>
          </td>
          <td>
            <strong style="color: var(--burgundy-800);">${currency}${Number(order.total_amount).toLocaleString()}</strong>
          </td>
          <td>
            <span class="status-pill status-${order.status}">
              ${order.status.replace(/_/g, ' ')}
            </span>
          </td>
          <td>
            <select class="form-select" style="padding: 6px 10px; font-size: 0.8125rem;" onchange="AdminPortal.changeOrderStatus('${order.id}', this.value)">
              <option value="received" ${order.status === 'received' ? 'selected' : ''}>Received</option>
              <option value="preparing" ${order.status === 'preparing' ? 'selected' : ''}>Preparing</option>
              <option value="ready_for_dispatch" ${order.status === 'ready_for_dispatch' ? 'selected' : ''}>Ready for Dispatch</option>
              <option value="on_the_way" ${order.status === 'on_the_way' ? 'selected' : ''}>On The Way</option>
              <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
              <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderProducts() {
    if (!productsTableBody) return;
    const currency = (window.CONFIG && window.CONFIG.BRAND.currencySymbol) || 'Rs. ';

    productsTableBody.innerHTML = cachedProducts.map(p => `
      <tr>
        <td style="display: flex; align-items: center; gap: 12px;">
          <img src="${p.image_url}" alt="${p.name}" style="width: 44px; height: 44px; object-fit: cover; border-radius: 4px;" />
          <div>
            <strong>${p.name}</strong>
            <div style="font-size: 0.75rem; color: #888;">${p.category}</div>
          </div>
        </td>
        <td>
          <input type="number" value="${p.price}" style="width: 100px; padding: 4px 8px; border: 1px solid #CCC; border-radius: 4px;"
            onchange="AdminPortal.updateProductPrice('${p.id}', this.value)" />
        </td>
        <td>
          <label class="switch">
            <input type="checkbox" ${p.in_stock ? 'checked' : ''} onchange="AdminPortal.toggleProductStock('${p.id}', this.checked)" />
            <span class="slider"></span>
          </label>
        </td>
        <td>
          <span style="font-size: 0.8125rem; color: #666;">${p.preparation_time || '15 mins'}</span>
        </td>
      </tr>
    `).join('');
  }

  // Filter listeners
  if (orderSearchInput) orderSearchInput.addEventListener('input', renderOrders);
  if (orderStatusFilter) orderStatusFilter.addEventListener('change', renderOrders);

  // Tab switching (Orders vs Inventory)
  const tabBtns = document.querySelectorAll('.admin-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.getAttribute('data-tab');

      document.getElementById('ordersPanel').style.display = target === 'orders' ? 'block' : 'none';
      document.getElementById('productsPanel').style.display = target === 'products' ? 'block' : 'none';
    });
  });

  // Global Admin Portal Actions
  window.AdminPortal = {
    async changeOrderStatus(orderId, newStatus) {
      if (window.showToast) window.showToast(`Updating order status to ${newStatus}...`, 'info');

      try {
        if (window.CONFIG && window.CONFIG.isConfigured() && window.CONFIG.SUPABASE.functionsUrl) {
          await fetch(`${window.CONFIG.SUPABASE.functionsUrl}/update-order-status`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${currentAdminSession?.token || ''}`,
              'apikey': window.CONFIG.SUPABASE.anonKey
            },
            body: JSON.stringify({ orderId, newStatus })
          });
        } else {
          // Local demo storage update
          const demoKey = (window.CONFIG && window.CONFIG.STORAGE_KEYS.demoOrders) || 'sweetsalim_demo_orders';
          const stored = JSON.parse(localStorage.getItem(demoKey) || '[]');
          const target = stored.find(o => o.id === orderId);
          if (target) {
            target.status = newStatus;
            localStorage.setItem(demoKey, JSON.stringify(stored));
          }
        }

        await fetchOrders();
        updateMetrics();
        renderOrders();
        if (window.showToast) window.showToast('Status updated and customer notification queued.', 'success');
      } catch (err) {
        if (window.showToast) window.showToast('Failed to update status: ' + err.message, 'error');
      }
    },

    toggleProductStock(productId, isInStock) {
      const prod = cachedProducts.find(p => p.id === productId);
      if (prod) {
        prod.in_stock = isInStock;
        if (window.showToast) {
          window.showToast(`"${prod.name}" marked as ${isInStock ? 'In Stock' : 'Out of Stock'}.`, 'info');
        }
      }
    },

    updateProductPrice(productId, newPrice) {
      const val = Number(newPrice);
      if (val > 0) {
        const prod = cachedProducts.find(p => p.id === productId);
        if (prod) {
          prod.price = val;
          if (window.showToast) window.showToast(`Updated price for "${prod.name}" to Rs. ${val.toLocaleString()}`, 'success');
        }
      }
    }
  };
});
