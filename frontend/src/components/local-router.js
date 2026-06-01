(function () {
    "use strict";

    const LOCAL_ROUTES = {
        home: "trangchu.html",
        cart: "giohang.html",
        checkout: "thanhtoan.html",
        success: "thanhcong.html",
        failed: "thatbai.html",
        account: "taikhoan.html",
        login: "dangnhap.html",
        register: "dangky.html",
        search: "timkiem.html",
        store: "timcuahang.html",
        intro: "gioithieu.html",
        product: "sanpham.html"
    };

    function isBabolatUrl(url) {
        return typeof url === "string" && url.includes("babolat.com.vn");
    }

    function mapBabolatUrlToLocal(url) {
        if (!url) return "#";

        if (url.includes("/gio-hang")) return LOCAL_ROUTES.cart;
        if (url.includes("/thanh-toan")) return LOCAL_ROUTES.checkout;
        if (url.includes("/tai-khoan")) return LOCAL_ROUTES.account;
        if (url.includes("/tim-cua-hang")) return LOCAL_ROUTES.store;
        if (url.includes("/lich-su-babolat")) return LOCAL_ROUTES.intro;
        if (url.includes("/san-pham/")) return LOCAL_ROUTES.product;
        if (url.includes("/sale")) return "sale.html";
        if (url.includes("/tennis")) return "tennis.html";
        if (url.includes("/cau-long")) return "caulong.html";
        if (url.includes("/padel")) return "padel.html";
        if (url.includes("/pickleball")) return "pickleball.html";
        if (url.includes("/nam")) return "nam.html";
        if (url.includes("/nu")) return "nu.html";
        if (url.includes("/thanh-thieu-nien-tre-em")) return "treem.html";
        if (url.includes("/chinh-sach-bao-mat")) return "chinhsachbaomat.html";
        if (url.includes("/chinh-sach-thanh-toan")) return "chinhsachthanhtoan.html";
        if (url.includes("/chinh-sach-doi-tra")) return "chinhsachdoitra.html";
        if (url.includes("/chinh-sach-giao-hang")) return "chinhsachgiaohang.html";
        if (url.includes("/chinh-sach-van-chuyen")) return "chinhsachvanchuyen.html";

        return LOCAL_ROUTES.home;
    }

    function fixAllLinks() {
        const links = document.querySelectorAll("a[href]");

        links.forEach(function (link) {
            const href = link.getAttribute("href");

            if (!href) return;

            if (isBabolatUrl(href)) {
                link.setAttribute("href", mapBabolatUrlToLocal(href));
            }

            if (href.includes("remove_item=")) {
                link.setAttribute("href", "#");
                link.classList.add("js-remove-cart-item");
            }

            if (href.includes("m.me") || href.includes("facebook.com") || href.includes("instagram.com") || href.includes("youtube.com")) {
                link.setAttribute("href", "#");
                link.removeAttribute("target");
            }
        });
    }

    function fixAllForms() {
        const forms = document.querySelectorAll("form");

        forms.forEach(function (form) {
            const action = form.getAttribute("action") || "";

            if (isBabolatUrl(action)) {
                if (form.classList.contains("woocommerce-cart-form")) {
                    form.setAttribute("action", "#");
                } else if (form.classList.contains("woocommerce-product-search")) {
                    form.setAttribute("action", LOCAL_ROUTES.search);
                } else {
                    form.setAttribute("action", "#");
                }
            }

            if (form.classList.contains("woocommerce-cart-form")) {
                form.addEventListener("submit", function (e) {
                    e.preventDefault();
                    alert("Giỏ hàng demo đã được cập nhật trên trang của bạn.");
                });
            }
        });
    }

    function fixImages() {
        const images = document.querySelectorAll("img[src]");

        images.forEach(function (img) {
            const src = img.getAttribute("src");

            if (!isBabolatUrl(src)) return;

            const newSrc = src
                .replace("https://babolat.com.vn/wp-content/", "../wp-content/")
                .replace("http://babolat.com.vn/wp-content/", "../wp-content/")
                .replace("//babolat.com.vn/wp-content/", "../wp-content/")
                .replace("https://babolat.com.vn/wp-includes/", "../wp-includes/")
                .replace("http://babolat.com.vn/wp-includes/", "../wp-includes/");

            img.setAttribute("src", newSrc);
        });

        const sourceImages = document.querySelectorAll("img[srcset]");

        sourceImages.forEach(function (img) {
            const srcset = img.getAttribute("srcset");

            if (!isBabolatUrl(srcset)) return;

            const newSrcset = srcset
                .replaceAll("https://babolat.com.vn/wp-content/", "../wp-content/")
                .replaceAll("http://babolat.com.vn/wp-content/", "../wp-content/")
                .replaceAll("//babolat.com.vn/wp-content/", "../wp-content/");

            img.setAttribute("srcset", newSrcset);
        });
    }

    function disableWooCommerceCartBehavior() {

        window.wc_add_to_cart_params = {
            ajax_url: "#",
            wc_ajax_url: "#",
            i18n_view_cart: "Xem giỏ hàng",
            cart_url: LOCAL_ROUTES.cart,
            is_cart: "1",
            cart_redirect_after_add: "no"
        };

        window.woocommerce_params = {
            ajax_url: "#",
            wc_ajax_url: "#"
        };

        document.addEventListener("click", function (e) {
            const removeBtn = e.target.closest(".remove_from_cart_button, .js-remove-cart-item");

            if (removeBtn) {
                e.preventDefault();

                const cartItem = removeBtn.closest(".cart_item, .woocommerce-cart-form__cart-item, .mini_cart_item");

                if (cartItem) {
                    cartItem.remove();
                }

                updateCartCount(0);
                alert("Đã xóa sản phẩm khỏi giỏ hàng demo.");
                return;
            }

            const checkoutBtn = e.target.closest(".checkout-button, .checkout-btn, a[href*='checkout'], a[href*='thanh-toan']");

            if (checkoutBtn) {
                e.preventDefault();
                window.location.href = LOCAL_ROUTES.checkout;
            }
        });
    }

    function updateCartCount(number) {
        const cartCounts = document.querySelectorAll(".cart-count, qty");

        cartCounts.forEach(function (item) {
            item.textContent = number;
        });
    }

    function setupCheckoutResultRedirect() {

        const checkoutForm = document.querySelector(".checkout-form, form.checkout, .payment-form");

        if (!checkoutForm) return;

        checkoutForm.addEventListener("submit", function (e) {
            e.preventDefault();

            const paymentSuccess = true;

            if (paymentSuccess) {
                window.location.href = LOCAL_ROUTES.success;
            } else {
                window.location.href = LOCAL_ROUTES.failed;
            }
        });
    }

    function init() {
        fixAllLinks();
        fixAllForms();
        fixImages();
        disableWooCommerceCartBehavior();
        setupCheckoutResultRedirect();
    }

    document.addEventListener("DOMContentLoaded", init);
})();