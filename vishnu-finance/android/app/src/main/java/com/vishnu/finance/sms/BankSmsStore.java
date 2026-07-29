package com.vishnu.finance.sms;

import android.content.Context;
import android.content.SharedPreferences;

public final class BankSmsStore {
    private static final String PREFS = "bank_sms_store";
    private static final String KEY_AUTO = "auto_read_enabled";
    private static final String KEY_OVERLAY = "overlay_enabled";
    private static final String KEY_PENDING = "pending_count";
    private static final String KEY_LAST_ONESHOT = "last_oneshot_alert_id";

    private BankSmsStore() {}

    public static void init(Context context) {
        // no-op warm prefs
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    public static boolean isAutoReadEnabled(Context context) {
        return prefs(context).getBoolean(KEY_AUTO, false);
    }

    public static void setAutoReadEnabled(Context context, boolean enabled) {
        prefs(context).edit().putBoolean(KEY_AUTO, enabled).apply();
    }

    public static boolean isOverlayEnabled(Context context) {
        return prefs(context).getBoolean(KEY_OVERLAY, false);
    }

    public static void setOverlayEnabled(Context context, boolean enabled) {
        prefs(context).edit().putBoolean(KEY_OVERLAY, enabled).apply();
    }

    public static int getPendingCount(Context context) {
        return prefs(context).getInt(KEY_PENDING, 0);
    }

    public static void setPendingCount(Context context, int count) {
        prefs(context).edit().putInt(KEY_PENDING, Math.max(0, count)).apply();
    }

    public static void incrementPendingCount(Context context) {
        setPendingCount(context, getPendingCount(context) + 1);
    }

    public static String getLastOneShotAlertId(Context context) {
        return prefs(context).getString(KEY_LAST_ONESHOT, null);
    }

    public static void setLastOneShotAlertId(Context context, String alertId) {
        prefs(context).edit().putString(KEY_LAST_ONESHOT, alertId).apply();
    }
}
