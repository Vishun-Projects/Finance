package com.vishnu.finance.sms;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;

import androidx.core.app.NotificationCompat;

import com.vishnu.finance.MainActivity;
import com.vishnu.finance.R;

/**
 * One-shot, dismissible notification when a new bank alert needs review.
 * Never ongoing; never re-posts the same alert id after dismiss.
 */
public final class BankSmsAlertNotifier {
    private static final String CHANNEL_ID = "bank_sms_new_alert";
    private static final int NOTIF_ID = 7103;

    private BankSmsAlertNotifier() {}

    public static void notifyNewItem(Context context, String alertId, int pendingCount) {
        if (alertId == null || alertId.isEmpty()) return;
        if (alertId.equals(BankSmsStore.getLastOneShotAlertId(context))) return;

        BankSmsStore.setLastOneShotAlertId(context, alertId);
        ensureChannel(context);

        Intent open = new Intent(context, MainActivity.class);
        open.setAction(Intent.ACTION_VIEW);
        open.setData(Uri.parse("com.vishnu.finance://sms-review"));
        open.addFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK
                | Intent.FLAG_ACTIVITY_SINGLE_TOP
                | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
        );
        open.putExtra(MainActivity.EXTRA_OPEN_SMS_REVIEW, true);

        PendingIntent pi = PendingIntent.getActivity(
            context,
            3,
            open,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        String text = pendingCount <= 1
            ? "1 bank alert ready to review"
            : pendingCount + " bank alerts ready to review";

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setContentTitle("New bank alert")
            .setContentText(text)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(pi)
            .setAutoCancel(true)
            .setOnlyAlertOnce(true)
            .setOngoing(false)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT);

        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(NOTIF_ID, builder.build());
    }

    public static void cancel(Context context) {
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.cancel(NOTIF_ID);
    }

    private static void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "New bank alerts",
            NotificationManager.IMPORTANCE_DEFAULT
        );
        channel.setDescription("One-shot alerts when a bank notification needs review");
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.createNotificationChannel(channel);
    }
}
