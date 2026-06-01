(function () {
  "use strict";

  var API_BASE          = "http://localhost:3000";
  var GUEST_CART_KEY    = "guestCartItems";
  var HOVER_DELAY_OPEN  = 150;
  var HOVER_DELAY_CLOSE = 300;

  var openTimer  = null;
  var closeTimer = null;

  function resolveCartUrl() {
    var path = window.location.pathname;
    var dir  = path.substring(0, path.lastIndexOf('/') + 1);
    return dir + 'gio-hang.html';
  }

  function getCurrentUser() {
    try { return JSON.parse(localStorage.getItem("currentUser")); }
    catch (e) { return null; }
  }

  function isLoggedIn() {
    var u = getCurrentUser();
    return Boolean(u && u.id);
  }

  function formatMoney(n) {
    return Number(n || 0).toLocaleString("vi-VN") + "₫";
  }

  function getGuestCartData() {
    try {
      var items = JSON.parse(localStorage.getItem(GUEST_CART_KEY)) || [];
      var tongSoLuong = 0;
      var tongTien    = 0;
      var mapped = items.map(function (item) {
        var gia = Number(item.giaBan || item.GIA_BAN || item.price || 0);
        var sl  = Number(item.soLuong || item.quantity || 1);
        var tenSP = item.tenSanPham || item.TEN_SAN_PHAM || item.name || "Sản phẩm";
        var imgUrl = item.hinhAnh || item.HINH_ANH || item.image || "https://via.placeholder.com/60";
        
        tongSoLuong += sl;
        tongTien    += gia * sl;
        return {
          chiTietId  : item.bienTheId || item.BIEN_THE_ID || item.chiTietId || "",
          bienTheId  : item.bienTheId || item.BIEN_THE_ID || "",
          tenSanPham : tenSP,
          hinhAnh    : imgUrl,
          mauSac     : item.mauSac    || item.MAU_SAC || item.color || "",
          kichCoCanVot: item.kichCoCanVot || item.KICH_CO_CAN_VOT || item.size || "",
          giaBan     : gia,
          soLuong    : sl,
          thanhTien  : gia * sl
        };
      });
      return { items: mapped, tongSoLuong: tongSoLuong, tongTien: tongTien };
    } catch (e) {
      return { items: [], tongSoLuong: 0, tongTien: 0 };
    }
  }

  async function getUserCartData() {
    var user = getCurrentUser();
    if (!user || !user.id) return getGuestCartData();
    try {
      var res  = await fetch(API_BASE + "/api/gio-hang?userId=" + user.id);
      var json = await res.json();
      if (json.ok && json.data) return json.data;
      return { items: [], tongSoLuong: 0, tongTien: 0 };
    } catch (e) {
      return { items: [], tongSoLuong: 0, tongTien: 0 };
    }
  }

  function renderIntoWrapper(data) {
    var wrapper = document.getElementById("minicart-wrapper");
    if (!wrapper) return;

    var items       = data.items || [];
    var tongSoLuong = data.tongSoLuong || 0;
    var tongTien    = data.tongTien    || 0;

    if (!items.length) {
      wrapper.innerHTML =
        '<div class="mini-cart-header">' +
          '<h3 class="mini-cart-title">Giỏ hàng của bạn</h3>' +
          '<span class="mini-cart-total-items">0 sản phẩm</span>' +
          '<button type="button" class="mini-cart-close" onclick="document.getElementById(\'header-minicart\').classList.remove(\'is-open\')">&times;</button>' +
        '</div>' +
        '<p class="mini-cart-empty">Chưa có sản phẩm trong giỏ hàng.</p>' +
        '<button type="button" class="mini-cart-continue" onclick="document.getElementById(\'header-minicart\').classList.remove(\'is-open\')">Tiếp tục mua hàng</button>';
      var countEl = document.getElementById("cart-count");
      if (countEl) countEl.textContent = "0";
      return;
    }

    var itemsHtml = items.map(function (item, idx) {
      var gia = Number(item.giaBan || item.GIA_BAN || 0);
      var sl  = Number(item.soLuong || 1);
      var tenSP = item.tenSanPham || item.TEN_SAN_PHAM || "Sản phẩm";
      return (
        '<div class="mini-cart-product-box">' +
          '<div class="mini-cart-item-top">' +
            '<img class="mini-cart-item-img" src="' + (item.hinhAnh || item.HINH_ANH || "https://via.placeholder.com/60") + '" alt="" ' +
              'style="width:56px;height:56px;object-fit:contain;flex-shrink:0;border-radius:4px;display:inline-block;">' +
            '<div class="mini-cart-item-info">' +
              '<div class="mini-cart-item-title-row">' +
                '<p class="mini-cart-item-name">' + tenSP + '</p>' +
                '<button class="mini-cart-remove" onclick="hoverCartRemove(' + idx + ')">&#128465;</button>' +
              '</div>' +
              '<div class="mini-cart-item-meta">' +
                (item.mauSac || item.MAU_SAC ? '<span>Màu sắc: ' + (item.mauSac || item.MAU_SAC) + '</span>' : '') +
                (item.kichCoCanVot || item.KICH_CO_CAN_VOT ? '<span>Kích cỡ cán: ' + (item.kichCoCanVot || item.KICH_CO_CAN_VOT) + '</span>' : '') +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="mini-cart-line"></div>' +
          '<div class="mini-cart-item-bottom">' +
            '<div><span style="font-size:12px;color:#555">Đơn giá</span><strong style="display:block">' + formatMoney(gia) + '</strong></div>' +
            '<div style="display:flex;align-items:center;gap:6px">' +
              '<button onclick="hoverCartQty(' + idx + ',-1)" style="width:26px;height:26px;border:1px solid #ccc;background:#fff;cursor:pointer;font-size:14px">&#8722;</button>' +
              '<span>' + sl + '</span>' +
              '<button onclick="hoverCartQty(' + idx + ',1)" style="width:26px;height:26px;border:1px solid #ccc;background:#fff;cursor:pointer;font-size:14px">+</button>' +
            '</div>' +
            '<div style="text-align:right"><span style="font-size:12px;color:#555">Tổng</span><strong style="display:block">' + formatMoney(gia * sl) + '</strong></div>' +
          '</div>' +
        '</div>'
      );
    }).join("");

    wrapper.innerHTML =
      '<div class="mini-cart-header">' +
        '<h3 class="mini-cart-title">Giỏ hàng của bạn</h3>' +
        '<span class="mini-cart-total-items">' + tongSoLuong + ' sản phẩm</span>' +
        '<button type="button" class="mini-cart-close" onclick="document.getElementById(\'header-minicart\').classList.remove(\'is-open\')">&times;</button>' +
      '</div>' +
      '<div style="max-height:400px;overflow-y:auto;padding-right:5px">' + itemsHtml + '</div>' +
      '<div class="mini-cart-summary"><span>Tạm tính:</span><strong>' + formatMoney(tongTien) + '</strong></div>' +
      '<a href="' + resolveCartUrl() + '" class="mini-cart-view-btn">XEM GIỎ HÀNG</a>' +
      '<button type="button" class="mini-cart-continue" onclick="document.getElementById(\'header-minicart\').classList.remove(\'is-open\')">Tiếp tục mua hàng</button>';

    var countEl = document.getElementById("cart-count");
    if (countEl) countEl.textContent = tongSoLuong;
  }

  window.hoverCartRemove = async function (idx) {
    if (isLoggedIn()) {
      var data = await getUserCartData();
      var item = (data.items || [])[idx];
      if (!item || !item.chiTietId) return;
      try { await fetch(API_BASE + "/api/gio-hang/" + item.chiTietId, { method: "DELETE" }); } catch (e) {}
    } else {
      var cart = [];
      try { cart = JSON.parse(localStorage.getItem(GUEST_CART_KEY)) || []; } catch (e) {}
      cart.splice(idx, 1);
      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cart));
    }
    refreshAndRender();
  };

  window.hoverCartQty = async function (idx, delta) {
    if (isLoggedIn()) {
      var data = await getUserCartData();
      var item = (data.items || [])[idx];
      if (!item) return;
      var newQty = Number(item.soLuong || 1) + delta;
      if (newQty < 1) return;
      try {
        await fetch(API_BASE + "/api/gio-hang/" + item.chiTietId, {
          method  : "PUT",
          headers : { "Content-Type": "application/json" },
          body    : JSON.stringify({ soLuong: newQty })
        });
      } catch (e) {}
    } else {
      var cart = [];
      try { cart = JSON.parse(localStorage.getItem(GUEST_CART_KEY)) || []; } catch (e) {}
      var newQtyG = Number(cart[idx].soLuong || cart[idx].quantity || 1) + delta;
      if (newQtyG < 1) return;
      cart[idx].soLuong = newQtyG;
      cart[idx].quantity = newQtyG;
      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cart));
    }
    refreshAndRender();
  };

  async function refreshAndRender() {
    var data = isLoggedIn() ? await getUserCartData() : getGuestCartData();
    if (document.getElementById("minicart-wrapper")) { renderIntoWrapper(data); return; }
    if (typeof window.renderMiniCartUI === "function") { window.renderMiniCartUI(); return; }
    if (typeof window.openMiniCart === "function") { window.openMiniCart(); }
  }

  function getMinicartEl() { return document.getElementById("header-minicart"); }

  async function openPopup() {
    clearTimeout(closeTimer);
    var el = getMinicartEl();
    if (!el) return;
    var data = isLoggedIn() ? await getUserCartData() : getGuestCartData();
    if (document.getElementById("minicart-wrapper")) renderIntoWrapper(data);
    else if (typeof window.renderMiniCartUI === "function") window.renderMiniCartUI();
    el.classList.add("is-open");
  }

  function closePopup() {
    var el = getMinicartEl();
    if (el) el.classList.remove("is-open");
  }

  function bindHover() {
    var minicart = getMinicartEl();
    if (!minicart) return;
    minicart.addEventListener("mouseenter", function () { clearTimeout(closeTimer); openTimer = setTimeout(openPopup, HOVER_DELAY_OPEN); });
    minicart.addEventListener("mouseleave", function () { clearTimeout(openTimer); closeTimer = setTimeout(closePopup, HOVER_DELAY_CLOSE); });
    var dropdown = minicart.querySelector(".mini-cart-dropdown, .custom-minicart-ui");
    if (dropdown) {
      dropdown.addEventListener("mouseenter", function () { clearTimeout(closeTimer); });
      dropdown.addEventListener("mouseleave", function () { clearTimeout(openTimer); closeTimer = setTimeout(closePopup, HOVER_DELAY_CLOSE); });
    }
  }

  function bindGioHangHover() {
    var cartWrap = document.querySelector(".cart-wrap");
    if (!cartWrap) return;
    cartWrap.addEventListener("mouseenter", function () { cartWrap.style.opacity = "0.75"; cartWrap.style.transition = "opacity 0.2s"; });
    cartWrap.addEventListener("mouseleave", function () { cartWrap.style.opacity = "1"; });
  }

  async function initBadge() {
    var data = isLoggedIn() ? await getUserCartData() : getGuestCartData();
    var total = data.tongSoLuong || 0;
    var countEls = document.querySelectorAll("#cart-count, .cart-count");
    countEls.forEach(function (el) {
      el.textContent = total;
      if (total <= 0) el.classList.add("is-hidden");
      else el.classList.remove("is-hidden");
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var isGioHangPage = Boolean(document.getElementById("cart-items-container"));
    initBadge();
    if (isGioHangPage) bindGioHangHover(); else bindHover();
  });

})();