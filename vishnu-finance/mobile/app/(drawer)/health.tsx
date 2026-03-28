import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Typography } from '@/src/components/common/Typography';
import { Card } from '@/src/components/common/Card';
import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/src/store/useStore';
import {
    HeartPulse,
    ShieldCheck,
    AlertTriangle,
    Activity,
    Award
} from 'lucide-react-native';

export default function HealthScreen() {
    const { theme } = useAuthStore();
    const colors = Colors[theme || 'dark'];

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.scoreContainer}>
                    <View style={[styles.scoreCircle, { borderColor: colors.tint }]}>
                        <Typography variant="h1" color={colors.tint}>85</Typography>
                        <Typography variant="caption">EXCELLENT</Typography>
                    </View>
                    <Typography variant="h2" style={{ marginTop: 24 }}>Your Health Score</Typography>
                    <Typography variant="body" style={styles.scoreDesc}>
                        Your financial health is in the top 10% of users. Keep it up!
                    </Typography>
                </View>

                <View style={styles.section}>
                    <Typography variant="label" style={styles.sectionTitle}>KEY METRICS</Typography>
                    <MetricItem
                        icon={ShieldCheck}
                        title="Debt Ratio"
                        value="12%"
                        status="Healthy"
                        color="#2ecc71"
                    />
                    <MetricItem
                        icon={Activity}
                        title="Savings Rate"
                        value="24%"
                        status="Improving"
                        color="#ffa502"
                    />
                    <MetricItem
                        icon={HeartPulse}
                        title="Emergency Fund"
                        value="6 Months"
                        status="Secure"
                        color="#2ecc71"
                    />
                </View>

                <Card style={styles.adviceCard} variant="solid">
                    <Award size={24} color="#f1c40f" />
                    <Typography variant="h3" color="#fff" style={{ marginTop: 12 }}>Next Milestone</Typography>
                    <Typography variant="body" color="rgba(255,255,255,0.7)" style={{ marginTop: 8 }}>
                        Maintain your savings rate for 3 more months to reach "Elite" status.
                    </Typography>
                </Card>
            </ScrollView>
        </View>
    );
}

function MetricItem({ icon: Icon, title, value, status, color }: any) {
    const { theme } = useAuthStore();
    const colors = Colors[theme || 'dark'];

    return (
        <Card style={styles.item} variant="glass">
            <View style={styles.row}>
                <View style={[styles.iconBox, { backgroundColor: `${color}20` }]}>
                    <Icon size={20} color={color} />
                </View>
                <View style={{ flex: 1, marginLeft: 16 }}>
                    <Typography variant="label">{title}</Typography>
                    <Typography variant="caption" color={color}>{status}</Typography>
                </View>
                <Typography variant="h3">{value}</Typography>
            </View>
        </Card>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: 24, paddingBottom: 40 },
    scoreContainer: { alignItems: 'center', marginBottom: 40 },
    scoreCircle: {
        width: 160,
        height: 160,
        borderRadius: 80,
        borderWidth: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scoreDesc: { textAlign: 'center', marginTop: 8, opacity: 0.6 },
    section: { marginBottom: 32 },
    sectionTitle: { marginBottom: 16, opacity: 0.5, letterSpacing: 1 },
    item: { padding: 16, marginBottom: 12 },
    row: { flexDirection: 'row', alignItems: 'center' },
    iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    adviceCard: { backgroundColor: '#1c1c1e', padding: 24 },
});
