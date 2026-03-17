document.addEventListener("DOMContentLoaded", function () {
    var LOGIN_FLAG_KEY = "snipmeCustomerLoggedIn";
    var USERNAME_KEY = "snipmeCustomerUsername";
    var navBar = document.querySelector(".nav-bar");

    function normalizeUsername(rawValue) {
        if (!rawValue) {
            return "Customer";
        }

        var value = rawValue.trim();
        if (!value) {
            return "Customer";
        }

        return value;
    }

    function readSession() {
        var isLoggedIn = localStorage.getItem(LOGIN_FLAG_KEY) === "true";
        var username = normalizeUsername(localStorage.getItem(USERNAME_KEY));

        window.isCustomerLoggedIn = isLoggedIn;

        return {
            isLoggedIn: isLoggedIn,
            username: username
        };
    }

    function clearSession() {
        localStorage.removeItem(LOGIN_FLAG_KEY);
        localStorage.removeItem(USERNAME_KEY);
        window.isCustomerLoggedIn = false;
        window.dispatchEvent(new Event("customer-auth-changed"));
        renderSessionPill();

        if (window.location.pathname.indexOf("/Frontend/") !== -1) {
            window.location.href = "customer_login.html";
        } else {
            window.location.href = "Frontend/customer_login.html";
        }
    }

    function createPillIfMissing() {
        var existingPill = document.getElementById("customerSessionPill");
        if (existingPill) {
            return existingPill;
        }

        var pill = document.createElement("div");
        pill.id = "customerSessionPill";
        pill.className = "customer-session-pill";

        var text = document.createElement("span");
        text.id = "customerSessionLabel";
        text.className = "customer-session-label";

        var logoutBtn = document.createElement("button");
        logoutBtn.type = "button";
        logoutBtn.className = "customer-logout-btn";
        logoutBtn.title = "Logout";
        logoutBtn.setAttribute("aria-label", "Logout customer");
        logoutBtn.textContent = "\u23FB";

        logoutBtn.addEventListener("click", function () {
            clearSession();
        });

        pill.appendChild(text);
        pill.appendChild(logoutBtn);
        document.body.appendChild(pill);

        return pill;
    }

    function renderSessionPill() {
        var pill = createPillIfMissing();
        var label = document.getElementById("customerSessionLabel");
        var session = readSession();

        if (!session.isLoggedIn) {
            pill.classList.remove("visible");
            return;
        }

        label.textContent = "Logged in as " + session.username;
        pill.classList.add("visible");
        updatePillTop();
    }

    function updatePillTop() {
        var pill = document.getElementById("customerSessionPill");
        if (!pill || !navBar) {
            return;
        }

        var navRect = navBar.getBoundingClientRect();
        var topOffset = Math.max(navRect.bottom + 10, 10);
        pill.style.top = topOffset + "px";
    }

    window.addEventListener("customer-auth-changed", function () {
        renderSessionPill();
    });

    window.addEventListener("scroll", updatePillTop, { passive: true });
    window.addEventListener("resize", updatePillTop);

    renderSessionPill();
    updatePillTop();
});
