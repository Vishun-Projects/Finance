package com.vishnu.finance.sms;

import android.content.Context;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.TextView;

import com.vishnu.finance.MainActivity;

/**
 * Floating pending-count bubble via WindowManager — no sticky notification.
 * Preferred host: NotificationListenerService (system-bound). Also callable from the plugin.
 */
public final class BankSmsBubbleController {
    private static WindowManager windowManager;
    private static View bubbleView;

    private BankSmsBubbleController() {}

    public static synchronized void update(Context context, int count) {
        Context app = context.getApplicationContext();
        if (count <= 0 || !BankSmsStore.isOverlayEnabled(app) || !canDrawOverlays(app)) {
            remove();
            return;
        }
        showOrUpdate(app, count);
    }

    public static synchronized void remove() {
        if (windowManager != null && bubbleView != null) {
            try {
                windowManager.removeView(bubbleView);
            } catch (Exception ignored) {
            }
        }
        bubbleView = null;
    }

    private static void showOrUpdate(Context app, int count) {
        if (windowManager == null) {
            windowManager = (WindowManager) app.getSystemService(Context.WINDOW_SERVICE);
        }
        if (windowManager == null) return;

        if (bubbleView == null) {
            TextView tv = new TextView(app);
            tv.setText(String.valueOf(count));
            tv.setTextColor(0xFFFFFFFF);
            tv.setTextSize(14f);
            tv.setGravity(Gravity.CENTER);
            tv.setPadding(36, 36, 36, 36);
            GradientDrawable bg = new GradientDrawable();
            bg.setColor(0xE0111111);
            bg.setCornerRadius(999f);
            tv.setBackground(bg);
            tv.setOnClickListener(v -> openReview(app));
            bubbleView = tv;

            int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                : WindowManager.LayoutParams.TYPE_PHONE;

            WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.WRAP_CONTENT,
                WindowManager.LayoutParams.WRAP_CONTENT,
                type,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                    | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                PixelFormat.TRANSLUCENT
            );
            params.gravity = Gravity.TOP | Gravity.END;
            params.x = 24;
            params.y = 180;
            try {
                windowManager.addView(bubbleView, params);
            } catch (Exception e) {
                bubbleView = null;
            }
        } else if (bubbleView instanceof TextView) {
            ((TextView) bubbleView).setText(String.valueOf(count));
        }
    }

    static void openReview(Context context) {
        Intent open = new Intent(context, MainActivity.class);
        open.setAction(Intent.ACTION_VIEW);
        open.setData(Uri.parse("com.vishnu.finance://sms-review"));
        open.addFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK
                | Intent.FLAG_ACTIVITY_SINGLE_TOP
                | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
        );
        open.putExtra(MainActivity.EXTRA_OPEN_SMS_REVIEW, true);
        context.startActivity(open);
        SmsBankReaderPlugin.emitReviewRequested();
    }

    private static boolean canDrawOverlays(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return true;
        return Settings.canDrawOverlays(context);
    }
}
