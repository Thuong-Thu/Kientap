(function () {
  'use strict';

  const API_BASE = window.API_BASE_URL || 'http://localhost:3000';
  const ADDRESS_JSON_PATH = '../../public/vietnam-address-old.json';

  let checkoutCartData = null;
  let selectedAddress = null;
  let editingAddressId = null;
  let modalAddressSelectsInitialized = false;

  let currentShippingFee = 40000;
  let currentPolicyId = null;
  function calculateDepositByPolicy(subtotal) {
    const amount = Number(subtotal || 0);

    if (amount <= 1000000) {
        return 0;
    }

    if (amount <= 3000000) {
        return 300000;
    }

    if (amount <= 6000000) {
        return 500000;
    }

    return Math.round(amount * 0.5);
}

  document.addEventListener('DOMContentLoaded', function () {
    initLoggedInCheckoutPage();
  });

  function getCurrentUser() { try { return JSON.parse(localStorage.getItem('currentUser')); } catch (e) { return null; } }
  
  function getCurrentUserId() { const user = getCurrentUser(); return user?.id ? Number(user.id) : null; }
  
  function requireLogin() {
    const userId = getCurrentUserId();
    if (!userId) { alert('Vui lòng đăng nhập để thanh toán.'); window.location.href = 'dangnhap.html'; return null; }
    return userId;
  }

  async function initLoggedInCheckoutPage() {
    const userId = requireLogin();
    if (!userId) return;

    fillUserInfoFromLogin();
    initPhoneValidation();
    bindAddressDropdownButton();
    bindAddressModalEvents();
    initPlaceOrderButton();

    document.querySelectorAll('input[name="shipping"]').forEach(radio => {
      radio.addEventListener('change', calculateShippingFee);
    });

    await loadCartFromDatabase();
    await initAddressArea();
    await initModalAddressSelects();
    initAddressSelectTextColor();
  }
  function showFieldError(input, message) {
  if (!input) return;

  removeFieldError(input);

  input.classList.add('input-error');

  const error = document.createElement('p');
  error.className = 'field-error-message';
  error.textContent = message;

  input.insertAdjacentElement('afterend', error);
}

function removeFieldError(input) {
  if (!input) return;

  input.classList.remove('input-error');

  const next = input.nextElementSibling;
  if (next && next.classList.contains('field-error-message')) {
    next.remove();
  }
}

function isValidVietnamPhone(phone) {
  return /^0\d{9}$/.test(phone);
}

function initPhoneValidation() {
  const phoneInput = document.getElementById('billing-phone');

  if (!phoneInput) return;

  phoneInput.setAttribute('maxlength', '10');
  phoneInput.setAttribute('inputmode', 'numeric');

  phoneInput.addEventListener('input', function () {
    phoneInput.value = phoneInput.value.replace(/\D/g, '').slice(0, 10);

    if (phoneInput.value.trim() === '') {
      removeFieldError(phoneInput);
      return;
    }

    if (isValidVietnamPhone(phoneInput.value.trim())) {
      removeFieldError(phoneInput);
    }
  });

  phoneInput.addEventListener('blur', function () {
    const phone = phoneInput.value.trim();

    if (phone && !isValidVietnamPhone(phone)) {
      showFieldError(
        phoneInput,
        'Số điện thoại bạn nhập chưa đúng vui lòng nhập lại.'
      );
    }
  });
}
  function fillUserInfoFromLogin() {
    const user = getCurrentUser();
    const nameInput = document.getElementById('billing-name');
    const phoneInput = document.getElementById('billing-phone');
    if (nameInput) {
      nameInput.value = user?.fullname || user?.hoTen || '';
      nameInput.setAttribute('readonly', true);
      nameInput.style.cursor = 'default';
      nameInput.style.backgroundColor = '#f5f5f5';
    }
    if (phoneInput) {
      phoneInput.value = user?.phone || user?.sdt || '';
      phoneInput.setAttribute('readonly', true);
      phoneInput.style.cursor = 'default';
      phoneInput.style.backgroundColor = '#f5f5f5';
    }
  }

  async function calculateShippingFee() {
    const totalsContainer = document.querySelector('.order-totals');
    const btnPlaceOrder = document.querySelector('.place-order');
    const sub = Number(checkoutCartData?.tongTien || 0);

    if (!selectedAddress || !checkoutCartData) {
        if (totalsContainer) {
            totalsContainer.innerHTML = `
              <div class="total-row"><span>Tạm tính</span><span>${sub.toLocaleString('vi-VN')}₫</span></div>
              <div class="total-row"><span>Phí vận chuyển</span><span style="color:#888; font-size:13px; font-weight:bold;">Vui lòng chọn địa chỉ</span></div>
              <div class="total-row total"><span>Tổng</span><span>${sub.toLocaleString('vi-VN')}₫</span></div>`;
        }
        if (btnPlaceOrder) btnPlaceOrder.disabled = true;
        return;
    }
    
    const shippingRadio = document.querySelector('input[name="shipping"]:checked');
    const hinhThuc = shippingRadio ? shippingRadio.value : 'standard';

    try {
        const response = await fetch(`${API_BASE}/api/phi-van-chuyen`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tinhTp: selectedAddress.tinhTp,
                quanHuyen: selectedAddress.quanHuyen,
                hinhThucGiao: hinhThuc,
                tamTinh: sub
            })
        });
        const result = await response.json();

        if(result.ok && result.data) {
            currentShippingFee = Number(result.data.PHI_GIAO_HANG);
            currentPolicyId = result.data.CHINH_SACH_ID;
            const tongCong = sub + currentShippingFee;
            if (totalsContainer) {
                totalsContainer.innerHTML = `
                  <div class="total-row"><span>Tạm tính</span><span>${sub.toLocaleString('vi-VN')}₫</span></div>
                  <div class="total-row"><span>Phí vận chuyển</span><span>${currentShippingFee === 0 ? 'Miễn phí' : currentShippingFee.toLocaleString('vi-VN') + '₫'}</span></div>
                  <div class="total-row total"><span>Tổng</span><span>${tongCong.toLocaleString('vi-VN')}₫</span></div>`;
            }
            if (btnPlaceOrder) btnPlaceOrder.disabled = false;
        } else if (result.notSupported) {
            currentPolicyId = null;
            if (totalsContainer) {
                totalsContainer.innerHTML = `
                  <div class="total-row"><span>Tạm tính</span><span>${sub.toLocaleString('vi-VN')}₫</span></div>
                  <div class="total-row"><span>Phí vận chuyển</span><span style="color:red; font-size:13px; font-weight:bold;">Không hỗ trợ</span></div>
                  <div class="total-row total"><span>Tổng</span><span>${sub.toLocaleString('vi-VN')}₫</span></div>`;
            }
            if (btnPlaceOrder) btnPlaceOrder.disabled = true;
        }
    } catch (e) { console.error("Lỗi tính phí ship:", e); }
  }

  async function loadCartFromDatabase() {
    document.querySelector('.review-title')?.remove();
    let selectedData = null;
    try { selectedData = JSON.parse(localStorage.getItem('selectedCartItems')); } catch (e) {}

    const response = await fetch(`${API_BASE}/api/gio-hang?userId=${getCurrentUserId()}`);
    const result = await response.json();
    const fullData = result.data || { items: [], tongTien: 0 };

    if (selectedData && selectedData.items && selectedData.items.length) {
      const selectedIds = selectedData.items.map(i => String(i.chiTietId || i.bienTheId || i.BIEN_THE_ID));
      const filteredItems = (fullData.items || []).filter(i => selectedIds.includes(String(i.chiTietId)) || selectedIds.includes(String(i.bienTheId || i.BIEN_THE_ID)));
      checkoutCartData = { ...fullData, items: filteredItems, tongTien: filteredItems.reduce((s, i) => s + Number(i.thanhTien || 0), 0) };
    } else { checkoutCartData = fullData; }
    
    const container = document.querySelector('.checkout-right');
    const policy = document.querySelector('.payment-policy');
    document.querySelectorAll('.cart-card').forEach(c => c.remove());
    
    checkoutCartData.items.forEach(item => {
      const card = document.createElement('article');
      card.className = 'cart-card';
      const tenSP = item.tenSanPham || item.TEN_SAN_PHAM || item.name || 'Sản phẩm';
      const hinhAnh = item.hinhAnh || item.HINH_ANH || item.image || 'https://via.placeholder.com/60';
      const mauSac = item.mauSac || item.MAU_SAC || '';
      const kichCoCanVot = item.kichCoCanVot || item.KICH_CO_CAN_VOT || '';
      const kichThuoc = item.kichThuoc || item.KICH_THUOC || '';
      const variantInfo = [
        mauSac ? `Màu: ${mauSac}` : '',
        kichCoCanVot ? `Cán vợt: ${kichCoCanVot}` : '',
        kichThuoc ? `Kích thước: ${kichThuoc}` : ''
      ].filter(Boolean).join(' | ');
      card.innerHTML = `
        <div class="cart-product">
          <img src="${hinhAnh}" style="width:60px;object-fit:contain;flex-shrink:0">
          <div style="flex:1">
            <h3 style="margin:0 0 4px;font-size:14px">${tenSP}</h3>
            ${variantInfo ? `<small style="color:#777;font-size:12px;display:block;margin-bottom:2px">${variantInfo}</small>` : ''}
            <small style="color:#555">SL: ${item.soLuong}</small>
          </div>
          <div style="text-align:right;flex-shrink:0">
            <strong>${Number(item.thanhTien).toLocaleString('vi-VN')}₫</strong>
          </div>
        </div>`;
      container.insertBefore(card, policy);
    });

    const sub = Number(checkoutCartData.tongTien || 0);
    const totalsContainer = document.querySelector('.order-totals');
    if (totalsContainer) {
        totalsContainer.innerHTML = `
            <div class="total-row"><span>Tạm tính</span><span>${sub.toLocaleString('vi-VN')}₫</span></div>
            <div class="total-row"><span>Phí vận chuyển</span><span style="color:#888; font-size:13px; font-weight:bold;">Đang tính...</span></div>
            <div class="total-row total"><span>Tổng</span><span>${sub.toLocaleString('vi-VN')}₫</span></div>`;
    }

    calculateShippingFee();
  }

  function initPlaceOrderButton() {
    const btn = document.querySelector('.place-order');
    if (!btn) return;

    btn.onclick = async (e) => {
  e.preventDefault();

  const phoneInput = document.getElementById('billing-phone');
  const phone = phoneInput ? phoneInput.value.trim() : '';

  removeFieldError(phoneInput);

  if (!isValidVietnamPhone(phone)) {
    showFieldError(
      phoneInput,
      'Số điện thoại bạn nhập chưa đúng vui lòng nhập lại.'
    );

    if (phoneInput) phoneInput.focus();

    return;
  }

  if (!selectedAddress) return alert('Vui lòng chọn địa chỉ giao hàng');
  if (!checkoutCartData || !checkoutCartData.items.length) return alert('Giỏ hàng trống');
  if (!currentPolicyId) return alert('Địa chỉ của bạn không hỗ trợ hình thức vận chuyển đang chọn. Vui lòng đổi phương thức khác!');

  btn.disabled = true;
  btn.textContent = 'Đang xử lý...';

      const paymentRadio = document.querySelector('input[name="payment"]:checked')?.value;
      const phuongThucSQL = (paymentRadio === 'cod') ? 'TIEN_MAT' : 'CHUYEN_KHOAN';
      const maDonHang = 'MDH' + Math.floor(100000 + Math.random() * 900000);
      const subtotal = Number(checkoutCartData.tongTien || 0);
      const totalWithShipping = subtotal + currentShippingFee;

      const depositAmount = phuongThucSQL === 'TIEN_MAT'
        ? calculateDepositByPolicy(subtotal)
        : 0;

      const orderData = {
        maDonHang: maDonHang,
        userId: Number(getCurrentUserId()),
        diaChiId: Number(selectedAddress.diaChiId),
        chinhSachId: currentPolicyId,
        tamTinh: subtotal,
        phiVanChuyen: currentShippingFee,
        tongTien: totalWithShipping,
        tienCoc: depositAmount,
        phuongThucTT: phuongThucSQL,
        ghiChu: document.getElementById('order-note')?.value || '',
        items: checkoutCartData.items.map(item => ({
          bienTheId: String(item.bienTheId || item.BIEN_THE_ID),
          tenSanPham: item.tenSanPham || item.TEN_SAN_PHAM || item.name,
          soLuong: Number(item.soLuong),
          giaBan: Number(item.giaBan || item.GIA_BAN),
          thanhTien: Number(item.thanhTien),
          hinhAnh: item.hinhAnh || item.HINH_ANH || item.image,
          mauSac: item.mauSac || item.MAU_SAC,
          kichCoCanVot: item.kichCoCanVot || item.KICH_CO_CAN_VOT
        }))
      };

      try {
        const response = await fetch(`${API_BASE}/api/don-hang`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(orderData)
        });
        const result = await response.json();

        if (result.ok) {
          const orderDisplay = {
            ...orderData,
            donHangId: result.donHangId,
            tienCoc: depositAmount,
            ngayTao: new Date().toLocaleDateString('vi-VN'),
            hoTen: selectedAddress.hoTen,
            sdt: phone,
            diaChi: `${selectedAddress.diaChiChiTiet}, ${selectedAddress.phuongXa}, ${selectedAddress.quanHuyen}, ${selectedAddress.tinhTp}`
          };
          localStorage.setItem('pendingOrder', JSON.stringify(orderDisplay));

          if (phuongThucSQL === 'CHUYEN_KHOAN') {
            window.location.href = 'bank.html';
          } else {
            if (depositAmount > 0) {
              alert(`Đơn hàng của quý khách cần thanh toán tiền cọc: ${depositAmount.toLocaleString('vi-VN')}₫`);
              window.location.href = 'bank.html';
            } else {
              window.location.href = 'paythanhcong.html';
            }
          }
        } else {
          alert('Lỗi lưu đơn hàng: ' + result.error); btn.disabled = false; btn.textContent = 'Đặt hàng';
        }
      } catch (error) { alert('Lỗi kết nối máy chủ!'); btn.disabled = false; btn.textContent = 'Đặt hàng'; }
    };
  }

  async function fetchUserAddresses() {
    try { const res = await fetch(`${API_BASE}/api/dia-chi?userId=${getCurrentUserId()}`); const json = await res.json(); return json.data || []; } 
    catch (e) { return []; }
  }

  async function initAddressArea() {
    const addresses = await fetchUserAddresses();
    const def = addresses.find(a => a.laMacDinh) || addresses[0];
    if (def) setSelectedAddressFromDB(def);
    renderAddressDropdown(addresses);
  }

  function setSelectedAddressFromDB(address) {
    selectedAddress = address;
    const valueEl = document.querySelector('[data-address-value]');
    if (valueEl) {
      valueEl.textContent = `${address.hoTen} - ${address.soDienThoai} (${address.diaChiChiTiet}, ${address.tinhTp})`;
      valueEl.classList.remove('checkout-address-placeholder');
    }
    const nameInput = document.getElementById('billing-name');
    const phoneInput = document.getElementById('billing-phone');
    if (nameInput) nameInput.value = address.hoTen;
    if (phoneInput) phoneInput.value = address.soDienThoai;
    calculateShippingFee();
  }

  function renderAddressDropdown(addresses) {
    const dropdown = document.querySelector('[data-address-dropdown]');
    if (!dropdown) return;
    dropdown.innerHTML = `
      <div class="address-list-panel">
        <div class="address-list-title">Chọn địa chỉ giao hàng</div>
        ${addresses.map(addr => `
            <div class="address-row js-select-address" data-id="${addr.diaChiId}">
              <div class="address-row-main" style="flex:1">
                <strong>${addr.hoTen} - ${addr.soDienThoai}</strong>
                <small>${addr.diaChiChiTiet}, ${addr.phuongXa}, ${addr.quanHuyen}, ${addr.tinhTp}</small>
                ${addr.laMacDinh ? '<span style="color:#2f5acf; font-size:11px">(Mặc định)</span>' : ''}
              </div>
              <div style="display:flex; gap:15px; margin-left: 10px;">
                <button type="button" class="js-edit-address" data-id="${addr.diaChiId}" style="color:green; border:none; background:none; cursor:pointer;">Sửa</button>
                <button type="button" class="js-delete-address" data-id="${addr.diaChiId}" style="color:red; border:none; background:none; cursor:pointer;">Xóa</button>
              </div>
            </div>`).join('')}
        <button type="button" class="address-row address-add-row js-open-address-modal"><span>+ Thêm địa chỉ mới</span></button>
      </div>`;

    dropdown.querySelectorAll('.js-select-address').forEach(el => el.onclick = (e) => { e.stopPropagation(); const addr = addresses.find(a => a.diaChiId == el.dataset.id); if (addr) { setSelectedAddressFromDB(addr); closeAddressDropdown(); } });
    dropdown.querySelectorAll('.js-edit-address').forEach(el => el.onclick = (e) => { e.stopPropagation(); const addr = addresses.find(a => a.diaChiId == el.dataset.id); openEditModal(addr); });
    dropdown.querySelectorAll('.js-delete-address').forEach(el => el.onclick = async (e) => { e.stopPropagation(); if (confirm('Xóa địa chỉ này?')) { await fetch(`${API_BASE}/api/dia-chi/${el.dataset.id}`, { method: 'DELETE' }); await initAddressArea(); } });
    dropdown.querySelector('.js-open-address-modal').onclick = (e) => { e.stopPropagation(); editingAddressId = null; openAddressModal(); };
  }

  function openAddressModal() {
    const modal = document.querySelector('[data-address-modal]');
    if (!modal) return;
    if (!editingAddressId) { document.querySelector('[data-modal-title]').textContent = 'Thêm địa chỉ mới'; document.querySelector('[data-address-form]').reset(); }
    // Xóa lỗi SĐT cũ mỗi lần mở modal
    const mp = document.getElementById('modal-phone');
    clearModalPhoneError(mp);
    // Xóa lỗi ngay khi người dùng gõ lại
    if (mp && !mp._phoneValidBound) {
      mp.addEventListener('input', function() {
        mp.value = mp.value.replace(/\D/g, '').slice(0, 10);
        clearModalPhoneError(mp);
      });
      mp._phoneValidBound = true;
    }
    modal.style.display = 'flex'; closeAddressDropdown();
  }

  function openEditModal(address) {
    editingAddressId = address.diaChiId;
    document.querySelector('[data-modal-title]').textContent = 'Cập nhật địa chỉ';
    document.getElementById('modal-name').value = address.hoTen;
    document.getElementById('modal-phone').value = address.soDienThoai;
    document.getElementById('modal-street').value = address.diaChiChiTiet;
    document.querySelector('input[name="isDefault"]').checked = address.laMacDinh;
    openAddressModal();
  }

  function showModalPhoneError(input, message) {
    if (!input) return;
    clearModalPhoneError(input);
    input.style.borderColor = '#d0021b';
    input.style.outline = 'none';
    const err = document.createElement('p');
    err.className = 'modal-phone-error';
    err.style.cssText = 'color:#d0021b;font-size:12px;margin:4px 0 0;';
    err.textContent = message;
    input.insertAdjacentElement('afterend', err);
    input.focus();
  }

  function clearModalPhoneError(input) {
    if (!input) return;
    input.style.borderColor = '';
    const next = input.nextElementSibling;
    if (next && next.classList.contains('modal-phone-error')) next.remove();
  }

  function closeAddressModal() { const modal = document.querySelector('[data-address-modal]'); if (modal) modal.style.display = 'none'; editingAddressId = null; }

  function bindAddressModalEvents() {
    document.querySelectorAll('[data-modal-close], .btn-secondary').forEach(btn => btn.onclick = (e) => { e.preventDefault(); closeAddressModal(); });
    const form = document.querySelector('[data-address-form]');
    if (form) form.onsubmit = async (e) => {
      e.preventDefault();

      // Validate số điện thoại trước khi lưu
      const modalPhoneInput = document.getElementById('modal-phone');
      const modalPhone = modalPhoneInput ? modalPhoneInput.value.trim() : '';
      if (!modalPhone) {
        showModalPhoneError(modalPhoneInput, 'Vui lòng nhập số điện thoại.');
        return;
      }
      if (!/^\d+$/.test(modalPhone)) {
        showModalPhoneError(modalPhoneInput, 'Số điện thoại chỉ được chứa chữ số.');
        return;
      }
      if (!isValidVietnamPhone(modalPhone)) {
        showModalPhoneError(modalPhoneInput, 'Số điện thoại không hợp lệ. Phải bắt đầu bằng 0 và đủ 10 chữ số (VD: 0912345678).');
        return;
      }
      clearModalPhoneError(modalPhoneInput);

      const citySel = document.getElementById('modal-city');
      const distSel = document.getElementById('modal-district');
      const wardSel = document.getElementById('modal-ward');
      const addressData = {
        userId: getCurrentUserId(),
        hoTen: document.getElementById('modal-name').value.trim(),
        soDienThoai: modalPhone,
        tinhTp: citySel.options[citySel.selectedIndex]?.text,
        quanHuyen: distSel.options[distSel.selectedIndex]?.text,
        phuongXa: wardSel.options[wardSel.selectedIndex]?.text,
        diaChiChiTiet: document.getElementById('modal-street').value.trim(),
        laMacDinh: document.querySelector('input[name="isDefault"]').checked
      };
      let url = `${API_BASE}/api/dia-chi`, method = 'POST';
      if (editingAddressId) { url = `${API_BASE}/api/dia-chi/${editingAddressId}`; method = 'PUT'; }
      await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(addressData) });
      closeAddressModal(); await initAddressArea();
    };
  }

  function bindAddressDropdownButton() {
  const triggerBtn = document.querySelector('[data-address-trigger]');
  const dropdown = document.querySelector('[data-address-dropdown]');

  if (!triggerBtn || !dropdown) return;

  triggerBtn.onclick = function (e) {
    e.preventDefault();
    e.stopPropagation();

    dropdown.classList.toggle('is-open');
  };

  dropdown.addEventListener('click', function (e) {
    e.stopPropagation();
  });

  document.addEventListener('click', closeAddressDropdown);
  }

  function closeAddressDropdown() {
    const dropdown = document.querySelector('[data-address-dropdown]');

    if (dropdown) {
      dropdown.classList.remove('is-open');
      dropdown.style.display = '';
    }
  }
    function updateSelectTextColor(select) {
    if (!select) return;

    const value = String(select.value || '').trim();

    if (value !== '') {
      select.classList.add('has-value');
    } else {
      select.classList.remove('has-value');
    }
  }

  function initAddressSelectTextColor() {
    const selects = [
      document.getElementById('modal-city'),
      document.getElementById('modal-district'),
      document.getElementById('modal-ward')
    ].filter(Boolean);

    selects.forEach(function (select) {
      updateSelectTextColor(select);

      select.addEventListener('change', function () {
        updateSelectTextColor(select);
      });
    });
  }
  async function initModalAddressSelects() {
    if (modalAddressSelectsInitialized) return;
    const citySel = document.getElementById('modal-city');
    const distSel = document.getElementById('modal-district');
    const wardSel = document.getElementById('modal-ward');
    try {
      const data = await (await fetch(ADDRESS_JSON_PATH)).json();
      data.forEach(p => citySel.add(new Option(p.name, p.code)));
      citySel.onchange = () => {
        distSel.innerHTML = '<option value="">Quận/Huyện</option>';
        wardSel.innerHTML = '<option value="">Phường/Xã</option>';
        distSel.disabled = true;
        wardSel.disabled = true;

        const p = data.find(x => x.code == citySel.value);

        if (p) {
          p.districts.forEach(d => distSel.add(new Option(d.name, d.code)));
          distSel.disabled = false;
        }

        updateSelectTextColor(citySel);
        updateSelectTextColor(distSel);
        updateSelectTextColor(wardSel);
      };
      distSel.onchange = () => {
        wardSel.innerHTML = '<option value="">Phường/Xã</option>';
        wardSel.disabled = true;

        const p = data.find(x => x.code == citySel.value);
        const d = p?.districts.find(x => x.code == distSel.value);

        if (d) {
          d.wards.forEach(w => wardSel.add(new Option(w.name, w.code)));
          wardSel.disabled = false;
        }

        updateSelectTextColor(distSel);
        updateSelectTextColor(wardSel);
      };

      wardSel.onchange = () => {
        updateSelectTextColor(wardSel);
      };
      modalAddressSelectsInitialized = true;
    } catch (e) {}
  }
  function showFieldError(input, message) {
  if (!input) return;
  removeFieldError(input);

  input.classList.add('input-error');

  const error = document.createElement('p');
  error.className = 'field-error-message';
  error.textContent = message;

  input.insertAdjacentElement('afterend', error);
}

function removeFieldError(input) {
  if (!input) return;
  input.classList.remove('input-error');

  const next = input.nextElementSibling;
  if (next && next.classList.contains('field-error-message')) {
    next.remove();
  }
}

function isValidVietnamPhone(phone) {
  return /^0\d{9}$/.test(phone);
}
function initPhoneValidation() {
  const phoneInput = document.getElementById('billing-phone');
  if (!phoneInput) return;

  phoneInput.setAttribute('maxlength', '10');
  phoneInput.setAttribute('inputmode', 'numeric');

  phoneInput.addEventListener('input', function () {
    phoneInput.value = phoneInput.value.replace(/\D/g, '').slice(0, 10);
    removeFieldError(phoneInput);
  });

  phoneInput.addEventListener('blur', function () {
    const phone = phoneInput.value.trim();
    if (phone && !isValidVietnamPhone(phone)) {
      showFieldError(phoneInput, 'Số điện thoại bạn nhập chưa đúng, vui lòng nhập lại.');
    }
  });
}

})();
