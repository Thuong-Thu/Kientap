document.addEventListener('DOMContentLoaded', function () {
    const orderData = JSON.parse(localStorage.getItem('pendingOrder'));
    if (!orderData) {
        window.location.href = 'gio-hang.html';
        return;
    }

    let soTienPhaiTra = 0;
    if (orderData.phuongThucTT === 'TIEN_MAT') {
        soTienPhaiTra = Number(orderData.tienCoc) || 0;
    } else {
        soTienPhaiTra = Number(orderData.tongTien) || 0; 
    }

    let emailUser = '';
    try {
        const user = JSON.parse(localStorage.getItem('currentUser'));
        if (user && user.email) emailUser = user.email;
    } catch (e) {}

    const infoContainer = document.getElementById('order-info-container');
    if (infoContainer) {
        let itemsHtml = orderData.items.map(item => `
            <div class="product-item">
                <img src="${item.hinhAnh || 'https://via.placeholder.com/80'}" alt="${item.tenSanPham}">
                <div class="product-details">
                    <div class="product-name">${item.tenSanPham}</div>
                    <div class="prod-info-row"><div class="prod-info-label">Màu sắc:</div><div class="prod-info-value">${item.mauSac || 'Tiêu chuẩn'}</div></div>
                    <div class="prod-info-row"><div class="prod-info-label">Kích cỡ cán vợt:</div><div class="prod-info-value">${item.kichCoCanVot || 'Tiêu chuẩn'}</div></div>
                    <div class="prod-info-row"><div class="prod-info-label">Giá:</div><div class="prod-info-value">${Number(item.giaBan).toLocaleString('vi-VN')}₫</div></div>
                    <div class="prod-info-row"><div class="prod-info-label">Số lượng:</div><div class="prod-info-value">${item.soLuong}</div></div>
                    <div class="prod-info-row"><div class="prod-info-label">Thành tiền:</div><div class="prod-info-value prod-total">${Number(item.thanhTien).toLocaleString('vi-VN')}₫</div></div>
                </div>
            </div>
        `).join('');

        let extraPaymentHtml = '';
        if (orderData.phuongThucTT === 'TIEN_MAT' && soTienPhaiTra > 0) {
            extraPaymentHtml = `
                <div class="summary-row summary-deposit">
                    <div class="summary-label">Số tiền cần thanh toán (Cọc):</div>
                    <div class="summary-value">${soTienPhaiTra.toLocaleString('vi-VN')}₫</div>
                </div>
            `;
        }

        infoContainer.innerHTML = `
            <div class="info-row"><div class="info-label">Mã đơn hàng:</div><div class="info-value">${orderData.maDonHang}</div></div>
            <div class="info-row"><div class="info-label">Ngày tạo:</div><div class="info-value">${orderData.ngayTao}</div></div>
            
            <div class="section-title">Thông tin người nhận:</div>
            <div class="info-row"><div class="info-label">Họ tên:</div><div class="info-value">${orderData.hoTen}</div></div>
            <div class="info-row"><div class="info-label">Số điện thoại:</div><div class="info-value">${orderData.sdt}</div></div>
            <div class="info-row"><div class="info-label">Địa chỉ:</div><div class="info-value">${orderData.diaChi}</div></div>
            <div class="info-row"><div class="info-label">Email:</div><div class="info-value">${emailUser || 'Không'}</div></div>
            <div class="info-row"><div class="info-label">Ghi chú:</div><div class="info-value">${orderData.ghiChu || 'Không'}</div></div>

            <div class="section-title">Chi tiết đơn hàng:</div>
            ${itemsHtml}

            <div class="summary-box">
                <div class="summary-row"><div class="summary-label">Tạm tính:</div><div class="summary-value">${Number(orderData.tamTinh).toLocaleString('vi-VN')}₫</div></div>
                <div class="summary-row"><div class="summary-label">Phương thức vận chuyển:</div><div class="summary-value">Giao tiêu chuẩn</div></div>
                <div class="summary-row"><div class="summary-label">Phí vận chuyển:</div><div class="summary-value">${Number(orderData.phiVanChuyen).toLocaleString('vi-VN')}₫</div></div>
                <div class="summary-row summary-total">
                    <div class="summary-label">Tổng:</div>
                    <div class="summary-value">${Number(orderData.tongTien).toLocaleString('vi-VN')}₫</div>
                </div>
                ${extraPaymentHtml}
            </div>
        `;
    }

    const confirmBtn = document.getElementById('confirm-payment');
    let selectedMethod = '';

    document.querySelectorAll('#methods-grid .method').forEach(m => {
        m.onclick = () => {
            document.querySelectorAll('#methods-grid .method').forEach(el => el.classList.remove('selected'));
            m.classList.add('selected');
            selectedMethod = m.dataset.method;
        };
    });

    if (confirmBtn) {
        confirmBtn.onclick = async () => {
            if (!selectedMethod) return alert("Vui lòng chọn Ví MoMo hoặc VNPay!");

            confirmBtn.disabled = true;
            confirmBtn.textContent = "Đang khởi tạo...";

            try {
                // Gọi API lưu trạng thái
                const response = await fetch('http://localhost:3000/api/khoi-tao-thanh-toan', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        donHangId: orderData.donHangId,
                        congThanhToan: selectedMethod.toUpperCase(),
                        soTien: soTienPhaiTra
                    })
                });

                const result = await response.json();
                if (result.ok) {
                    orderData.soTienDangGiaoDich = soTienPhaiTra;
                    localStorage.setItem('pendingOrder', JSON.stringify(orderData));

                    window.location.href = selectedMethod === 'momo' ? 'momo.html' : 'VNpay.html';
                } else {
                    alert("Khởi tạo thất bại: " + result.error);
                    confirmBtn.disabled = false;
                    confirmBtn.textContent = "Xác nhận";
                }
            } catch (error) {
                alert("Lỗi máy chủ.");
                confirmBtn.disabled = false;
                confirmBtn.textContent = "Xác nhận";
            }
        };
    }
});