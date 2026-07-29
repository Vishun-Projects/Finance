package com.vishnu.finance.sms;

import android.app.Notification;
import android.content.ComponentName;
import android.content.Context;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

import com.getcapacitor.JSObject;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Captures bank / UPI alerts from notifications (SMS apps + payment apps).
 * Does not require READ_SMS.
 */
public class BankNotificationListenerService extends NotificationListenerService {
    private static final Pattern TXN_HINT = Pattern.compile(
        "(?i)(sent\\s+rs|credited|debited|avl\\s*bal|available\\s+balance|\\brrn\\b|upi|neft|imps|spent\\s+rs|paid\\s+rs)"
    );

    private static volatile BankNotificationListenerService instance;

    private static final Set<String> ALLOWED_PACKAGES = new HashSet<>(Arrays.asList(
        // Messaging (SMS notifications)
        "com.google.android.apps.messaging",
        "com.android.mms",
        "com.samsung.android.messaging",
        "com.android.messaging",
        "com.miui.sms",
        "com.android.mms.service",
        "com.xiaomi.mipicks",
        "com.truecaller",
        // UPI / wallets
        "com.google.android.apps.nbu.paisa.user",
        "com.phonepe.app",
        "net.one97.paytm",
        "com.phonepe.app.business",
        "com.dreamplug.androidapp",
        "in.amazon.mShop.android.shopping",
        "com.whatsapp",
        // Major bank apps (India)
        "com.sbi.lotusintouch",
        "com.snapwork.hdfc",
        "com.csam.icici.bank.imobile",
        "com.axis.mobile",
        "com.msf.kbank.mobile",
        "com.fss.indianbank",
        "com.indianbank.indmobile",
        "com.bankofbaroda.mconnect",
        "com.canarabank.mobility",
        "com.pnb.cdn",
        "com.yesbank",
        "com.infrasofttech.yesbank",
        "com.idfcfirstbank.mobile",
        "com.kotak.mobile"
    ));

    private static final Pattern BANKISH_PACKAGE = Pattern.compile(
        "(?i).*(bank|upi|paytm|phonepe|paisa|bhim|wallet|hdfc|sbi|icici|axis|kotak|indian).*"
    );

    @Override
    public void onListenerConnected() {
        super.onListenerConnected();
        instance = this;
        if (BankSmsStore.isAutoReadEnabled(this) && BankSmsStore.isOverlayEnabled(this)) {
            BankSmsBubbleController.update(this, BankSmsStore.getPendingCount(this));
        }
    }

    @Override
    public void onListenerDisconnected() {
        if (instance == this) instance = null;
        super.onListenerDisconnected();
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null || sbn.isOngoing()) return;
        if (!BankSmsStore.isAutoReadEnabled(this)) return;

        String pkg = sbn.getPackageName();
        if (pkg == null || pkg.equals(getPackageName())) return;
        if (!isAllowedPackage(pkg)) return;

        Notification notification = sbn.getNotification();
        if (notification == null) return;
        Bundle extras = notification.extras;
        if (extras == null) return;

        CharSequence titleCs = extras.getCharSequence(Notification.EXTRA_TITLE);
        CharSequence textCs = extras.getCharSequence(Notification.EXTRA_TEXT);
        CharSequence bigCs = extras.getCharSequence(Notification.EXTRA_BIG_TEXT);
        String title = titleCs != null ? titleCs.toString().trim() : "";
        String text = textCs != null ? textCs.toString().trim() : "";
        String big = bigCs != null ? bigCs.toString().trim() : "";

        String body = !big.isEmpty() ? big : text;
        if (body.isEmpty() && !title.isEmpty()) body = title;
        if (body.isEmpty()) return;

        // Combine title when it looks like a sender (e.g. BT-INDBNK-S)
        String combined = body;
        if (!title.isEmpty() && !body.contains(title) && title.length() < 80) {
            combined = title + "\n" + body;
        }

        if (!TXN_HINT.matcher(combined).find()) return;
        if (SmsBankReaderPlugin.looksLikeOtp(combined)) return;
        if (looksLikeUpcoming(combined)) return;

        String address = !title.isEmpty() ? title : pkg;
        long when = sbn.getPostTime() > 0 ? sbn.getPostTime() : System.currentTimeMillis();
        String id = pkg + ":" + sbn.getId() + ":" + when + ":" + Integer.toHexString(combined.hashCode());

        JSObject payload = new JSObject();
        payload.put("id", id);
        payload.put("address", address);
        payload.put("body", combined);
        payload.put("date", when);
        payload.put("packageName", pkg);

        BankSmsStore.incrementPendingCount(this);
        int pending = BankSmsStore.getPendingCount(this);
        SmsBankReaderPlugin.emitSmsReceived(payload);
        BankSmsBubbleController.update(this, pending);
        BankSmsAlertNotifier.notifyNewItem(this, id, pending);
    }

    /** Active notifications from the connected listener (null if not bound). */
    public static StatusBarNotification[] getActiveBankNotifications() {
        BankNotificationListenerService svc = instance;
        if (svc == null) return null;
        try {
            return svc.getActiveNotifications();
        } catch (Exception e) {
            return null;
        }
    }

    static boolean isAllowedPackage(String pkg) {
        if (ALLOWED_PACKAGES.contains(pkg)) return true;
        return BANKISH_PACKAGE.matcher(pkg).matches();
    }

    static boolean looksLikeUpcoming(String body) {
        String lower = body.toLowerCase(Locale.US);
        return lower.contains("will be debited")
            || (lower.contains("autopay") && lower.contains("pause mandate"))
            || (lower.contains("mandate") && lower.contains("will be"));
    }

    /** Whether our listener component is enabled in system settings. */
    public static boolean isNotificationAccessEnabled(Context context) {
        String flat = android.provider.Settings.Secure.getString(
            context.getContentResolver(),
            "enabled_notification_listeners"
        );
        if (flat == null || flat.isEmpty()) return false;
        ComponentName expected = new ComponentName(context, BankNotificationListenerService.class);
        for (String name : flat.split(":")) {
            ComponentName cn = ComponentName.unflattenFromString(name);
            if (cn != null && cn.equals(expected)) return true;
        }
        return false;
    }
}
