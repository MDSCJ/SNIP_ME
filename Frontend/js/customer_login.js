document.addEventListener("DOMContentLoaded", function () {
    const LOGIN_FLAG_KEY = "snipmeCustomerLoggedIn";
    const USERNAME_KEY = "snipmeCustomerUsername";
    const GOOGLE_CLIENT_ID = "366250450099-j5sle9ukjhobugsj3g9rr0o0jrg6p3so.apps.googleusercontent.com";

    const loginView = document.getElementById("customerLoginView");
    const signupView = document.getElementById("customerSignupView");

    const showSignup = document.getElementById("showCustomerSignup");
    const showLogin = document.getElementById("showCustomerLogin");
    const USERNAME_KEY   = "snipmeCustomerUsername";
    const EMAIL_KEY      = "snipmeCustomerEmail";
    const PASSWORD_KEY   = "snipmeCustomerPassword";
    const EMAIL_REGEX    = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i;
    const PHONE_REGEX    = /^0[0-9]{9,14}$/;

    const loginView  = document.getElementById("customerLoginView");
    const signupView  = document.getElementById("customerSignupView");
    const forgotView  = document.getElementById("customerForgotView");

    const showSignup  = document.getElementById("showCustomerSignup");
    const showLogin   = document.getElementById("showCustomerLogin");
    const showForgot  = document.getElementById("showForgotPassword");
    const showLoginFromForgot = document.getElementById("showLoginFromForgot");

    function switchView(show) {
        [loginView, signupView, forgotView].forEach(function (v) {
            if (v) v.classList.add("hidden-view");
        });
        if (show) show.classList.remove("hidden-view");
    }

    const loginForm = document.getElementById("loginForm");
    const signupForm = document.getElementById("customerSignupForm");

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

    function handleCustomerGoogleResponse(response) {
        console.log("Customer Google response:", response);

        if (response && response.credential) {
            const payload = parseJwt(response.credential);
            console.log("Decoded customer user:", payload);

            const username =
                payload.given_name ||
                payload.name ||
                (payload.email ? payload.email.split("@")[0] : "Customer");

            localStorage.setItem(LOGIN_FLAG_KEY, "true");
            localStorage.setItem(USERNAME_KEY, username);
            window.isCustomerLoggedIn = true;
            window.dispatchEvent(new Event("customer-auth-changed"));

            alert("Customer Google login successful: " + (payload.email || "Unknown user"));
            window.location.href = "../index.html";
        }
    }

    function renderGoogleButtonWhenReady() {
        const target = document.getElementById("customerGoogleButton");

        if (!target) {
            console.error("customerGoogleButton container not found");
            return;
        }

        if (window.google && google.accounts && google.accounts.id) {
            google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleCustomerGoogleResponse
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

    // Small delay helps ensure GIS script is loaded
    setTimeout(renderGoogleButtonWhenReady, 300);

    function isValidEmail(email) {
        return EMAIL_REGEX.test(email);
    }

    setupPasswordToggle("toggleLoginPassword", "loginPassword", "loginEyeOpen", "loginEyeClosed");
    setupPasswordToggle("toggleSignupPassword", "signupPassword", "signupEyeOpen", "signupEyeClosed");
    setupPasswordToggle("toggleConfirmPassword", "signupConfirmPassword", "confirmEyeOpen", "confirmEyeClosed");

    if (showSignup)  showSignup.addEventListener("click",  function (e) { e.preventDefault(); switchView(signupView); });
    if (showLogin)   showLogin.addEventListener("click",   function (e) { e.preventDefault(); switchView(loginView); });
    if (showForgot)  showForgot.addEventListener("click",  function (e) { e.preventDefault(); switchView(forgotView); });
    if (showLoginFromForgot) showLoginFromForgot.addEventListener("click", function (e) { e.preventDefault(); switchView(loginView); });

    if (loginForm) {
        loginForm.addEventListener("submit", function (e) {
            e.preventDefault();

            const email = document.getElementById("loginEmail").value.trim();
            const password = document.getElementById("loginPassword").value.trim();

            if (email === "" || password === "") {
                alert("Please fill in all fields.");
                return;
            }

            if (!isValidEmail(email)) {
                alert("Please enter a valid email address.");
                return;
            }

            if (password.length < 6) {
                alert("Password must be at least 6 characters long.");
                return;
            }

            const username = email.split("@")[0] || "Customer";

            localStorage.setItem(LOGIN_FLAG_KEY, "true");
            localStorage.setItem(USERNAME_KEY, username);
            localStorage.setItem(EMAIL_KEY, email);
            window.isCustomerLoggedIn = true;
            window.dispatchEvent(new Event("customer-auth-changed"));

            alert("Customer login successful.");
            window.location.href = "../index.html";
        });
    }

    if (signupForm) {
        signupForm.addEventListener("submit", function (e) {
            e.preventDefault();

            const fullName = document.getElementById("signupFullName").value.trim();
            const email = document.getElementById("signupEmail").value.trim();
            const phone = document.getElementById("signupPhone").value.trim();
            const password = document.getElementById("signupPassword").value.trim();
            const confirmPassword = document.getElementById("signupConfirmPassword").value.trim();

            if (fullName === "" || email === "" || phone === "" || password === "" || confirmPassword === "") {
                alert("Please fill in all fields.");
                return;
            }

            if (!isValidEmail(email)) {
                alert("Please enter a valid email address.");
                return;
            }

            if (!PHONE_REGEX.test(phone)) {
                alert("Please enter a valid phone number starting with 0.");
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

            localStorage.setItem(EMAIL_KEY, email);
            localStorage.setItem(PASSWORD_KEY, btoa(password));

            alert("Customer signup successful (demo).");
        });
    }

    // ========= Forgot Password =========
    var forgotForm = document.getElementById("forgotPasswordForm");
    if (forgotForm) {
        forgotForm.addEventListener("submit", function (e) {
            e.preventDefault();
            var enteredEmail = document.getElementById("forgotEmail").value.trim();

            if (!enteredEmail) {
                alert("Please enter your email address.");
                return;
            }
            if (!isValidEmail(enteredEmail)) {
                alert("Please enter a valid Gmail address.");
                return;
            }

            var submitBtn = forgotForm.querySelector("button[type=submit]");
            if (submitBtn) submitBtn.disabled = true;

            fetch("http://localhost:8080/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: enteredEmail })
            })
            .then(function (res) { return res.json(); })
            .then(function (data) {
                alert(data.message || "If that email is registered, a temporary password has been sent.");
                switchView(loginView);
                document.getElementById("forgotEmail").value = "";
            })
            .catch(function () {
                alert("Could not reach the server. Please try again later.");
            })
            .finally(function () {
                if (submitBtn) submitBtn.disabled = false;
            });
        });
    }
});