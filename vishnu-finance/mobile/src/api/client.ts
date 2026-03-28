import axios from 'axios';
import { useAuthStore } from '../store/useStore';

// Production Vercel backend
export const BASE_URL = 'https://vishun-finance.vercel.app/api';

export const apiClient = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    // Allow cookies to be sent / received cross-origin
    withCredentials: true,
    timeout: 15000,
});

// Request Interceptor: Attach stored token as Cookie header for mobile clients
// The backend reads `auth-token` cookie; on mobile we manually pass it.
apiClient.interceptors.request.use(
    async (config) => {
        const token = useAuthStore.getState().token;
        if (token) {
            config.headers['Cookie'] = `auth-token=${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor: Extract cookie from Set-Cookie if present (login response)
apiClient.interceptors.response.use(
    (response) => {
        // After login the server sets a Set-Cookie header.
        // Axios on React Native can't auto-store it, so we parse it manually.
        const setCookie = response.headers['set-cookie'];
        if (setCookie) {
            const cookieArr = Array.isArray(setCookie) ? setCookie : [setCookie];
            for (const cookie of cookieArr) {
                const match = cookie.match(/auth-token=([^;]+)/);
                if (match) {
                    useAuthStore.getState().setToken(match[1]);
                    break;
                }
            }
        }
        return response;
    },
    async (error) => {
        if (error.response?.status === 401) {
            useAuthStore.getState().logout();
        }
        return Promise.reject(error);
    }
);
