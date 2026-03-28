/**
 * Loader Helper Functions
 * Manages showing/hiding the loading animation with blur effect
 */

function showLoader() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.add('active');
        document.body.classList.add('loading-blur');
    }
}

function hideLoader() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.remove('active');
        document.body.classList.remove('loading-blur');
    }
}
