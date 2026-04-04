(function () {
    const path = (window.location && window.location.pathname ? window.location.pathname : '').replace(/\\/g, '/');

    const isFrontendPage = path.toLowerCase().includes('/frontend/');
    const imageUrl = isFrontendPage ? 'images/inspect.png' : 'Frontend/images/inspect.png';
    const OVERLAY_ID = 'devtools-inspect-overlay';
    const WARNING_DURATION_MS = 5000;
    let overlayTimer = null;

    // Render a visual warning banner in the console.
    const style = [
        "background-image: url('" + imageUrl + "')",
        'background-size: contain',
        'background-repeat: no-repeat',
        'padding: 150px 200px',
        'font-size: 1px'
    ].join('; ');

    console.log('%c ', style);
    console.log('%cHey! What are you looking for? Please be cautious.', 'color: red; font-size: 30px; font-weight: bold;');

    function getOrCreateOverlay() {
        if (!document.body) {
            return null;
        }

        let overlay = document.getElementById(OVERLAY_ID);
        if (overlay) {
            return overlay;
        }

        overlay = document.createElement('div');
        overlay.id = OVERLAY_ID;
        overlay.style.position = 'fixed';
        overlay.style.inset = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.zIndex = '2147483647';
        overlay.style.backgroundImage = "url('" + imageUrl + "')";
        overlay.style.backgroundRepeat = 'no-repeat';
        overlay.style.backgroundPosition = 'center center';
        overlay.style.backgroundSize = 'cover';
        overlay.style.backgroundColor = '#000';
        overlay.style.display = 'none';
        overlay.style.pointerEvents = 'all';
        overlay.style.cursor = 'not-allowed';
        document.body.appendChild(overlay);
        return overlay;
    }

    function hideOverlay() {
        const overlay = getOrCreateOverlay();
        if (!overlay) {
            return;
        }

        overlay.style.display = 'none';
    }

    function showInspectWarning() {
        const overlay = getOrCreateOverlay();
        if (!overlay) {
            return;
        }

        overlay.style.display = 'block';

        if (overlayTimer) {
            window.clearTimeout(overlayTimer);
        }

        overlayTimer = window.setTimeout(function () {
            hideOverlay();
            overlayTimer = null;
        }, WARNING_DURATION_MS);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', getOrCreateOverlay);
    } else {
        getOrCreateOverlay();
    }

    document.addEventListener('keydown', function (event) {
        const key = (event.key || '').toLowerCase();
        const isF12 = key === 'f12';
        const isInspectShortcut = (event.ctrlKey && event.shiftKey && (key === 'i' || key === 'j' || key === 'c'));
        if (isF12 || isInspectShortcut) {
            showInspectWarning();
        }
    }, true);
})();
