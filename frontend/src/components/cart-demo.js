(function () {
    const cartCount = document.querySelector('.cart-count');
    const cartButtons = document.querySelectorAll('.demo-add-to-cart');

    function getCart() {
        return JSON.parse(localStorage.getItem('demoCart')) || [];
    }

    function saveCart(cart) {
        localStorage.setItem('demoCart', JSON.stringify(cart));
    }

    function updateCartCount() {
        const cart = getCart();
        const total = cart.reduce(function (sum, item) {
            return sum + item.quantity;
        }, 0);

        if (cartCount) {
            cartCount.textContent = total;
        }
    }

    cartButtons.forEach(function (button) {
        button.addEventListener('click', function () {
            const product = {
                id: button.dataset.id,
                name: button.dataset.name,
                price: Number(button.dataset.price),
                image: button.dataset.image,
                quantity: 1
            };

            const cart = getCart();
            const existingProduct = cart.find(function (item) {
                return item.id === product.id;
            });

            if (existingProduct) {
                existingProduct.quantity += 1;
            } else {
                cart.push(product);
            }

            saveCart(cart);
            updateCartCount();

            window.location.href = 'giohang.html';
        });
    });

    updateCartCount();
})();