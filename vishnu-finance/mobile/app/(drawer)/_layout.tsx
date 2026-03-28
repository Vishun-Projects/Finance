import { Drawer } from 'expo-router/drawer';
import { BlurView } from 'expo-blur';
import { Platform, StyleSheet, View } from 'react-native';
import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/src/store/useStore';
import { Typography } from '@/src/components/common/Typography';
import {
    BarChart3,
    Wallet,
    Settings,
    LogOut,
    User,
    LayoutDashboard,
    History,
    PieChart,
    MessageSquare,
    Clock,
    HeartPulse,
    TrendingUp,
    Target,
    Sparkles,
    BookOpen
} from 'lucide-react-native';
import { DrawerContentScrollView, DrawerItemList, DrawerItem } from '@react-navigation/drawer';

function CustomDrawerContent(props: any) {
    const { theme, user, logout } = useAuthStore();
    const colors = Colors[theme || 'dark'];

    return (
        <View style={{ flex: 1, backgroundColor: colors.background }}>
            <DrawerContentScrollView {...props}>
                <View style={styles.drawerHeader}>
                    <View style={styles.avatar}>
                        <User size={32} stroke={colors.tint as any} />
                    </View>
                    <View style={styles.userInfo}>
                        <Typography variant="h3">{user?.name || 'Vishnu'}</Typography>
                        <Typography variant="caption">{user?.email || 'vishnu@example.com'}</Typography>
                    </View>
                </View>
                <DrawerItemList {...props} />
            </DrawerContentScrollView>
            <View style={[styles.drawerFooter, { borderTopColor: colors.border }]}>
                <DrawerItem
                    label="Logout"
                    labelStyle={{ color: '#ff4757', fontWeight: '600' }}
                    icon={({ size }) => <LogOut size={size} stroke="#ff4757" />}
                    onPress={() => logout()}
                />
            </View>
        </View>
    );
}

export default function DrawerLayout() {
    const { theme } = useAuthStore();
    const colors = Colors[theme || 'dark'];

    return (
        <Drawer
            drawerContent={(props) => <CustomDrawerContent {...props} />}
            screenOptions={{
                headerShown: true,
                headerStyle: {
                    backgroundColor: colors.background,
                    borderBottomWidth: 0,
                    elevation: 0,
                    shadowOpacity: 0,
                },
                headerTitleStyle: {
                    fontWeight: '700',
                    color: colors.text,
                },
                headerTintColor: colors.text,
                drawerActiveTintColor: colors.tint,
                drawerInactiveTintColor: colors.icon,
                drawerStyle: {
                    backgroundColor: colors.background,
                    width: 280,
                },
                drawerLabelStyle: {
                    marginLeft: -16,
                    fontWeight: '600',
                },
            }}
        >
            <Drawer.Screen
                name="(tabs)"
                options={{
                    drawerLabel: 'Home',
                    title: 'Finance Portfolio',
                    drawerIcon: ({ color, size }) => <LayoutDashboard size={size} stroke={color} />,
                }}
            />
            <Drawer.Screen
                name="transactions"
                options={{
                    drawerLabel: 'History',
                    title: 'Transaction History',
                    drawerIcon: ({ color, size }) => <History size={size} stroke={color} />,
                }}
            />
            <Drawer.Screen
                name="wallet"
                options={{
                    drawerLabel: 'My Wallet',
                    title: 'Wallet',
                    drawerIcon: ({ color, size }) => <Wallet size={size} stroke={color} />,
                }}
            />
            <Drawer.Screen
                name="advisor"
                options={{
                    drawerLabel: 'AI Advisor',
                    title: 'AI Financial Advisor',
                    drawerIcon: ({ color, size }) => <MessageSquare size={size} stroke={color} />,
                }}
            />
            <Drawer.Screen
                name="deadlines"
                options={{
                    drawerLabel: 'Deadlines',
                    title: 'Bills & Reminders',
                    drawerIcon: ({ color, size }) => <Clock size={size} stroke={color} />,
                }}
            />
            <Drawer.Screen
                name="health"
                options={{
                    drawerLabel: 'Financial Health',
                    title: 'Health Score',
                    drawerIcon: ({ color, size }) => <HeartPulse size={size} stroke={color} />,
                }}
            />
            <Drawer.Screen
                name="income"
                options={{
                    drawerLabel: 'Income Tracker',
                    title: 'Income Sources',
                    drawerIcon: ({ color, size }) => <TrendingUp size={size} stroke={color} />,
                }}
            />
            <Drawer.Screen
                name="plans"
                options={{
                    drawerLabel: 'Plans & Budgets',
                    title: 'Financial Planning',
                    drawerIcon: ({ color, size }) => <Target size={size} stroke={color} />,
                }}
            />
            <Drawer.Screen
                name="wishlist"
                options={{
                    drawerLabel: 'Wishlist',
                    title: 'Future Goals',
                    drawerIcon: ({ color, size }) => <Sparkles size={size} stroke={color} />,
                }}
            />
            <Drawer.Screen
                name="education"
                options={{
                    drawerLabel: 'Education',
                    title: 'Finance Learning',
                    drawerIcon: ({ color, size }) => <BookOpen size={size} stroke={color} />,
                }}
            />
            <Drawer.Screen
                name="settings"
                options={{
                    drawerLabel: 'Settings',
                    title: 'Preferences',
                    drawerIcon: ({ color, size }) => <Settings size={size} stroke={color} />,
                }}
            />
        </Drawer>
    );
}

const styles = StyleSheet.create({
    drawerHeader: {
        padding: 24,
        paddingTop: 40,
        marginBottom: 20,
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    userInfo: {
        gap: 4,
    },
    drawerFooter: {
        padding: 16,
        borderTopWidth: 1,
        marginBottom: 20,
    },
});
