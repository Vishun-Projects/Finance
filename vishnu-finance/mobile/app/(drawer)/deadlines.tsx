import React from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Typography } from '@/src/components/common/Typography';
import { Card } from '@/src/components/common/Card';
import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/src/store/useStore';
import { useDeadlines } from '@/src/api/hooks';
import { Bell, Calendar, AlertTriangle, CheckCircle } from 'lucide-react-native';

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getDaysLeft(dateStr: string) {
    const diff = new Date(dateStr).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export default function DeadlinesScreen() {
    const { theme } = useAuthStore();
    const colors = Colors[theme || 'dark'];
    const { data, isLoading } = useDeadlines();

    const deadlines: any[] = Array.isArray(data) ? data : (data?.data ?? data?.deadlines ?? []);

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Typography variant="h2">Deadlines</Typography>
                    <Typography variant="caption">Upcoming bills & commitments</Typography>
                </View>

                {isLoading ? (
                    <View style={styles.centered}>
                        <ActivityIndicator color={colors.tint} size="large" />
                        <Typography variant="caption" style={{ marginTop: 12 }}>Loading deadlines…</Typography>
                    </View>
                ) : deadlines.length === 0 ? (
                    <Card style={styles.emptyCard} variant="glass">
                        <CheckCircle size={40} color="#2ecc71" />
                        <Typography variant="h3" style={{ marginTop: 16 }}>All Clear!</Typography>
                        <Typography variant="caption" style={{ marginTop: 8, textAlign: 'center', opacity: 0.6 }}>
                            No upcoming deadlines. Enjoy the peace!
                        </Typography>
                    </Card>
                ) : (
                    <View style={styles.section}>
                        {deadlines.map((d: any) => {
                            const daysLeft = d.dueDate ? getDaysLeft(d.dueDate) : null;
                            const isUrgent = daysLeft !== null && daysLeft <= 3;
                            const isPast = daysLeft !== null && daysLeft < 0;
                            const color = isPast ? '#ff4757' : isUrgent ? '#ffa502' : '#2ecc71';

                            return (
                                <Card key={d.id} style={styles.item} variant="glass">
                                    <View style={styles.row}>
                                        <View style={[styles.iconBox, { backgroundColor: `${color}20` }]}>
                                            {isPast || isUrgent ? <AlertTriangle size={20} color={color} /> : <Calendar size={20} color={color} />}
                                        </View>
                                        <View style={{ flex: 1, marginLeft: 14 }}>
                                            <Typography variant="label">{d.title || d.name || d.description}</Typography>
                                            <Typography variant="caption">{d.dueDate ? formatDate(d.dueDate) : 'No date'}</Typography>
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            {daysLeft !== null && (
                                                <Typography variant="caption" color={color}>
                                                    {isPast ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? 'Today!' : `${daysLeft}d left`}
                                                </Typography>
                                            )}
                                            {d.amount && <Typography variant="label">₹{d.amount.toLocaleString('en-IN')}</Typography>}
                                        </View>
                                    </View>
                                </Card>
                            );
                        })}
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
    section: { gap: 12 },
    item: { padding: 16 },
    row: { flexDirection: 'row', alignItems: 'center' },
    iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    centered: { alignItems: 'center', marginTop: 40 },
    emptyCard: { padding: 40, alignItems: 'center', marginTop: 20 },
});
