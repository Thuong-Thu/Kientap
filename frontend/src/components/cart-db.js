(function () {
    const cartButtons = document.querySelectorAll('.demo-add-to-cart');

    cartButtons.forEach(function (button) {
        button.addEventListener('click', function () {
            const product = {
                id: button.dataset.id,
                name: button.dataset.name,
                price: Number(button.dataset.price),
                image: button.dataset.image
            };

            fetch('../backend/cart/add-to-cart.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(product)
            })
                .then(function (response) {
                    return response.json();
                })
                .then(function (result) {
                    if (result.success) {
                        alert('Đã thêm sản phẩm vào giỏ hàng!');
                        window.location.href = 'giohang.php';
                    } else {
                        alert(result.message || 'Không thể thêm vào giỏ hàng.');
                    }
                })
                .catch(function () {
                    alert('Lỗi kết nối đến server.');
                });
        });
    });
})();