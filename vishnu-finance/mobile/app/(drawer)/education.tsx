import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Typography } from '@/src/components/common/Typography';
import { Card } from '@/src/components/common/Card';
import { Colors } from '@/constants/theme';
import { useAuthStore } from '@/src/store/useStore';
import {
    BookOpen,
    Video,
    FileText,
    Bookmark,
    ChevronRight,
    TrendingUp,
    BrainCircuit
} from 'lucide-react-native';

export default function EducationScreen() {
    const { theme } = useAuthStore();
    const colors = Colors[theme || 'dark'];

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <Typography variant="h2">Learn Finance</Typography>
                    <Typography variant="caption">Master your money with curated content</Typography>
                </View>

                <View style={styles.featuredSection}>
                    <Card style={styles.featuredCard} variant="solid">
                        <BrainCircuit size={32} color={colors.tint} />
                        <Typography variant="h2" color="#fff" style={{ marginTop: 16 }}>Smart Investing 101</Typography>
                        <Typography variant="body" color="rgba(255,255,255,0.7)" style={{ marginTop: 8 }}>
                            Learn the basics of stock market and compound interest.
                        </Typography>
                        <TouchableOpacity style={[styles.startBtn, { backgroundColor: colors.tint }]}>
                            <Typography variant="label" color="#000">Start Learning</Typography>
                        </TouchableOpacity>
                    </Card>
                </View>

                <View style={styles.section}>
                    <Typography variant="label" style={styles.sectionTitle}>LATEST ARTICLES</Typography>
                    <CourseItem
                        type="article"
                        title="Understanding Tax Brackets"
                        time="5 min read"
                        category="Taxes"
                        icon={FileText}
                    />
                    <CourseItem
                        type="video"
                        title="Real Estate vs Stocks"
                        time="12 min video"
                        category="Investing"
                        icon={Video}
                    />
                    <CourseItem
                        type="article"
                        title="The 50/30/20 Rule Explored"
                        time="8 min read"
                        category="Budgeting"
                        icon={BookOpen}
                    />
                </View>

                <View style={styles.section}>
                    <Typography variant="label" style={styles.sectionTitle}>STREAK</Typography>
                    <Card style={styles.streakCard} variant="glass">
                        <TrendingUp size={24} color={colors.tint} />
                        <View style={{ marginLeft: 16 }}>
                            <Typography variant="label">7 Day Learning Streak!</Typography>
                            <Typography variant="caption">You're becoming a finance pro.</Typography>
                        </View>
                    </Card>
                </View>
            </ScrollView>
        </View>
    );
}

function CourseItem({ title, time, category, icon: Icon }: any) {
    const { theme } = useAuthStore();
    const colors = Colors[theme || 'dark'];

    return (
        <Card style={styles.itemCard} variant="glass">
            <View style={styles.row}>
                <View style={styles.iconBox}>
                    <Icon size={22} color={colors.tint} />
                </View>
                <View style={{ flex: 1, marginLeft: 16 }}>
                    <Typography variant="caption" color={colors.tint}>{category}</Typography>
                    <Typography variant="label" style={{ marginTop: 2 }}>{title}</Typography>
                    <Typography variant="caption" style={{ marginTop: 4 }}>{time}</Typography>
                </View>
                <ChevronRight size={20} color={colors.icon} />
            </View>
        </Card>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { padding: 24, paddingBottom: 40 },
    header: { marginBottom: 32 },
    featuredSection: { marginBottom: 32 },
    featuredCard: { backgroundColor: '#1c1c1e', padding: 24 },
    startBtn: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        alignSelf: 'flex-start',
        marginTop: 20
    },
    section: { marginBottom: 32 },
    sectionTitle: { marginBottom: 16, opacity: 0.5, letterSpacing: 1 },
    itemCard: { padding: 16, marginBottom: 12 },
    row: { flexDirection: 'row', alignItems: 'center' },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center'
    },
    streakCard: { padding: 20, flexDirection: 'row', alignItems: 'center' },
});
