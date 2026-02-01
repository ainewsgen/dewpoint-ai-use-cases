// Simple UUID v4 generator to avoid external dependencies
function uuidv4() {
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
        (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
    );
}

const SHADOW_ID_KEY = 'dpg_shadow_id';
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year in seconds

export const TrackingService = {
    /**
     * Retrieves or creates a persistent Shadow ID for the current user.
     * Checks localStorage and Cookies. Syncs them if one is missing.
     */
    getShadowId: (): string => {
        let shadowId = localStorage.getItem(SHADOW_ID_KEY);
        const cookieId = getCookie(SHADOW_ID_KEY);

        if (shadowId && !cookieId) {
            // Restore cookie from localStorage
            setCookie(SHADOW_ID_KEY, shadowId, COOKIE_MAX_AGE);
        } else if (!shadowId && cookieId) {
            // Restore localStorage from cookie
            shadowId = cookieId;
            localStorage.setItem(SHADOW_ID_KEY, cookieId);
        } else if (!shadowId && !cookieId) {
            // New user: Generate fresh ID
            shadowId = uuidv4();
            localStorage.setItem(SHADOW_ID_KEY, shadowId);
            setCookie(SHADOW_ID_KEY, shadowId, COOKIE_MAX_AGE);
        }

        return shadowId!;
    },

    /**
     * Returns the Shadow ID to be sent in API headers.
     */
    getHeaders: () => {
        return {
            'x-shadow-id': TrackingService.getShadowId()
        };
    }
};

// Helper: Set Cookie
function setCookie(name: string, value: string, maxAge: number) {
    document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; SameSite=Strict`;
}

// Helper: Get Cookie by name
function getCookie(name: string): string | null {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
}
