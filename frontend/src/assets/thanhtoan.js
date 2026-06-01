(function () {
    'use strict';
    const API_BASE = 'http://localhost:3000';
    const GUEST_CART_KEY = 'guestCartItems';

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
        initAddressSelects();
        initPhoneInput();
        initSelectTextColor();
        initGuestCheckout();
        loadGuestCartReview();

        document.querySelectorAll('input[name="shipping_method"]').forEach(radio => {
            radio.addEventListener('change', calculateGuestShippingFee);
        });
    });

    async function calculateGuestShippingFee() {
        if (!window.guestCartData) return;

        const citySel = document.getElementById('billing_city');
        const distSel = document.getElementById('billing_district');
        const hinhThucRadio = document.querySelector('input[name="shipping_method"]:checked');
        const btnPlaceOrder = document.getElementById('place_order');
        
        const tinhTp = citySel.options[citySel.selectedIndex]?.text || '';
        const quanHuyen = distSel.options[distSel.selectedIndex]?.text || '';
        const hinhThuc = hinhThucRadio ? hinhThucRadio.value : 'Giao tiêu chuẩn';

        let shippingRow = document.querySelector('.shipping-fee-row');
        if(!shippingRow) {
            const tr = document.createElement('tr');
            tr.className = 'shipping-fee-row';
            document.querySelector('.cart-subtotal').after(tr);
            shippingRow = tr;
        }

        if(!tinhTp || !quanHuyen || tinhTp === 'Tỉnh/TP' || quanHuyen === 'Quận/Huyện') {
            currentPolicyId = null;
            shippingRow.innerHTML = `<th>Phí vận chuyển</th><td><span style="color:#888; font-size:13px; font-weight:bold;">Vui lòng chọn địa chỉ</span></td>`;
            if(btnPlaceOrder) btnPlaceOrder.disabled = true;
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/api/phi-van-chuyen`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tinhTp: tinhTp,
                    quanHuyen: quanHuyen,
                    hinhThucGiao: hinhThuc,
                    tamTinh: window.guestCartData.total
                })
            });
            const result = await response.json();
            const totalTd = document.querySelector('.order-total strong span');

            if(result.ok && result.data) {
                currentShippingFee = Number(result.data.PHI_GIAO_HANG);
                currentPolicyId = result.data.CHINH_SACH_ID;

                const totalAmount = window.guestCartData.total + currentShippingFee;
                
                shippingRow.innerHTML = `<th>Phí vận chuyển</th><td><span class="woocommerce-Price-amount amount"><bdi>${currentShippingFee === 0 ? 'Miễn phí' : currentShippingFee.toLocaleString('vi-VN') + '<span class="woocommerce-Price-currencySymbol">₫</span>'}</bdi></span></td>`;
                if(totalTd) totalTd.innerHTML = `<bdi>${totalAmount.toLocaleString('vi-VN')}<span class="woocommerce-Price-currencySymbol">₫</span></bdi>`;
                if(btnPlaceOrder) btnPlaceOrder.disabled = false;

            } else if (result.notSupported) {
                currentPolicyId = null;
                shippingRow.innerHTML = `<th>Phí vận chuyển</th><td><span style="color:red; font-size:13px; font-weight:bold;">Không áp dụng hình thức này</span></td>`;
                if(totalTd) totalTd.innerHTML = `<bdi>${window.guestCartData.total.toLocaleString('vi-VN')}<span class="woocommerce-Price-currencySymbol">₫</span></bdi>`;
                if(btnPlaceOrder) btnPlaceOrder.disabled = true;
            }
        } catch (error) { console.log("Lỗi tính phí ship:", error); }
    }
    
    function loadGuestCartReview() {
        const selected = JSON.parse(localStorage.getItem('selectedCartItems'));
        const items = selected ? selected.items : (JSON.parse(localStorage.getItem(GUEST_CART_KEY)) || []);
        const container = document.querySelector('.checkout-review');
        if (!container) return;
        
        let total = 0;
        let html = items.map(item => {
            const price = Number(item.giaBan || item.GIA_BAN || item.price || 0);
            const qty = Number(item.soLuong || item.quantity || 1);
            const name = item.tenSanPham || item.TEN_SAN_PHAM || item.name || 'Sản phẩm';
            const image = item.hinhAnh || item.HINH_ANH || item.image || 'https://via.placeholder.com/60';
            const color = item.mauSac || item.MAU_SAC || item.color || 'Mặc định';
            
            total += (price * qty);
            
            const kichCoCanVot = item.kichCoCanVot || item.KICH_CO_CAN_VOT || '';
            const kichThuoc = item.kichThuoc || item.KICH_THUOC || '';
            const variantInfo = [
                color && color !== 'Mặc định' ? `Màu: ${color}` : '',
                kichCoCanVot ? `Cán vợt: ${kichCoCanVot}` : '',
                kichThuoc ? `Kích thước: ${kichThuoc}` : ''
            ].filter(Boolean).join(' | ');

            return `
                <div class="woocommerce-cart-form__cart-item cart_item" style="display:flex; gap:10px; margin-bottom:15px; border-bottom:1px solid #eee; padding-bottom:10px">
                    <img src="${image}" style="width:60px; height:60px; object-fit:contain;flex-shrink:0">
                    <div style="flex:1">
                        <strong style="font-size:14px">${name}</strong>
                        ${variantInfo ? `<p style="font-size:12px; color:#777; margin:2px 0 0">${variantInfo}</p>` : ''}
                        <p style="font-size:12px; color:#555; margin:2px 0 0">SL: ${qty}</p>
                        <p style="margin:4px 0 0"><strong>${price.toLocaleString('vi-VN')}₫</strong></p>
                    </div>
                </div>`;
        }).join('');
        container.innerHTML = `<h3>Sản phẩm</h3>` + html;
        window.guestCartData = { items, total };
        
        const subtotalTd = document.querySelector('.cart-subtotal td span');
        const totalTd = document.querySelector('.order-total strong span');
        if(subtotalTd) subtotalTd.innerHTML = `<bdi>${total.toLocaleString('vi-VN')}<span class="woocommerce-Price-currencySymbol">₫</span></bdi>`;
        if(totalTd) totalTd.innerHTML = `<bdi>${total.toLocaleString('vi-VN')}<span class="woocommerce-Price-currencySymbol">₫</span></bdi>`;
        
        calculateGuestShippingFee();
    }

        function initPhoneInput() {
            const phoneInput = document.getElementById('billing_phone');

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
                showFieldError(
                    phoneInput,
                    'Số điện thoại bạn nhập chưa đúng vui lòng nhập lại.'
                );
                }
            });
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
    function initGuestCheckout() {
        const btn = document.getElementById('place_order');
        if (!btn) return;

        btn.onclick = async (e) => {
            e.preventDefault();
            const fullName = document.getElementById('billing_last_name').value.trim();
            const phone = document.getElementById('billing_phone').value.trim();
            const email = document.getElementById('billing_email')?.value.trim() || '';
            const detail = document.getElementById('billing_address_detail').value.trim();
            const citySel = document.getElementById('billing_city');
            const city = citySel.options[citySel.selectedIndex]?.text;
            
            const phoneInput = document.getElementById('billing_phone');

            removeFieldError(phoneInput);

            if (!phone || !isValidVietnamPhone(phone)) {
            showFieldError(
                phoneInput,
                'Số điện thoại bạn nhập chưa đúng vui lòng nhập lại.'
            );
            phoneInput.focus();
            return;
            }

            if (!fullName || !city || city === 'Tỉnh/TP' || !detail) {
            return alert('Vui lòng điền đủ thông tin giao hàng!');
            }

            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                return alert("Email không đúng định dạng.");
            }

            if (!currentPolicyId) {
                return alert('Địa chỉ của bạn không hỗ trợ hình thức vận chuyển đang chọn. Vui lòng đổi phương thức khác!');
            }
            btn.disabled = true;
            btn.textContent = 'Đang xử lý...';

            try {
                const addrRes = await fetch(`${API_BASE}/api/dia-chi`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: null, hoTen: fullName, soDienThoai: phone, tinhTp: city,
                        quanHuyen: document.getElementById('billing_district').options[document.getElementById('billing_district').selectedIndex].text,
                        phuongXa: document.getElementById('billing_ward').options[document.getElementById('billing_ward').selectedIndex].text,
                        diaChiChiTiet: detail, laMacDinh: null
                    })
                });
                const addrResult = await addrRes.json();
                if (!addrResult.ok) throw new Error("Lỗi lưu địa chỉ");

                const phuongThucTT = (document.querySelector('input[name="payment_method"]:checked').value === 'cod') ? 'TIEN_MAT' : 'CHUYEN_KHOAN';
                const subtotal = Number(window.guestCartData.total || 0);
                const totalWithShipping = subtotal + currentShippingFee;
                const depositAmount = phuongThucTT === 'TIEN_MAT'
                    ? calculateDepositByPolicy(subtotal)
                    : 0;

                const orderPayload = {
                    userId: null,
                    diaChiId: addrResult.data.diaChiId,
                    chinhSachId: currentPolicyId,
                    maDonHang: 'MDH' + Math.floor(100000 + Math.random() * 900000),
                    tamTinh: subtotal,
                    phiVanChuyen: currentShippingFee,
                    tongTien: totalWithShipping,
                    tienCoc: depositAmount,
                    phuongThucTT: phuongThucTT,
                    email: email,
                    ghiChu: document.getElementById('order_comments').value || 'Khách vãng lai',
                    items: window.guestCartData.items.map(i => ({
                        bienTheId: i.bienTheId || i.BIEN_THE_ID,
                        tenSanPham: i.tenSanPham || i.TEN_SAN_PHAM || i.name,
                        soLuong: i.soLuong || i.quantity,
                        giaBan: i.giaBan || i.GIA_BAN || i.price,
                        thanhTien: i.thanhTien,
                        hinhAnh: i.hinhAnh || i.HINH_ANH || i.image,
                        mauSac: i.mauSac || i.MAU_SAC,
                        kichCoCanVot: i.kichCoCanVot || i.KICH_CO_CAN_VOT
                    }))
                };

                const orderRes = await fetch(`${API_BASE}/api/don-hang`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(orderPayload) });
                const orderResult = await orderRes.json();

                if (orderResult.ok) {
                    orderPayload.donHangId = orderResult.donHangId;
                    orderPayload.tienCoc = depositAmount; 
                    orderPayload.ngayTao = new Date().toLocaleDateString('vi-VN');
                    orderPayload.hoTen = fullName; orderPayload.sdt = phone; orderPayload.diaChi = `${detail}, ${city}`;
                    localStorage.setItem('pendingOrder', JSON.stringify(orderPayload));
                    
                    if (phuongThucTT === 'CHUYEN_KHOAN') { window.location.href = 'bank.html'; } 
                    else {
                        if (depositAmount > 0) {
                        alert(`Đơn hàng của quý khách cần thanh toán tiền cọc: ${depositAmount.toLocaleString('vi-VN')}₫`);
                        window.location.href = 'bank.html';
                        } else {
                        window.location.href = 'paythanhcong.html';
                        }
                    }
                } else { alert('Lỗi tạo đơn hàng: ' + orderResult.error); btn.disabled = false; btn.textContent = 'Đặt hàng'; }
            } catch (err) { alert(err.message); btn.disabled = false; btn.textContent = 'Đặt hàng'; }
        };
    }

    async function initAddressSelects() {
        const citySel = document.getElementById('billing_city');
        const distSel = document.getElementById('billing_district');
        const wardSel = document.getElementById('billing_ward');
        if (!citySel || !distSel || !wardSel) return;
        try {
            const data = await (await fetch('../../public/vietnam-address-old.json')).json();
            data.forEach(p => citySel.add(new Option(p.name, p.code)));
            citySel.onchange = () => {
                distSel.innerHTML = '<option value="">Quận/Huyện</option>'; wardSel.innerHTML = '<option value="">Phường/Xã</option>'; distSel.disabled = wardSel.disabled = true;
                const p = data.find(x => x.code == citySel.value);
                if (p) { p.districts.forEach(d => distSel.add(new Option(d.name, d.code))); distSel.disabled = false; }
                calculateGuestShippingFee();
            };
            distSel.onchange = () => {
                wardSel.innerHTML = '<option value="">Phường/Xã</option>'; wardSel.disabled = true;
                const p = data.find(x => x.code == citySel.value); const d = p?.districts.find(x => x.code == distSel.value);
                if (d) { d.wards.forEach(w => wardSel.add(new Option(w.name, w.code))); wardSel.disabled = false; }
                calculateGuestShippingFee();
            };
        } catch (e) {}
    }
})();
function initSelectTextColor() {
  const selects = [
    document.getElementById('billing_city'),
    document.getElementById('billing_district'),
    document.getElementById('billing_ward'),
    document.getElementById('modal-city'),
    document.getElementById('modal-district'),
    document.getElementById('modal-ward')
  ].filter(Boolean);

  function updateSelectColor(select) {
    const value = select.value ? String(select.value).trim() : '';
    if (value !== '') {
      select.classList.add('has-value');
    } else {
      select.classList.remove('has-value');
    }
  }

  selects.forEach(function (select) {
    updateSelectColor(select);

    select.addEventListener('change', function () {
      updateSelectColor(select);
    });
  });
}