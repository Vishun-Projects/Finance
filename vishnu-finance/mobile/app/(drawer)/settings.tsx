import React from 'react';
import { View, StyleSheet, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { Typography } from '@/src/components/common/Typography';
import { Card } from '@/src/components/common/Card';
import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/src/store/useStore';
import {
    User,
    Bell,
    Lock,
    Eye,
    Moon,
    ChevronRight,
    ShieldCheck,
    HelpCircle
} from 'lucide-react-native';

export default function SettingsScreen() {
    const { theme, setTheme, user } = useAuthStore();
    const colors = Colors[theme || 'dark'];

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* Profile Section */}
                <Card style={styles.profileCard} variant="solid">
                    <View style={styles.avatar}>
                        <User size={40} color={colors.tint} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 16 }}>
                        <Typography variant="h3">{user?.name || 'Vishnu'}</Typography>
                        <Typography variant="caption">{user?.email || 'vishnu@example.com'}</Typography>
                    </View>
                    <TouchableOpacity style={styles.editBtn}>
                        <Typography variant="label" color={colors.tint}>Edit</Typography>
                    </TouchableOpacity>
                </Card>

                {/* Settings Groups */}
                <View style={styles.section}>
                    <Typography variant="label" style={styles.sectionTitle}>PREFERENCES</Typography>
                    <Card style={styles.groupCard}>
                        <SettingItem
                            icon={Moon}
                            label="Dark Mode"
                            right={<Switch value={theme === 'dark'} onValueChange={toggleTheme} trackColor={{ true: colors.tint }} />}
                        />
                        <SettingItem icon={Bell} label="Notifications" right={<ChevronRight size={20} color={colors.icon} />} />
                    </Card>
                </View>

                <View style={styles.section}>
                    <Typography variant="label" style={styles.sectionTitle}>SECURITY</Typography>
                    <Card style={styles.groupCard}>
                        <SettingItem icon={Lock} label="Change Password" right={<ChevronRight size={20} color={colors.icon} />} />
                        <SettingItem icon={ShieldCheck} label="Two-Factor Auth" right={<Switch value={true} trackColor={{ true: colors.tint }} />} />
                    </Card>
                </View>

                <View style={styles.section}>
                    <Typography variant="label" style={styles.sectionTitle}>SUPPORT</Typography>
                    <Card style={styles.groupCard}>
                        <SettingItem icon={HelpCircle} label="Help Center" right={<ChevronRight size={20} color={colors.icon} />} />
                    </Card>
                </View>

                <Typography variant="caption" style={styles.version}>Version 1.0.0 (BETA)</Typography>
            </ScrollView>
        </View>
    );
}

function SettingItem({ icon: Icon, label, right }: any) {
    const { theme } = useAuthStore();
    const colors = Colors[theme || 'dark'];

    return (
        <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
            <View style={styles.settingLabel}>
                <View style={styles.iconBox}>
                    <Icon size={20} color={colors.text} />
                </View>
                <Typography variant="label" style={{ marginLeft: 12 }}>{label}</Typography>
            </View>
            {right}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: 24, paddingBottom: 40 },
    profileCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 32, padding: 20 },
    avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    editBtn: { padding: 8 },
    section: { marginBottom: 24 },
    sectionTitle: { marginBottom: 12, marginLeft: 4, letterSpacing: 1 },
    groupCard: { padding: 0, borderRadius: 20 },
    settingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 0.5,
    },
    settingLabel: { flexDirection: 'row', alignItems: 'center' },
    iconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center' },
    version: { textAlign: 'center', marginTop: 20, opacity: 0.4 },
});
