(function () {
  'use strict';

  (function injectStyle() {
    if (document.getElementById('db-pagination-style')) return;
    const style = document.createElement('style');
    style.id = 'db-pagination-style';
    style.textContent = `
      #pagination {
        display: flex;
        justify-content: center;
        margin: 40px 0 20px;
      }
      #pagination ul.page-numbers {
        display: flex;
        align-items: center;
        gap: 16px;
        list-style: none;
        margin: 0;
        padding: 0;
      }
      #pagination ul.page-numbers li {
        display: flex;
      }
      #pagination .page-numbers {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 50px;
        height: 52px;
        background: #fff;
        color: #252323;
        font-size: 16px;
        font-weight: 700;
        font-family: inherit;
        text-decoration: none;
        cursor: pointer;
        transition: background 0.15s, color 0.15s;
        box-sizing: border-box;
      }
      #pagination .page-numbers:hover {
        background: #252323;
        color: #fff;
      }
      #pagination .page-numbers.current {
        background: #252323;
        color: #fff;
        border-color: #252323;
        cursor: default;
      }
      #pagination .page-numbers.prev,
      #pagination .page-numbers.next {
        border: none;
        background: transparent;
        width: 40px;
        font-size: 20px;
      }
      #pagination .page-numbers.prev:hover,
      #pagination .page-numbers.next:hover {
        background: transparent;
        color: #252323;
      }
      #pagination .page-numbers.dots {
        border: none;
        background: transparent;
        cursor: default;
        width: 32px;
      }
      #pagination .page-numbers.dots:hover {
        background: transparent;
      }
    `;
    document.head.appendChild(style);
  })();

  const API_BASE = window.API_BASE_URL || 'http://localhost:3000';
  const ITEMS_PER_PAGE = 15;

  let allProducts = [];
  let currentPage = 1;

  function getEl() {
    return {
      productList: document.getElementById('product-list'),
      resultCount:  document.querySelector('.woocommerce-result-count'),
      orderSelect:  document.querySelector('.orderby'),
      searchInput:  document.querySelector('.header-search input'),
      pagination:   document.getElementById('pagination')
    };
  }

  function formatPrice(value) {
    return Number(value || 0).toLocaleString('vi-VN') + '₫';
  }

  function safeText(value) {
    return value === null || value === undefined ? '' : String(value);
  }

  function getValue(product, keys, fallback) {
    for (const key of keys) {
      if (product[key] !== undefined && product[key] !== null && product[key] !== '') {
        return product[key];
      }
    }
    return fallback !== undefined ? fallback : '';
  }

  function normalizeProduct(product) {
    return {
      id:       getValue(product, ['sanPhamId', 'SAN_PHAM_ID', 'id', 'ID']),
      name:     getValue(product, ['tenSanPham', 'TEN_SAN_PHAM', 'name', 'TEN']),
      image:    getValue(product, ['hinhAnh', 'HINH_ANH', 'image', 'URL', 'url']),
      price:    getValue(product, ['giaBan', 'GIA_BAN', 'price', 'GIA']),
      oldPrice: getValue(product, ['giaGoc', 'GIA_GOC', 'oldPrice', 'GIA_CU'], 0),
      stock:    getValue(product, ['soLuongTon', 'SO_LUONG_TON', 'stock'], 0),
      brand:    getValue(product, ['thuongHieu', 'THUONG_HIEU'], ''),
      color:    getValue(product, ['mauSac', 'MAU_SAC'], ''),
      grip:     getValue(product, ['kichCoCanVot', 'KICH_CO_CAN_VOT'], '')
    };
  }

  function imageHtml(src, alt) {
    if (!src) return '<div class="db-no-image">Chưa có ảnh</div>';
    return `<img width="350" height="350"
      src="${safeText(src)}"
      class="attachment-dt-thumbnail-small size-dt-thumbnail-small wvs-archive-product-image"
      alt="${safeText(alt)}" loading="lazy"/>`;
  }

  function starHtml() {
    const star = 'https://babolat.com.vn/wp-content/themes/b6/assets/images/star.svg';
    const img  = '<img width="16" height="16" src="' + star + '" alt="Star">';
    const imgs = img + img + img + img + img;
    return '<div class="star-rating"><div class="star-rating__list">' + imgs + '</div></div>';
  }

  function productCard(rawProduct) {
    const p      = normalizeProduct(rawProduct);
    const price  = Number(p.price || 0);
    const old    = Number(p.oldPrice || 0);
    const isSale = old > price && price > 0;

    return `
      <li class="wvs-archive-product-wrapper product type-product
          ${Number(p.stock) > 0 ? 'instock' : 'outofstock'}
          has-post-thumbnail purchasable product-type-variable">
        <a href="sanpham.html?id=${encodeURIComponent(safeText(p.id))}"
           class="woocommerce-LoopProduct-link woocommerce-loop-product__link">
          ${isSale ? '<span class="onsale">Giảm giá!</span>' : ''}
          <div class="wsha-images">
            <div class="im-def">${imageHtml(p.image, p.name)}</div>
          </div>
          <h3 class="woocommerce-loop-product__title" title="${safeText(p.name)}">${safeText(p.name)}</h3>
        </a>
        ${starHtml()}
        <span class="price">
          ${isSale
            ? `<del><bdi>${formatPrice(old)}</bdi></del> <ins><bdi>${formatPrice(price)}</bdi></ins>`
            : `<span class="woocommerce-Price-amount amount"><bdi>${formatPrice(price)}</bdi></span>`
          }
        </span>
      </li>`;
  }

  function sortProducts(products) {
    const { orderSelect } = getEl();
    const type = orderSelect ? orderSelect.value : 'date';
    const list = [...products];

    if (type === 'price') {
      list.sort((a, b) => Number(normalizeProduct(a).price || 0) - Number(normalizeProduct(b).price || 0));
    } else if (type === 'price-desc') {
      list.sort((a, b) => Number(normalizeProduct(b).price || 0) - Number(normalizeProduct(a).price || 0));
    } else {
      list.sort((a, b) => Number(normalizeProduct(b).id || 0) - Number(normalizeProduct(a).id || 0));
    }

    return list;
  }

  function renderPagination(totalItems) {
    const { pagination } = getEl();
    if (!pagination) return;

    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    if (totalPages <= 1) {
      pagination.innerHTML = '';
      return;
    }

    const delta = 2;
    const left  = Math.max(1, currentPage - delta);
    const right = Math.min(totalPages, currentPage + delta);

    let html = '<ul class="page-numbers">';

    if (currentPage > 1) {
      html += `<li><a href="#" class="prev page-numbers" data-page="${currentPage - 1}">&#8249;</a></li>`;
    }

    if (left > 1) {
      html += `<li><a href="#" class="page-numbers" data-page="1">1</a></li>`;
      if (left > 2) html += `<li><span class="page-numbers dots">…</span></li>`;
    }

    for (let i = left; i <= right; i++) {
      if (i === currentPage) {
        html += `<li><span class="page-numbers current">${i}</span></li>`;
      } else {
        html += `<li><a href="#" class="page-numbers" data-page="${i}">${i}</a></li>`;
      }
    }

    if (right < totalPages) {
      if (right < totalPages - 1) html += `<li><span class="page-numbers dots">…</span></li>`;
      html += `<li><a href="#" class="page-numbers" data-page="${totalPages}">${totalPages}</a></li>`;
    }

    if (currentPage < totalPages) {
      html += `<li><a href="#" class="next page-numbers" data-page="${currentPage + 1}">&#8250;</a></li>`;
    }

    html += '</ul>';
    pagination.innerHTML = html;

    pagination.querySelectorAll('[data-page]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        currentPage = Number(btn.dataset.page) || 1;
        render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }

  function render() {
    const { productList, resultCount } = getEl();
    if (!productList) return;

    const sorted  = sortProducts(allProducts);
    const total   = sorted.length;
    const start   = (currentPage - 1) * ITEMS_PER_PAGE;
    const end     = start + ITEMS_PER_PAGE;
    const page    = sorted.slice(start, end);

    productList.innerHTML = page.length
      ? page.map(productCard).join('')
      : '<li class="db-empty">Không có sản phẩm nào để hiển thị.</li>';

    if (resultCount) {
      const from = total === 0 ? 0 : start + 1;
      const to   = Math.min(end, total);
      resultCount.textContent = `Hiển thị ${from}–${to} của ${total} sản phẩm`;
    }

    renderPagination(total);
  }

  async function loadProducts(keyword) {
    const { productList, resultCount } = getEl();

    try {
      if (productList) {
        productList.innerHTML = '<li class="db-loading">Đang tải sản phẩm từ database...</li>';
      }

      const params    = new URLSearchParams(window.location.search);
      const danhMucId = params.get('danhMucId') || params.get('categoryId');
      const query     = new URLSearchParams();

      if (danhMucId) query.set('danhMucId', danhMucId);
      if (keyword)   query.set('keyword', keyword);

      const url = `${API_BASE}/api/san-pham${query.toString() ? '?' + query.toString() : ''}`;

      const response = await fetch(url);
      const result   = await response.json();

      if (!response.ok || result.ok === false) {
        throw new Error(result.message || result.error || 'Không lấy được sản phẩm');
      }

      allProducts = Array.isArray(result) ? result : (result.data || []);
      window.__DB_PRODUCTS__ = allProducts;

      currentPage = 1;
      render();

    } catch (error) {
      if (productList) {
        productList.innerHTML = `<li class="db-error">${safeText(error.message)}</li>`;
      }
      if (resultCount) {
        resultCount.textContent = 'Không lấy được danh sách sản phẩm';
      }
    }
  }

  function init() {
    const { orderSelect, searchInput } = getEl();

    if (orderSelect) {
      orderSelect.addEventListener('change', function () {
        currentPage = 1;
        render();
      });
    }

    if (searchInput) {
      searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          loadProducts(searchInput.value.trim());
        }
      });
    }

    loadProducts();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
