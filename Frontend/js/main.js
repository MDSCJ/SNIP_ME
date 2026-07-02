// js/main.js

const GLASS_MODE_KEY = 'snipmeGlassMode';

function getSavedGlassMode() {
    return localStorage.getItem(GLASS_MODE_KEY) === 'true';
}

function setGlassMode(enabled) {
    document.body.classList.toggle('glass-theme', enabled);
    localStorage.setItem(GLASS_MODE_KEY, enabled ? 'true' : 'false');
}

function initGlobalTheme() {
    setGlassMode(getSavedGlassMode());
    window.setGlassMode = setGlassMode;
}

initGlobalTheme();

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
    let trendingRetryTimer = null;

    // Load trending salons from API
    function loadTrendingSalons() {
        console.log('Loading trending salons...');
        ensureSkeletonsFillViewport();
        
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
                    clearRetryTimer();
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
                // Keep skeletons visible forever while backend is unavailable.
                ensureSkeletonsFillViewport();
                scheduleTrendingRetry();
            });
    }

    function clearRetryTimer() {
        if (trendingRetryTimer) {
            clearTimeout(trendingRetryTimer);
            trendingRetryTimer = null;
        }
    }

    function scheduleTrendingRetry() {
        if (trendingRetryTimer) {
            return;
        }
        trendingRetryTimer = setTimeout(() => {
            trendingRetryTimer = null;
            loadTrendingSalons();
        }, 5000);
    }

    function buildSkeletonCard() {
        const card = document.createElement('div');
        card.className = 'salon-card skeleton-loader';
        card.innerHTML = `
            <div class="skeleton-title"></div>
            <div class="skeleton-img"></div>
            <div class="skeleton-services"></div>
            <div class="skeleton-rating"></div>
            <div class="skeleton-buttons"></div>
        `;
        return card;
    }

    function ensureSkeletonsFillViewport() {
        const sliderWidth = salonSlider.clientWidth || Math.floor(window.innerWidth * 0.9);
        const approxCardWidthWithGap = 320;
        const requiredCount = Math.max(3, Math.ceil(sliderWidth / approxCardWidthWithGap) + 1);
        const existingSkeletons = salonSlider.querySelectorAll('.skeleton-loader');

        if (existingSkeletons.length > 0) {
            if (existingSkeletons.length < requiredCount) {
                for (let i = existingSkeletons.length; i < requiredCount; i++) {
                    salonSlider.appendChild(buildSkeletonCard());
                }
            }
            return;
        }

        salonSlider.innerHTML = '';
        for (let i = 0; i < requiredCount; i++) {
            salonSlider.appendChild(buildSkeletonCard());
        }
    }

    function renderTrendingSalons(salons) {
        console.log('Rendering salons...');
        removeSkeletons();
        
        salons.forEach((salon, index) => {
            const card = document.createElement('div');
            card.className = 'salon-card';
            const sid = salon.salonID || salon.id || salon.SalonID || salon.salonId || '';
            if (sid) card.dataset.salonId = sid;
            
            // Build rating stars
            const rating = parseFloat(salon.rating) || 0;
            const numberOfRatings = Number.isFinite(Number(salon.numberOfRatings)) ? Number(salon.numberOfRatings) : 0;
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
                <div class="salon-rating">${ratingHTML} (${numberOfRatings} ratings)</div>
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

                // Use the numeric salon id if available, otherwise fall back to slug
                const cardSalonId = currentCard?.dataset?.salonId;
                if (cardSalonId) {
                    sessionStorage.setItem('selectedSalonId', cardSalonId);
                } else {
                    sessionStorage.setItem('selectedSalonId', salonName.toLowerCase().replace(/\s+/g, '-'));
                }
                sessionStorage.setItem('selectedSalonName', salonName);
                sessionStorage.setItem('selectedSalonDesc', salonDescription);
                sessionStorage.setItem('selectedServices', JSON.stringify(allServices));

                if (isLoggedIn === 'true') {
                    // Navigate to booking page and include salonId query param when available
                    const target = cardSalonId ? `Frontend/booking.html?salonId=${encodeURIComponent(cardSalonId)}` : 'Frontend/booking.html';
                    window.location.href = target;
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

    window.addEventListener('resize', () => {
        ensureSkeletonsFillViewport();
    });

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

    // ===== SEARCH FUNCTIONALITY =====
    const searchResultsSection = document.getElementById('searchResultsSection');
    const searchResultsContainer = document.getElementById('searchResultsContainer');
    const sortRatingBtn = document.getElementById('sortRatingBtn');
    const sortPriceBtn = document.getElementById('sortPriceBtn');
    const distanceRange = document.getElementById('distanceRange');
    const distanceValue = document.getElementById('distanceValue');
    const searchBtn = document.querySelector('.btn-search-round');
    const refreshSearchBtn = document.getElementById('refreshSearchBtn');
    const locationInput = document.getElementById('location');
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    const pageInfo = document.getElementById('pageInfo');

    let userLocation = null;
    let currentSortBy = 'rating';
    let currentRadius = 5;
    let currentPage = 0;
    let currentSearchResults = [];
    let apiRoot = '';
    const LOCATION_CACHE_KEY = 'snipmeUserLocation';
    const DEFAULT_LOCATION = {
        latitude: 7.8731,
        longitude: 80.7718
    };

    // Determine API root
    if (typeof API_BASE_URL !== 'undefined' && API_BASE_URL) {
        apiRoot = API_BASE_URL;
    } else if (typeof AUTH_BASE_URL !== 'undefined' && AUTH_BASE_URL) {
        apiRoot = AUTH_BASE_URL.replace(/\/auth\/?$/, '');
    } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        apiRoot = 'http://localhost:8080/api';
    } else {
        apiRoot = 'https://snip-me.onrender.com/api';
    }

    function getCachedLocation() {
        try {
            const raw = localStorage.getItem(LOCATION_CACHE_KEY);
            if (!raw) {
                return null;
            }
            const parsed = JSON.parse(raw);
            if (!Number.isFinite(parsed.latitude) || !Number.isFinite(parsed.longitude)) {
                return null;
            }
            return {
                latitude: Number(parsed.latitude),
                longitude: Number(parsed.longitude)
            };
        } catch {
            return null;
        }
    }

    function cacheLocation(location) {
        try {
            localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(location));
        } catch {
            // Ignore storage errors (private mode / storage disabled).
        }
    }

    function getUserLocation() {
        userLocation = getCachedLocation();
    }

    function parseLocationCoordinates(rawLocation) {
        if (!rawLocation) {
            return null;
        }

        const match = rawLocation.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
        if (!match) {
            return null;
        }

        const latitude = Number(match[1]);
        const longitude = Number(match[2]);

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            return null;
        }

        return { latitude, longitude };
    }

    function getSearchLocation() {
        const locationValue = (locationInput?.value || '').trim();
        const parsedLocation = parseLocationCoordinates(locationValue);

        userLocation = parsedLocation;

        return {
            latitude: parsedLocation ? parsedLocation.latitude : null,
            longitude: parsedLocation ? parsedLocation.longitude : null,
            locationQuery: parsedLocation || !locationValue ? '' : locationValue
        };
    }

    // Update distance display
    distanceRange.addEventListener('input', (e) => {
        currentRadius = parseInt(e.target.value);
        distanceValue.textContent = currentRadius;
        e.target.style.setProperty('--value', (currentRadius / 50) * 100 + '%');

        // Reload search with the new radius when results are already visible.
        if (currentSearchResults.length > 0) {
            currentPage = 0;
            performSearch();
        }
    });

    if (refreshSearchBtn) {
        refreshSearchBtn.addEventListener('click', () => {
            currentPage = 0;
            performSearch();
        });
    }

    // Sort by rating
    sortRatingBtn.addEventListener('click', () => {
        currentSortBy = 'rating';
        sortRatingBtn.classList.add('active');
        sortPriceBtn.classList.remove('active');
        currentPage = 0;
        if (searchResultsSection.style.display === 'block') {
            performSearch();
        }
    });

    // Sort by price
    sortPriceBtn.addEventListener('click', () => {
        currentSortBy = 'price';
        sortPriceBtn.classList.add('active');
        sortRatingBtn.classList.remove('active');
        currentPage = 0;
        if (searchResultsSection.style.display === 'block') {
            performSearch();
        }
    });

    // Perform search
    function performSearch() {
        const searchLocation = getSearchLocation();
        const treatmentValue = (treatmentSelect?.value || '').trim();

        console.log('Searching with:', {
            lat: searchLocation.latitude,
            lng: searchLocation.longitude,
            treatment: treatmentValue,
            location: searchLocation.locationQuery,
            radius: currentRadius,
            sortBy: currentSortBy
        });

        const params = new URLSearchParams();
        if (Number.isFinite(searchLocation.latitude) && Number.isFinite(searchLocation.longitude)) {
            params.set('latitude', String(searchLocation.latitude));
            params.set('longitude', String(searchLocation.longitude));
            params.set('radiusKm', String(currentRadius));
        }
        if (treatmentValue) {
            params.set('treatment', treatmentValue);
        }
        if (searchLocation.locationQuery) {
            params.set('location', searchLocation.locationQuery);
        }
        params.set('sortBy', currentSortBy);
        params.set('page', String(currentPage));

        const endpoint = apiRoot + '/public/salons/search?' + params.toString();

        fetch(endpoint)
            .then(res => res.json())
            .then(data => {
                if (data.salons && data.salons.length > 0) {
                    currentSearchResults = data.salons;
                    console.log('Search results:', currentSearchResults);
                    searchResultsSection.style.display = 'block';
                    displaySearchResults(data);
                } else {
                    currentSearchResults = [];
                    searchResultsSection.style.display = 'block';
                    const hasLocationFilter = Number.isFinite(searchLocation.latitude) && Number.isFinite(searchLocation.longitude);
                    const hasTreatmentFilter = Boolean(treatmentValue);
                    const hasTextLocationFilter = Boolean(searchLocation.locationQuery);
                    const hasNarrowFilters = hasLocationFilter || hasTreatmentFilter || hasTextLocationFilter;
                    const emptyMessage = hasNarrowFilters
                        ? 'No salons matched your filters. Try widening the search or increasing the distance range.'
                        : 'No salons available right now. Try again later.';

                    searchResultsContainer.innerHTML = '<div style="grid-column: 1/-1; padding: 40px; text-align: center; color: #f4c400;">' + emptyMessage + '</div>';
                    pageInfo.innerHTML = '';
                    prevPageBtn.style.display = 'none';
                    nextPageBtn.style.display = 'none';
                }
            })
            .catch(err => {
                console.error('Search error:', err);
                currentSearchResults = [];
                searchResultsSection.style.display = 'block';
                searchResultsContainer.innerHTML = '<div style="grid-column: 1/-1; padding: 40px; text-align: center; color: #ff6b6b;">Error searching salons: ' + err.message + '</div>';
            });
    }

    // Display search results
    function displaySearchResults(data) {
        if (!data || !data.salons || data.salons.length === 0) {
            searchResultsContainer.innerHTML = '<div style="grid-column: 1/-1; padding: 40px; text-align: center; color: #f4c400;">No results found</div>';
            return;
        }

        searchResultsContainer.innerHTML = '';
        
        data.salons.forEach(salon => {
            const card = document.createElement('div');
            card.className = 'search-result-card';
            const sid = salon.salonID || salon.id || salon.SalonID || salon.salonId || '';
            if (sid) card.dataset.salonId = sid;

            const rating = parseFloat(salon.rating) || 0;
            const numberOfRatings = Number.isFinite(Number(salon.numberOfRatings)) ? Number(salon.numberOfRatings) : 0;
            const fullStars = Math.floor(rating);
            let ratingHTML = '';
            for (let i = 0; i < 5; i++) {
                ratingHTML += i < fullStars ? '⭐' : '☆';
            }

            const imageStyle = salon.photo ? `style="background-image: url('${sanitizeURL(salon.photo)}'); background-size: cover; background-position: center;"` : '';
            const noImageClass = salon.photo ? '' : ' no-image';
            const distance = salon.distance ? salon.distance.toFixed(1) : 'N/A';

            card.innerHTML = `
                <div class="search-result-img${noImageClass}" ${imageStyle}>
                    ${!salon.photo ? '<i class="fas fa-image"></i>' : ''}
                </div>
                <div class="search-result-content">
                    <div class="search-result-header">
                        <h3 class="search-result-title">${sanitizeHTML(salon.name)}</h3>
                        <span class="search-result-distance">${distance} km</span>
                    </div>
                    <div class="search-result-location">
                        📍 ${sanitizeHTML(salon.city || 'Location')}
                    </div>
                    <div class="search-result-rating">
                        ${ratingHTML} (${numberOfRatings} ratings)
                    </div>
                    <div class="search-result-hours">
                        ${salon.openingTime && salon.closingTime ? '⏰ ' + salon.openingTime + ' - ' + salon.closingTime : ''}
                    </div>
                    <div class="search-result-description">
                        ${sanitizeHTML(salon.description || 'Professional salon services')}
                    </div>
                    <div class="search-result-actions">
                        <button class="btn-view">View</button>
                        <button class="btn-book">Book Now</button>
                    </div>
                </div>
            `;

            searchResultsContainer.appendChild(card);
        });

        // Attach event listeners to buttons
        attachSearchResultListeners();

        // Update pagination info
        const totalCount = data.totalCount || 0;
        const hasMore = data.hasMore || false;
        const pageNum = (data.currentPage || 0) + 1;
        const totalPages = Math.ceil(totalCount / 10);
        
        pageInfo.innerHTML = `Page ${pageNum} of ${totalPages} (${totalCount} salons)`;
        
        if (currentPage > 0) {
            prevPageBtn.style.display = 'inline-block';
        } else {
            prevPageBtn.style.display = 'none';
        }

        if (hasMore) {
            nextPageBtn.style.display = 'inline-block';
        } else {
            nextPageBtn.style.display = 'none';
        }
    }

    // Attach listeners to search result cards
    function attachSearchResultListeners() {
        const viewButtons = searchResultsContainer.querySelectorAll('.btn-view');
        const bookButtons = searchResultsContainer.querySelectorAll('.btn-book');

        viewButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const card = btn.closest('.search-result-card');
                card.classList.toggle('expanded');
                btn.textContent = card.classList.contains('expanded') ? 'Hide' : 'View';
            });
        });

        bookButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const card = btn.closest('.search-result-card');
                const salonName = card.querySelector('.search-result-title')?.textContent.trim() || 'Salon';
                const salonDescription = card.querySelector('.search-result-description')?.textContent.trim() || '';
                
                const isLoggedIn = localStorage.getItem('snipmeCustomerLoggedIn');

                const cardSalonId = card.dataset?.salonId;
                if (cardSalonId) {
                    sessionStorage.setItem('selectedSalonId', cardSalonId);
                } else {
                    sessionStorage.setItem('selectedSalonId', salonName.toLowerCase().replace(/\s+/g, '-'));
                }
                sessionStorage.setItem('selectedSalonName', salonName);
                sessionStorage.setItem('selectedSalonDesc', salonDescription);
                sessionStorage.setItem('selectedServices', JSON.stringify([]));

                if (isLoggedIn === 'true') {
                    const target = cardSalonId ? `Frontend/booking.html?salonId=${encodeURIComponent(cardSalonId)}` : 'Frontend/booking.html';
                    window.location.href = target;
                } else {
                    window.location.href = 'Frontend/customer_login.html';
                }
            });
        });
    }

    // Search button click
    searchBtn.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Validate date: must be tomorrow or later
        var dateVal = document.getElementById('date') ? document.getElementById('date').value : '';
        if (dateVal) {
            var today = new Date();
            today.setHours(0, 0, 0, 0);
            var todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
            if (dateVal === todayStr) {
                alert('Cannot search for today. Please select a date from tomorrow onwards.');
                return;
            }
            if (dateVal < todayStr) {
                alert('Please select a date from tomorrow onwards.');
                return;
            }
        }
        
        currentPage = 0;
        performSearch();
    });

    // Pagination handlers
    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 0) {
            currentPage--;
            performSearch();
        }
    });

    nextPageBtn.addEventListener('click', () => {
        currentPage++;
        performSearch();
    });

    // Initialize user location on page load
    getUserLocation();
});