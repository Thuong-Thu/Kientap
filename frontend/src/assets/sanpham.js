(function () {
  'use strict';

  const API_BASE = window.API_BASE_URL || 'http://localhost:3000';
  const GUEST_CART_KEY = 'guestCartItems';

  function getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem('currentUser'));
    } catch (error) {
      return null;
    }
  }

  function getCurrentUserId() {
    const user = getCurrentUser();
    if (!user || !user.id) return null;
    return Number(user.id);
  }

  function isLoggedIn() {
    return Boolean(getCurrentUserId());
  }

  function money(value) {
    return Number(value || 0).toLocaleString('vi-VN') + '₫';
  }

  function text(value) {
    return value === null || value === undefined ? '' : String(value);
  }

  function getProductId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id') || params.get('sanPhamId') || params.get('productId');
  }

  function getCartUrl() {
    const path = window.location.pathname;
    const dir  = path.substring(0, path.lastIndexOf('/') + 1);
    return dir + 'gio-hang.html';
  }

  function getCheckoutUrl() {
    const path = window.location.pathname;
    const dir  = path.substring(0, path.lastIndexOf('/') + 1);
    return dir + (isLoggedIn() ? 'thanhtoandangnhap.html' : 'thanhtoan.html');
  }

  function setCartCount(total) {
    const count = Number(total || 0);
    const badge = document.getElementById('cart-count');
    if (badge) {
      badge.textContent = count;
      if (count > 0) {
        badge.classList.remove('is-hidden');
      } else {
        badge.classList.add('is-hidden');
      }
    }
    document.dispatchEvent(new CustomEvent('cart:updated', { detail: { count: count } }));
  }

  function getGuestCartItems() {
    try { return JSON.parse(localStorage.getItem(GUEST_CART_KEY)) || []; } 
    catch (error) { return []; }
  }

  function saveGuestCartItems(items) {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
  }

  function getGuestCartTotalQuantity() {
    return getGuestCartItems().reduce(function (sum, item) {
      return sum + Number(item.soLuong || item.quantity || 0);
    }, 0);
  }

  async function updateCartCount() {
    try {
      const userId = getCurrentUserId();
      if (userId) {
        const response = await fetch(`${API_BASE}/api/gio-hang?userId=${userId}`);
        const result = await response.json();
        if (result.ok && result.data) setCartCount(result.data.tongSoLuong || 0);
        return;
      }
      setCartCount(getGuestCartTotalQuantity());
    } catch (error) {
      console.warn('Không cập nhật được số lượng giỏ hàng:', error.message);
    }
  }

  function optionList(variants, field) {
    const fieldUpper = field.replace(/([A-Z])/g, '_$1').toUpperCase();
    const values = [...new Set(variants.map((item) => item[field] || item[fieldUpper]).filter(Boolean))];
    return values.map((value) => `<option value="${text(value)}">${text(value)}</option>`).join('');
  }

  function findVariant(product) {
    const variants = product.variants || [];
    const mauSac = document.getElementById('db-mau-sac') ? document.getElementById('db-mau-sac').value : '';
    const kichThuoc = document.getElementById('db-kich-thuoc') ? document.getElementById('db-kich-thuoc').value : '';
    const kichCoCanVot = document.getElementById('db-kich-co-can-vot') ? document.getElementById('db-kich-co-can-vot').value : '';

    return variants.find(function (item) {
      const itemMau = text(item.mauSac || item.MAU_SAC);
      const itemSize = text(item.kichThuoc || item.KICH_THUOC);
      const itemCan = text(item.kichCoCanVot || item.KICH_CO_CAN_VOT);

      const okMau = !mauSac || itemMau === mauSac;
      const okSize = !kichThuoc || itemSize === kichThuoc;
      const okCan = !kichCoCanVot || itemCan === kichCoCanVot;

      return okMau && okSize && okCan;
    }) || variants[0];
  }

function getProductMainImage(product, variant) {
  const variantImage = getVariantImage(variant);

  if (variantImage) return variantImage;

  const currentMainImage = document.getElementById('db-main-product-image');

  if (currentMainImage && currentMainImage.src) {
    return currentMainImage.src;
  }

  if (product.images && product.images.length) {
    const firstImage = product.images[0];

    return normalizeImageUrl(
      firstImage.url ||
      firstImage.URL ||
      firstImage.hinhAnh ||
      firstImage.HINH_ANH ||
      firstImage.image ||
      firstImage.IMAGE
    );
  }

  return normalizeImageUrl(product.hinhAnh || product.HINH_ANH || product.image || product.IMAGE || '');
}
  function renderImages(product) {
    const imgUrl = product.hinhAnh || product.HINH_ANH;
    const images = product.images && product.images.length ? product.images : imgUrl ? [{ url: imgUrl }] : [];
    const tenSP = product.tenSanPham || product.TEN_SAN_PHAM || 'Sản phẩm';

    if (!images.length) {
      return `<div class="woocommerce-product-gallery images db-gallery"><div class="db-no-image db-no-image-large">Sản phẩm này chưa có ảnh</div></div>`;
    }

    return `
      <div class="woocommerce-product-gallery images db-gallery">
        <div class="product-gallery__main db-main-image" id="db-zoom-container" style="position:relative;overflow:hidden;cursor:crosshair;">
          <img id="db-main-product-image" src="${text(images[0].url)}" alt="${text(tenSP)}" style="width:100%;height:100%;object-fit:contain;transition:transform 0.1s ease;transform-origin:0 0;" />
        </div>
        <div class="product-gallery__thumb db-thumbs">
          ${images.map((img, index) => `
              <button type="button" class="db-thumb ${index === 0 ? 'active' : ''}" data-image="${text(img.url)}">
                <img src="${text(img.url)}" alt="${text(tenSP)} ${index + 1}" />
              </button>
            `).join('')}
        </div>
      </div>
      <style>
        #db-quantity::-webkit-outer-spin-button,
        #db-quantity::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        #db-zoom-container img { will-change: transform; }
      </style>
    `;
  }
function getField(item, keys) {
  for (const key of keys) {
    if (item && item[key] !== undefined && item[key] !== null && item[key] !== '') {
      return item[key];
    }
  }

  return '';
}

function normalizeImageUrl(url) {
  if (!url) return '';

  const value = String(url).trim();

  if (
    value.startsWith('http://') ||
    value.startsWith('https://') ||
    value.startsWith('data:')
  ) {
    return value;
  }

  if (value.startsWith('/')) {
    return API_BASE + value;
  }

  return API_BASE + '/' + value;
}

function getVariantImage(variant) {
  return normalizeImageUrl(
    getField(variant, [
      'hinhAnh',
      'HINH_ANH',
      'image',
      'IMAGE',
      'url',
      'URL',
      'src',
      'SRC'
    ])
  );
}

function getUniqueValues(variants, keys) {
  const values = variants
    .map(function (item) {
      return text(getField(item, keys));
    })
    .filter(Boolean);

  return [...new Set(values)];
}

function getColorStyle(colorName) {
  const color = String(colorName || '').toLowerCase().trim();

  const COLOR_MAP = [
    ['xanh navy',    '#1a2b5e'],
    ['xanh dương',   '#1e73be'],
    ['xanh biển',    '#0288d1'],
    ['xanh lá',      '#4caf50'],
    ['xanh',         '#1e73be'],
    ['đen',          '#111111'],
    ['trắng',        '#f0f0f0'],
    ['xám',          '#8b8b8b'],
    ['đỏ',           '#d32f2f'],
    ['vàng',         '#f9a825'],
    ['tím',          '#7b1fa2'],
    ['cam',          '#ef6c00'],
    ['hồng',         '#e91e8c'],
    ['bạc',          '#b0bec5'],
  ];

  const COMBO_MAP = [
    { keys: ['đen', 'đỏ'],        style: 'linear-gradient(135deg, #111 50%, #d32f2f 50%)' },
    { keys: ['đen', 'vàng'],      style: 'linear-gradient(135deg, #111 50%, #f9a825 50%)' },
    { keys: ['đen', 'trắng'],     style: 'linear-gradient(135deg, #111 50%, #f0f0f0 50%)' },
    { keys: ['đen', 'xanh'],      style: 'linear-gradient(135deg, #111 50%, #1e73be 50%)' },
    { keys: ['đen', 'cam'],       style: 'linear-gradient(135deg, #111 50%, #ef6c00 50%)' },
    { keys: ['đen', 'bạc'],       style: 'linear-gradient(135deg, #111 50%, #b0bec5 50%)' },
    { keys: ['đen', 'tím'],       style: 'linear-gradient(135deg, #111 50%, #7b1fa2 50%)' },
    { keys: ['trắng', 'xanh lá'], style: 'linear-gradient(135deg, #f0f0f0 50%, #4caf50 50%)' },
    { keys: ['trắng', 'xanh'],    style: 'linear-gradient(135deg, #f0f0f0 50%, #1e73be 50%)' },
    { keys: ['trắng', 'đỏ'],      style: 'linear-gradient(135deg, #f0f0f0 50%, #d32f2f 50%)' },
    { keys: ['trắng', 'hồng'],    style: 'linear-gradient(135deg, #f0f0f0 50%, #e91e8c 50%)' },
    { keys: ['trắng', 'vàng'],    style: 'linear-gradient(135deg, #f0f0f0 50%, #f9a825 50%)' },
    { keys: ['trắng', 'bạc'],     style: 'linear-gradient(135deg, #f0f0f0 50%, #b0bec5 50%)' },
    { keys: ['trắng', 'cam'],     style: 'linear-gradient(135deg, #f0f0f0 50%, #ef6c00 50%)' },
    { keys: ['xám', 'đen'],       style: 'linear-gradient(135deg, #8b8b8b 50%, #111 50%)' },
    { keys: ['xám', 'bạc'],       style: 'linear-gradient(135deg, #8b8b8b 50%, #b0bec5 50%)' },
    { keys: ['xám', 'xanh'],      style: 'linear-gradient(135deg, #8b8b8b 50%, #1e73be 50%)' },
    { keys: ['đỏ', 'đen'],        style: 'linear-gradient(135deg, #d32f2f 50%, #111 50%)' },
    { keys: ['đỏ', 'trắng'],      style: 'linear-gradient(135deg, #d32f2f 50%, #f0f0f0 50%)' },
    { keys: ['đỏ', 'bạc'],        style: 'linear-gradient(135deg, #d32f2f 50%, #b0bec5 50%)' },
    { keys: ['đỏ', 'vàng'],       style: 'linear-gradient(135deg, #d32f2f 50%, #f9a825 50%)' },
    { keys: ['xanh', 'bạc'],      style: 'linear-gradient(135deg, #1e73be 50%, #b0bec5 50%)' },
    { keys: ['xanh', 'vàng'],     style: 'linear-gradient(135deg, #1e73be 50%, #f9a825 50%)' },
    { keys: ['vàng', 'đen'],      style: 'linear-gradient(135deg, #f9a825 50%, #111 50%)' },
    { keys: ['vàng', 'trắng'],    style: 'linear-gradient(135deg, #f9a825 50%, #f0f0f0 50%)' },
    { keys: ['tím', 'bạc'],       style: 'linear-gradient(135deg, #7b1fa2 50%, #b0bec5 50%)' },
  ];

  for (const combo of COMBO_MAP) {
    if (combo.keys.every(k => color.includes(k))) {
      return `background: ${combo.style};`;
    }
  }

  for (const [key, hex] of COLOR_MAP) {
    if (color.includes(key)) {
      return `background: ${hex};`;
    }
  }

  return 'background: #ddd;';
}

function renderHiddenSelect(id, values, selectedValue) {
  return `
    <select id="${id}" style="display:none">
      ${values
        .map(function (value) {
          return `
            <option value="${text(value)}" ${value === selectedValue ? 'selected' : ''}>
              ${text(value)}
            </option>
          `;
        })
        .join('')}
    </select>
  `;
}

function renderColorItems(values, selectedValue) {
  if (!values.length) return '';

  return `
    <ul
      role="radiogroup"
      aria-label="Màu sắc"
      class="single-product-variable-items wvs-style-rounded variable-items-wrapper image-variable-items-wrapper"
    >
      ${values
        .map(function (value) {
          const active = value === selectedValue;

          return `
            <li
              role="radio"
              tabindex="0"
              aria-checked="${active ? 'true' : 'false'}"
              title="${text(value)}"
              data-value="${text(value)}"
              data-target="db-mau-sac"
              class="variable-item image-variable-item db-option ${active ? 'selected' : ''}"
            >
              <div class="variable-item-contents">
                <span
                  class="variable-color-dot"
                  style="${getColorStyle(value)}"
                ></span>
              </div>
            </li>
          `;
        })
        .join('')}
    </ul>
  `;
}

function renderButtonItems(values, selectedValue, targetId) {
  if (!values.length) return '';

  return `
    <ul
      role="radiogroup"
      class="single-product-variable-items wvs-style-rounded variable-items-wrapper button-variable-items-wrapper"
    >
      ${values
        .map(function (value) {
          const active = value === selectedValue;

          return `
            <li
              role="radio"
              tabindex="0"
              aria-checked="${active ? 'true' : 'false'}"
              title="${text(value)}"
              data-value="${text(value)}"
              data-target="${targetId}"
              class="variable-item button-variable-item db-option ${active ? 'selected' : ''}"
            >
              <div class="variable-item-contents">
                <span class="variable-item-span variable-item-span-button">
                  ${text(value)}
                </span>
              </div>
            </li>
          `;
        })
        .join('')}
    </ul>
  `;
}
 function renderVariantForm(product) {
  const variants = product.variants || [];
  const first = variants[0] || {};

  const colors = getUniqueValues(variants, ['mauSac', 'MAU_SAC']);
  const sizes = getUniqueValues(variants, ['kichThuoc', 'KICH_THUOC']);
  const gripSizes = getUniqueValues(variants, ['kichCoCanVot', 'KICH_CO_CAN_VOT']);

  const selectedColor = text(first.mauSac || first.MAU_SAC || colors[0] || '');
  const selectedSize = text(first.kichThuoc || first.KICH_THUOC || sizes[0] || '');
  const selectedGrip = text(first.kichCoCanVot || first.KICH_CO_CAN_VOT || gripSizes[0] || '');

  const sku = first.sku || first.SKU || 'Chưa có';
  const tonKho = Number(first.soLuongTon || first.SO_LUONG_TON || 0);

  return `
    <form class="variations_form cart" id="db-product-form">
      <table class="variations" cellspacing="0">
        <tbody>
          ${
            colors.length
              ? `
                <tr>
                  <td class="label">
                    <label for="db-mau-sac">Màu sắc</label>
                  </td>
                  <td class="value">
                    ${renderHiddenSelect('db-mau-sac', colors, selectedColor)}
                    ${renderColorItems(colors, selectedColor)}
                  </td>
                </tr>
              `
              : ''
          }

          ${
            sizes.length
              ? `
                <tr>
                  <td class="label">
                    <label for="db-kich-thuoc">Kích thước</label>
                  </td>
                  <td class="value">
                    ${renderHiddenSelect('db-kich-thuoc', sizes, selectedSize)}
                    ${renderButtonItems(sizes, selectedSize, 'db-kich-thuoc')}
                  </td>
                </tr>
              `
              : ''
          }

          ${
            gripSizes.length
              ? `
                <tr>
                  <td class="label">
                    <label for="db-kich-co-can-vot">Kích cỡ cán vợt</label>
                  </td>
                  <td class="value">
                    ${renderHiddenSelect('db-kich-co-can-vot', gripSizes, selectedGrip)}
                    ${renderButtonItems(gripSizes, selectedGrip, 'db-kich-co-can-vot')}
                  </td>
                </tr>
              `
              : ''
          }
        </tbody>
      </table>

      <div class="db-variant-info" id="db-variant-info">
        SKU: ${text(sku)} | Tồn kho: ${tonKho}
      </div>

      <div class="single_variation_wrap">
        <div class="woocommerce-variation-add-to-cart variations_button">
          <div class="quantity quantity-control" style="display:inline-flex;align-items:center;gap:6px;margin-left:10px">
            <label for="db-quantity" class="screen-reader-text">Số lượng</label>
            <button type="button" class="qty-btn qty-minus" id="db-qty-minus" style="width:28px;height:28px;border:1px solid #ccc;border-radius:4px;background:#f5f5f5;cursor:pointer;font-size:16px;line-height:1;padding:0;flex-shrink:0;display:flex;align-items:center;justify-content:center">&#8722;</button>
            <input type="number" class="input-text qty text" id="db-quantity" name="quantity" value="1" min="1" style="width:44px;text-align:center;border:1px solid #ccc;border-radius:4px;height:28px;font-size:14px;outline:none;padding:0;display:block;line-height:28px;-moz-appearance:textfield;appearance:textfield">
            <button type="button" class="qty-btn qty-plus" id="db-qty-plus" style="width:28px;height:28px;border:1px solid #ccc;border-radius:4px;background:#f5f5f5;cursor:pointer;font-size:16px;line-height:1;padding:0;flex-shrink:0;display:flex;align-items:center;justify-content:center">+</button>
          </div>

          <button type="submit" class="single_add_to_cart_button button alt btn btn--normal is-ready">
            Thêm vào giỏ hàng
          </button>

          <button type="button" class="buy-now-button button btn btn--primary" id="db-buy-now">
            Mua ngay
          </button>
        </div>
      </div>
    </form>
  `;
}

  function render(product) {
    const box = document.querySelector('.dt-product-details');
    if (!box) return;

    const tenSP = product.tenSanPham || product.TEN_SAN_PHAM || product.name || 'Sản phẩm';
    const idSP = product.sanPhamId || product.SAN_PHAM_ID || product.id || '';
    const thuongHieu = product.thuongHieu || product.THUONG_HIEU || '';
    const moTa = product.moTa || product.MO_TA || 'Sản phẩm này chưa có mô tả.';

    const firstVariant = product.variants && product.variants.length ? product.variants[0] : null;
    const price = firstVariant ? (firstVariant.giaBan || firstVariant.GIA_BAN) : (product.giaBan || product.GIA_BAN);

    document.title = `${text(tenSP)} - Babolat`;

    box.innerHTML = `
      <div id="product-${text(idSP)}" class="wvs-archive-product-wrapper product type-product instock has-post-thumbnail purchasable product-type-variable db-product-detail">
        ${renderImages(product)}
        <div class="summary entry-summary">
          <nav class="woocommerce-breadcrumb">
            <a href="trangchu.html">Trang chủ</a>&nbsp;/&nbsp;<a href="bosuutap.html">Bộ sưu tập</a>&nbsp;/&nbsp;<span>${text(tenSP)}</span>
          </nav>
          <h1 class="product_title entry-title">${text(tenSP)}</h1>
          ${thuongHieu ? `<p class="db-brand">Thương hiệu: ${text(thuongHieu)}</p>` : ''}
          <p class="price"><span class="woocommerce-Price-amount amount"><bdi>${money(price)}</bdi></span></p>
          ${renderVariantForm(product)}
        </div>
      </div>
      <div class="woocommerce-tabs wc-tabs-wrapper db-product-tabs">
        <ul class="tabs wc-tabs" role="tablist">
          <li class="description_tab active"><a href="#tab-description">Mô tả</a></li>
          <li class="additional_information_tab"><a href="#tab-additional_information">Thông tin bổ sung</a></li>
        </ul>
        <div class="woocommerce-Tabs-panel panel entry-content wc-tab" id="tab-description">
          <h2 class="product-details__tab-title">Mô tả</h2>
          <p>${text(moTa)}</p>
        </div>
        <div class="woocommerce-Tabs-panel panel entry-content wc-tab" id="tab-additional_information">
          <h2 class="product-details__tab-title">Đặc điểm kỹ thuật</h2>
          <table class="woocommerce-product-attributes shop_attributes" id="db-spec-table"></table>
        </div>
      </div>
    `;

    bindEvents(product);
    refreshVariantInfo(product);
  }

function refreshVariantInfo(product) {
  const variant = findVariant(product);
  const info = document.getElementById('db-variant-info');
  const priceEl = document.querySelector('.summary .price bdi');
  const spec = document.getElementById('db-spec-table');
  const mainImage = document.getElementById('db-main-product-image');

  if (!variant) return;

  const sku = variant.sku || variant.SKU || 'Chưa có';
  const tonKho = Number(variant.soLuongTon || variant.SO_LUONG_TON || 0);
  const price = Number(variant.giaBan || variant.GIA_BAN || 0);

  const variantImage = getVariantImage(variant);

  if (info) {
    info.textContent = `SKU: ${text(sku)} | Tồn kho: ${tonKho}`;
  }

  if (priceEl) {
    priceEl.textContent = money(price);
  }

  if (mainImage && variantImage) {
    mainImage.src = variantImage;
  }

  const qtyInput = document.getElementById('db-quantity');
  if (qtyInput) {
    const currentQty = Number(qtyInput.value || 1);
    if (currentQty > tonKho) qtyInput.value = Math.max(1, tonKho);
  }

  if (spec) {
    spec.innerHTML = `
      <tr><th>SKU</th><td><p>${text(sku)}</p></td></tr>
      <tr><th>Màu sắc</th><td><p>${text(variant.mauSac || variant.MAU_SAC)}</p></td></tr>
      <tr><th>Kích thước</th><td><p>${text(variant.kichThuoc || variant.KICH_THUOC)}</p></td></tr>
      <tr><th>Trọng lượng</th><td><p>${text(variant.trongLuong || variant.TRONG_LUONG)}</p></td></tr>
      <tr><th>Kích cỡ cán vợt</th><td><p>${text(variant.kichCoCanVot || variant.KICH_CO_CAN_VOT)}</p></td></tr>
      <tr><th>Số lượng tồn</th><td><p>${tonKho}</p></td></tr>
    `;
  }
}

  function showSuccess() {
    const overlay = document.getElementById('success-overlay');
    if (overlay) {
      overlay.setAttribute('aria-hidden', 'false');
      overlay.classList.add('is-active', 'is-show');
      overlay.style.display = 'flex';
      overlay.style.pointerEvents = 'auto';
    } else {
      alert('Đã thêm vào giỏ hàng');
    }
  }

  function buildGuestCartItem(product, variant, quantity) {
    const price = Number(variant.giaBan || variant.GIA_BAN || product.giaBan || product.GIA_BAN || 0);
    const image = getProductMainImage(product, variant);    const tenSP = product.tenSanPham || product.TEN_SAN_PHAM || product.name || 'Sản phẩm';
    const idSP = product.sanPhamId || product.SAN_PHAM_ID || product.id || '';
    const variantId = variant.bienTheId || variant.BIEN_THE_ID || '';

    return {
      chiTietId: `guest-${variantId}`,
      isGuest: true,
      sanPhamId: idSP,
      tenSanPham: tenSP,
      hinhAnh: image,
      bienTheId: variantId,
      sku: variant.sku || variant.SKU,
      mauSac: variant.mauSac || variant.MAU_SAC,
      kichThuoc: variant.kichThuoc || variant.KICH_THUOC,
      trongLuong: variant.trongLuong || variant.TRONG_LUONG,
      kichCoCanVot: variant.kichCoCanVot || variant.KICH_CO_CAN_VOT,
      giaBan: price,
      soLuong: quantity,
      thanhTien: price * quantity,
      name: tenSP,
      image: image,
      price: price,
      quantity: quantity
    };
  }

  function addToGuestCart(product, variant, quantity) {
    const items = getGuestCartItems();
    const variantId = variant.bienTheId || variant.BIEN_THE_ID;
    const existing = items.find(item => String(item.bienTheId || item.BIEN_THE_ID) === String(variantId));

    if (existing) {
      existing.soLuong = Number(existing.soLuong || existing.quantity || 0) + quantity;
      existing.quantity = existing.soLuong;
      existing.thanhTien = Number(existing.giaBan || existing.GIA_BAN || existing.price || 0) * existing.soLuong;
    } else {
      items.push(buildGuestCartItem(product, variant, quantity));
    }
    saveGuestCartItems(items);
  }

  async function addToUserCart(variant, quantity) {
    const userId = getCurrentUserId();
    if (!userId) return false;
    const variantId = variant.bienTheId || variant.BIEN_THE_ID;

    const response = await fetch(`${API_BASE}/api/gio-hang/them`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userId, bienTheId: variantId, soLuong: quantity })
    });
    const result = await response.json();
    if (!response.ok || result.ok === false) {
      alert(result.message || 'Không thêm được vào giỏ hàng');
      return false;
    }
    return true;
  }

  async function addSelectedVariantToCart(product) {
    const variant = findVariant(product);
    const quantity = Number(document.getElementById('db-quantity').value || 1);

    if (!variant || !(variant.bienTheId || variant.BIEN_THE_ID)) {
      alert('Sản phẩm này chưa có biến thể trong database nên chưa thể thêm vào giỏ hàng.');
      return false;
    }

    const tonKho = Number(variant.soLuongTon || variant.SO_LUONG_TON || 0);
    if (quantity > tonKho) {
      alert(`Số lượng vượt quá tồn kho. Hiện còn ${tonKho} sản phẩm.`);
      document.getElementById('db-quantity').value = Math.max(1, tonKho);
      return false;
    }

    if (isLoggedIn()) {
      const added = await addToUserCart(variant, quantity);
      if (!added) return false;
    } else {
      addToGuestCart(product, variant, quantity);
    }

    showSuccess();
    if (!isLoggedIn()) {
      setCartCount(getGuestCartTotalQuantity());
    } else {
      const currentCount = Number(document.getElementById('cart-count')?.textContent || 0);
      setCartCount(currentCount + quantity);
    }
    updateCartCount();
    return true;
  }

  function bindEvents(product) {
    document.querySelectorAll('.db-thumb').forEach(button => {
      button.addEventListener('click', function () {
        const main = document.getElementById('db-main-product-image');
        if (main) main.src = button.dataset.image;
        document.querySelectorAll('.db-thumb').forEach(item => item.classList.remove('active'));
        button.classList.add('active');
      });
    });

    const zoomContainer = document.getElementById('db-zoom-container');
    const zoomImg = document.getElementById('db-main-product-image');
    if (zoomContainer && zoomImg) {
      const ZOOM = 2.2;
      zoomContainer.addEventListener('mousemove', function (e) {
        const rect = zoomContainer.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        zoomImg.style.transformOrigin = `${x}% ${y}%`;
        zoomImg.style.transform = `scale(${ZOOM})`;
      });
      zoomContainer.addEventListener('mouseleave', function () {
        zoomImg.style.transform = 'scale(1)';
      });
    }

    document.querySelectorAll('.db-option').forEach(function (option) {
  option.addEventListener('click', function () {
    const targetId = option.dataset.target;
    const value = option.dataset.value;
    const select = document.getElementById(targetId);

    if (!select) return;

    select.value = value;

    document
      .querySelectorAll('.db-option[data-target="' + targetId + '"]')
      .forEach(function (item) {
        item.classList.remove('selected');
        item.setAttribute('aria-checked', 'false');
      });

    option.classList.add('selected');
    option.setAttribute('aria-checked', 'true');

    refreshVariantInfo(product);
  });
});
    ['db-mau-sac', 'db-kich-thuoc', 'db-kich-co-can-vot'].forEach(id => {
      const select = document.getElementById(id);
      if (select) select.addEventListener('change', () => refreshVariantInfo(product));
    });

    const qtyInput = document.getElementById('db-quantity');
    const qtyMinus = document.getElementById('db-qty-minus');
    const qtyPlus  = document.getElementById('db-qty-plus');

    function getStock() {
      const variant = findVariant(product);
      return variant ? Number(variant.soLuongTon || variant.SO_LUONG_TON || 99) : 99;
    }

    function clampQty(val) {
      const stock = getStock();
      return Math.min(stock, Math.max(1, Number(val) || 1));
    }

    if (qtyMinus && qtyInput) {
      qtyMinus.addEventListener('click', function () {
        qtyInput.value = clampQty(Number(qtyInput.value || 1) - 1);
      });
    }
    if (qtyPlus && qtyInput) {
      qtyPlus.addEventListener('click', function () {
        qtyInput.value = clampQty(Number(qtyInput.value || 1) + 1);
      });
    }
    if (qtyInput) {
      qtyInput.addEventListener('change', function () {
        qtyInput.value = clampQty(qtyInput.value);
      });
      qtyInput.addEventListener('blur', function () {
        qtyInput.value = clampQty(qtyInput.value);
      });
    }

    const form = document.getElementById('db-product-form');
    if (form) {
      form.addEventListener('submit', async event => {
        event.preventDefault();
        await addSelectedVariantToCart(product);
      });
    }

    const buyNow = document.getElementById('db-buy-now');

    if (buyNow) {
      buyNow.addEventListener('click', async () => {
        const added = await addSelectedVariantToCart(product);

        if (added) {
          const variant = findVariant(product);
          const quantity = Number(document.getElementById('db-quantity')?.value || 1);
          const price = Number(variant?.giaBan || variant?.GIA_BAN || 0);
          const variantId = String(variant?.bienTheId || variant?.BIEN_THE_ID || '');

          if (isLoggedIn()) {
            try {
              const userId = getCurrentUserId();
              const res = await fetch(`${API_BASE}/api/gio-hang?userId=${userId}`);
              const result = await res.json();
              const allItems = result?.data?.items || [];
              const matchedItem = allItems.find(i =>
                String(i.bienTheId || i.BIEN_THE_ID) === variantId
              );
              if (matchedItem) {
                const singleItem = { ...matchedItem, soLuong: quantity, thanhTien: price * quantity };
                localStorage.setItem('selectedCartItems', JSON.stringify({
                  items: [singleItem],
                  tongTien: price * quantity,
                  tongSoLuong: quantity
                }));
              }
            } catch (e) { }
          } else {
            const guestItem = {
              chiTietId: 'guest-' + variantId,
              bienTheId: variantId,
              sanPhamId: String(product.sanPhamId || product.SAN_PHAM_ID || product.id || ''),
              tenSanPham: product.tenSanPham || product.TEN_SAN_PHAM || product.name || 'San pham',
              hinhAnh: getProductMainImage(product, variant),
              sku: variant?.sku || variant?.SKU || '',
              mauSac: variant?.mauSac || variant?.MAU_SAC || '',
              kichCoCanVot: variant?.kichCoCanVot || variant?.KICH_CO_CAN_VOT || '',
              giaBan: price,
              soLuong: quantity,
              thanhTien: price * quantity
            };
            localStorage.setItem('selectedCartItems', JSON.stringify({
              items: [guestItem],
              tongTien: price * quantity,
              tongSoLuong: quantity
            }));
          }

          window.location.href = getCheckoutUrl();
        }
      });
    }

    const close = document.getElementById('success-close');
    const cont = document.getElementById('success-continue');
    const viewCart = document.getElementById('success-view-cart');
    const overlay = document.getElementById('success-overlay');

    function hide() {
      if (!overlay) return;
      overlay.setAttribute('aria-hidden', 'true');
      overlay.classList.remove('is-active', 'is-show');
      overlay.style.display = 'none';
      overlay.style.pointerEvents = 'none';
    }

    if (close) close.addEventListener('click', hide);
    if (cont) cont.addEventListener('click', hide);
    if (viewCart) viewCart.addEventListener('click', () => window.location.href = getCartUrl());
  }

  async function loadProduct() {
    const id = getProductId();
    const box = document.querySelector('.dt-product-details');

    if (!id) {
      if (box) box.innerHTML = '<p class="db-error">Thiếu id sản phẩm. Hãy mở sản phẩm từ trang bosuutap.html.</p>';
      return;
    }

    try {
      if (box) box.innerHTML = '<p class="db-loading">Đang tải sản phẩm từ database...</p>';
      const response = await fetch(`${API_BASE}/api/san-pham/${encodeURIComponent(id)}`);
      const result = await response.json();

      if (!response.ok || !result.ok) throw new Error(result.message || 'Không lấy được sản phẩm');

      render(result.data);
      updateCartCount();

    } catch (error) {
      console.error(error);
      if (box) box.innerHTML = `<p class="db-error">${text(error.message)}</p>`;
    }
  }

  document.addEventListener('DOMContentLoaded', loadProduct);
})();