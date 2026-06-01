(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    initMiniCart();
    updateMiniCartCount();
    renderMiniCart();
    
    initAddToCartListeners();
  });

  function getMiniCartItems() {
    try {
      return JSON.parse(localStorage.getItem("cart")) || [];
    } catch (error) {
      return [];
    }
  }

  function saveMiniCartItems(cart) {
    localStorage.setItem("cart", JSON.stringify(cart));
  }

  function normalizePrice(price) {
    if (typeof price === "number") return price;
    return Number(String(price || "0").replace(/[^\d]/g, "")) || 0;
  }

  function formatMoney(number) {
    return Number(number || 0).toLocaleString("vi-VN") + "₫";
  }

  function getCartTotalQuantity(cart) {
    return cart.reduce((total, item) => total + Number(item.quantity || 0), 0);
  }

  function getCartSubtotal(cart) {
    return cart.reduce((total, item) => total + normalizePrice(item.price) * Number(item.quantity || 0), 0);
  }

  function updateMiniCartCount() {
    const cartCountEls = document.querySelectorAll("#cart-count, .cart-count");
    const cart = getMiniCartItems();
    const totalQuantity = getCartTotalQuantity(cart);

    cartCountEls.forEach(function (cartCountEl) {
      cartCountEl.textContent = totalQuantity;
      if (totalQuantity <= 0) {
        cartCountEl.classList.add("is-hidden");
      } else {
        cartCountEl.classList.remove("is-hidden");
      }
    });
  }

  function renderMiniCart() {
    const wrapper = document.getElementById("minicart-wrapper");
    if (!wrapper) return;

    const cart = getMiniCartItems();
    const totalQuantity = getCartTotalQuantity(cart);

    if (cart.length === 0) {
      wrapper.innerHTML = `
        <div class="mini-cart-header">
          <h3 class="mini-cart-title">Giỏ hàng của bạn</h3>
          <span class="mini-cart-total-items">0 sản phẩm</span>
          <button type="button" class="mini-cart-close">×</button>
        </div>
        <p class="mini-cart-empty">Chưa có sản phẩm trong giỏ hàng.</p>
        <button type="button" class="mini-cart-continue">Tiếp tục mua hàng</button>
      `;
      bindMiniCartActions();
      return;
    }

    const itemsHtml = cart.map((item, index) => {
      const price = normalizePrice(item.price);
      const quantity = Number(item.quantity || 1);
      return `
        <div class="mini-cart-product-box" data-index="${index}">
          <div class="mini-cart-item">
            <div class="mini-cart-item-img-wrap">
              <img class="mini-cart-item-img" src="${item.image || ""}" alt="${item.name}">
            </div>
            <div class="mini-cart-item-info">
              <p class="mini-cart-item-name">${item.name}</p>
              <p class="mini-cart-item-meta"><span>Số lượng:</span> <strong>${quantity}</strong></p>
            </div>
            <button type="button" class="mini-cart-remove" data-index="${index}">🗑</button>
          </div>
          <div class="mini-cart-line"></div>
          <div class="mini-cart-price-row">
            <div><span class="mini-cart-price-label">Đơn giá</span><span class="mini-cart-price-value">${formatMoney(price)}</span></div>
            <div class="mini-cart-qty">
              <button type="button" class="mini-cart-minus" data-index="${index}">−</button>
              <input type="text" value="${quantity}" readonly>
              <button type="button" class="mini-cart-plus" data-index="${index}">+</button>
            </div>
            <div><span class="mini-cart-price-label">Tổng</span><span class="mini-cart-price-value">${formatMoney(price * quantity)}</span></div>
          </div>
        </div>
      `;
    }).join("");

    wrapper.innerHTML = `
      <div class="mini-cart-header">
        <h3 class="mini-cart-title">Giỏ hàng của bạn</h3>
        <span class="mini-cart-total-items">${totalQuantity} sản phẩm</span>
        <button type="button" class="mini-cart-close">×</button>
      </div>
      <div class="mini-cart-scroll-area" style="max-height: 400px; overflow-y: auto;">
        ${itemsHtml}
      </div>
      <div class="mini-cart-summary">
        <span>Tạm tính:</span>
        <strong>${formatMoney(getCartSubtotal(cart))}</strong>
      </div>
      <a href="gio-hang.html" class="mini-cart-view">XEM GIỎ HÀNG</a>
      <button type="button" class="mini-cart-continue">Tiếp tục mua hàng</button>
    `;
    bindMiniCartActions();
  }

  function openMiniCart() {
    const headerMinicart = document.getElementById("header-minicart");
    if (headerMinicart) {
        renderMiniCart();
        updateMiniCartCount();
        headerMinicart.classList.add("is-open");
    }
  }

  function closeMiniCart() {
    const headerMinicart = document.getElementById("header-minicart");
    if (headerMinicart) headerMinicart.classList.remove("is-open");
  }

  function initMiniCart() {
    const toggleBtn = document.getElementById("minicart-toggle");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        const headerMinicart = document.getElementById("header-minicart");
        if (headerMinicart.classList.contains("is-open")) closeMiniCart();
        else openMiniCart();
      });
    }

    document.addEventListener("click", function (e) {
      if (!e.target.closest("#header-minicart")) closeMiniCart();
    });
  }

  function initAddToCartListeners() {
    document.addEventListener("click", function (e) {
      const btn = e.target.closest(".demo-add-to-cart");
      if (!btn) return;

      const product = {
        id: btn.dataset.id,
        name: btn.dataset.name,
        price: btn.dataset.price,
        image: btn.dataset.image,
        quantity: 1
      };

      let cart = getMiniCartItems();
      const existingItem = cart.find(item => item.id === product.id);

      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        cart.push(product);
      }

      saveMiniCartItems(cart);
      updateMiniCartCount();
      openMiniCart(); 
    });
  }

  function bindMiniCartActions() {
    const closeBtns = document.querySelectorAll(".mini-cart-close, .mini-cart-continue");
    closeBtns.forEach(btn => btn.addEventListener("click", closeMiniCart));

    document.querySelectorAll(".mini-cart-plus").forEach(btn => {
      btn.addEventListener("click", () => {
        let cart = getMiniCartItems();
        cart[btn.dataset.index].quantity++;
        saveMiniCartItems(cart);
        renderMiniCart();
        updateMiniCartCount();
      });
    });

    document.querySelectorAll(".mini-cart-minus").forEach(btn => {
      btn.addEventListener("click", () => {
        let cart = getMiniCartItems();
        if (cart[btn.dataset.index].quantity > 1) {
          cart[btn.dataset.index].quantity--;
          saveMiniCartItems(cart);
          renderMiniCart();
          updateMiniCartCount();
        }
      });
    });

    document.querySelectorAll(".mini-cart-remove").forEach(btn => {
      btn.addEventListener("click", () => {
        let cart = getMiniCartItems();
        cart.splice(btn.dataset.index, 1);
        saveMiniCartItems(cart);
        renderMiniCart();
        updateMiniCartCount();
      });
    });
  }

  window.openMiniCart = openMiniCart;
})();