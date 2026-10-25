/* Auto-select API URL for local development vs production */
const isLocalFrontend =
	window.location.protocol === "file:" ||         // opened directly from disk
	window.location.hostname === "localhost" ||
	window.location.hostname === "127.0.0.1";

// On Render, backend is at snip-me.onrender.com
// Locally, backend runs on port 8080 (overridable via localStorage)
const localApiRoot = localStorage.getItem("snipmeApiRoot") || "http://localhost:8080/api";
const productionApiRoot = "https://snip-me.onrender.com/api";

const API_BASE_URL = isLocalFrontend ? localApiRoot : productionApiRoot;
const AUTH_BASE_URL = API_BASE_URL + "/auth";


/* Adds the logged-in customer's JWT so the backend knows who is calling */
function customerAuthHeaders(extraHeaders) {
	const headers = Object.assign({}, extraHeaders || {});
	const token = localStorage.getItem("snipmeCustomerToken");
	if (token) {
		headers["Authorization"] = "Bearer " + token;
	}
	return headers;
}


/* Escapes a value for safe insertion into HTML text or quoted attributes */
function escapeHTML(value) {
	if (value === null || value === undefined) return "";
	return String(value)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

/* Allows only http(s):, data:image/ and relative URLs; returns '' otherwise */
function safeURL(value) {
	if (value === null || value === undefined) return "";
	const url = String(value).trim();
	if (url === "") return "";
	if (/^(https?:|data:image\/)/i.test(url)) return url;
	// Relative URL: no scheme before the first / ? or #
	if (!/^[^\/?#]*:/.test(url.replace(/[\u0000- ]/g, ""))) return url;
	return "";
}
