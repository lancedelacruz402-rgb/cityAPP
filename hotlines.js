
document.addEventListener("DOMContentLoaded", function () {

    // ====================================
    // HOTLINE CATEGORY FILTER
    // ====================================

    const filterButtons = document.querySelectorAll(".filter-btn");
    const hotlineCards = document.querySelectorAll(".hotline-card");

    filterButtons.forEach(function (button) {

        button.addEventListener("click", function () {

            const selectedCategory = button.dataset.filter;

            // Active button
            filterButtons.forEach(function (btn) {
                btn.classList.remove("active");
            });

            button.classList.add("active");

            // Show / hide hotline cards
            hotlineCards.forEach(function (card) {

                const cardCategory = card.dataset.category;

                if (
                    selectedCategory === "all" ||
                    selectedCategory === cardCategory
            ) {
                    card.classList.remove("hide-card");
                } else {
                    card.classList.add("hide-card");
                }

            });

        });

    });


    // ====================================
    // COPY HOTLINE NUMBER
    // ====================================

    const copyButtons = document.querySelectorAll(".copy-hotline");

    copyButtons.forEach(function (button) {

        button.addEventListener("click", async function () {

            const number = button.dataset.number;

            try {

                await navigator.clipboard.writeText(number);

                const originalText = button.innerText;

                button.innerText = "✓ Copied!";

                setTimeout(function () {
                    button.innerText = originalText;
                }, 1500);

            } catch (error) {

                // Fallback copy method
                const input = document.createElement("textarea");

                input.value = number;
                document.body.appendChild(input);

                input.select();
                document.execCommand("copy");

                document.body.removeChild(input);

                button.innerText = "✓ Copied!";

                setTimeout(function () {
                    button.innerText = "▣ " + number;
                }, 1500);

            }

        });

    });

});
