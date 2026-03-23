document.addEventListener("DOMContentLoaded", function () {
    // AUTH_BASE_URL is defined globally in api-config.js
    const OWNER_LOGIN_FLAG_KEY = "snipmeOwnerLoggedIn";
    const OWNER_NAME_KEY = "snipmeOwnerName";
    const OWNER_EMAIL_KEY = "snipmeOwnerEmail";
    const OWNER_TOKEN_KEY = "snipmeOwnerToken";
    const OWNER_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
    const OWNER_PHONE_REGEX = /^[0-9]{10,15}$/;
    const GOOGLE_CLIENT_ID = "520195887658-u2vcovmf6k1htff623gc92ak3j3g1r67.apps.googleusercontent.com";
    const GITHUB_PAGES_ORIGIN = "https://mdscj.github.io";

    const loginView = document.getElementById("ownerLoginView");
    const signupView = document.getElementById("ownerSignupView");

    const showSignup = document.getElementById("showOwnerSignup");
    const showLogin = document.getElementById("showOwnerLogin");

    const loginForm = document.getElementById("ownerLoginForm");
    const signupForm = document.getElementById("ownerSignupForm");

    function setupPasswordToggle(toggleId, inputId, eyeOpenId, eyeClosedId) {
        const toggleBtn = document.getElementById(toggleId);
        const input = document.getElementById(inputId);
        const eyeOpen = document.getElementById(eyeOpenId);
        const eyeClosed = document.getElementById(eyeClosedId);

        if (toggleBtn && input) {
            toggleBtn.addEventListener("click", function () {
                if (input.type === "password") {
                    input.type = "text";
                    if (eyeOpen) eyeOpen.style.display = "none";
                    if (eyeClosed) eyeClosed.style.display = "block";
                } else {
                    input.type = "password";
                    if (eyeOpen) eyeOpen.style.display = "block";
                    if (eyeClosed) eyeClosed.style.display = "none";
                }
            });
        }
    }

    function parseJwt(token) {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map(function (c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                })
                .join('')
        );
        return JSON.parse(jsonPayload);
    }

    function handleSalonOwnerGoogleResponse(response) {
        console.log("Salon owner Google response:", response);

        if (response && response.credential) {
            const payload = parseJwt(response.credential);
            console.log("Decoded owner user:", payload);

            const ownerName =
                payload.given_name ||
                payload.name ||
                (payload.email ? payload.email.split("@")[0] : "Salon Owner");

            localStorage.setItem(OWNER_LOGIN_FLAG_KEY, "true");
            localStorage.setItem(OWNER_NAME_KEY, ownerName);
            if (payload.email) {
                localStorage.setItem(OWNER_EMAIL_KEY, payload.email);
            }

            alert("Salon owner Google login successful: " + (payload.email || "Unknown user"));
            window.location.href = "Salon-Owner-Dashboard.html";
        }
    }

    function showGoogleOriginMessage(target) {
        if (!target) return;
        target.innerHTML = "";

        const message = document.createElement("p");
        message.textContent = "Google Sign-In is enabled only on https://mdscj.github.io";
        message.style.fontSize = "0.9rem";
        message.style.lineHeight = "1.4";
        message.style.textAlign = "center";
        message.style.color = "#aaa";
        target.appendChild(message);
    }

    function renderGoogleButtonWhenReady() {
        const target = document.getElementById("ownerGoogleButton");

        if (!target) {
            console.error("ownerGoogleButton container not found");
            return;
        }

        if (window.location.origin !== GITHUB_PAGES_ORIGIN) {
            showGoogleOriginMessage(target);
            console.error("Blocked Google Sign-In for non-GitHub origin:", window.location.origin);
            return;
        }

        if (window.google && google.accounts && google.accounts.id) {
            google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleSalonOwnerGoogleResponse
            });

            google.accounts.id.renderButton(target, {
                theme: "outline",
                size: "large",
                shape: "pill",
                text: "signin_with",
                width: 420
            });
        } else {
            console.error("Google Identity Services script not loaded");
        }
    }

    setTimeout(renderGoogleButtonWhenReady, 300);

    setupPasswordToggle("toggleOwnerLoginPassword", "ownerLoginPassword", "ownerLoginEyeOpen", "ownerLoginEyeClosed");
    setupPasswordToggle("toggleOwnerSignupPassword", "ownerSignupPassword", "ownerSignupEyeOpen", "ownerSignupEyeClosed");
    setupPasswordToggle("toggleOwnerConfirmPassword", "ownerConfirmPassword", "ownerConfirmEyeOpen", "ownerConfirmEyeClosed");

    if (showSignup) {
        showSignup.addEventListener("click", function (e) {
            e.preventDefault();
            loginView.classList.add("hidden-view");
            signupView.classList.remove("hidden-view");
        });
    }

    if (showLogin) {
        showLogin.addEventListener("click", function (e) {
            e.preventDefault();
            signupView.classList.add("hidden-view");
            loginView.classList.remove("hidden-view");
        });
    }

    if (loginForm) {
        loginForm.addEventListener("submit", function (e) {
            e.preventDefault();

            const email = document.getElementById("ownerLoginEmail").value.trim().toLowerCase();
            const password = document.getElementById("ownerLoginPassword").value.trim();

            if (email === "" || password === "") {
                alert("Please fill in all fields.");
                return;
            }

            if (!OWNER_EMAIL_REGEX.test(email)) {
                alert("Please enter a valid business email address.");
                return;
            }

            if (password.length < 6) {
                alert("Password must be at least 6 characters long.");
                return;
            }

            showLoader();

            fetch(AUTH_BASE_URL + "/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email, password: password })
            })
                .then(function (res) {
                    return res.json().then(function (data) {
                        return { ok: res.ok, data: data };
                    });
                })
                .then(function (result) {
                    hideLoader();
                    if (!result.ok) {
                        alert(result.data.error || "Invalid email or password.");
                        return;
                    }

                    const ownerName = email.split("@")[0] || "Salon Owner";
                    localStorage.setItem(OWNER_LOGIN_FLAG_KEY, "true");
                    localStorage.setItem(OWNER_NAME_KEY, ownerName);
                    localStorage.setItem(OWNER_EMAIL_KEY, email);
                    if (result.data.token) {
                        localStorage.setItem(OWNER_TOKEN_KEY, result.data.token);
                    }

                    alert("Salon owner login successful.");
                    window.location.href = "Salon-Owner-Dashboard.html";
                })
                .catch(function (error) {
                    hideLoader();
                    console.error('Login error:', error);
                    const errorMsg = error.message || "Could not reach the server";
                    alert("Connection Error: " + errorMsg + "\n\nPlease check:\n- Internet connection\n- Backend server status\n- Visit: " + AUTH_BASE_URL + "/ping");
                });
        });
    }

    if (signupForm) {
        signupForm.addEventListener("submit", function (e) {
            e.preventDefault();

            const salonName = document.getElementById("salonName").value.trim();
            const salonDetails = document.getElementById("salonDetails").value.trim();
            const ownerName = document.getElementById("ownerName").value.trim();
            const email = document.getElementById("ownerSignupEmail").value.trim().toLowerCase();
            const phone = document.getElementById("ownerPhone").value.trim();
            const password = document.getElementById("ownerSignupPassword").value.trim();
            const confirmPassword = document.getElementById("ownerConfirmPassword").value.trim();

            if (salonName === "" || salonDetails === "" || ownerName === "" || email === "" || phone === "" || password === "" || confirmPassword === "") {
                alert("Please fill in all fields.");
                return;
            }

            if (!OWNER_EMAIL_REGEX.test(email)) {
                alert("Please enter a valid business email address.");
                return;
            }

            if (!OWNER_PHONE_REGEX.test(phone)) {
                alert("Please enter a valid phone number.");
                return;
            }

            if (password.length < 6) {
                alert("Password must be at least 6 characters long.");
                return;
            }

            if (password !== confirmPassword) {
                alert("Passwords do not match.");
                return;
            }

            showLoader();

            fetch(AUTH_BASE_URL + "/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: ownerName,
                    email: email,
                    phoneNumber: phone,
                    password: password,
                    role: "SALON_OWNER",
                    salonName: salonName,
                    salonAddress: salonDetails
                })
            })
                .then(function (res) {
                    return res.json().then(function (data) {
                        return { ok: res.ok, data: data };
                    });
                })
                .then(function (result) {
                    hideLoader();
                    if (!result.ok) {
                        alert(result.data.error || "Sign up failed.");
                        return;
                    }

                    alert("Salon owner signup successful. Please sign in.");
                    signupView.classList.add("hidden-view");
                    loginView.classList.remove("hidden-view");
                    document.getElementById("ownerLoginEmail").value = email;
                    document.getElementById("ownerLoginPassword").value = "";
                })
                .catch(function (error) {
                    hideLoader();
                    console.error('Signup error:', error);
                    const errorMsg = error.message || "Could not reach the server";
                    alert("Connection Error: " + errorMsg + "\n\nPlease check:\n- Internet connection\n- Backend server status");
                });
        });
    }
});