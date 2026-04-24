(function () {
    const ADMIN_LOGIN_KEY = "snipmeAdminLoggedIn";
    const ADMIN_NAME_KEY = "snipmeAdminName";
    const ADMIN_TOKEN_KEY = "snipmeAdminToken";

    const isAdminLoggedIn = localStorage.getItem(ADMIN_LOGIN_KEY) === "true";
    const adminToken = localStorage.getItem(ADMIN_TOKEN_KEY);

    if (!isAdminLoggedIn || !adminToken) {
        window.location.href = "admin-login.html";
        return;
    }

    const adminName = localStorage.getItem(ADMIN_NAME_KEY) || "Admin";
    const adminIdentity = document.getElementById("adminIdentity");
    if (adminIdentity) {
        adminIdentity.textContent = "Signed in as " + adminName;
    }

    const apiRoot = (typeof AUTH_BASE_URL === "string")
        ? AUTH_BASE_URL.replace(/\/auth\/?$/, "")
        : "http://localhost:8080/api";

    const headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + adminToken
    };
    const authOnlyHeaders = {
        "Authorization": "Bearer " + adminToken
    };

    const statLoggedUsers = document.getElementById("statLoggedUsers");
    const statLoggedOwners = document.getElementById("statLoggedOwners");
    const statTotalUsers = document.getElementById("statTotalUsers");
    const statTotalSalons = document.getElementById("statTotalSalons");

    const usersTableBody = document.getElementById("usersTableBody");
    const salonsTableBody = document.getElementById("salonsTableBody");
    const servicesTableBody = document.getElementById("servicesTableBody");

    const userSearch = document.getElementById("userSearch");
    const salonSearch = document.getElementById("salonSearch");

    const refreshUsersBtn = document.getElementById("refreshUsersBtn");
    const refreshSalonsBtn = document.getElementById("refreshSalonsBtn");
    const addServiceForm = document.getElementById("addServiceForm");

    const adminLogoutBtn = document.getElementById("adminLogoutBtn");
    if (adminLogoutBtn) {
        adminLogoutBtn.addEventListener("click", function () {
            localStorage.removeItem("snipmeAdminLoggedIn");
            localStorage.removeItem("snipmeAdminName");
            localStorage.removeItem("snipmeAdminEmail");
            localStorage.removeItem("snipmeAdminToken");
            window.location.href = "admin-login.html";
        });
    }

    function initMatrixRain() {
        const matrixLayer = document.querySelector(".matrix-overlay");
        if (!matrixLayer) return;

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        matrixLayer.innerHTML = "";
        matrixLayer.appendChild(canvas);

        const glyphs = "01ABCDEFGHIJKLMNOPQRSTUVWXYZ#$%&*+-<>";
        const fontSize = 15;
        const frameIntervalMs = 85;
        const dropStep = 0.45;
        let columns = 0;
        let drops = [];
        let animationId = null;
        let lastFrameTime = 0;

        function resizeRain() {
            const ratio = window.devicePixelRatio || 1;
            canvas.width = Math.floor(window.innerWidth * ratio);
            canvas.height = Math.floor(window.innerHeight * ratio);
            ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

            columns = Math.ceil(window.innerWidth / fontSize);
            drops = new Array(columns).fill(0).map(function () {
                return Math.floor(Math.random() * -40);
            });
        }

        function drawRain(timestamp) {
            if (timestamp - lastFrameTime < frameIntervalMs) {
                animationId = window.requestAnimationFrame(drawRain);
                return;
            }
            lastFrameTime = timestamp;

            ctx.fillStyle = "rgba(2, 7, 6, 0.14)";
            ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

            ctx.font = fontSize + "px Consolas, monospace";
            for (let i = 0; i < columns; i += 1) {
                const text = glyphs.charAt(Math.floor(Math.random() * glyphs.length));
                const x = i * fontSize;
                const y = drops[i] * fontSize;

                ctx.fillStyle = "rgba(115, 255, 180, 0.85)";
                ctx.fillText(text, x, y);

                if (y > window.innerHeight && Math.random() > 0.975) {
                    drops[i] = Math.floor(Math.random() * -20);
                }
                drops[i] += dropStep;
            }

            animationId = window.requestAnimationFrame(drawRain);
        }

        function onVisibilityChange() {
            if (document.hidden && animationId) {
                window.cancelAnimationFrame(animationId);
                animationId = null;
                return;
            }
            if (!document.hidden && !animationId) {
                lastFrameTime = 0;
                drawRain();
            }
        }

        resizeRain();
        drawRain();
        window.addEventListener("resize", resizeRain);
        document.addEventListener("visibilitychange", onVisibilityChange);
    }

    function handleAuthFailure(res) {
        if (res.status === 401 || res.status === 403) {
            alert("Admin session expired or unauthorized. Please login again.");
            localStorage.removeItem("snipmeAdminLoggedIn");
            localStorage.removeItem("snipmeAdminToken");
            window.location.href = "admin-login.html";
            return true;
        }
        return false;
    }

    function fetchOverview() {
        fetch(apiRoot + "/admin/overview", { headers: headers })
            .then(function (res) {
                if (handleAuthFailure(res)) return Promise.reject(new Error("Unauthorized"));
                return res.json();
            })
            .then(function (data) {
                statLoggedUsers.textContent = data.loggedInUsers ?? 0;
                statLoggedOwners.textContent = data.loggedInSalonOwners ?? 0;
                statTotalUsers.textContent = data.totalUsers ?? 0;
                statTotalSalons.textContent = data.totalSalons ?? 0;
            })
            .catch(function () {});
    }

    function escapeHtml(value) {
        if (value == null) return "";
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function syncTableScroll(tableBody) {
        if (!tableBody) return;

        const tableWrap = tableBody.closest(".table-wrap");
        const table = tableBody.closest("table");
        if (!tableWrap || !table) return;

        const rows = tableBody.querySelectorAll("tr");
        if (rows.length <= 5) {
            tableWrap.classList.remove("scroll-enabled");
            tableWrap.style.maxHeight = "";
            return;
        }

        const header = table.querySelector("thead");
        const headerHeight = header ? header.offsetHeight : 0;
        let fiveRowHeight = 0;
        for (let i = 0; i < 5; i += 1) {
            fiveRowHeight += rows[i].offsetHeight;
        }

        tableWrap.style.maxHeight = (headerHeight + fiveRowHeight + 2) + "px";
        tableWrap.classList.add("scroll-enabled");
    }

    function fetchUsers() {
        const q = encodeURIComponent((userSearch.value || "").trim());
        fetch(apiRoot + "/admin/users?query=" + q, { headers: headers })
            .then(function (res) {
                if (handleAuthFailure(res)) return Promise.reject(new Error("Unauthorized"));
                return res.json();
            })
            .then(function (users) {
                usersTableBody.innerHTML = "";
                users.forEach(function (u) {
                    const tr = document.createElement("tr");
                    tr.innerHTML =
                        "<td>" + (u.email || "") + "</td>" +
                        "<td>" + (u.name || "-") + " <button class=\"edit-btn\" data-email=\"" + (u.email || "") + "\" data-field=\"name\" data-value=\"" + escapeHtml(u.name || "") + "\">✎</button></td>" +
                        "<td>" + (u.phoneNumber || "-") + " <button class=\"edit-btn\" data-email=\"" + (u.email || "") + "\" data-field=\"phoneNumber\" data-value=\"" + escapeHtml(u.phoneNumber || "") + "\">✎</button></td>" +
                        "<td>" + (u.userType || "CUSTOMER") + " <button class=\"edit-btn\" data-email=\"" + (u.email || "") + "\" data-field=\"userType\" data-value=\"" + escapeHtml(u.userType || "CUSTOMER") + "\">✎</button></td>" +
                        "<td><button class=\"delete-btn\" data-email=\"" + (u.email || "") + "\">Delete</button></td>";
                    usersTableBody.appendChild(tr);
                });

                syncTableScroll(usersTableBody);

                usersTableBody.querySelectorAll(".edit-btn").forEach(function (btn) {
                    btn.addEventListener("click", function () {
                        const email = btn.getAttribute("data-email");
                        const field = btn.getAttribute("data-field");
                        const currentValue = btn.getAttribute("data-value") || "";
                        if (!email) return;

                        const label = field === "phoneNumber"
                            ? "phone number"
                            : field === "userType"
                                ? "role (CUSTOMER/SALON_OWNER/ADMIN)"
                                : "name";
                        const nextValue = prompt("Edit " + label + ":", currentValue);
                        if (nextValue === null) return;

                        const payload = {};
                        payload[field] = nextValue;

                        fetch(apiRoot + "/admin/users/" + encodeURIComponent(email), {
                            method: "PUT",
                            headers: headers,
                            body: JSON.stringify(payload)
                        })
                            .then(function (res) {
                                if (handleAuthFailure(res)) return Promise.reject(new Error("Unauthorized"));
                                return res.json();
                            })
                            .then(function () {
                                fetchUsers();
                            })
                            .catch(function () {
                                alert("Failed to update user.");
                            });
                    });
                });

                usersTableBody.querySelectorAll(".delete-btn").forEach(function (btn) {
                    btn.addEventListener("click", function () {
                        const email = btn.getAttribute("data-email");
                        if (!email) return;
                        if (!confirm("Delete user " + email + "?")) return;

                        fetch(apiRoot + "/admin/users/" + encodeURIComponent(email), {
                            method: "DELETE",
                            headers: headers
                        })
                            .then(function (res) {
                                if (handleAuthFailure(res)) return Promise.reject(new Error("Unauthorized"));
                                return res.json();
                            })
                            .then(function () {
                                fetchUsers();
                                fetchOverview();
                            })
                            .catch(function () {
                                alert("Failed to delete user.");
                            });
                    });
                });
            })
            .catch(function () {});
    }

    function fetchSalons() {
        const q = encodeURIComponent((salonSearch.value || "").trim());
        fetch(apiRoot + "/admin/salons?query=" + q, { headers: headers })
            .then(function (res) {
                if (handleAuthFailure(res)) return Promise.reject(new Error("Unauthorized"));
                return res.json();
            })
            .then(function (salons) {
                salonsTableBody.innerHTML = "";
                salons.forEach(function (s) {
                    const tr = document.createElement("tr");
                    const statusClass = s.isActive ? "active" : "banned";
                    const statusText = s.isActive ? "ACTIVE" : "BANNED";
                    const actionBtn = s.isActive
                        ? "<button class=\"ban-btn\" data-id=\"" + s.salonID + "\" data-action=\"ban\">Ban</button>"
                        : "<button class=\"ban-btn\" data-id=\"" + s.salonID + "\" data-action=\"unban\">Unban</button>";
                    tr.innerHTML =
                        "<td>" + (s.salonID ?? "") + "</td>" +
                        "<td>" + (s.name || "-") + "</td>" +
                        "<td>" + (s.details || "-") + "</td>" +
                        "<td><span class=\"status-pill " + statusClass + "\">" + statusText + "</span></td>" +
                        "<td>" + actionBtn + "</td>";
                    salonsTableBody.appendChild(tr);
                });

                syncTableScroll(salonsTableBody);

                salonsTableBody.querySelectorAll(".ban-btn").forEach(function (btn) {
                    btn.addEventListener("click", function () {
                        const salonId = btn.getAttribute("data-id");
                        if (!salonId) return;
                        const action = btn.getAttribute("data-action") || "ban";
                        const url = action === "unban"
                            ? apiRoot + "/admin/salons/" + salonId + "/unban"
                            : apiRoot + "/admin/salons/" + salonId + "/ban";

                        if (!confirm((action === "unban" ? "Unban" : "Ban") + " this salon?")) return;

                        fetch(url, {
                            method: "PUT",
                            headers: headers
                        })
                            .then(function (res) {
                                if (handleAuthFailure(res)) return Promise.reject(new Error("Unauthorized"));
                                return res.json();
                            })
                            .then(function () {
                                fetchSalons();
                            })
                            .catch(function () {
                                alert("Failed to ban salon.");
                            });
                    });
                });
            })
            .catch(function () {});
    }

    function fetchServices() {
        fetch(apiRoot + "/admin/services", { headers: headers })
            .then(function (res) {
                if (handleAuthFailure(res)) return Promise.reject(new Error("Unauthorized"));
                return res.json();
            })
            .then(function (services) {
                servicesTableBody.innerHTML = "";
                services.forEach(function (svc) {
                    const tr = document.createElement("tr");
                    tr.innerHTML =
                        "<td>" + (svc.id ?? "") + "</td>" +
                        "<td>" + (svc.name || "-") + "</td>" +
                        "<td>" + (svc.includeInSearch ? "YES" : "NO") + "</td>" +
                        "<td><button class=\"delete-btn\" data-service-id=\"" + (svc.id ?? "") + "\">Delete</button></td>";
                    servicesTableBody.appendChild(tr);
                });

                syncTableScroll(servicesTableBody);

                servicesTableBody.querySelectorAll(".delete-btn").forEach(function (btn) {
                    btn.addEventListener("click", function () {
                        const id = btn.getAttribute("data-service-id");
                        if (!id) return;
                        if (!confirm("Delete this service?")) return;

                        fetch(apiRoot + "/admin/services/" + id, {
                            method: "DELETE",
                            headers: headers
                        })
                            .then(function (res) {
                                if (handleAuthFailure(res)) return Promise.reject(new Error("Unauthorized"));
                                return res.json();
                            })
                            .then(function () {
                                fetchServices();
                            })
                            .catch(function () {
                                alert("Failed to delete service.");
                            });
                    });
                });
            })
            .catch(function () {});
    }

    if (refreshUsersBtn) {
        refreshUsersBtn.addEventListener("click", fetchUsers);
    }

    if (refreshSalonsBtn) {
        refreshSalonsBtn.addEventListener("click", fetchSalons);
    }

    // Notification System
    const notificationBellBtn = document.getElementById("notificationBellBtn");
    const notificationBadge = document.getElementById("notificationBadge");
    const notificationsModal = document.getElementById("notificationsModal");
    const notificationsList = document.getElementById("notificationsList");

    if (notificationBellBtn) {
        notificationBellBtn.addEventListener("click", function () {
            notificationBellBtn.blur();
            loadAndDisplayNotifications();
        });
    }

    function loadAndDisplayNotifications() {
        if (notificationsModal) {
            notificationsModal.style.display = "flex";
        }
        if (notificationsList) {
            notificationsList.innerHTML = '<p style="text-align: center; color: #9affc7; padding: 20px;">Loading notifications...</p>';
        }

        const url = apiRoot + "/admin/notifications";
        
        fetch(url, {
            method: "GET",
            headers: authOnlyHeaders
        })
        .then(function (response) {
            if (handleAuthFailure(response)) return Promise.reject(new Error("Unauthorized"));
            if (!response.ok) {
                return response.text().then(function (text) {
                    throw new Error(text || ("Failed to load notifications (HTTP " + response.status + ")"));
                });
            }
            return response.json();
        })
        .then(function (data) {
            // Support both { notifications: [...] } and raw array response shapes.
            const notifications = Array.isArray(data)
                ? data
                : (Array.isArray(data.notifications) ? data.notifications : []);
            displayNotifications(notifications);

            const unreadCount = Number.isFinite(Number(data.unreadCount)) ? Number(data.unreadCount) : null;
            if (unreadCount !== null && notificationBadge) {
                if (unreadCount > 0) {
                    notificationBadge.textContent = unreadCount;
                    notificationBadge.style.display = "block";
                } else {
                    notificationBadge.style.display = "none";
                }
            }
        })
        .catch(function (error) {
            console.error("Error loading notifications:", error);
            if (notificationsList) {
                const message = String(error && error.message ? error.message : "Failed to load notifications");
                notificationsList.innerHTML = '<p style="color: #ff9db0; padding: 20px;">' + message + '</p>';
            }
        });
    }

    function displayNotifications(notifications) {
        if (!notificationsList) return;

        if (!notifications || notifications.length === 0) {
            notificationsList.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">No notifications</p>';
            return;
        }

        let html = '';
        notifications.forEach(notif => {
            const date = new Date(notif.createdAt).toLocaleString();
            const readClass = notif.isRead ? 'read' : 'unread';
            html += `
                <div class="notification-item ${readClass}">
                    <div class="notification-content">
                        <h4>${notif.message}</h4>
                        <p class="notification-date">${date}</p>
                    </div>
                    ${!notif.isRead ? `<button class="mark-read-btn" onclick="markNotificationAsRead(${notif.id})" type="button">Mark as Read</button>` : ''}
                </div>
            `;
        });

        notificationsList.innerHTML = html;
    }

    window.markNotificationAsRead = function(notificationId) {
        const url = apiRoot + "/admin/notifications/" + notificationId + "/read";
        
        fetch(url, {
            method: "PUT",
            headers: headers
        })
        .then(function (response) {
            if (handleAuthFailure(response)) return Promise.reject(new Error("Unauthorized"));
            if (!response.ok) throw new Error("Failed to mark notification as read");
            return response.json();
        })
        .then(function () {
            loadAndDisplayNotifications();
            updateNotificationBadge();
        })
        .catch(function (error) {
            console.error("Error marking notification as read:", error);
        });
    };

    function updateNotificationBadge() {
        const url = apiRoot + "/admin/notifications/unread-count";
        
        fetch(url, {
            method: "GET",
            headers: authOnlyHeaders
        })
        .then(function (response) {
            if (handleAuthFailure(response)) return Promise.reject(new Error("Unauthorized"));
            if (!response.ok) throw new Error("Failed to get notification count");
            return response.json();
        })
        .then(function (data) {
            const count = data.unreadCount || 0;
            if (notificationBadge) {
                if (count > 0) {
                    notificationBadge.textContent = count;
                    notificationBadge.style.display = "block";
                } else {
                    notificationBadge.style.display = "none";
                }
            }
        })
        .catch(function (error) {
            console.error("Error updating notification badge:", error);
        });
    }

    window.closeNotificationsModal = function() {
        if (notificationsModal) {
            notificationsModal.style.display = "none";
        }
    };

    if (notificationsModal) {
        notificationsModal.addEventListener("click", function (event) {
            if (event.target === notificationsModal) {
                window.closeNotificationsModal();
            }
        });
    }

    // Update notification badge on page load and every 30 seconds
    updateNotificationBadge();
    setInterval(updateNotificationBadge, 30000);

    if (userSearch) {
        userSearch.addEventListener("input", fetchUsers);
    }

    if (salonSearch) {
        salonSearch.addEventListener("input", fetchSalons);
    }

    if (addServiceForm) {
        addServiceForm.addEventListener("submit", function (e) {
            e.preventDefault();

            const name = document.getElementById("serviceNameInput").value.trim();
            const includeInSearch = document.getElementById("includeInSearchInput").checked;

            if (!name) {
                alert("Service name is required.");
                return;
            }

            const payload = {
                name: name,
                includeInSearch: includeInSearch
            };

            fetch(apiRoot + "/admin/services", {
                method: "POST",
                headers: headers,
                body: JSON.stringify(payload)
            })
                .then(function (res) {
                    if (handleAuthFailure(res)) return Promise.reject(new Error("Unauthorized"));
                    return res.json();
                })
                .then(function () {
                    addServiceForm.reset();
                    document.getElementById("includeInSearchInput").checked = true;
                    fetchServices();
                })
                .catch(function () {
                    alert("Failed to add service.");
                });
        });
    }

    initMatrixRain();
    fetchOverview();
    fetchUsers();
    fetchSalons();
    fetchServices();
    window.addEventListener("resize", function () {
        syncTableScroll(usersTableBody);
        syncTableScroll(salonsTableBody);
        syncTableScroll(servicesTableBody);
    });
    setInterval(fetchOverview, 15000);
})();
