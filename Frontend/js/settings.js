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
});
