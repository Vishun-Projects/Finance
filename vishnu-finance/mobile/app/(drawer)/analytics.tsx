import React from 'react';
import { View, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { Typography } from '@/src/components/common/Typography';
import { Card } from '@/src/components/common/Card';
import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/src/store/useStore';
import {
    TrendingUp,
    TrendingDown,
    PieChart as PieChartIcon,
    Activity,
    ArrowUpRight,
    Target
} from 'lucide-react-native';

export default function AnalyticsScreen() {
    const { theme } = useAuthStore();
    const colors = Colors[theme || 'dark'];

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <Typography variant="h2" style={styles.title}>Spending Insights</Typography>
                <Typography variant="caption" style={styles.subtitle}>Last 30 days analysis</Typography>

                {/* Analytics Summary */}
                <View style={styles.summaryGrid}>
                    <Card style={[styles.summaryCard, { flex: 1 }]}>
                        <Activity size={20} color={colors.tint} />
                        <Typography variant="label" style={{ marginTop: 12 }}>Efficiency</Typography>
                        <Typography variant="h2">92%</Typography>
                    </Card>
                    <Card style={[styles.summaryCard, { flex: 1 }]}>
                        <Target size={20} color="#ff9f43" />
                        <Typography variant="label" style={{ marginTop: 12 }}>Safe Spend</Typography>
                        <Typography variant="h2">$420</Typography>
                    </Card>
                </View>

                {/* Charts Section Placeholder */}
                <Card style={styles.chartCard}>
                    <View style={styles.chartHeader}>
                        <Typography variant="h3">Monthly Trends</Typography>
                        <TrendingUp size={20} color="#2ecc71" />
                    </View>
                    <View style={styles.chartPlaceholder}>
                        {/* We'll use a visual placeholder since complex charts need dedicated libs */}
                        <View style={[styles.bar, { height: '40%', backgroundColor: colors.tint }]} />
                        <View style={[styles.bar, { height: '70%', backgroundColor: colors.tint }]} />
                        <View style={[styles.bar, { height: '55%', backgroundColor: colors.tint }]} />
                        <View style={[styles.bar, { height: '90%', backgroundColor: colors.tint }]} />
                        <View style={[styles.bar, { height: '65%', backgroundColor: colors.tint }]} />
                        <View style={[styles.bar, { height: '45%', backgroundColor: colors.tint }]} />
                    </View>
                </Card>

                {/* Category Breakdown */}
                <View style={styles.section}>
                    <Typography variant="h3" style={styles.sectionTitle}>Category Breakdown</Typography>
                    <BreakdownItem label="Housing" percentage={45} color="#70a1ff" amount="$1,200" />
                    <BreakdownItem label="Food & Dining" percentage={20} color="#ff7f50" amount="$540" />
                    <BreakdownItem label="Transportation" percentage={15} color="#2ed573" amount="$410" />
                    <BreakdownItem label="Shopping" percentage={12} color="#eccc68" amount="$320" />
                </View>

                {/* Savings Goal */}
                <Card style={styles.goalCard} variant="solid">
                    <View style={styles.goalInfo}>
                        <Typography variant="label" color="#fff">New Car Fund</Typography>
                        <Typography variant="caption" color="rgba(255,255,255,0.6)">$12,000 / $25,000</Typography>
                    </View>
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: '48%' }]} />
                    </View>
                </Card>
            </ScrollView>
        </View>
    );
}

function BreakdownItem({ label, percentage, color, amount }: any) {
    return (
        <View style={styles.breakdownItem}>
            <View style={styles.breakdownHeader}>
                <Typography variant="label">{label}</Typography>
                <Typography variant="label">{amount}</Typography>
            </View>
            <View style={styles.breakdownBarBg}>
                <View style={[styles.breakdownBarFill, { width: `${percentage}%`, backgroundColor: color }]} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: 24, paddingBottom: 40 },
    title: { marginBottom: 4 },
    subtitle: { marginBottom: 24, opacity: 0.6 },
    summaryGrid: { flexDirection: 'row', gap: 16, marginBottom: 24 },
    summaryCard: { padding: 16, alignItems: 'flex-start' },
    chartCard: { padding: 20, marginBottom: 32 },
    chartHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
    chartPlaceholder: {
        height: 150,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
    },
    bar: { width: 30, borderRadius: 6, opacity: 0.8 },
    section: { marginBottom: 32 },
    sectionTitle: { marginBottom: 20 },
    breakdownItem: { marginBottom: 16 },
    breakdownHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    breakdownBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 3 },
    breakdownBarFill: { height: '100%', borderRadius: 3 },
    goalCard: { backgroundColor: '#1c1c1e', padding: 20 },
    goalInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    progressBarBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4 },
    progressBarFill: { height: '100%', backgroundColor: '#7beded', borderRadius: 4 },
});
