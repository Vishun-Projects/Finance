import { Redirect } from 'expo-router';
import { useAuthStore } from '@/src/store/useStore';

export default function Index() {
    const { isAuthenticated } = useAuthStore();

    if (!isAuthenticated) {
        return <Redirect href="/login" />;
    }

    return <Redirect href="/(drawer)/(tabs)" />;
}
