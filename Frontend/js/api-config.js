/* Auto-select API URL for local development vs production */
const isLocalFrontend =
	window.location.protocol === "file:" ||
	window.location.hostname === "localhost" ||
	window.location.hostname === "127.0.0.1";

const AUTH_BASE_URL = isLocalFrontend
	? "http://localhost:8080/api/auth"
	: "https://snip-me.onrender.com/api/auth";

