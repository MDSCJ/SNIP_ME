(function () {
    const path = (window.location && window.location.pathname ? window.location.pathname : '').replace(/\\/g, '/');
    const isFrontendPage = path.toLowerCase().includes('/frontend/');
    const imageUrl = isFrontendPage ? 'images/inspect.png' : 'Frontend/images/inspect.png';
    const OVERLAY_ID = 'devtools-inspect-overlay';
    const LOCK_CLASS = 'devtools-page-locked';
    const LOCK_STYLE_ID = 'devtools-lockdown-style';
    const DEVTOOLS_THRESHOLD = 160;
    let overflowLocked = false;
    let forcedOpenUntil = 0;
    let consoleProbeTriggered = false;
    let lockdownActive = false;
    let lockLatched = false;
    const disabledStyleNodes = [];

    const blockedEvents = ['click', 'dblclick', 'mousedown', 'mouseup', 'keydown', 'keyup', 'keypress', 'touchstart', 'touchmove', 'touchend', 'wheel', 'submit', 'input', 'change', 'dragstart', 'selectstart', 'copy', 'cut', 'paste'];

    const consoleProbe = new Image();
    Object.defineProperty(consoleProbe, 'id', {
        get: function () {
            consoleProbeTriggered = true;
            return 'devtools-probe';
        }
    });

    // Use console CSS to render a visual warning banner for people inspecting the app.
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

    function getOrCreateLockStyle() {
        let lockStyle = document.getElementById(LOCK_STYLE_ID);
        if (lockStyle) {
            return lockStyle;
        }

        lockStyle = document.createElement('style');
        lockStyle.id = LOCK_STYLE_ID;
        lockStyle.textContent =
            'html.' + LOCK_CLASS + ', body.' + LOCK_CLASS + ' {' +
            'overflow: hidden !important;' +
            'user-select: none !important;' +
            '}' +
            'body.' + LOCK_CLASS + ' > *:not(#' + OVERLAY_ID + ') {' +
            'visibility: hidden !important;' +
            '}' +
            '#' + OVERLAY_ID + ' {' +
            'visibility: visible !important;' +
            '}';

        document.head.appendChild(lockStyle);
        return lockStyle;
    }

    function blockInteraction(event) {
        if (!lockdownActive) {
            return;
        }
        if (event.cancelable) {
            event.preventDefault();
        }
        event.stopImmediatePropagation();
        event.stopPropagation();
    }

    function enableInteractionBlocker() {
        blockedEvents.forEach(function (eventName) {
            document.addEventListener(eventName, blockInteraction, true);
        });
    }

    function disableInteractionBlocker() {
        blockedEvents.forEach(function (eventName) {
            document.removeEventListener(eventName, blockInteraction, true);
        });
    }

    function disableStyles() {
        if (disabledStyleNodes.length > 0) {
            return;
        }

        const styleNodes = document.querySelectorAll('link[rel~="stylesheet"], style');
        styleNodes.forEach(function (node) {
            if (node.id === LOCK_STYLE_ID) {
                return;
            }

            const tag = node.tagName.toLowerCase();
            if (tag === 'link') {
                disabledStyleNodes.push({ node: node, tag: tag, wasDisabled: node.disabled === true });
                node.disabled = true;
                return;
            }

            disabledStyleNodes.push({ node: node, tag: tag, previousMedia: node.getAttribute('media') });
            node.setAttribute('media', 'not all');
        });
    }

    function restoreStyles() {
        while (disabledStyleNodes.length > 0) {
            const item = disabledStyleNodes.pop();
            if (!item || !item.node || !item.node.isConnected) {
                continue;
            }

            if (item.tag === 'link') {
                item.node.disabled = item.wasDisabled;
                continue;
            }

            if (item.previousMedia === null) {
                item.node.removeAttribute('media');
            } else {
                item.node.setAttribute('media', item.previousMedia);
            }
        }
    }

    function activateLockdown() {
        if (lockdownActive || !document.body) {
            return;
        }

        getOrCreateLockStyle();
        lockdownActive = true;
        disableStyles();
        document.documentElement.classList.add(LOCK_CLASS);
        document.body.classList.add(LOCK_CLASS);
        enableInteractionBlocker();
    }

    function deactivateLockdown() {
        if (!lockdownActive) {
            return;
        }

        lockdownActive = false;
        disableInteractionBlocker();
        document.documentElement.classList.remove(LOCK_CLASS);
        document.body.classList.remove(LOCK_CLASS);
        restoreStyles();
    }

    function lockPageScroll() {
        if (overflowLocked) {
            return;
        }
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        overflowLocked = true;
    }

    function unlockPageScroll() {
        if (!overflowLocked) {
            return;
        }
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
        overflowLocked = false;
    }

    function isDevToolsOpen() {
        const widthDiff = Math.abs(window.outerWidth - window.innerWidth);
        const heightDiff = Math.abs(window.outerHeight - window.innerHeight);
        const sizeHeuristicOpen = widthDiff > DEVTOOLS_THRESHOLD || heightDiff > DEVTOOLS_THRESHOLD;

        // This probe can still trigger in undocked/windowed DevTools where size heuristics fail.
        consoleProbeTriggered = false;
        console.debug(consoleProbe);

        return sizeHeuristicOpen || consoleProbeTriggered || Date.now() < forcedOpenUntil;
    }

    function syncOverlayState() {
        const overlay = getOrCreateOverlay();
        if (!overlay) {
            return;
        }

        const devToolsOpen = isDevToolsOpen();
        if (devToolsOpen) {
            lockLatched = true;
        }

        if (devToolsOpen || lockLatched) {
            overlay.style.display = 'block';
            lockPageScroll();
            activateLockdown();
            return;
        }
        overlay.style.display = 'none';
        unlockPageScroll();
        deactivateLockdown();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', syncOverlayState);
    } else {
        syncOverlayState();
    }

    document.addEventListener('keydown', function (event) {
        const key = (event.key || '').toLowerCase();
        const isF12 = key === 'f12';
        const isInspectShortcut = (event.ctrlKey && event.shiftKey && (key === 'i' || key === 'j' || key === 'c'));
        if (isF12 || isInspectShortcut) {
            forcedOpenUntil = Date.now() + 5000;
            syncOverlayState();
        }
    });

    window.addEventListener('resize', syncOverlayState);
    setInterval(syncOverlayState, 800);
})();
