import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Typography } from '@/src/components/common/Typography';
import { Card } from '@/src/components/common/Card';
import { Button } from '@/src/components/common/Button';
import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/src/store/useStore';
import {
    CreditCard,
    Plus,
    ArrowUpRight,
    PiggyBank,
    CheckCircle2,
    AlertCircle
} from 'lucide-react-native';

export default function WalletScreen() {
    const { theme } = useAuthStore();
    const colors = Colors[theme || 'dark'];

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <Typography variant="h2" style={styles.title}>My Accounts</Typography>

                {/* Card Swiper Placeholder */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} pagingEnabled style={styles.cardSwiper}>
                    <DebitCard color="#2ecc71" brand="VISA" last4="4582" balance="$12,450" label="Primary Savings" />
                    <DebitCard color="#70a1ff" brand="Mastercard" last4="8821" balance="$5,200" label="Daily Expense" />
                </ScrollView>

                <Button title="Add New Card" onPress={() => { }} variant="outline" style={styles.addBtn} />

                {/* Savings Section */}
                <View style={styles.section}>
                    <Typography variant="h3" style={styles.sectionTitle}>Savings Goals</Typography>
                    <GoalItem icon={PiggyBank} title="Emergency Fund" progress={80} amount="$4,000" />
                    <GoalItem icon={ArrowUpRight} title="Vacation Fund" progress={35} amount="$1,500" />
                </View>

                {/* Account Limits */}
                <View style={styles.section}>
                    <Typography variant="h3" style={styles.sectionTitle}>Account Limits</Typography>
                    <Card style={styles.limitCard}>
                        <View style={styles.limitHeader}>
                            <CheckCircle2 size={24} color="#2ecc71" />
                            <Typography variant="label" style={{ marginLeft: 12 }}>Daily Transaction Limit</Typography>
                        </View>
                        <Typography variant="h3" style={{ marginTop: 12 }}>$5,000.00</Typography>
                    </Card>
                </View>
            </ScrollView>
        </View>
    );
}

function DebitCard({ color, brand, last4, balance, label }: any) {
    return (
        <Card style={[styles.card, { backgroundColor: color }]} variant="solid">
            <View style={styles.cardHeader}>
                <Typography variant="label" color="#fff">{label}</Typography>
                <Typography variant="label" color="#fff" style={{ fontWeight: '800' }}>{brand}</Typography>
            </View>
            <View style={styles.cardBody}>
                <Typography variant="caption" color="rgba(255,255,255,0.8)">Balance</Typography>
                <Typography variant="h1" color="#fff">{balance}</Typography>
            </View>
            <View style={styles.cardFooter}>
                <Typography variant="label" color="#fff">**** **** **** {last4}</Typography>
                <CreditCard size={24} color="#fff" />
            </View>
        </Card>
    );
}

function GoalItem({ icon: Icon, title, progress, amount }: any) {
    return (
        <Card style={styles.goalItem} variant="glass">
            <View style={styles.goalContent}>
                <View style={styles.goalIcon}>
                    <Icon size={20} color="#7beded" />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Typography variant="label">{title}</Typography>
                    <Typography variant="caption">{progress}% complete • {amount} saved</Typography>
                    <View style={styles.miniProgressBg}>
                        <View style={[styles.miniProgressFill, { width: `${progress}%` }]} />
                    </View>
                </View>
            </View>
        </Card>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: 24, paddingBottom: 40 },
    title: { marginBottom: 24 },
    cardSwiper: { height: 220, marginBottom: 20 },
    card: { width: 340, height: 200, padding: 24, marginRight: 16, borderRadius: 28, borderWidth: 0 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
    cardBody: { flex: 1, justifyContent: 'center' },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    addBtn: { marginBottom: 32 },
    section: { marginBottom: 32 },
    sectionTitle: { marginBottom: 16 },
    goalItem: { padding: 16, marginBottom: 12 },
    goalContent: { flexDirection: 'row', alignItems: 'center' },
    goalIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(123, 237, 237, 0.1)', alignItems: 'center', justifyContent: 'center' },
    miniProgressBg: { height: 4, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 2, marginTop: 10 },
    miniProgressFill: { height: '100%', backgroundColor: '#7beded', borderRadius: 2 },
    limitCard: { padding: 20 },
    limitHeader: { flexDirection: 'row', alignItems: 'center' },
});
