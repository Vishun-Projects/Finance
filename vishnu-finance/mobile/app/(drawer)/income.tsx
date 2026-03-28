import React from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Typography } from '@/src/components/common/Typography';
import { Card } from '@/src/components/common/Card';
import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/src/store/useStore';
import { useIncome } from '@/src/api/hooks';
import { TrendingUp, Target } from 'lucide-react-native';

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

export default function IncomeScreen() {
    const { theme } = useAuthStore();
    const colors = Colors[theme || 'dark'];
    const { data, isLoading } = useIncome();

    const incomes = data?.data ?? [];
    const totalIncome = incomes.reduce((sum, inc) => sum + (inc.amount || 0), 0);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Typography variant="h2">Income Tracker</Typography>
                    <Typography variant="caption">All sources of your income</Typography>
                </View>

                <Card style={styles.totalCard}>
                    <Typography variant="label" color="rgba(255,255,255,0.7)">Total Income This Month</Typography>
                    <Typography variant="h1" style={styles.amount}>{formatCurrency(totalIncome)}</Typography>
                    <View style={styles.growthBadge}>
                        <TrendingUp size={14} color="#2ecc71" />
                        <Typography variant="caption" color="#2ecc71" style={{ marginLeft: 4 }}>{incomes.length} source{incomes.length !== 1 ? 's' : ''}</Typography>
                    </View>
                </Card>

                {isLoading ? (
                    <View style={styles.centered}>
                        <ActivityIndicator color={colors.tint} size="large" />
                        <Typography variant="caption" style={{ marginTop: 12 }}>Loading income data…</Typography>
                    </View>
                ) : (
                    <View style={styles.section}>
                        <Typography variant="label" style={styles.sectionTitle}>INCOME SOURCES</Typography>
                        {incomes.length === 0 && (
                            <Typography variant="caption" style={{ opacity: 0.4, textAlign: 'center', marginTop: 20 }}>
                                No income records found. Add transactions with INCOME category.
                            </Typography>
                        )}
                        {incomes.map(inc => (
                            <Card key={inc.id} style={styles.item} variant="glass">
                                <View style={styles.row}>
                                    <View style={[styles.iconBox, { backgroundColor: 'rgba(46,204,113,0.15)' }]}>
                                        <Target size={20} color="#2ecc71" />
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 16 }}>
                                        <Typography variant="label" numberOfLines={1}>{inc.name}</Typography>
                                        <Typography variant="caption">{new Date(inc.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}</Typography>
                                    </View>
                                    <Typography variant="label" color="#2ecc71">{formatCurrency(inc.amount)}</Typography>
                                </View>
                            </Card>
                        ))}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: 24, paddingBottom: 40 },
    header: { marginBottom: 32 },
    totalCard: { backgroundColor: '#1c1c1e', padding: 24, marginBottom: 32, alignItems: 'center' },
    amount: { marginTop: 8 },
    growthBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(46,204,113,0.1)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginTop: 12 },
    section: { marginBottom: 32 },
    sectionTitle: { marginBottom: 16, opacity: 0.5, letterSpacing: 1 },
    item: { padding: 16, marginBottom: 12 },
    row: { flexDirection: 'row', alignItems: 'center' },
    iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    centered: { alignItems: 'center', marginTop: 40 },
});
