document.addEventListener("DOMContentLoaded", function () {
    var LOGIN_FLAG_KEY = "snipmeCustomerLoggedIn";
    var USERNAME_KEY   = "snipmeCustomerUsername";
    var PASSWORD_KEY   = "snipmeCustomerPassword";

    var isLoggedIn = localStorage.getItem(LOGIN_FLAG_KEY) === "true";

    // Redirect to login if not authenticated
    if (!isLoggedIn) {
        alert("Please log in to access Settings.");
        window.location.href = "customer_login.html";
        return;
    }

    // --- Hide "Current Password" field when already logged in ---
    var currentPwGroup = document.getElementById("currentPwGroup");
    if (currentPwGroup) {
        currentPwGroup.style.display = "none";
    }

    // --- Prefill current username ---
    var newUsernameInput = document.getElementById("newUsername");
    var savedUsername = localStorage.getItem(USERNAME_KEY) || "";
    if (newUsernameInput) {
        newUsernameInput.value = savedUsername;
    }

    // --- Show message helper ---
    function showMsg(elId, text, isError) {
        var el = document.getElementById(elId);
        if (!el) return;
        el.textContent = text;
        el.className = "settings-msg " + (isError ? "msg-error" : "msg-success");
        setTimeout(function () { el.className = "settings-msg hidden"; }, 4000);
    }

    // ========= 1. Change Username =========
    var changeUsernameForm = document.getElementById("changeUsernameForm");
    if (changeUsernameForm) {
        changeUsernameForm.addEventListener("submit", function (e) {
            e.preventDefault();
            var val = newUsernameInput ? newUsernameInput.value.trim() : "";
            if (!val) {
                showMsg("usernameMsg", "Username cannot be empty.", true);
                return;
            }
            if (val.length < 3) {
                showMsg("usernameMsg", "Username must be at least 3 characters.", true);
                return;
            }
            localStorage.setItem(USERNAME_KEY, val);
            window.isCustomerLoggedIn = true;
            window.dispatchEvent(new Event("customer-auth-changed"));
            showMsg("usernameMsg", "Username updated successfully!", false);
        });
    }

    // ========= 2. Change Password =========
    var changePasswordForm = document.getElementById("changePasswordForm");
    if (changePasswordForm) {
        changePasswordForm.addEventListener("submit", function (e) {
            e.preventDefault();

            var currentInput    = document.getElementById("currentPassword");
            var newPwInput      = document.getElementById("newPassword");
            var confirmPwInput  = document.getElementById("confirmNewPassword");

            var newPw    = newPwInput    ? newPwInput.value.trim()    : "";
            var confirmPw= confirmPwInput? confirmPwInput.value.trim(): "";

            // Only verify current password when NOT logged in
            if (!isLoggedIn && currentInput) {
                var enteredCurrent = currentInput.value.trim();
                var storedEncoded  = localStorage.getItem(PASSWORD_KEY) || "";
                var storedDecoded  = storedEncoded ? atob(storedEncoded) : "";
                if (!enteredCurrent || enteredCurrent !== storedDecoded) {
                    showMsg("passwordMsg", "Current password is incorrect.", true);
                    return;
                }
            }

            if (!newPw) {
                showMsg("passwordMsg", "New password cannot be empty.", true);
                return;
            }
            if (newPw.length < 6) {
                showMsg("passwordMsg", "New password must be at least 6 characters.", true);
                return;
            }
            if (newPw !== confirmPw) {
                showMsg("passwordMsg", "Passwords do not match.", true);
                return;
            }

            localStorage.setItem(PASSWORD_KEY, btoa(newPw));
            showMsg("passwordMsg", "Password updated successfully!", false);

            if (newPwInput)     newPwInput.value     = "";
            if (confirmPwInput) confirmPwInput.value = "";
        });
    }

    // ========= 3. Delete Account =========
    var deleteBtn = document.getElementById("deleteAccountBtn");
    if (deleteBtn) {
        deleteBtn.addEventListener("click", function () {
            var confirmed = confirm("Are you sure you want to permanently delete your account? This cannot be undone.");
            if (!confirmed) return;

            localStorage.removeItem(LOGIN_FLAG_KEY);
            localStorage.removeItem(USERNAME_KEY);
            localStorage.removeItem(PASSWORD_KEY);
            localStorage.removeItem("snipmeCustomerEmail");

            window.isCustomerLoggedIn = false;
            window.dispatchEvent(new Event("customer-auth-changed"));

            alert("Your account has been deleted.");
            window.location.href = "customer_login.html";
        });
    }

    // ========= 4. Tab Navigation =========
    var tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            var tabName = this.getAttribute('data-tab');
            
            // Remove active class from all tabs and buttons
            document.querySelectorAll('.tab-btn').forEach(function(b) {
                b.classList.remove('active');
            });
            document.querySelectorAll('.tab-content').forEach(function(content) {
                content.classList.remove('active');
            });
            
            // Add active class to clicked tab and content
            this.classList.add('active');
            document.getElementById(tabName + '-tab').classList.add('active');
            
            // Load bookings if switching to bookings tab
            if (tabName === 'bookings') {
                loadBookings();
            }
        });
    });

    // ========= 5. Bookings Management =========
    var dbBookings = [];

    // Remove legacy local cache so stale snippets do not appear.
    localStorage.removeItem('userBookings');

    function getCustomerIdFromSession() {
        return localStorage.getItem('customerID')
            || localStorage.getItem('snipmeCustomerUserId')
            || sessionStorage.getItem('customerID');
    }

    function renderNoBookings(bookingsContainer) {
        bookingsContainer.innerHTML = `
            <div class="no-bookings-wrap">
                <p class="no-bookings">No bookings yet.</p>
                <a href="booking.html" class="continue-search-btn">Continue Searching</a>
            </div>
        `;
    }

    function formatBookingDate(rawDate) {
        var dt = rawDate ? new Date(rawDate) : null;
        if (!dt || isNaN(dt.getTime())) return '-';
        return dt.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    function formatSlotTime(rawDate) {
        if (!rawDate) return '-';
        var dt = new Date(rawDate);
        if (isNaN(dt.getTime())) return '-';
        var hh = dt.getHours();
        var mm = String(dt.getMinutes()).padStart(2, '0');
        var hh2 = (hh + 1) % 24;
        return String(hh).padStart(2, '0') + ':' + mm + ' - ' + String(hh2).padStart(2, '0') + ':' + mm;
    }

    function loadBookings() {
        var bookingsContainer = document.getElementById('bookingsContainer');
        var customerId = getCustomerIdFromSession();

        if (!customerId) {
            renderNoBookings(bookingsContainer);
            return;
        }

        fetch(API_BASE_URL + '/bookings/customer?customerID=' + encodeURIComponent(customerId), {
            method: 'GET'
        })
        .then(function(response) {
            if (!response.ok) throw new Error('Failed to load bookings');
            return response.json();
        })
        .then(function(bookings) {
            dbBookings = Array.isArray(bookings) ? bookings : [];

            if (dbBookings.length === 0) {
                renderNoBookings(bookingsContainer);
                return;
            }

            // Split into upcoming (today or future) and past
            var todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            var upcoming = [];
            var past     = [];

            dbBookings.forEach(function(booking, index) {
                var slotDate = booking.slotStartTime ? new Date(booking.slotStartTime) : null;
                // If no slot date, treat as upcoming so it's always visible
                if (!slotDate || isNaN(slotDate.getTime()) || slotDate >= todayStart) {
                    upcoming.push({ booking: booking, index: index });
                } else {
                    past.push({ booking: booking, index: index });
                }
            });

            function buildCard(booking, index) {
                var formattedDate = formatBookingDate(booking.slotStartTime || booking.bookingDate);
                var status        = String(booking.status || '').toUpperCase();
                var statusClass   = (status === 'CANCELED' || status === 'CANCELLED') ? 'status-canceled' : 'status-confirmed';
                var paymentText   = booking.paymentStatus ? ('Online Payment (' + booking.paymentStatus + ')') : 'Online Payment';
                return `
                    <div class="booking-card ${statusClass}">
                        <div class="booking-info">
                            <h3>${booking.salonName || '-'}</h3>
                            <p><strong>Service:</strong> ${booking.service || '-'}</p>
                            <p><strong>Date:</strong> ${formattedDate}</p>
                            <p><strong>Time:</strong> ${formatSlotTime(booking.slotStartTime)}</p>
                            <p><strong>Payment Method:</strong> ${paymentText}</p>
                            <p><strong>Status:</strong> <span class="status-badge">${status || '-'}</span></p>
                        </div>
                        <div class="booking-actions">
                            ${status === 'CONFIRMED' ? `
                                <button onclick="cancelBooking(${index})" class="btn-cancel">Cancel Booking</button>
                            ` : `
                                <p class="booking-canceled">This booking has been ${status === 'CANCELLED' || status === 'CANCELED' ? 'canceled' : status.toLowerCase()}</p>
                            `}
                        </div>
                    </div>
                `;
            }

            var html = '<div class="bookings-list">';

            // ── Upcoming bookings ──────────────────────────────
            if (upcoming.length === 0) {
                html += '<p class="no-bookings" style="margin-bottom:12px;">No upcoming bookings.</p>';
            } else {
                upcoming.forEach(function(item) {
                    html += buildCard(item.booking, item.index);
                });
            }

            // ── Past bookings (collapsed) ──────────────────────
            if (past.length > 0) {
                html += `
                    <button id="showPastBtn" onclick="togglePastBookings()" class="btn-secondary" style="margin:16px 0 8px;width:100%;padding:10px;">
                        📅 Show Past Bookings (${past.length})
                    </button>
                    <div id="pastBookingsSection" style="display:none;">
                        <p style="color:var(--text-muted,#aaa);font-size:0.85rem;margin-bottom:8px;">Past appointments</p>
                `;
                past.forEach(function(item) {
                    html += buildCard(item.booking, item.index);
                });
                html += '</div>';
            }

            html += '</div>';
            bookingsContainer.innerHTML = html;
        })
        .catch(function(error) {
            console.error('Error loading bookings from database:', error);
            renderNoBookings(bookingsContainer);
        });
    }

    window.togglePastBookings = function() {
        var section = document.getElementById('pastBookingsSection');
        var btn     = document.getElementById('showPastBtn');
        if (!section || !btn) return;
        if (section.style.display === 'none') {
            section.style.display = 'block';
            btn.textContent = '📅 Hide Past Bookings';
        } else {
            section.style.display = 'none';
            // Restore the count label
            var count = section.querySelectorAll('.booking-card').length;
            btn.textContent = '📅 Show Past Bookings (' + count + ')';
        }
    };


    window.cancelBooking = function(index) {
        if (!dbBookings[index]) return;

        var confirmed = confirm('Are you sure you want to cancel this booking?');
        if (!confirmed) return;

        var cancelSlotId = dbBookings[index].slotID;
        if (!cancelSlotId) {
            alert('Cannot cancel: missing slot ID for this booking.');
            return;
        }

        fetch(API_BASE_URL + '/bookings/cancel?slotID=' + encodeURIComponent(cancelSlotId), {
            method: 'POST'
        })
        .then(function(response) {
            if (response.ok) {
                loadBookings();
                alert('Booking canceled successfully!');
            } else {
                alert('Failed to cancel booking. Please try again.');
            }
        })
        .catch(function(error) {
            console.error('Error canceling booking:', error);
            alert('Failed to cancel booking due to network/backend error.');
        });
    };

    // Load bookings on page if bookings tab is active
    if (window.location.search.includes('tab=bookings')) {
        document.querySelector('[data-tab="bookings"]').click();
    }
});
