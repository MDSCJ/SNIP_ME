/* Auto-select API URL for local development vs production */
const isLocalFrontend =
	window.location.protocol === "file:" ||
	window.location.hostname === "localhost" ||
	window.location.hostname === "127.0.0.1";

const localApiRoot = localStorage.getItem("snipmeApiRoot") || "http://localhost:8080/api";
const productionApiRoot = "https://snip-me.onrender.com/api";

const API_BASE_URL = isLocalFrontend ? localApiRoot : productionApiRoot;

const AUTH_BASE_URL = API_BASE_URL + "/auth";

