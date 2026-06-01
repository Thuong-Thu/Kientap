(function () {
  'use strict';

  const API_BASE = 'http://localhost:3000';
  const GUEST_CART_KEY = 'guestCartItems';

  const cartContainer = document.querySelector('.woocommerce-cart-form__contents');
  const subtotalElement = document.getElementById('subtotal');
  const grandTotalElement = document.getElementById('grand-total');
  const cartBadgeImg = document.querySelector('.cart-badge-img');

  function getCurrentUser() {
    try { return JSON.parse(localStorage.getItem('currentUser')); } catch (error) { return null; }
  }

  function getCurrentUserId() {
    const user = getCurrentUser();
    if (!user || !user.id) return null;
    return Number(user.id);
  }

  function isLoggedIn() { return Boolean(getCurrentUserId()); }

  function getCheckoutUrl() { return isLoggedIn() ? 'thanhtoandangnhap.html' : 'thanhtoan.html'; }

  function formatPrice(value) { return Number(value || 0).toLocaleString('vi-VN') + '₫'; }

  function safeText(value) { return value === null || value === undefined ? '' : String(value); }

  function getGuestCartItems() {
    try { return JSON.parse(localStorage.getItem(GUEST_CART_KEY)) || []; } catch (error) { return []; }
  }

  function saveGuestCartItems(items) { localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items)); }

  function getGuestCartData() {
    const items = getGuestCartItems().map(function (item) {
      const price = Number(item.giaBan || item.GIA_BAN || item.price || 0);
      const quantity = Number(item.soLuong || item.quantity || 1);
      return {
        ...item,
        giaBan: price,
        soLuong: quantity,
        quantity: quantity,
        thanhTien: price * quantity
      };
    });

    const tongSoLuong = items.reduce((sum, item) => sum + Number(item.soLuong || 0), 0);
    const tongTien = items.reduce((sum, item) => sum + Number(item.thanhTien || 0), 0);

    return { userId: null, gioHangId: null, items: items, tongSoLuong: tongSoLuong, tongTien: tongTien };
  }

  function updateCartBadge(total) {
    if (cartBadgeImg) cartBadgeImg.alt = `${Number(total || 0)} sản phẩm`;
    const cartCount = document.getElementById('cart-count');
    if (cartCount) cartCount.textContent = Number(total || 0);
  }

  function normalizeCartItem(item) {
    const price = Number(item.giaBan || item.GIA_BAN || item.price || 0);
    const quantity = Number(item.soLuong || item.quantity || 1);
    const tenSP = item.tenSanPham || item.TEN_SAN_PHAM || item.name || 'Sản phẩm';
    const hinhAnh = item.hinhAnh || item.HINH_ANH || item.image || '';

    return {
      ...item,
      chiTietId: item.chiTietId || `guest-${item.bienTheId || Date.now()}`,
      sanPhamId: item.sanPhamId || item.SAN_PHAM_ID || item.productId || '',
      tenSanPham: tenSP,
      hinhAnh: hinhAnh,
      bienTheId: item.bienTheId || item.BIEN_THE_ID || item.variantId || '',
      sku: item.sku || item.SKU || '',
      mauSac: item.mauSac || item.MAU_SAC || item.color || 'Tiêu chuẩn',
      kichCoCanVot: item.kichCoCanVot || item.KICH_CO_CAN_VOT || item.size || 'Tiêu chuẩn',
      giaBan: price,
      soLuong: quantity,
      quantity: quantity,
      thanhTien: price * quantity
    };
  }

  function renderCartItem(rawItem) {
    const item = normalizeCartItem(rawItem);

    return `
      <div class="woocommerce-cart-form__cart-item cart_item" data-id="${safeText(item.chiTietId)}" data-variant="${safeText(item.bienTheId)}">
        <div class="cart-item__product-info">
          <div class="product-select"><input type="checkbox" class="cart-item-checkbox" checked></div>
          <div class="product-thumbnail">
            <a href="sanpham.html?id=${encodeURIComponent(item.sanPhamId)}">
              ${ item.hinhAnh ? `<img width="1008" height="1008" src="${safeText(item.hinhAnh)}" class="attachment-woocommerce_thumbnail size-woocommerce_thumbnail" alt="${safeText(item.tenSanPham)}" loading="lazy">` : `<div class="db-no-image">Chưa có ảnh</div>` }
            </a>
          </div>
          <div class="product-name">
            <a href="sanpham.html?id=${encodeURIComponent(item.sanPhamId)}">${safeText(item.tenSanPham)}</a>
            <dl class="variation">
              <dt class="variation-Musc">Màu sắc:</dt><dd><p>${safeText(item.mauSac)}</p></dd>
              <dt class="variation-Kchccnvt">Kích cỡ cán vợt:</dt><dd><p>${safeText(item.kichCoCanVot)}</p></dd>
              <dt>SKU:</dt><dd><p>${safeText(item.sku)}</p></dd>
            </dl>
          </div>
          <div class="product-remove">
            <button type="button" class="remove remove_from_cart_button js-remove-cart" data-id="${safeText(item.chiTietId)}" data-variant="${safeText(item.bienTheId)}" aria-label="Xóa sản phẩm">
              <svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" width="14.05" height="14.05" viewBox="0 0 14.05 14.05">
                <path d="M11.47,6.75v6.3M4.28,15.52h9.44V4.27H4.28ZM6.53,4.27h4.94V2.48H6.53Zm-4.06,0H15.53m-9,2.48v6.3M9,6.75v6.3" transform="translate(-1.97 -1.98)" style="fill:none;stroke:#252323;stroke-linecap:round;stroke-linejoin:round"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="line-divider"></div>
        <div class="cart-item__price-qty">
          <div class="product-price">
            <p class="cart-item__unit-price-label">Đơn giá</p>
            <span class="cart-item__unit-price-value"><span class="woocommerce-Price-amount amount"><bdi>${formatPrice(item.giaBan)}</bdi></span></span>
          </div>
          <div class="product-quantity">
            <div class="quantity quantity-control">
              <button type="button" class="qty-btn qty-minus js-qty-minus" data-id="${safeText(item.chiTietId)}" data-variant="${safeText(item.bienTheId)}">−</button>
              <input type="text" class="qty-input" value="${Number(item.soLuong || 1)}" readonly>
              <button type="button" class="qty-btn qty-plus js-qty-plus" data-id="${safeText(item.chiTietId)}" data-variant="${safeText(item.bienTheId)}">+</button>
            </div>
          </div>
          <div class="product-subtotal">
            <p class="cart-item__total-price-label">Tổng</p>
            <span class="cart-item__total-price-value"><span class="woocommerce-Price-amount amount"><bdi>${formatPrice(item.thanhTien)}</bdi></span></span>
          </div>
        </div>
      </div>
    `;
  }

  function renderCart(data) {
    if (!cartContainer) return;
    const items = data.items || [];
    if (!items.length) {
      cartContainer.innerHTML = `<div class="cart-empty"><p>Giỏ hàng của bạn đang trống.</p><a href="bosuutap.html" class="continue-shopping">TIẾP TỤC MUA HÀNG</a></div>`;
    } else {
      cartContainer.innerHTML = items.map(renderCartItem).join('');
    }
    if (subtotalElement) subtotalElement.textContent = formatPrice(data.tongTien);
    if (grandTotalElement) grandTotalElement.textContent = formatPrice(data.tongTien);
    updateCartBadge(data.tongSoLuong || 0);
    bindRemoveButtons(); bindQuantityButtons(); bindCheckboxes(); bindCheckoutLinks(data);
  }

  async function loadCart() {
    try {
      if (cartContainer) cartContainer.innerHTML = '<p>Đang tải giỏ hàng...</p>';
      if (isLoggedIn()) {
        const userId = getCurrentUserId();
        const response = await fetch(`${API_BASE}/api/gio-hang?userId=${userId}`);
        const result = await response.json();
        if (!response.ok || result.ok === false) throw new Error(result.message || 'Không lấy được giỏ hàng');
        renderCart(result.data);
        return;
      }
      const guestCartData = getGuestCartData();
      renderCart(guestCartData);
    } catch (error) {
      if (cartContainer) cartContainer.innerHTML = `<p>${safeText(error.message)}</p>`;
    }
  }

  function removeGuestCartItem(bienTheId) {
    const items = getGuestCartItems().filter(item => String(item.bienTheId || item.BIEN_THE_ID) !== String(bienTheId));
    saveGuestCartItems(items);
  }

  async function removeUserCartItem(chiTietId) {
    const response = await fetch(`${API_BASE}/api/gio-hang/${chiTietId}`, { method: 'DELETE' });
    const result = await response.json();
    if (!response.ok || result.ok === false) throw new Error(result.message || 'Không xóa được sản phẩm');
  }

  function bindRemoveButtons() {
    document.querySelectorAll('.js-remove-cart').forEach(button => {
      button.addEventListener('click', async function () {
        if (!confirm('Bạn có chắc muốn xóa sản phẩm này khỏi giỏ hàng?')) return;
        try {
          if (isLoggedIn()) await removeUserCartItem(button.dataset.id);
          else removeGuestCartItem(button.dataset.variant);
          loadCart();
        } catch (error) { alert(error.message); }
      });
    });
  }

  function updateGuestQuantity(bienTheId, soLuongMoi) {
    const items = getGuestCartItems();
    const item = items.find(cartItem => String(cartItem.bienTheId || cartItem.BIEN_THE_ID) === String(bienTheId));
    if (!item) return;
    const quantity = Number(soLuongMoi);
    if (quantity < 1) return;
    const price = Number(item.giaBan || item.GIA_BAN || item.price || 0);
    item.soLuong = quantity;
    item.quantity = quantity;
    item.thanhTien = price * quantity;
    saveGuestCartItems(items);
  }

  async function updateUserQuantity(chiTietId, soLuongMoi) {
    const response = await fetch(`${API_BASE}/api/gio-hang/${chiTietId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ soLuong: soLuongMoi })
    });
    const result = await response.json();
    if (!response.ok || result.ok === false) throw new Error(result.message || 'Không cập nhật được số lượng');
  }

  async function updateQuantity(chiTietId, bienTheId, soLuongMoi) {
    try {
      if (soLuongMoi < 1) return alert('Số lượng tối thiểu là 1');
      if (isLoggedIn()) {
        if (!chiTietId) return alert('Không tìm thấy mã chi tiết giỏ hàng');
        await updateUserQuantity(chiTietId, soLuongMoi);
      } else {
        if (!bienTheId) return alert('Không tìm thấy biến thể sản phẩm');
        updateGuestQuantity(bienTheId, soLuongMoi);
      }
      loadCart();
    } catch (error) { alert(error.message); }
  }

  function recalcTotals() {
    let total = 0;
    document.querySelectorAll('.woocommerce-cart-form__cart-item').forEach(row => {
      const checkbox = row.querySelector('.cart-item-checkbox');
      if (!checkbox || !checkbox.checked) return;
      const totalCell = row.querySelector('.cart-item__total-price-value bdi');
      if (!totalCell) return;
      const raw = totalCell.textContent.replace(/[^\d]/g, '');
      total += Number(raw) || 0;
    });
    if (subtotalElement) subtotalElement.textContent = total.toLocaleString('vi-VN') + '₫';
    if (grandTotalElement) grandTotalElement.textContent = total.toLocaleString('vi-VN') + '₫';
  }

  function bindCheckboxes() {
    document.querySelectorAll('.cart-item-checkbox').forEach(cb => {
      cb.addEventListener('change', recalcTotals);
    });
  }

  function bindQuantityButtons() {
    document.querySelectorAll('.js-qty-plus').forEach(button => {
      button.addEventListener('click', function () {
        const input = button.closest('.cart_item').querySelector('.qty-input');
        updateQuantity(button.dataset.id, button.dataset.variant, Number(input.value || 1) + 1);
      });
    });
    document.querySelectorAll('.js-qty-minus').forEach(button => {
      button.addEventListener('click', function () {
        const input = button.closest('.cart_item').querySelector('.qty-input');
        updateQuantity(button.dataset.id, button.dataset.variant, Number(input.value || 1) - 1);
      });
    });
  }

  function hasCartItems(data) { return data && Array.isArray(data.items) && data.items.length > 0; }

  function getCheckoutLinks() {
    return document.querySelectorAll('.checkout-btn, .checkout-button, .wc-proceed-to-checkout a, .cart_totals a, a[href="thanhtoan.html"], a[href="thanhtoandangnhap.html"]');
  }

  function bindCheckoutLinks(data) {
    const checkoutLinks = getCheckoutLinks();
    if (!checkoutLinks.length) return;

    checkoutLinks.forEach(link => {
      const textContent = (link.textContent || '').toLowerCase();
      if (!(link.classList.contains('checkout-btn') || link.classList.contains('checkout-button') || textContent.includes('thanh toán'))) return;
      
      link.setAttribute('href', getCheckoutUrl());
      if (link.dataset.checkoutBound === 'true') return;
      link.dataset.checkoutBound = 'true';

      link.addEventListener('click', function (event) {
        event.preventDefault();
        const currentCartData = isLoggedIn() ? data : getGuestCartData();

        if (!hasCartItems(currentCartData)) return alert('Giỏ hàng đang trống.');

        const checkedIds = [];
        document.querySelectorAll('.woocommerce-cart-form__cart-item').forEach(row => {
          const cb = row.querySelector('.cart-item-checkbox');
          if (cb && cb.checked) {
            if (row.dataset.id) checkedIds.push(String(row.dataset.id));
            if (row.dataset.variant) checkedIds.push(String(row.dataset.variant));
          }
        });

        const selectedItems = currentCartData.items.filter(item => 
          checkedIds.includes(String(item.chiTietId)) || checkedIds.includes(String(item.bienTheId || item.BIEN_THE_ID))
        );

        if (!selectedItems.length) return alert('Vui lòng chọn ít nhất một sản phẩm.');

        const selectedTotal = selectedItems.reduce((sum, item) => sum + Number(item.thanhTien || 0), 0);

        localStorage.setItem('selectedCartItems', JSON.stringify({
          items: selectedItems,
          tongTien: selectedTotal,
          tongSoLuong: selectedItems.reduce((s, i) => s + Number(i.soLuong || 1), 0)
        }));

        window.location.href = getCheckoutUrl();
      });
    });
  }

  function fixStaticLinks() {
    document.querySelectorAll('a[href="giohang.html"]').forEach(link => link.setAttribute('href', 'gio-hang.html'));
    document.querySelectorAll('a[href="thanhtoan.html"], a[href="thanhtoandangnhap.html"]').forEach(link => {
      const textContent = (link.textContent || '').toLowerCase();
      if (link.classList.contains('checkout-btn') || link.classList.contains('checkout-button') || textContent.includes('thanh toán')) {
        link.setAttribute('href', getCheckoutUrl());
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => { fixStaticLinks(); loadCart(); });
})();