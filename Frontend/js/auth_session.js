document.addEventListener('DOMContentLoaded', function () {
    function isValidJwt(token) {
        if (!token || token.split('.').length !== 3) return false;
        try {
            var payloadPart = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
            var payload = JSON.parse(atob(payloadPart));
            if (!payload.exp) return false;
            return (payload.exp * 1000) > Date.now();
        } catch (e) {
            return false;
        }
    }

    var customerLogged = localStorage.getItem('snipmeCustomerLoggedIn') === 'true';
    var ownerLogged = localStorage.getItem('snipmeOwnerLoggedIn') === 'true';
    var adminLogged = localStorage.getItem('snipmeAdminLoggedIn') === 'true';

    var ownerToken = localStorage.getItem('snipmeOwnerToken');
    var adminToken = localStorage.getItem('snipmeAdminToken');

    var ownerSessionValid = ownerLogged && ownerToken && isValidJwt(ownerToken);
    var adminSessionValid = adminLogged && adminToken && isValidJwt(adminToken);

    // Clean invalid sessions
    if (!ownerSessionValid) {
        localStorage.removeItem('snipmeOwnerLoggedIn');
        localStorage.removeItem('snipmeOwnerToken');
        localStorage.removeItem('snipmeOwnerEmail');
        localStorage.removeItem('snipmeOwnerName');
        localStorage.removeItem('snipmeOwnerSalonName');
        localStorage.removeItem('snipmeOwnerUserId');
        localStorage.removeItem('snipmeOwnerPhone');
        ownerLogged = false;
    }
    if (!customerLogged) {
        localStorage.removeItem('snipmeCustomerUserId');
        localStorage.removeItem('customerID');
        sessionStorage.removeItem('customerID');
    }
    if (!adminSessionValid) {
        localStorage.removeItem('snipmeAdminLoggedIn');
        localStorage.removeItem('snipmeAdminToken');
        localStorage.removeItem('snipmeAdminEmail');
        localStorage.removeItem('snipmeAdminName');
        adminLogged = false;
    }

    var navBar = document.querySelector('.nav-bar');

    function createPill(id, labelId, labelClass) {
        var existing = document.getElementById(id);
        if (existing) return existing;
        var pill = document.createElement('div');
        pill.id = id;
        pill.className = 'customer-session-pill';

        var text = document.createElement('span');
        text.id = labelId;
        text.className = labelClass || 'customer-session-label';

        var logoutBtn = document.createElement('button');
        logoutBtn.type = 'button';
        logoutBtn.className = 'customer-logout-btn';
        logoutBtn.title = 'Logout';
        logoutBtn.setAttribute('aria-label', 'Logout');
        logoutBtn.textContent = '\u23FB';

        pill.appendChild(text);
        pill.appendChild(logoutBtn);
        document.body.appendChild(pill);

        // Ensure pill is positioned under the nav bar like customer session pill
        function updatePillTop() {
            try {
                if (!pill || !navBar) return;
                var navRect = navBar.getBoundingClientRect();
                var topOffset = Math.max(navRect.bottom + 10, 10);
                pill.style.top = topOffset + 'px';
            } catch (e) {
                // ignore
            }
        }

        // Keep position updated on scroll/resize
        window.addEventListener('scroll', updatePillTop, { passive: true });
        window.addEventListener('resize', updatePillTop);
        // update once now
        setTimeout(updatePillTop, 10);

        return pill;
    }

    function renderAdminPill() {
        var name = localStorage.getItem('snipmeAdminName') || 'Admin';
        var pill = createPill('adminSessionPill', 'adminSessionLabel');
        var label = document.getElementById('adminSessionLabel');
        pill.querySelector('.customer-logout-btn').addEventListener('click', function () {
            if (!confirm('Do you need to logout?')) return;
            localStorage.removeItem('snipmeAdminLoggedIn');
            localStorage.removeItem('snipmeAdminToken');
            localStorage.removeItem('snipmeAdminEmail');
            localStorage.removeItem('snipmeAdminName');
            window.location.href = (window.location.pathname.indexOf('/Frontend/') !== -1) ? 'admin-login.html' : 'Frontend/admin-login.html';
        });
        label.textContent = 'Logged in as ' + name;
        pill.classList.add('visible');
        // position update
        try { var navRect = navBar && navBar.getBoundingClientRect(); if (navRect) pill.style.top = Math.max(navRect.bottom + 10, 10) + 'px'; } catch(e){}
    }

    function renderOwnerPill() {
        var name = localStorage.getItem('snipmeOwnerName') || 'Salon Owner';
        var pill = createPill('ownerSessionPill', 'ownerSessionLabel');
        var label = document.getElementById('ownerSessionLabel');
        pill.querySelector('.customer-logout-btn').addEventListener('click', function () {
            if (!confirm('Do you need to logout?')) return;
            localStorage.removeItem('snipmeOwnerLoggedIn');
            localStorage.removeItem('snipmeOwnerToken');
            localStorage.removeItem('snipmeOwnerEmail');
            localStorage.removeItem('snipmeOwnerName');
            localStorage.removeItem('snipmeOwnerSalonName');
            localStorage.removeItem('snipmeOwnerUserId');
            localStorage.removeItem('snipmeOwnerPhone');
            window.location.href = (window.location.pathname.indexOf('/Frontend/') !== -1) ? 'salon-owner-login.html' : 'Frontend/salon-owner-login.html';
        });
        label.textContent = 'Logged in as ' + name;
        pill.classList.add('visible');
        try { var navRect = navBar && navBar.getBoundingClientRect(); if (navRect) pill.style.top = Math.max(navRect.bottom + 10, 10) + 'px'; } catch(e){}
    }

    // If any session exists, remove general login links/buttons from DOM
    var anyLogged = (localStorage.getItem('snipmeCustomerLoggedIn') === 'true') || (localStorage.getItem('snipmeOwnerLoggedIn') === 'true') || (localStorage.getItem('snipmeAdminLoggedIn') === 'true');

    if (anyLogged) {
        // Remove only the login nav item container so no extra empty spacing remains.
        document.querySelectorAll('.nav-bar li a[href$="login.html"]').forEach(function (a) {
            const href = a.getAttribute('href') || '';
            if (href.indexOf('admin-dashboard') !== -1 || href.indexOf('Salon-Owner-Dashboard') !== -1) {
                return;
            }

            const li = a.closest('li');
            if (li) {
                li.remove();
            } else {
                a.remove();
            }
        });

        // Remove role groups on login page from DOM
        document.querySelectorAll('.role-group').forEach(function (g) { g.remove(); });

        // Remove login buttons that navigate to specific login pages (keep dashboard buttons)
        document.querySelectorAll('button[onclick]').forEach(function (b) {
            var onclick = b.getAttribute('onclick') || '';
            if (onclick.indexOf('admin-login.html') !== -1 || onclick.indexOf('salon-owner-login.html') !== -1 || onclick.indexOf('customer_login.html') !== -1) {
                b.remove();
            }
        });
    }

    if (adminLogged) {
        renderAdminPill();
    }
    if (ownerLogged) {
        renderOwnerPill();
    }
});
