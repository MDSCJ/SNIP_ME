/**
 * API Configuration
 * Easily switch between local and production servers
 * 
 * DEVELOPMENT (Local): Set ENVIRONMENT = 'local'
 *   - Frontend: http://localhost:3000 or file://
 *   - Backend: http://localhost:8080
 *   - Database: Local MySQL
 * 
 * PRODUCTION (GitHub Pages + Render): Set ENVIRONMENT = 'production'
 *   - Frontend: https://mdscj.github.io (GitHub Pages)
 *   - Backend: https://snip-me.onrender.com
 *   - Database: Render MySQL
 */

// ⚙️ SWITCH HERE: 'local' for development, 'production' for deployed
const ENVIRONMENT = 'local';

const API_CONFIG = {
    production: {
        baseUrl: 'https://snip-me.onrender.com/api',
        name: 'Production (Render)',
        frontend: 'https://mdscj.github.io'
    },
    local: {
        baseUrl: 'http://localhost:8080/api',
        name: 'Local Development',
        frontend: 'http://localhost:3000'
    }
};

// Get the appropriate configuration
const CURRENT_CONFIG = API_CONFIG[ENVIRONMENT] || API_CONFIG.production;
const API_BASE_URL = CURRENT_CONFIG.baseUrl;
const AUTH_BASE_URL = `${API_BASE_URL}/auth`;

// Function to switch environment (reload page with new environment)
function switchEnvironment(env) {
    if (API_CONFIG[env]) {
        console.log(`🔄 Switching to ${API_CONFIG[env].name}...`);
        console.log(`Backend: ${API_CONFIG[env].baseUrl}`);
        // You can add a URL parameter to persist the choice if needed
        window.location.reload();
    } else {
        console.error('Unknown environment:', env);
    }
}
