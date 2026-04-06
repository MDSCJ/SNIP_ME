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

    const navToggle = document.querySelector('.nav-toggle');
    const navMenu = document.querySelector('.nav-bar ul');

    if (navToggle && navMenu) {
        navToggle.addEventListener('click', () => {
            navMenu.classList.toggle('open');
        });

        // Optional: Close menu when a link is clicked
        document.querySelectorAll('.nav-bar ul li a').forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('open');
            });
        });
    }
});


document.addEventListener('DOMContentLoaded', () => {
    const salonSlider = document.getElementById('salonSlider');
    const leftArrow = document.querySelector('.slider-btn.left');
    const rightArrow = document.querySelector('.slider-btn.right');

    // Load trending salons from API
    function loadTrendingSalons() {
        console.log('Loading trending salons...');
        
        // Determine API endpoint
        let apiRoot = '';
        
        if (typeof API_BASE_URL !== 'undefined' && API_BASE_URL) {
            apiRoot = API_BASE_URL;
        } else if (typeof AUTH_BASE_URL !== 'undefined' && AUTH_BASE_URL) {
            apiRoot = AUTH_BASE_URL.replace(/\/auth\/?$/, '');
        } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            apiRoot = 'http://localhost:8080/api';
        } else {
            apiRoot = 'https://snip-me.onrender.com/api';
        }

        const endpoint = apiRoot + '/public/salons/trending';
        console.log('API endpoint:', endpoint);

        fetch(endpoint)
            .then(res => {
                console.log('Response status:', res.status);
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                }
                return res.json();
            })
            .then(salons => {
                console.log('Salons received:', salons);
                if (Array.isArray(salons) && salons.length > 0) {
                    console.log(`Rendering ${salons.length} salons`);
                    renderTrendingSalons(salons);
                } else {
                    console.warn('No salons data received or invalid format');
                    removeSkeletons();
                    salonSlider.innerHTML = '<div style="padding: 40px; text-align: center; color: #f4c400;">No trending salons available at this time.</div>';
                }
            })
            .catch(err => {
                console.error('Error loading trending salons:', err);
                removeSkeletons();
                salonSlider.innerHTML = '<div style="padding: 40px; text-align: center; color: #ff6b6b;">⚠️ Failed to load trending salons: ' + err.message + '</div>';
            });
    }

    function renderTrendingSalons(salons) {
        console.log('Rendering salons...');
        removeSkeletons();
        
        salons.forEach((salon, index) => {
            const card = document.createElement('div');
            card.className = 'salon-card';
            
            // Build rating stars
            const rating = parseFloat(salon.rating) || 0;
            const fullStars = Math.floor(rating);
            let ratingHTML = '';
            for (let i = 0; i < 5; i++) {
                ratingHTML += i < fullStars ? '⭐' : '☆';
            }
            
            // Handle image
            const imageStyle = salon.photo ? `style="background-image: url('${sanitizeURL(salon.photo)}'); background-size: cover; background-position: center;"` : '';
            const noImageClass = salon.photo ? '' : ' no-image';
            
            card.innerHTML = `
                <h4 class="salon-title">${sanitizeHTML(salon.name)}</h4>
                <div class="salon-img${noImageClass}" ${imageStyle}>
                    ${!salon.photo ? '<i class="fas fa-image"></i>' : ''}
                </div>
                <div class="salon-services">
                    ${sanitizeHTML(salon.description || 'Professional salon services')}
                    <span class="view-more">View more</span>
                    <div class="more-services">${sanitizeHTML(salon.city || '')}</div>
                </div>
                <div class="salon-rating">${ratingHTML} (${rating.toFixed(1)})</div>
                <div class="salon-actions">
                    <button class="btn-view">View</button>
                    <button class="btn-book">Book Now</button>
                </div>
                <div class="salon-details">
                    📍 ${sanitizeHTML(salon.city || 'Location')} <br>
                    ${salon.openingTime && salon.closingTime ? `Open: ${salon.openingTime} - ${salon.closingTime}<br>` : ''}
                    ${sanitizeHTML(salon.description || 'Professional salon services')}
                </div>
            `;
            
            salonSlider.appendChild(card);
        });
        
        // Re-attach listeners to new cards
        attachViewMoreListeners();
        attachViewButtonListeners();
        attachBookButtonListeners();
        revealCards();
    }

    function removeSkeletons() {
        const skeletons = salonSlider.querySelectorAll('.skeleton-loader');
        skeletons.forEach(skeleton => skeleton.remove());
    }

    function sanitizeHTML(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function sanitizeURL(url) {
        // Basic URL validation
        try {
            new URL(url);
            return url;
        } catch {
            return '';
        }
    }

    function attachViewMoreListeners() {
        const buttons = salonSlider.querySelectorAll('.view-more');
        buttons.forEach((button) => {
            button.removeEventListener('click', null); // Remove old listeners
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
    }

    function attachViewButtonListeners() {
        const buttons = salonSlider.querySelectorAll('.btn-view');
        buttons.forEach((button) => {
            button.removeEventListener('click', null); // Remove old listeners
            button.addEventListener('click', () => {
                const currentCard = button.closest('.salon-card');
                if (!currentCard) return;
                currentCard.classList.toggle('active');
                button.textContent = currentCard.classList.contains('active')
                    ? 'Hide'
                    : 'View';
            });
        });
    }

    function attachBookButtonListeners() {
        const buttons = salonSlider.querySelectorAll('.btn-book');
        buttons.forEach((button) => {
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
    }

    function revealCards() {
        if (typeof ScrollReveal !== 'undefined') {
            ScrollReveal().reveal('.salon-card', { delay: 100, distance: '40px', origin: 'bottom', interval: 100 });
        }
    }

    // Load salons on page load
    loadTrendingSalons();

    // Slider navigation
    if (leftArrow && rightArrow) {
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

    // View more buttons (for static cards if any)
    const staticViewMoreButtons = document.querySelectorAll('.view-more:not(.salon-slider .view-more)');
    staticViewMoreButtons.forEach((button) => {
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

    // View buttons (for static cards if any)
    const staticViewButtons = document.querySelectorAll('.btn-view:not(.salon-slider .btn-view)');
    staticViewButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const currentCard = button.closest('.salon-card');
            if (!currentCard) return;
            currentCard.classList.toggle('active');
            button.textContent = currentCard.classList.contains('active')
                ? 'Hide'
                : 'View';
        });
    });

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
});