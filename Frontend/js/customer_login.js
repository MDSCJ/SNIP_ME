document.addEventListener("DOMContentLoaded", function () {
    const loginView = document.getElementById("customerLoginView");
    const signupView = document.getElementById("customerSignupView");

    const showSignup = document.getElementById("showCustomerSignup");
    const showLogin = document.getElementById("showCustomerLogin");

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

    setupPasswordToggle("toggleLoginPassword", "loginPassword", "loginEyeOpen", "loginEyeClosed");
    setupPasswordToggle("toggleSignupPassword", "signupPassword", "signupEyeOpen", "signupEyeClosed");
    setupPasswordToggle("toggleConfirmPassword", "signupConfirmPassword", "confirmEyeOpen", "confirmEyeClosed");

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

            const email = document.getElementById("loginEmail").value.trim();
            const password = document.getElementById("loginPassword").value.trim();

            if (email === "" || password === "") {
                alert("Please fill in all fields.");
                return;
            }

            const emailPattern = /^[^ ]+@[^ ]+\.[a-z]{2,}$/i;
            if (!emailPattern.test(email)) {
                alert("Please enter a valid email address.");
                return;
            }

            if (password.length < 6) {
                alert("Password must be at least 6 characters long.");
                return;
            }

            alert("Customer login successful (demo).");
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

            const emailPattern = /^[^ ]+@[^ ]+\.[a-z]{2,}$/i;
            if (!emailPattern.test(email)) {
                alert("Please enter a valid email address.");
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

            alert("Customer signup successful (demo).");
        });
    }
});