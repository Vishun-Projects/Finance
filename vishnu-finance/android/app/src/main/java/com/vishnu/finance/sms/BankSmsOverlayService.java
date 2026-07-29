package com.vishnu.finance.sms;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.TextView;

import androidx.core.app.NotificationCompat;

import com.vishnu.finance.MainActivity;
import com.vishnu.finance.R;

public class BankSmsOverlayService extends Service {
    public static final String ACTION_UPDATE = "com.vishnu.finance.sms.OVERLAY_UPDATE";
    public static final String ACTION_STOP = "com.vishnu.finance.sms.OVERLAY_STOP";
    public static final String EXTRA_COUNT = "count";
    private static final String CHANNEL_ID = "bank_sms_overlay";
    private static final int NOTIF_ID = 7102;

    private WindowManager windowManager;
    private View bubbleView;

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            removeBubble();
            stopForeground(STOP_FOREGROUND_REMOVE);
            stopSelf();
            return START_NOT_STICKY;
        }

        int count = intent != null ? intent.getIntExtra(EXTRA_COUNT, 0) : BankSmsStore.getPendingCount(this);
        ensureChannel();
        startForeground(NOTIF_ID, buildSilentNotification(count));

        if (count <= 0 || !BankSmsStore.isOverlayEnabled(this)) {
            removeBubble();
            return START_STICKY;
        }

        showOrUpdateBubble(count);
        return START_STICKY;
    }

    private Notification buildSilentNotification(int count) {
        Intent open = new Intent(this, MainActivity.class);
        open.setData(Uri.parse("com.vishnu.finance://sms-review"));
        open.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(
            this,
            1,
            open,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Bank SMS pending")
            .setContentText(count + " to review")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(pi)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_MIN)
            .build();
    }

    private void showOrUpdateBubble(int count) {
        if (windowManager == null) {
            windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        }
        if (bubbleView == null) {
            TextView tv = new TextView(this);
            tv.setText(String.valueOf(count));
            tv.setTextColor(0xFFFFFFFF);
            tv.setTextSize(14f);
            tv.setGravity(Gravity.CENTER);
            tv.setPadding(28, 28, 28, 28);
            tv.setBackgroundColor(0xE0111111);
            tv.setOnClickListener(v -> {
                Intent open = new Intent(this, MainActivity.class);
                open.setData(Uri.parse("com.vishnu.finance://sms-review"));
                open.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                startActivity(open);
            });
            bubbleView = tv;

            int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                : WindowManager.LayoutParams.TYPE_PHONE;

            WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                type,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
                PixelFormat.TRANSLUCENT
            );
            params.gravity = Gravity.TOP | Gravity.END;
            params.x = 24;
            params.y = 180;
            windowManager.addView(bubbleView, params);
        } else if (bubbleView instanceof TextView) {
            ((TextView) bubbleView).setText(String.valueOf(count));
        }
    }

    private void removeBubble() {
        if (windowManager != null && bubbleView != null) {
            try {
                windowManager.removeView(bubbleView);
            } catch (Exception ignored) {
            }
            bubbleView = null;
        }
    }

    private void ensureChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Bank SMS bubble",
            NotificationManager.IMPORTANCE_MIN
        );
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.createNotificationChannel(channel);
    }

    @Override
    public void onDestroy() {
        removeBubble();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
