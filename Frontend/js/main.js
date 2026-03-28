// js/main.js

document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. Active Tab Highlighter ---
    const currentLocation = location.href;
    const menuItem = document.querySelectorAll('.nav-links a');
    const menuLength = menuItem.length;

    for (let i = 0; i < menuLength; i++) {
        if (menuItem[i].href === currentLocation) {
            menuItem[i].className = "active";
        }
    }

    // --- 2. Hamburger Menu Toggle ---
    const hamburger = document.querySelector(".hamburger");
    const navMenu = document.querySelector(".nav-links");

    hamburger.addEventListener("click", () => {
        hamburger.classList.toggle("active");
        navMenu.classList.toggle("active");
    });

    // Close menu when a link is clicked
    document.querySelectorAll(".nav-links a").forEach(n => n.addEventListener("click", () => {
        hamburger.classList.remove("active");
        navMenu.classList.remove("active");
    }));
});

// =========================
// SALON CARD FEATURES
// =========================

document.addEventListener('DOMContentLoaded', () => {
    const salonSlider = document.getElementById('salonSlider');
    const leftArrow = document.querySelector('.slider-btn.left');
    const rightArrow = document.querySelector('.slider-btn.right');

    if (salonSlider && leftArrow && rightArrow) {
        leftArrow.addEventListener('click', () => {
            salonSlider.scrollBy({
                left: -320,
                behavior: 'smooth'
            });
        });

        rightArrow.addEventListener('click', () => {
            salonSlider.scrollBy({
                left: 320,
                behavior: 'smooth'
            });
        });
    }

    const viewMoreButtons = document.querySelectorAll('.view-more');

    viewMoreButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const serviceBlock = button.closest('.salon-services');

            if (serviceBlock) {
                serviceBlock.classList.toggle('active');
                button.textContent = serviceBlock.classList.contains('active')
                    ? 'Show less'
                    : 'View more';
            }
        });
    });

    const viewButtons = document.querySelectorAll('.btn-view');

    viewButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const currentCard = button.closest('.salon-card');

            if (!currentCard) return;

            currentCard.classList.toggle('active');

            button.textContent = currentCard.classList.contains('active')
                ? 'Hide'
                : 'View';
        });
    });

    const bookButtons = document.querySelectorAll('.btn-book');

    bookButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const isLoggedIn = localStorage.getItem('snipmeCustomerLoggedIn');

            if (isLoggedIn === 'true') {
                window.location.href = 'Frontend/booking.html';
            } else {
                window.location.href = 'Frontend/customer_login.html';
            }
        });
    });
});