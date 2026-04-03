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
    const hamburger = document.querySelector(".hamburger") || document.querySelector(".nav-toggle");
    const navMenu = document.querySelector(".nav-links") || document.querySelector(".nav-bar ul");

    if (hamburger && navMenu) {
        hamburger.addEventListener("click", () => {
            hamburger.classList.toggle("active");
            navMenu.classList.toggle("active");
            navMenu.classList.toggle("open");
        });

        // Close menu when a link is clicked
        document.querySelectorAll(".nav-bar ul a, .nav-links a").forEach(n => n.addEventListener("click", () => {
            hamburger.classList.remove("active");
            navMenu.classList.remove("active");
            navMenu.classList.remove("open");
        }));
    }
});


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

    const treatmentSelect = document.getElementById('treatment');
    if (treatmentSelect) {
        const apiRoot = typeof AUTH_BASE_URL === 'string'
            ? AUTH_BASE_URL.replace(/\/auth\/?$/, '')
            : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                ? 'http://localhost:8080/api'
                : 'https://snip-me.onrender.com/api');

        fetch(apiRoot + '/public/services/search-options')
            .then(res => res.json())
            .then(options => {
                if (!Array.isArray(options)) {
                    return;
                }

                treatmentSelect.innerHTML = '';

                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = 'All treatments and venues';
                treatmentSelect.appendChild(defaultOption);

                options.forEach(option => {
                    const opt = document.createElement('option');
                    opt.value = option;
                    opt.textContent = option;
                    treatmentSelect.appendChild(opt);
                });
            })
            .catch(() => {
                // Keep fallback options already embedded in HTML.
            });
    }

    bookButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const isLoggedIn = localStorage.getItem('snipmeCustomerLoggedIn');
            const currentCard = button.closest('.salon-card');

            if (!currentCard) return;

            const salonName = currentCard.querySelector('.salon-title')?.textContent.trim() || 'Salon';
            const salonDescription = currentCard.querySelector('.salon-details')?.textContent.trim() || 'Professional salon services';

            const servicesText = currentCard.querySelector('.salon-services')?.childNodes[0]?.textContent.trim() || '';
            const moreServicesText = currentCard.querySelector('.more-services')?.textContent.trim() || '';

            const allServices = (servicesText + ',' + moreServicesText)
               .split('•')
               .join(',')
               .split(',')
               .map(service => service.trim())
               .filter(service => service.length > 0 && service.toLowerCase() !== 'view more');

            sessionStorage.setItem('selectedSalonId', salonName.toLowerCase().replace(/\s+/g, '-'));
            sessionStorage.setItem('selectedSalonName', salonName);
            sessionStorage.setItem('selectedSalonDesc', salonDescription);
            sessionStorage.setItem('selectedServices', JSON.stringify(allServices));

            if (isLoggedIn === 'true') {
                window.location.href = 'Frontend/booking.html';
            }   else {
                window.location.href = 'Frontend/customer_login.html';
           }
        });
    });
});