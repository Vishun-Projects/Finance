package com.vishnu.finance.sms;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.service.notification.StatusBarNotification;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.Locale;
import java.util.regex.Pattern;

@CapacitorPlugin(name = "SmsBankReader")
public class SmsBankReaderPlugin extends Plugin {
    private static final Pattern BANK_SENDER = Pattern.compile(
        "(?i).*(HDFC|SBI|ICICI|AXIS|KOTAK|BOI|PNB|YESB|IDFC|FEDERAL|INDUS|INDBNK|INDIANB|UNION|CANARA|BOB|CBI|UCO|IOB|RBL|BANDHAN|AU\\s?BANK|NPCI|PHONPE|PHONEPE|GPAY|PAYTM|BHIM|AIRTEL\\s?PAY|AMAZONP).*|"
            + "(?i)^[A-Z]{2}-[A-Z0-9]{4,}(?:-[A-Z0-9]+)?$"
    );

    private static final Pattern TXN_HINT = Pattern.compile(
        "(?i)(sent\\s+rs|credited|debited|avl\\s*bal|available\\s+balance|\\brrn\\b|upi|neft|imps)"
    );

    private static SmsBankReaderPlugin instance;

    @Override
    public void load() {
        instance = this;
        BankSmsStore.init(getContext());
    }

    public static void emitSmsReceived(JSObject payload) {
        if (instance != null) {
            instance.notifyListeners("bankSmsReceived", payload);
        }
    }

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        boolean notificationAccess = BankNotificationListenerService.isNotificationAccessEnabled(getContext());
        JSObject result = new JSObject();
        result.put("sms", notificationAccess ? "granted" : "denied");
        result.put("notificationAccess", notificationAccess);
        result.put("overlay", canDrawOverlays());
        result.put("restrictedLikely", false);
        call.resolve(result);
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        // Notification access cannot be granted via runtime dialog — open settings.
        boolean enabled = BankNotificationListenerService.isNotificationAccessEnabled(getContext());
        if (!enabled) {
            Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        }
        JSObject result = new JSObject();
        result.put("sms", enabled ? "granted" : "denied");
        result.put("notificationAccess", enabled);
        result.put("overlay", canDrawOverlays());
        result.put("openedSettings", !enabled);
        call.resolve(result);
    }

    @PluginMethod
    public void checkNotificationAccess(PluginCall call) {
        boolean enabled = BankNotificationListenerService.isNotificationAccessEnabled(getContext());
        JSObject result = new JSObject();
        result.put("enabled", enabled);
        call.resolve(result);
    }

    @PluginMethod
    public void openNotificationAccessSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        JSObject result = new JSObject();
        result.put("opened", true);
        call.resolve(result);
    }

    @PluginMethod
    public void openAppSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        intent.setData(Uri.parse("package:" + getContext().getPackageName()));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        JSObject result = new JSObject();
        result.put("opened", true);
        call.resolve(result);
    }

    @PluginMethod
    public void openSmsSettings(PluginCall call) {
        // Compat alias → notification access settings
        Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        JSObject result = new JSObject();
        result.put("opened", true);
        result.put("hint", "Enable Vishnu Finance under Notification access");
        call.resolve(result);
    }

    @PluginMethod
    public void requestOverlayPermission(PluginCall call) {
        if (canDrawOverlays()) {
            JSObject result = new JSObject();
            result.put("overlay", true);
            call.resolve(result);
            return;
        }
        Intent intent = new Intent(
            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
            Uri.parse("package:" + getContext().getPackageName())
        );
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        JSObject result = new JSObject();
        result.put("overlay", false);
        result.put("openedSettings", true);
        call.resolve(result);
    }

    /** Active notification drawer catch-up (not full SMS inbox). */
    @PluginMethod
    public void getRecentBankSms(PluginCall call) {
        getRecentBankNotifications(call);
    }

    @PluginMethod
    public void getRecentBankNotifications(PluginCall call) {
        if (!BankNotificationListenerService.isNotificationAccessEnabled(getContext())) {
            call.reject("Notification access not granted");
            return;
        }

        int limit = Math.min(Math.max(call.getInt("limit", 50), 1), 100);
        JSArray messages = new JSArray();

        try {
            // Active notifications are only available from the listener service instance.
            // Bridge asks listener via static helper when connected; otherwise return empty.
            StatusBarNotification[] active = BankNotificationListenerService.getActiveBankNotifications();
            if (active != null) {
                for (StatusBarNotification sbn : active) {
                    if (messages.length() >= limit) break;
                    JSObject row = toMessage(sbn);
                    if (row != null) messages.put(row);
                }
            }
        } catch (Exception e) {
            call.reject("Failed to read notifications: " + e.getMessage());
            return;
        }

        JSObject result = new JSObject();
        result.put("messages", messages);
        call.resolve(result);
    }

    private JSObject toMessage(StatusBarNotification sbn) {
        if (sbn == null || sbn.isOngoing()) return null;
        String pkg = sbn.getPackageName();
        if (!BankNotificationListenerService.isAllowedPackage(pkg)) return null;
        android.app.Notification n = sbn.getNotification();
        if (n == null || n.extras == null) return null;

        CharSequence titleCs = n.extras.getCharSequence(android.app.Notification.EXTRA_TITLE);
        CharSequence textCs = n.extras.getCharSequence(android.app.Notification.EXTRA_TEXT);
        CharSequence bigCs = n.extras.getCharSequence(android.app.Notification.EXTRA_BIG_TEXT);
        String title = titleCs != null ? titleCs.toString().trim() : "";
        String text = textCs != null ? textCs.toString().trim() : "";
        String big = bigCs != null ? bigCs.toString().trim() : "";
        String body = !big.isEmpty() ? big : text;
        if (body.isEmpty()) return null;
        if (!title.isEmpty() && !body.contains(title) && title.length() < 80) {
            body = title + "\n" + body;
        }
        if (!TXN_HINT.matcher(body).find()) return null;
        if (looksLikeOtp(body)) return null;
        if (BankNotificationListenerService.looksLikeUpcoming(body)) return null;

        long when = sbn.getPostTime() > 0 ? sbn.getPostTime() : System.currentTimeMillis();
        JSObject row = new JSObject();
        row.put("id", pkg + ":" + sbn.getId() + ":" + when);
        row.put("address", !title.isEmpty() ? title : pkg);
        row.put("body", body);
        row.put("date", when);
        row.put("packageName", pkg);
        return row;
    }

    @PluginMethod
    public void startBackgroundSync(PluginCall call) {
        BankSmsStore.setAutoReadEnabled(getContext(), true);
        Intent intent = new Intent(getContext(), BankSmsForegroundService.class);
        intent.setAction(BankSmsForegroundService.ACTION_START);
        ContextCompat.startForegroundService(getContext(), intent);
        JSObject result = new JSObject();
        result.put("running", true);
        call.resolve(result);
    }

    @PluginMethod
    public void stopBackgroundSync(PluginCall call) {
        BankSmsStore.setAutoReadEnabled(getContext(), false);
        Intent intent = new Intent(getContext(), BankSmsForegroundService.class);
        intent.setAction(BankSmsForegroundService.ACTION_STOP);
        getContext().startService(intent);
        JSObject result = new JSObject();
        result.put("running", false);
        call.resolve(result);
    }

    @PluginMethod
    public void setOverlayCount(PluginCall call) {
        int count = call.getInt("count", 0);
        boolean enabled = Boolean.TRUE.equals(call.getBoolean("enabled", false));
        BankSmsStore.setOverlayEnabled(getContext(), enabled);
        BankSmsStore.setPendingCount(getContext(), count);

        if (enabled && canDrawOverlays()) {
            Intent intent = new Intent(getContext(), BankSmsOverlayService.class);
            intent.setAction(BankSmsOverlayService.ACTION_UPDATE);
            intent.putExtra(BankSmsOverlayService.EXTRA_COUNT, count);
            ContextCompat.startForegroundService(getContext(), intent);
        } else {
            Intent intent = new Intent(getContext(), BankSmsOverlayService.class);
            intent.setAction(BankSmsOverlayService.ACTION_STOP);
            getContext().startService(intent);
        }

        JSObject result = new JSObject();
        result.put("count", count);
        result.put("enabled", enabled && canDrawOverlays());
        call.resolve(result);
    }

    @PluginMethod
    public void isNativeAvailable(PluginCall call) {
        JSObject result = new JSObject();
        result.put("available", true);
        result.put("platform", "android");
        result.put("captureMode", "notification_listener");
        call.resolve(result);
    }

    private boolean canDrawOverlays() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return true;
        return Settings.canDrawOverlays(getContext());
    }

    static boolean isBankSender(String address) {
        if (address == null || address.isBlank()) return false;
        String cleaned = address.trim().replace("+91", "");
        return BANK_SENDER.matcher(cleaned).find();
    }

    static boolean looksLikeOtp(String body) {
        String lower = body.toLowerCase(Locale.US);
        boolean hasTxn =
            lower.contains("sent rs")
                || lower.contains("debited")
                || lower.contains("credited")
                || lower.contains("spent")
                || lower.contains("paid");
        if (lower.contains("do not share") || lower.contains("don't share")) {
            if (!hasTxn) return true;
        }
        if (lower.contains("one time password") || lower.contains("otp")) {
            if (!hasTxn) return true;
        }
        return false;
    }
}
