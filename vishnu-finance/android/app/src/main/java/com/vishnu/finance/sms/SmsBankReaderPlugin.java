package com.vishnu.finance.sms;

import android.Manifest;
import android.content.ContentResolver;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.provider.Telephony;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.Locale;
import java.util.regex.Pattern;

@CapacitorPlugin(
    name = "SmsBankReader",
    permissions = {
        @Permission(
            alias = "sms",
            strings = {
                Manifest.permission.READ_SMS,
                Manifest.permission.RECEIVE_SMS
            }
        )
    }
)
public class SmsBankReaderPlugin extends Plugin {
    private static final Pattern BANK_SENDER = Pattern.compile(
        // Match bank/PSP codes inside DLT IDs — do not hardcode BT/BZ/BV prefixes
        "(?i).*(HDFC|SBI|ICICI|AXIS|KOTAK|BOI|PNB|YESB|IDFC|FEDERAL|INDUS|INDBNK|INDIANB|UNION|CANARA|BOB|CBI|UCO|IOB|RBL|BANDHAN|AU\\s?BANK|NPCI|PHONPE|PHONEPE|GPAY|PAYTM|BHIM|AIRTEL\\s?PAY|AMAZONP).*|"
            // Any 2-letter operator prefix + bank-like token (VK-HDFCBK, BT-INDBNK-S, etc.)
            + "(?i)^[A-Z]{2}-[A-Z0-9]{4,}(?:-[A-Z0-9]+)?$"
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
        JSObject result = new JSObject();
        result.put("sms", getPermissionState("sms").toString().toLowerCase(Locale.US));
        result.put("overlay", canDrawOverlays());
        call.resolve(result);
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        if (getPermissionState("sms") == PermissionState.GRANTED) {
            JSObject result = new JSObject();
            result.put("sms", "granted");
            result.put("overlay", canDrawOverlays());
            call.resolve(result);
            return;
        }
        requestPermissionForAlias("sms", call, "smsPermsCallback");
    }

    @PermissionCallback
    private void smsPermsCallback(PluginCall call) {
        JSObject result = new JSObject();
        result.put("sms", getPermissionState("sms").toString().toLowerCase(Locale.US));
        result.put("overlay", canDrawOverlays());
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

    @PluginMethod
    public void getRecentBankSms(PluginCall call) {
        if (getPermissionState("sms") != PermissionState.GRANTED) {
            call.reject("SMS permission not granted");
            return;
        }

        long sinceMs = call.getLong("sinceMs", 0L);
        int limit = Math.min(Math.max(call.getInt("limit", 100), 1), 300);

        JSArray messages = new JSArray();
        ContentResolver resolver = getContext().getContentResolver();
        Uri uri = Telephony.Sms.Inbox.CONTENT_URI;
        String selection = Telephony.Sms.DATE + " > ?";
        String[] args = new String[]{String.valueOf(sinceMs)};
        String sort = Telephony.Sms.DATE + " DESC";

        try (Cursor cursor = resolver.query(
            uri,
            new String[]{
                Telephony.Sms._ID,
                Telephony.Sms.ADDRESS,
                Telephony.Sms.BODY,
                Telephony.Sms.DATE
            },
            selection,
            args,
            sort
        )) {
            if (cursor != null) {
                int idIdx = cursor.getColumnIndexOrThrow(Telephony.Sms._ID);
                int addrIdx = cursor.getColumnIndexOrThrow(Telephony.Sms.ADDRESS);
                int bodyIdx = cursor.getColumnIndexOrThrow(Telephony.Sms.BODY);
                int dateIdx = cursor.getColumnIndexOrThrow(Telephony.Sms.DATE);
                while (cursor.moveToNext() && messages.length() < limit) {
                    String address = cursor.getString(addrIdx);
                    if (!isBankSender(address)) continue;
                    String body = cursor.getString(bodyIdx);
                    if (body == null || looksLikeOtp(body)) continue;

                    JSObject row = new JSObject();
                    row.put("id", cursor.getString(idIdx));
                    row.put("address", address);
                    row.put("body", body);
                    row.put("date", cursor.getLong(dateIdx));
                    messages.put(row);
                }
            }
        } catch (Exception e) {
            call.reject("Failed to read SMS inbox: " + e.getMessage());
            return;
        }

        JSObject result = new JSObject();
        result.put("messages", messages);
        call.resolve(result);
    }

    @PluginMethod
    public void startBackgroundSync(PluginCall call) {
        Intent intent = new Intent(getContext(), BankSmsForegroundService.class);
        intent.setAction(BankSmsForegroundService.ACTION_START);
        ContextCompat.startForegroundService(getContext(), intent);
        JSObject result = new JSObject();
        result.put("running", true);
        call.resolve(result);
    }

    @PluginMethod
    public void stopBackgroundSync(PluginCall call) {
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
        if (lower.contains("do not share") || lower.contains("don't share")) return true;
        if (lower.contains("one time password") || lower.contains("otp")) {
            if (!lower.contains("debited") && !lower.contains("credited") && !lower.contains("spent")) {
                return true;
            }
        }
        return false;
    }
}
