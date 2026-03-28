import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Typography } from '@/src/components/common/Typography';
import { Card } from '@/src/components/common/Card';
import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/src/store/useStore';
import {
    Target,
    Map,
    Calendar,
    Flag,
    ArrowRight
} from 'lucide-react-native';

export default function PlansScreen() {
    const { theme } = useAuthStore();
    const colors = Colors[theme || 'dark'];

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Typography variant="h2">Financial Planning</Typography>
                    <Typography variant="caption">Blueprint for your future wealth</Typography>
                </View>

                <View style={styles.section}>
                    <Typography variant="label" style={styles.sectionTitle}>ACTIVE PLANS</Typography>
                    <PlanCard
                        title="Retirement Strategy"
                        target="$1,000,000"
                        progress={42}
                        eta="15 Years"
                        icon={Target}
                        color="#7beded"
                    />
                    <PlanCard
                        title="House Down Payment"
                        target="$120,000"
                        progress={68}
                        eta="2 Years"
                        icon={Map}
                        color="#ff9f43"
                    />
                </View>

                <View style={styles.section}>
                    <Typography variant="label" style={styles.sectionTitle}>LONG-TERM GOALS</Typography>
                    <GoalItem title="Debt Free" year="2027" icon={Flag} />
                    <GoalItem title="Emergency Fund (1 Yr)" year="2028" icon={Calendar} />
                </View>

                <Card style={styles.ctaCard} variant="solid">
                    <Typography variant="h3" color="#fff">Ready to scale?</Typography>
                    <Typography variant="caption" color="rgba(255,255,255,0.7)" style={{ marginTop: 8 }}>
                        Create a custom budget plan optimized for your current income.
                    </Typography>
                    <TouchableOpacity style={[styles.ctaBtn, { backgroundColor: colors.tint }]}>
                        <Typography variant="label" color="#000">Create New Plan</Typography>
                        <ArrowRight size={18} color="#000" />
                    </TouchableOpacity>
                </Card>
            </ScrollView>
        </View>
    );
}

function PlanCard({ title, target, progress, eta, icon: Icon, color }: any) {
    return (
        <Card style={styles.planCard} variant="glass">
            <View style={styles.planHeader}>
                <View style={[styles.iconBox, { backgroundColor: `${color}20` }]}>
                    <Icon size={24} color={color} />
                </View>
                <View style={{ flex: 1, marginLeft: 16 }}>
                    <Typography variant="h3">{title}</Typography>
                    <Typography variant="caption">Target: {target}</Typography>
                </View>
            </View>

            <View style={styles.progressSection}>
                <View style={styles.progressLabels}>
                    <Typography variant="label">{progress}%</Typography>
                    <Typography variant="caption">ETA: {eta}</Typography>
                </View>
                <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${progress}%`, backgroundColor: color }]} />
                </View>
            </View>
        </Card>
    );
}

function GoalItem({ title, year, icon: Icon }: any) {
    return (
        <Card style={styles.goalItem} variant="glass">
            <View style={styles.row}>
                <Icon size={20} color="#747d8c" />
                <Typography variant="label" style={{ flex: 1, marginLeft: 16 }}>{title}</Typography>
                <Typography variant="caption" style={{ fontWeight: '700' }}>{year}</Typography>
            </View>
        </Card>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: 24, paddingBottom: 40 },
    header: { marginBottom: 32 },
    section: { marginBottom: 32 },
    sectionTitle: { marginBottom: 16, opacity: 0.5, letterSpacing: 1 },
    planCard: { padding: 20, marginBottom: 16 },
    planHeader: { flexDirection: 'row', alignItems: 'center' },
    iconBox: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    progressSection: { marginTop: 20 },
    progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    progressBarBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 4 },
    progressBarFill: { height: '100%', borderRadius: 4 },
    goalItem: { padding: 16, marginBottom: 8, borderRadius: 16 },
    row: { flexDirection: 'row', alignItems: 'center' },
    ctaCard: { backgroundColor: '#1c1c1e', padding: 24 },
    ctaBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 12,
        marginTop: 20,
    },
});
