document.addEventListener("DOMContentLoaded", function () {
    const GOOGLE_CLIENT_ID = "520195887658-u2vcovmf6k1htff623gc92ak3j3g1r67.apps.googleusercontent.com";

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

            alert("Salon owner Google login successful: " + (payload.email || "Unknown user"));
            window.location.href = "../index.html";
        }
    }

    function renderGoogleButtonWhenReady() {
        const target = document.getElementById("ownerGoogleButton");

        if (!target) {
            console.error("ownerGoogleButton container not found");
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

            const email = document.getElementById("ownerLoginEmail").value.trim();
            const password = document.getElementById("ownerLoginPassword").value.trim();

            if (email === "" || password === "") {
                alert("Please fill in all fields.");
                return;
            }

            const emailPattern = /^[^ ]+@[^ ]+\.[a-z]{2,}$/i;
            if (!emailPattern.test(email)) {
                alert("Please enter a valid business email address.");
                return;
            }

            if (password.length < 6) {
                alert("Password must be at least 6 characters long.");
                return;
            }

            alert("Salon owner login successful (demo).");
        });
    }

    if (signupForm) {
        signupForm.addEventListener("submit", function (e) {
            e.preventDefault();

            const salonName = document.getElementById("salonName").value.trim();
            const ownerName = document.getElementById("ownerName").value.trim();
            const email = document.getElementById("ownerSignupEmail").value.trim();
            const phone = document.getElementById("ownerPhone").value.trim();
            const password = document.getElementById("ownerSignupPassword").value.trim();
            const confirmPassword = document.getElementById("ownerConfirmPassword").value.trim();

            if (salonName === "" || ownerName === "" || email === "" || phone === "" || password === "" || confirmPassword === "") {
                alert("Please fill in all fields.");
                return;
            }

            const emailPattern = /^[^ ]+@[^ ]+\.[a-z]{2,}$/i;
            if (!emailPattern.test(email)) {
                alert("Please enter a valid business email address.");
                return;
            }

            if (!/^[0-9]{10,15}$/.test(phone)) {
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

            alert("Salon owner signup successful (demo).");
        });
    }
});