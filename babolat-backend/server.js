const express = require('express');
const cors = require('cors');
const { sql, connectDB } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let dbReady = connectDB();
async function ready() { return dbReady; }

function toNumber(value) { return value === null || value === undefined ? 0 : Number(value) || 0; }

function normalizeProduct(row) {
  return {
    sanPhamId: row.SAN_PHAM_ID, id: row.SAN_PHAM_ID, danhMucId: row.DANH_MUC_ID,
    tenSanPham: row.TEN_SAN_PHAM, name: row.TEN_SAN_PHAM, moTa: row.MO_TA, thuongHieu: row.THUONG_HIEU,
    trangThai: row.TRANG_THAI, ngayTao: row.NGAY_TAO,
    bienTheId: row.BIEN_THE_ID, variantId: row.BIEN_THE_ID, sku: row.SKU,
    mauSac: row.MAU_SAC, kichThuoc: row.KICH_THUOC, trongLuong: row.TRONG_LUONG, kichCoCanVot: row.KICH_CO_CAN_VOT,
    soLuongTon: toNumber(row.SO_LUONG_TON), giaBan: toNumber(row.GIA_BAN), price: toNumber(row.GIA_BAN),
    hinhAnh: row.HINH_ANH, image: row.HINH_ANH
  };
}

async function layDanhSachSanPham(options = {}) {
  await ready();
  const danhMucId = options.danhMucId || '';
  const keyword = options.keyword || '';
  const request = new sql.Request();
  let where = `WHERE 1 = 1`;

  if (danhMucId) {
    request.input('DANH_MUC_ID', sql.VarChar(50), danhMucId);
    where += ` AND SP.DANH_MUC_ID = @DANH_MUC_ID`;
  }
  if (keyword) {
    request.input('KEYWORD', sql.NVarChar(255), `%${keyword}%`);
    where += ` AND (SP.TEN_SAN_PHAM LIKE @KEYWORD OR SP.MO_TA LIKE @KEYWORD OR SP.THUONG_HIEU LIKE @KEYWORD)`;
  }

  const result = await request.query(`
    SELECT
      SP.SAN_PHAM_ID, SP.DANH_MUC_ID, SP.TEN_SAN_PHAM, SP.MO_TA, SP.THUONG_HIEU, SP.TRANG_THAI, SP.NGAY_TAO,
      BT.BIEN_THE_ID, BT.SKU, BT.MAU_SAC, BT.KICH_THUOC, BT.TRONG_LUONG, BT.KICH_CO_CAN_VOT, BT.SO_LUONG_TON, BT.GIA_BAN,
      HA.URL AS HINH_ANH
    FROM SAN_PHAM SP
    OUTER APPLY (SELECT TOP 1 BIEN_THE_ID, SAN_PHAM_ID, SKU, MAU_SAC, KICH_THUOC, TRONG_LUONG, KICH_CO_CAN_VOT, SO_LUONG_TON, GIA_BAN FROM BIEN_THE_SAN_PHAM WHERE SAN_PHAM_ID = SP.SAN_PHAM_ID ORDER BY BIEN_THE_ID ASC) BT
    OUTER APPLY (SELECT TOP 1 URL FROM HINH_ANH_SAN_PHAM WHERE SAN_PHAM_ID = SP.SAN_PHAM_ID ORDER BY CASE WHEN LA_ANH_CHINH = 1 THEN 0 ELSE 1 END, HINH_ANH_ID ASC) HA
    ${where} ORDER BY SP.SAN_PHAM_ID ASC
  `);
  return result.recordset.map(normalizeProduct);
}

app.get('/', (req, res) => res.send('Backend đang chạy!'));

app.post('/register', async (req, res) => {
  try {
    await ready();
    const { fullname, phone, email, password } = req.body;
    if (!fullname || !phone || !password) return res.status(400).json({ success: false, message: 'Vui lòng nhập đủ thông tin' });
    const checkUser = await sql.query`SELECT * FROM NGUOI_DUNG WHERE SDT = ${phone}`;
    if (checkUser.recordset.length > 0) return res.status(400).json({ success: false, message: 'Số điện thoại đã tồn tại' });
    await sql.query`INSERT INTO NGUOI_DUNG (HO_TEN, EMAIL, SDT, MAT_KHAU, VAI_TRO, DA_XAC_THUC) VALUES (${fullname}, ${email || ''}, ${phone}, ${password}, 'KHACH_HANG', 1)`;
    res.json({ success: true, message: 'Đăng ký thành công' });
  } catch (err) { res.status(500).json({ success: false, message: 'Lỗi server', error: err.message }); }
});

app.post('/login', async (req, res) => {
  try {
    await ready();
    const { phone, password } = req.body;
    const result = await sql.query`SELECT * FROM NGUOI_DUNG WHERE SDT = ${phone} AND MAT_KHAU = ${password}`;
    if (result.recordset.length === 0) return res.status(400).json({ success: false, message: 'Sai SĐT hoặc mật khẩu' });
    const user = result.recordset[0];
    res.json({ success: true, user: { id: user.USER_ID, fullname: user.HO_TEN, phone: user.SDT, email: user.EMAIL, role: user.VAI_TRO } });
  } catch (err) { res.status(500).json({ success: false, message: 'Lỗi server', error: err.message }); }
});

app.get(['/api/san-pham', '/api/products', '/collections'], async (req, res) => {
  try {
    const products = await layDanhSachSanPham({ danhMucId: req.query.danhMucId || req.query.categoryId, keyword: req.query.keyword || req.query.q });
    res.json({ ok: true, data: products });
  } catch (err) { res.status(500).json({ ok: false, message: 'Lỗi lấy sản phẩm', error: err.message }); }
});

app.get(['/api/san-pham/:id', '/api/products/:id', '/product/:id'], async (req, res) => {
  try {
    await ready();
    const id = req.params.id;
    const productResult = await new sql.Request().input('ID', sql.VarChar(50), id).query(`SELECT * FROM SAN_PHAM WHERE SAN_PHAM_ID = @ID`);
    if (productResult.recordset.length === 0) return res.status(404).json({ ok: false, message: 'Không tìm thấy sản phẩm' });

    const variantResult = await new sql.Request().input('ID', sql.VarChar(50), id).query(`SELECT * FROM BIEN_THE_SAN_PHAM WHERE SAN_PHAM_ID = @ID ORDER BY BIEN_THE_ID ASC`);
    const imageResult = await new sql.Request().input('ID', sql.VarChar(50), id).query(`SELECT * FROM HINH_ANH_SAN_PHAM WHERE SAN_PHAM_ID = @ID ORDER BY CASE WHEN LA_ANH_CHINH = 1 THEN 0 ELSE 1 END, HINH_ANH_ID ASC`);

    const product = productResult.recordset[0];
    const variants = variantResult.recordset.map((row) => ({ ...row, bienTheId: row.BIEN_THE_ID, variantId: row.BIEN_THE_ID, sku: row.SKU, mauSac: row.MAU_SAC, kichThuoc: row.KICH_THUOC, kichCoCanVot: row.KICH_CO_CAN_VOT, soLuongTon: toNumber(row.SO_LUONG_TON), giaBan: toNumber(row.GIA_BAN), price: toNumber(row.GIA_BAN) }));
    const images = imageResult.recordset.map((row) => ({ url: row.URL, laAnhChinh: Boolean(row.LA_ANH_CHINH) }));

    res.json({ ok: true, data: { ...product, variants, images, hinhAnh: images.length > 0 ? images[0].url : null } });
  } catch (err) { res.status(500).json({ ok: false, message: 'Không lấy được sản phẩm', error: err.message }); }
});

app.get(['/api/bo-suu-tap', '/api/categories'], async (req, res) => {
  try {
    await ready();
    const result = await new sql.Request().query(`SELECT DM.DANH_MUC_ID AS danhMucId, DM.TEN_DANH_MUC AS tenDanhMuc, COUNT(SP.SAN_PHAM_ID) AS soLuongSanPham FROM DANH_MUC_SAN_PHAM DM LEFT JOIN SAN_PHAM SP ON SP.DANH_MUC_ID = DM.DANH_MUC_ID GROUP BY DM.DANH_MUC_ID, DM.TEN_DANH_MUC ORDER BY DM.TEN_DANH_MUC ASC`);
    res.json({ ok: true, data: result.recordset });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.get(['/api/bo-suu-tap/:danhMucId/san-pham', '/api/categories/:danhMucId/products'], async (req, res) => {
  try {
    const products = await layDanhSachSanPham({ danhMucId: req.params.danhMucId });
    res.json({ ok: true, data: products });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

async function getOrCreateCart(userId) {
  await ready();
  const found = await new sql.Request().input('USER_ID', sql.Int, userId).query(`SELECT TOP 1 GIO_HANG_ID FROM GIO_HANG WHERE USER_ID = @USER_ID`);
  if (found.recordset.length > 0) return found.recordset[0].GIO_HANG_ID;
  const created = await new sql.Request().input('USER_ID', sql.Int, userId).query(`INSERT INTO GIO_HANG (USER_ID) OUTPUT INSERTED.GIO_HANG_ID VALUES (@USER_ID)`);
  return created.recordset[0].GIO_HANG_ID;
}

app.post(['/api/gio-hang/them', '/api/gio-hang', '/api/cart', '/add-cart'], async (req, res) => {
  try {
    const userId = Number(req.body.userId || 1);
    const bienTheId = req.body.bienTheId || req.body.variantId;
    const soLuong = Math.max(1, Number(req.body.soLuong || req.body.quantity || 1));
    if (!bienTheId) return res.status(400).json({ ok: false, message: 'Thiếu BIEN_THE_ID' });

    const gioHangId = await getOrCreateCart(userId);
    await new sql.Request().input('GIO_HANG_ID', sql.Int, gioHangId).input('BIEN_THE_ID', sql.VarChar(50), bienTheId).input('SO_LUONG', sql.Int, soLuong).query(`
        IF EXISTS (SELECT 1 FROM CHI_TIET_GIO_HANG WHERE GIO_HANG_ID = @GIO_HANG_ID AND BIEN_THE_ID = @BIEN_THE_ID)
          UPDATE CHI_TIET_GIO_HANG SET SO_LUONG = SO_LUONG + @SO_LUONG WHERE GIO_HANG_ID = @GIO_HANG_ID AND BIEN_THE_ID = @BIEN_THE_ID
        ELSE
          INSERT INTO CHI_TIET_GIO_HANG (GIO_HANG_ID, BIEN_THE_ID, SO_LUONG) VALUES (@GIO_HANG_ID, @BIEN_THE_ID, @SO_LUONG)
      `);
    res.json({ ok: true, message: 'Đã thêm vào giỏ hàng' });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.get(['/api/gio-hang', '/api/cart'], async (req, res) => {
  try {
    const userId = Number(req.query.userId || 1);
    const gioHangId = await getOrCreateCart(userId);
    const result = await new sql.Request().input('GIO_HANG_ID', sql.Int, gioHangId).query(`
        SELECT CT.CHI_TIET_ID AS chiTietId, GH.GIO_HANG_ID AS gioHangId, SP.SAN_PHAM_ID AS sanPhamId, SP.TEN_SAN_PHAM AS tenSanPham, BT.BIEN_THE_ID AS bienTheId, BT.SKU AS sku, BT.MAU_SAC AS mauSac, BT.KICH_CO_CAN_VOT AS kichCoCanVot, BT.GIA_BAN AS giaBan, CT.SO_LUONG AS soLuong, CT.SO_LUONG * BT.GIA_BAN AS thanhTien,
        (SELECT TOP 1 URL FROM HINH_ANH_SAN_PHAM WHERE SAN_PHAM_ID = SP.SAN_PHAM_ID ORDER BY CASE WHEN LA_ANH_CHINH = 1 THEN 0 ELSE 1 END, HINH_ANH_ID ASC) AS hinhAnh
        FROM GIO_HANG GH INNER JOIN CHI_TIET_GIO_HANG CT ON CT.GIO_HANG_ID = GH.GIO_HANG_ID INNER JOIN BIEN_THE_SAN_PHAM BT ON BT.BIEN_THE_ID = CT.BIEN_THE_ID INNER JOIN SAN_PHAM SP ON SP.SAN_PHAM_ID = BT.SAN_PHAM_ID
        WHERE GH.GIO_HANG_ID = @GIO_HANG_ID ORDER BY CT.CHI_TIET_ID DESC
      `);
    const items = result.recordset.map((item) => ({ ...item, giaBan: toNumber(item.giaBan), soLuong: toNumber(item.soLuong), thanhTien: toNumber(item.thanhTien) }));
    res.json({ ok: true, data: { userId, gioHangId, items, tongSoLuong: items.reduce((sum, item) => sum + item.soLuong, 0), tongTien: items.reduce((sum, item) => sum + item.thanhTien, 0) } });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.delete('/api/gio-hang/:chiTietId', async (req, res) => {
  try {
    await ready();
    await new sql.Request().input('CHI_TIET_ID', sql.Int, Number(req.params.chiTietId)).query(`DELETE FROM CHI_TIET_GIO_HANG WHERE CHI_TIET_ID = @CHI_TIET_ID`);
    res.json({ ok: true, message: 'Đã xóa sản phẩm' });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.put('/api/gio-hang/:chiTietId', async (req, res) => {
  try {
    await ready();
    const soLuong = Number(req.body.soLuong);
    await new sql.Request().input('CHI_TIET_ID', sql.Int, Number(req.params.chiTietId)).input('SO_LUONG', sql.Int, soLuong).query(`UPDATE CHI_TIET_GIO_HANG SET SO_LUONG = @SO_LUONG WHERE CHI_TIET_ID = @CHI_TIET_ID`);
    res.json({ ok: true, message: 'Đã cập nhật số lượng' });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.get('/api/dia-chi', async (req, res) => {
  try {
    await ready();
    const userId = Number(req.query.userId);
    const result = await new sql.Request().input('USER_ID', sql.Int, userId).query(`SELECT DIA_CHI_ID AS diaChiId, USER_ID AS userId, TEN_NGUOI_NHAN AS hoTen, SDT_NGUOI_NHAN AS soDienThoai, TINH_THANH AS tinhTp, QUAN_HUYEN AS quanHuyen, PHUONG_XA AS phuongXa, DIA_CHI_CHI_TIET AS diaChiChiTiet, LA_MAC_DINH AS laMacDinh FROM DIA_CHI_GIAO_HANG WHERE USER_ID = @USER_ID ORDER BY LA_MAC_DINH DESC, DIA_CHI_ID DESC`);
    res.json({ ok: true, data: result.recordset });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.post('/api/dia-chi', async (req, res) => {
  let transaction;
  try {
    await ready();
    const { userId, hoTen, soDienThoai, tinhTp, quanHuyen, phuongXa, diaChiChiTiet, laMacDinh } = req.body;
    transaction = new sql.Transaction();
    await transaction.begin();
    const insertResult = await new sql.Request(transaction)
      .input('USER_ID', sql.Int, userId || null).input('TEN', sql.NVarChar(100), hoTen).input('SDT', sql.VarChar(15), soDienThoai).input('TINH', sql.NVarChar(100), tinhTp).input('QUAN', sql.NVarChar(100), quanHuyen).input('PHUONG', sql.NVarChar(100), phuongXa).input('CT', sql.NVarChar(255), diaChiChiTiet).input('DEF', sql.Bit, laMacDinh ? 1 : 0)
      .query(`INSERT INTO DIA_CHI_GIAO_HANG (USER_ID, TEN_NGUOI_NHAN, SDT_NGUOI_NHAN, TINH_THANH, QUAN_HUYEN, PHUONG_XA, DIA_CHI_CHI_TIET, LA_MAC_DINH) OUTPUT INSERTED.DIA_CHI_ID AS diaChiId VALUES (@USER_ID, @TEN, @SDT, @TINH, @QUAN, @PHUONG, @CT, @DEF)`);
    await transaction.commit();
    res.json({ ok: true, data: insertResult.recordset[0] });
  } catch (err) {
    if (transaction) await transaction.rollback();
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.put('/api/dia-chi/:diaChiId/mac-dinh', async (req, res) => {
  try {
    await ready();
    const userId = Number(req.body.userId);
    await new sql.Request().input('USER_ID', sql.Int, userId).query(`UPDATE DIA_CHI_GIAO_HANG SET LA_MAC_DINH = 0 WHERE USER_ID = @USER_ID`);
    await new sql.Request().input('DIA_CHI_ID', sql.Int, Number(req.params.diaChiId)).input('USER_ID', sql.Int, userId).query(`UPDATE DIA_CHI_GIAO_HANG SET LA_MAC_DINH = 1 WHERE DIA_CHI_ID = @DIA_CHI_ID AND USER_ID = @USER_ID`);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.delete('/api/dia-chi/:diaChiId', async (req, res) => {
  try { await ready(); await new sql.Request().input('ID', sql.Int, Number(req.params.diaChiId)).query(`DELETE FROM DIA_CHI_GIAO_HANG WHERE DIA_CHI_ID = @ID`); res.json({ ok: true }); } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.put('/api/dia-chi/:diaChiId', async (req, res) => {
  try {
    await ready();
    const { hoTen, soDienThoai, tinhTp, quanHuyen, phuongXa, diaChiChiTiet, laMacDinh } = req.body;
    await new sql.Request().input('ID', sql.Int, Number(req.params.diaChiId)).input('TEN', sql.NVarChar(100), hoTen).input('SDT', sql.VarChar(15), soDienThoai).input('TINH', sql.NVarChar(100), tinhTp).input('QUAN', sql.NVarChar(100), quanHuyen).input('PHUONG', sql.NVarChar(100), phuongXa).input('CT', sql.NVarChar(255), diaChiChiTiet).input('DEF', sql.Bit, laMacDinh ? 1 : 0)
      .query(`UPDATE DIA_CHI_GIAO_HANG SET TEN_NGUOI_NHAN = @TEN, SDT_NGUOI_NHAN = @SDT, TINH_THANH = @TINH, QUAN_HUYEN = @QUAN, PHUONG_XA = @PHUONG, DIA_CHI_CHI_TIET = @CT, LA_MAC_DINH = @DEF WHERE DIA_CHI_ID = @ID`);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

async function calculateDeposit(tongTien) {
  try {
    await ready();
    let result = await new sql.Request()
      .input('TOTAL', sql.Decimal(18, 2), tongTien)
      .query(`SELECT TOP 1 CS_ID, LOAI_COC, TIEN_COC FROM CHINH_SACH_THANH_TOAN WHERE @TOTAL > TU_GIA_TRI AND @TOTAL <= DEN_GIA_TRI`);

    if (result.recordset.length === 0) {
      result = await new sql.Request().query(`SELECT TOP 1 CS_ID, LOAI_COC, TIEN_COC FROM CHINH_SACH_THANH_TOAN ORDER BY CS_ID ASC`);
    }
    if (result.recordset.length === 0) return { tienCoc: 0, csId: 1 };

    const policy = result.recordset[0];
    let tienCoc = 0;
    if (policy.LOAI_COC === 'CO_DINH') {
      tienCoc = Number(policy.TIEN_COC);
    } else if (policy.LOAI_COC === 'PHAN_TRAM') {
      tienCoc = (Number(tongTien) * Number(policy.TIEN_COC)) / 100;
    }
    return { tienCoc: tienCoc, csId: policy.CS_ID };
  } catch (err) {
    console.error("Lỗi tính tiền cọc:", err);
    return { tienCoc: 0, csId: 1 };
  }
}

app.post('/api/don-hang', async (req, res) => {
  let transaction;
  try {
    await ready();
    const { userId, diaChiId, maDonHang, tamTinh, phiVanChuyen, tongTien, phuongThucTT, items, ghiChu } = req.body;

    let tienCoc = 0;
    let csId = 1;
    if (phuongThucTT === 'TIEN_MAT') {
      const depositInfo = await calculateDeposit(tamTinh);
      tienCoc = depositInfo.tienCoc;
      csId = depositInfo.csId;
    }

    let trangThai = 'DANG_XU_LY';
    if (phuongThucTT === 'CHUYEN_KHOAN' || (phuongThucTT === 'TIEN_MAT' && tienCoc > 0)) {
      trangThai = 'CHO_THANH_TOAN';
    }

    transaction = new sql.Transaction();
    await transaction.begin();
    
    const orderResult = await new sql.Request(transaction)
      .input('USER_ID', sql.Int, userId || null)
      .input('DIA_CHI_ID', sql.Int, diaChiId)
      .input('CHINH_SACH_ID', sql.Int, req.body.chinhSachId || null) 
      .input('MA_DON_HANG', sql.NVarChar(30), maDonHang)
      .input('TAM_TINH', sql.Decimal(15, 2), tamTinh)
      .input('PHI_VC', sql.Decimal(15, 2), phiVanChuyen)
      .input('TONG_TIEN', sql.Decimal(15, 2), tongTien)
      .input('TIEN_COC', sql.Decimal(15, 2), tienCoc)
      .input('PHUONG_THUC', sql.VarChar(50), phuongThucTT)
      .input('TRANG_THAI', sql.NVarChar(20), trangThai)
      .input('GHI_CHU', sql.NVarChar(sql.MAX), ghiChu || '')
      .input('CS_ID', sql.Int, csId)
      .query(`
        INSERT INTO DON_HANG (
          USER_ID, DIA_CHI_ID, CHINH_SACH_ID, MA_DON_HANG, TAM_TINH, TIEN_GIAM, 
          PHI_VAN_CHUYEN, TIEN_COC, TONG_TIEN, PHUONG_THUC_THANH_TOAN, 
          TRANG_THAI_DON_HANG, GHI_CHU, NGAY_TAO, CS_ID
        )
        OUTPUT INSERTED.DON_HANG_ID
        VALUES (
          @USER_ID, @DIA_CHI_ID, @CHINH_SACH_ID, @MA_DON_HANG, @TAM_TINH, 0, 
          @PHI_VC, @TIEN_COC, @TONG_TIEN, @PHUONG_THUC, 
          @TRANG_THAI, @GHI_CHU, GETDATE(), @CS_ID
        )
      `);

    const donHangId = orderResult.recordset[0].DON_HANG_ID;

    for (const item of items) {
      await new sql.Request(transaction)
        .input('DHID', sql.Int, donHangId).input('BTID', sql.VarChar(50), String(item.bienTheId)).input('SL', sql.Int, item.soLuong).input('DG', sql.Decimal(15, 2), item.giaBan).input('TT', sql.Decimal(15, 2), item.thanhTien)
        .query(`INSERT INTO CHI_TIET_DON_HANG (DON_HANG_ID, BIEN_THE_ID, SO_LUONG, DON_GIA, THANH_TIEN) VALUES (@DHID, @BTID, @SL, @DG, @TT)`);
    }

    await transaction.commit();
    res.json({ ok: true, donHangId, tienCoc }); 
  } catch (err) {
    if (transaction) await transaction.rollback();
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/api/khoi-tao-thanh-toan', async (req, res) => {
  try {
    await ready();
    const { donHangId, congThanhToan, soTien } = req.body;

    await new sql.Request()
      .input('DHID', sql.Int, donHangId)
      .input('CONG', sql.NVarChar(10), congThanhToan)
      .input('MGD', sql.NVarChar(100), 'GD' + Date.now())
      .input('ST', sql.Decimal(15, 2), soTien)
      .query(`INSERT INTO THANH_TOAN (DON_HANG_ID, CONG_THANH_TOAN, MA_GIAO_DICH, SO_TIEN, TRANG_THAI_THANH_TOAN) VALUES (@DHID, @CONG, @MGD, @ST, 'CHO_XU_LY')`);

    res.json({ ok: true });

    setTimeout(async () => {
      try {
        const pool = await sql.connect();
        await pool.request().input('ID', sql.Int, donHangId).query(`
          UPDATE THANH_TOAN SET TRANG_THAI_THANH_TOAN = 'THAT_BAI' WHERE DON_HANG_ID = @ID AND TRANG_THAI_THANH_TOAN = 'CHO_XU_LY';
          UPDATE DON_HANG SET TRANG_THAI_DON_HANG = 'DA_HUY' WHERE DON_HANG_ID = @ID AND TRANG_THAI_DON_HANG = 'CHO_THANH_TOAN';
        `);
      } catch(e) { console.error('Lỗi hẹn giờ hủy:', e); }
    }, 600000);
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.put('/api/don-hang/:id/huy-tu-dong', async (req, res) => {
  try {
    await ready();
    const donHangId = parseInt(req.params.id);
    await new sql.Request()
      .input('ID', sql.Int, donHangId)
      .query(`
        UPDATE THANH_TOAN SET TRANG_THAI_THANH_TOAN = 'THAT_BAI' WHERE DON_HANG_ID = @ID AND TRANG_THAI_THANH_TOAN = 'CHO_XU_LY';
        UPDATE DON_HANG SET TRANG_THAI_DON_HANG = 'DA_HUY' WHERE DON_HANG_ID = @ID AND TRANG_THAI_DON_HANG = 'CHO_THANH_TOAN';
      `);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.put('/api/don-hang/:id/huy-giao-dich', async (req, res) => {
  try {
    await ready();
    const donHangId = parseInt(req.params.id);
    await new sql.Request()
      .input('ID', sql.Int, donHangId)
      .query(`DELETE FROM THANH_TOAN WHERE DON_HANG_ID = @ID AND TRANG_THAI_THANH_TOAN = 'CHO_XU_LY'`);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.put('/api/don-hang/:id/thanh-toan-lai', async (req, res) => {
  try {
    await ready();
    const donHangId = parseInt(req.params.id);

    const check = await new sql.Request()
      .input('ID', sql.Int, donHangId)
      .query(`SELECT TRANG_THAI_DON_HANG, TONG_TIEN FROM DON_HANG WHERE DON_HANG_ID = @ID`);

    if (check.recordset.length === 0)
      return res.status(404).json({ ok: false, error: 'Không tìm thấy đơn hàng' });

    const { TRANG_THAI_DON_HANG, TONG_TIEN } = check.recordset[0];
    if (TRANG_THAI_DON_HANG !== 'DA_HUY')
      return res.status(400).json({ ok: false, error: 'Chỉ có thể thanh toán lại đơn hàng đã hủy do hết giờ' });

    const lastPayment = await new sql.Request()
      .input('ID', sql.Int, donHangId)
      .query(`SELECT TOP 1 CONG_THANH_TOAN, SO_TIEN FROM THANH_TOAN WHERE DON_HANG_ID = @ID ORDER BY THANH_TOAN_ID DESC`);

    const congThanhToan = lastPayment.recordset.length > 0 ? lastPayment.recordset[0].CONG_THANH_TOAN : 'VNPAY';
    const soTien = lastPayment.recordset.length > 0 ? Number(lastPayment.recordset[0].SO_TIEN) : Number(TONG_TIEN);

    await new sql.Request()
      .input('ID', sql.Int, donHangId)
      .query(`UPDATE DON_HANG SET TRANG_THAI_DON_HANG = 'CHO_THANH_TOAN' WHERE DON_HANG_ID = @ID`);

    res.json({ ok: true, congThanhToan, soTien });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});

app.post('/api/xac-nhan-thanh-toan-thanh-cong', async (req, res) => {
  try {
    await ready();
    const { donHangId } = req.body;
    
    await new sql.Request()
      .input('DHID', sql.Int, donHangId)
      .query(`UPDATE THANH_TOAN SET TRANG_THAI_THANH_TOAN = 'THANH_CONG', NGAY_THANH_TOAN = GETDATE() WHERE DON_HANG_ID = @DHID`);
      
    await new sql.Request()
      .input('DHID', sql.Int, donHangId)
      .query(`
        UPDATE DON_HANG 
        SET TRANG_THAI_DON_HANG = 
          CASE 
            WHEN PHUONG_THUC_THANH_TOAN = 'CHUYEN_KHOAN' THEN 'DA_THANH_TOAN'
            WHEN PHUONG_THUC_THANH_TOAN = 'TIEN_MAT' AND TIEN_COC > 0 THEN 'DA_DAT_COC'
            ELSE TRANG_THAI_DON_HANG
          END
        WHERE DON_HANG_ID = @DHID AND TRANG_THAI_DON_HANG = 'CHO_THANH_TOAN'
      `);
      
    res.json({ ok: true, message: 'Đã cập nhật trạng thái đơn hàng thành công' });
  } catch (err) { 
    res.status(500).json({ ok: false, error: err.message }); 
  }
});

app.get('/api/don-hang/tra-cuu/:maDonHang', async (req, res) => {
  try {
    await ready();
    const orderResult = await new sql.Request().input('MA_DON_HANG', sql.NVarChar(30), req.params.maDonHang).query(`
        SELECT DH.DON_HANG_ID, DH.MA_DON_HANG, DH.NGAY_TAO, DH.TRANG_THAI_DON_HANG, DH.TAM_TINH, DH.PHI_VAN_CHUYEN, DH.TONG_TIEN, DH.PHUONG_THUC_THANH_TOAN, DH.GHI_CHU, DC.TEN_NGUOI_NHAN, DC.SDT_NGUOI_NHAN, DC.DIA_CHI_CHI_TIET, DC.PHUONG_XA, DC.QUAN_HUYEN, DC.TINH_THANH
        FROM DON_HANG DH JOIN DIA_CHI_GIAO_HANG DC ON DH.DIA_CHI_ID = DC.DIA_CHI_ID WHERE DH.MA_DON_HANG = @MA_DON_HANG
      `);
    if (orderResult.recordset.length === 0) return res.status(404).json({ ok: false, message: 'Không tìm thấy đơn hàng' });
    const orderRow = orderResult.recordset[0];
    const itemsResult = await new sql.Request().input('DON_HANG_ID', sql.Int, orderRow.DON_HANG_ID).query(`
        SELECT CT.SO_LUONG, CT.DON_GIA, CT.THANH_TIEN, SP.TEN_SAN_PHAM, BT.MAU_SAC, BT.KICH_CO_CAN_VOT, (SELECT TOP 1 URL FROM HINH_ANH_SAN_PHAM WHERE SAN_PHAM_ID = SP.SAN_PHAM_ID ORDER BY LA_ANH_CHINH DESC) AS HINH_ANH
        FROM CHI_TIET_DON_HANG CT JOIN BIEN_THE_SAN_PHAM BT ON CT.BIEN_THE_ID = BT.BIEN_THE_ID JOIN SAN_PHAM SP ON BT.SAN_PHAM_ID = SP.SAN_PHAM_ID WHERE CT.DON_HANG_ID = @DON_HANG_ID
      `);
    res.json({ ok: true, data: { orderCode: orderRow.MA_DON_HANG, createdAt: orderRow.NGAY_TAO, status: orderRow.TRANG_THAI_DON_HANG, subtotal: orderRow.TAM_TINH, shippingFee: orderRow.PHI_VAN_CHUYEN, total: orderRow.TONG_TIEN, paymentMethod: orderRow.PHUONG_THUC_THANH_TOAN, customer: { fullName: orderRow.TEN_NGUOI_NHAN, phone: orderRow.SDT_NGUOI_NHAN, address: `${orderRow.DIA_CHI_CHI_TIET}, ${orderRow.PHUONG_XA}, ${orderRow.QUAN_HUYEN}, ${orderRow.TINH_THANH}`, note: orderRow.GHI_CHU }, items: itemsResult.recordset.map(item => ({ name: item.TEN_SAN_PHAM, color: item.MAU_SAC, size: item.KICH_CO_CAN_VOT, price: item.DON_GIA, quantity: item.SO_LUONG, image: item.HINH_ANH || 'https://via.placeholder.com/150' })) } });
  } catch (err) { res.status(500).json({ ok: false, error: err.message }); }
});
app.post('/api/phi-van-chuyen', async (req, res) => {
  try {
    await ready();
    const { tinhTp, quanHuyen, hinhThucGiao, tamTinh } = req.body;
    
    let khuVuc = 'TINH_KHAC'; 
    
    if (tinhTp && (tinhTp === 'Thành phố Hồ Chí Minh' || tinhTp === 'TP. Hồ Chí Minh' || tinhTp.includes('Hồ Chí Minh'))) {
        const noiThanh = [
            'Quận 1', 'Quận 3', 'Quận 4', 'Quận 5', 'Quận 6', 
            'Quận 7', 'Quận 8', 'Quận 10', 'Quận 11', 'Huyện Nhà Bè', 
            'Quận Bình Thạnh', 'Quận Phú Nhuận', 'Quận Tân Bình', 
            'Quận Tân Phú', 'Quận Gò Vấp'
        ];
        
        const isNoiThanh = noiThanh.some(q => quanHuyen && quanHuyen.includes(q));
        khuVuc = isNoiThanh ? 'NOI_THANH' : 'NGOAI_THANH';
    }

    let hinhThucSQL = 'GIAO_TIEU_CHUAN';
    if (hinhThucGiao === 'fast' || hinhThucGiao === 'Giao nhanh' || hinhThucGiao === 'GIAO_NHANH') {
        hinhThucSQL = 'GIAO_NHANH';
    }

    let result = await new sql.Request()
      .input('KHU_VUC', sql.NVarChar(20), khuVuc)
      .input('HINH_THUC_GIAO', sql.NVarChar(20), hinhThucSQL)
      .input('TAM_TINH', sql.Decimal(18, 2), tamTinh || 0)
      .query(`
          SELECT TOP 1 CHINH_SACH_ID, PHI_GIAO_HANG 
          FROM CHINH_SACH_VAN_CHUYEN 
          WHERE KHU_VUC = @KHU_VUC 
            AND HINH_THUC_GIAO = @HINH_THUC_GIAO 
            AND @TAM_TINH >= TU_GIA_TRI 
            AND (@TAM_TINH <= DEN_GIA_TRI OR DEN_GIA_TRI IS NULL)
      `);
    
    if (result.recordset.length > 0) {
        res.json({ ok: true, data: result.recordset[0] });
    } else {
        res.json({ 
            ok: false, 
            notSupported: true, 
            message: 'Địa chỉ của bạn không áp dụng hình thức vận chuyển này. Vui lòng chọn hình thức khác!' 
        });
    }
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});
let otpStore = {}; 

app.post('/api/forgot-password/request-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    await ready();
    const checkUser = await sql.query`SELECT * FROM NGUOI_DUNG WHERE SDT = ${phone}`;
    if (checkUser.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Số điện thoại chưa được đăng ký' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[phone] = otp; 
    
    console.log(`Mã OTP cho ${phone} là: ${otp}`); 
    res.json({ success: true, message: 'Mã OTP đã được gửi' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

app.post('/api/forgot-password/verify-otp', (req, res) => {
  const { phone, otp } = req.body;
  if (otpStore[phone] && otpStore[phone] === otp) {
    res.json({ success: true });
  } else {
    res.status(400).json({ success: false, message: 'Mã OTP không chính xác' });
  }
});

app.post('/api/forgot-password/reset', async (req, res) => {
  try {
    const { phone, newPassword } = req.body;
    await ready();
    await sql.query`UPDATE NGUOI_DUNG SET MAT_KHAU = ${newPassword} WHERE SDT = ${phone}`;
    delete otpStore[phone]; 
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi cập nhật mật khẩu' });
  }
});
app.post('/api/don-hang/yeu-cau-huy', async (req, res) => {
  try {
    const { maDonHang, phone } = req.body;
    await ready();
    const result = await sql.query`
      SELECT DH.* FROM DON_HANG DH 
      JOIN DIA_CHI_GIAO_HANG DC ON DH.DIA_CHI_ID = DC.DIA_CHI_ID 
      WHERE DH.MA_DON_HANG = ${maDonHang} AND DC.SDT_NGUOI_NHAN = ${phone}`;

    if (result.recordset.length === 0) {
      return res.status(404).json({ ok: false, message: 'Thông tin đơn hàng hoặc SĐT không khớp' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[`CANCEL_${maDonHang}`] = otp;

    console.log(`Mã hủy đơn ${maDonHang} là: ${otp}`);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, message: 'Lỗi server' });
  }
});

app.post('/api/don-hang/xac-nhan-huy', async (req, res) => {
  try {
    const { maDonHang, otp } = req.body;
    if (otpStore[`CANCEL_${maDonHang}`] === otp) {
      await ready();
      await sql.query`UPDATE DON_HANG SET TRANG_THAI_DON_HANG = 'DA_HUY' WHERE MA_DON_HANG = ${maDonHang}`;
      delete otpStore[`CANCEL_${maDonHang}`];
      res.json({ ok: true });
    } else {
      res.status(400).json({ ok: false, message: 'Mã OTP sai' });
    }
  } catch (err) {
    res.status(500).json({ ok: false, message: 'Lỗi hủy đơn' });
  }
});

app.listen(PORT, () => console.log(`Server chạy tại http://localhost:${PORT}`));
app.delete('/api/don-hang/:id', async (req, res) => {
  try {
    await ready();
    const donHangId = parseInt(req.params.id);
    if (!donHangId) return res.status(400).json({ ok: false, error: 'ID không hợp lệ' });

    const check = await new sql.Request()
      .input('ID', sql.Int, donHangId)
      .query(`SELECT TRANG_THAI_DON_HANG FROM DON_HANG WHERE DON_HANG_ID = @ID`);

    if (check.recordset.length === 0)
      return res.status(404).json({ ok: false, error: 'Không tìm thấy đơn hàng' });

    const trangThai = check.recordset[0].TRANG_THAI_DON_HANG;
    if (trangThai !== 'CHO_THANH_TOAN')
      return res.status(403).json({ ok: false, error: 'Không thể xóa đơn hàng ở trạng thái: ' + trangThai });

    // Xóa theo thứ tự: child tables trước, parent sau
    await new sql.Request()
      .input('ID', sql.Int, donHangId)
      .query(`
        DELETE FROM THANH_TOAN        WHERE DON_HANG_ID = @ID;
        DELETE FROM CHI_TIET_DON_HANG WHERE DON_HANG_ID = @ID;
        DELETE FROM DON_HANG          WHERE DON_HANG_ID = @ID AND TRANG_THAI_DON_HANG = 'CHO_THANH_TOAN';
      `);

    res.json({ ok: true, message: 'Đã xóa đơn hàng thành công' });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});
