document.addEventListener("DOMContentLoaded", function () {
    const ADMIN_LOGIN_KEY = "snipmeAdminLoggedIn";
    const ADMIN_NAME_KEY = "snipmeAdminName";
    const ADMIN_EMAIL_KEY = "snipmeAdminEmail";
    const ADMIN_TOKEN_KEY = "snipmeAdminToken";

    const form = document.getElementById("adminLoginForm");

    function parseResponseSafely(res) {
        return res.text().then(function (text) {
            if (!text || !text.trim()) {
                return { ok: res.ok, data: {}, status: res.status };
            }

            try {
                return { ok: res.ok, data: JSON.parse(text), status: res.status };
            } catch (parseError) {
                return {
                    ok: res.ok,
                    data: { error: "Received an unexpected response from server." },
                    status: res.status
                };
            }
        });
    }

    if (!form) {
        return;
    }

    form.addEventListener("submit", function (e) {
        e.preventDefault();

        const email = document.getElementById("adminEmail").value.trim().toLowerCase();
        const password = document.getElementById("adminPassword").value.trim();

        if (!email || !password) {
            alert("Please fill in all fields.");
            return;
        }

        showLoader();

        fetch(AUTH_BASE_URL + "/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email, password: password })
        })
            .then(function (res) {
                return parseResponseSafely(res);
            })
            .then(function (result) {
                hideLoader();
                if (!result.ok) {
                    alert(result.data.error || "Invalid email or password.");
                    return;
                }

                const userType = typeof result.data.userType === "string" ? result.data.userType.trim().toUpperCase() : "CUSTOMER";
                if (userType !== "ADMIN") {
                    alert("This account is not an admin account.");
                    return;
                }

                const adminName = typeof result.data.name === "string" && result.data.name.trim()
                    ? result.data.name.trim()
                    : email.split("@")[0];

                localStorage.setItem(ADMIN_LOGIN_KEY, "true");
                localStorage.setItem(ADMIN_NAME_KEY, adminName);
                localStorage.setItem(ADMIN_EMAIL_KEY, email);
                if (result.data.token) {
                    localStorage.setItem(ADMIN_TOKEN_KEY, result.data.token);
                }

                alert("Admin login successful.");
                window.location.href = "admin-dashboard.html";
            })
            .catch(function (error) {
                hideLoader();
                console.error("Admin login error:", error);
                alert("Connection Error. Please check backend and network.");
            });
    });
});
