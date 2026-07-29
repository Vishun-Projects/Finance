package com.vishnu.finance.sms;

import android.annotation.SuppressLint;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewConfiguration;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.TextView;

import com.vishnu.finance.MainActivity;
import com.vishnu.finance.R;

/**
 * Floating logo bubble with unread badge and drag/snap behavior.
 * Runs with WindowManager only (no sticky foreground notification).
 */
public final class BankSmsBubbleController {
    private static final int BUBBLE_DP = 56;
    private static final int BADGE_DP = 20;
    private static final int SCREEN_MARGIN_DP = 12;
    private static final int START_TOP_DP = 120;

    private static WindowManager windowManager;
    private static FrameLayout bubbleView;
    private static TextView badgeView;
    private static WindowManager.LayoutParams layoutParams;
    private static int touchSlop = -1;

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
        badgeView = null;
        layoutParams = null;
    }

    private static void showOrUpdate(Context app, int count) {
        if (windowManager == null) {
            windowManager = (WindowManager) app.getSystemService(Context.WINDOW_SERVICE);
        }
        if (windowManager == null) return;

        if (bubbleView == null) {
            bubbleView = buildBubbleView(app);
            layoutParams = buildLayoutParams(app);
            try {
                windowManager.addView(bubbleView, layoutParams);
            } catch (Exception e) {
                bubbleView = null;
                badgeView = null;
                layoutParams = null;
                return;
            }
        }
        if (badgeView != null) {
            badgeView.setText(formatCount(count));
        }
    }

    private static FrameLayout buildBubbleView(Context app) {
        int bubblePx = dp(app, BUBBLE_DP);
        int badgePx = dp(app, BADGE_DP);

        FrameLayout root = new FrameLayout(app);
        FrameLayout.LayoutParams rootLp = new FrameLayout.LayoutParams(bubblePx, bubblePx);
        root.setLayoutParams(rootLp);
        root.setClickable(true);
        root.setFocusable(false);

        ImageView logo = new ImageView(app);
        logo.setImageResource(R.mipmap.ic_launcher_round);
        logo.setScaleType(ImageView.ScaleType.CENTER_CROP);
        GradientDrawable bubbleBg = new GradientDrawable();
        bubbleBg.setColor(0xF0212226);
        bubbleBg.setShape(GradientDrawable.OVAL);
        bubbleBg.setStroke(dp(app, 1), 0x40FFFFFF);
        logo.setBackground(bubbleBg);
        logo.setClipToOutline(true);
        logo.setElevation(dp(app, 6));
        root.addView(logo, new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ));

        TextView badge = new TextView(app);
        badge.setTextColor(Color.WHITE);
        badge.setTextSize(10f);
        badge.setTypeface(Typeface.DEFAULT_BOLD);
        badge.setGravity(Gravity.CENTER);
        GradientDrawable badgeBg = new GradientDrawable();
        badgeBg.setColor(0xFFE53935);
        badgeBg.setShape(GradientDrawable.OVAL);
        badge.setBackground(badgeBg);
        FrameLayout.LayoutParams badgeLp = new FrameLayout.LayoutParams(badgePx, badgePx);
        badgeLp.gravity = Gravity.TOP | Gravity.END;
        badgeLp.topMargin = dp(app, 1);
        badgeLp.rightMargin = dp(app, 1);
        root.addView(badge, badgeLp);
        badgeView = badge;

        bindTouchHandlers(app, root);
        return root;
    }

    private static WindowManager.LayoutParams buildLayoutParams(Context app) {
        int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            : WindowManager.LayoutParams.TYPE_PHONE;
        WindowManager.LayoutParams lp = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        );
        lp.gravity = Gravity.TOP | Gravity.START;
        lp.x = BankSmsStore.getBubbleX(app, dp(app, SCREEN_MARGIN_DP));
        lp.y = BankSmsStore.getBubbleY(app, dp(app, START_TOP_DP));
        return lp;
    }

    @SuppressLint("ClickableViewAccessibility")
    private static void bindTouchHandlers(Context app, FrameLayout root) {
        if (touchSlop < 0) {
            touchSlop = ViewConfiguration.get(app).getScaledTouchSlop();
        }
        final long[] downAt = {0L};
        final int[] downX = {0};
        final int[] downY = {0};
        final float[] touchStartRawX = {0f};
        final float[] touchStartRawY = {0f};
        final boolean[] moved = {false};

        root.setOnTouchListener((v, event) -> {
            if (layoutParams == null || windowManager == null) return false;
            switch (event.getActionMasked()) {
                case MotionEvent.ACTION_DOWN:
                    moved[0] = false;
                    downAt[0] = System.currentTimeMillis();
                    downX[0] = layoutParams.x;
                    downY[0] = layoutParams.y;
                    touchStartRawX[0] = event.getRawX();
                    touchStartRawY[0] = event.getRawY();
                    return true;
                case MotionEvent.ACTION_MOVE:
                    int dx = (int) (event.getRawX() - touchStartRawX[0]);
                    int dy = (int) (event.getRawY() - touchStartRawY[0]);
                    if (!moved[0] && (Math.abs(dx) > touchSlop || Math.abs(dy) > touchSlop)) {
                        moved[0] = true;
                    }
                    if (moved[0]) {
                        layoutParams.x = clampX(app, downX[0] + dx);
                        layoutParams.y = clampY(app, downY[0] + dy);
                        try {
                            windowManager.updateViewLayout(bubbleView, layoutParams);
                        } catch (Exception ignored) {
                        }
                    }
                    return true;
                case MotionEvent.ACTION_UP:
                    long pressMs = System.currentTimeMillis() - downAt[0];
                    if (moved[0]) {
                        snapToEdge(app);
                        BankSmsStore.setBubblePosition(app, layoutParams.x, layoutParams.y);
                    } else if (pressMs >= ViewConfiguration.getLongPressTimeout()) {
                        // User explicitly closes floating bubble.
                        BankSmsStore.setOverlayEnabled(app, false);
                        remove();
                    } else {
                        openReview(app);
                    }
                    return true;
                default:
                    return false;
            }
        });
    }

    private static void snapToEdge(Context app) {
        if (layoutParams == null || windowManager == null) return;
        int width = getDisplayWidth(app);
        int bubbleWidth = dp(app, BUBBLE_DP);
        int margin = dp(app, SCREEN_MARGIN_DP);
        int midpoint = width / 2;
        layoutParams.x = layoutParams.x + bubbleWidth / 2 < midpoint
            ? margin
            : Math.max(margin, width - bubbleWidth - margin);
        layoutParams.y = clampY(app, layoutParams.y);
        try {
            windowManager.updateViewLayout(bubbleView, layoutParams);
        } catch (Exception ignored) {
        }
    }

    private static int clampX(Context app, int x) {
        int width = getDisplayWidth(app);
        int margin = dp(app, SCREEN_MARGIN_DP);
        int bubbleWidth = dp(app, BUBBLE_DP);
        int maxX = Math.max(margin, width - bubbleWidth - margin);
        return Math.min(maxX, Math.max(margin, x));
    }

    private static int clampY(Context app, int y) {
        int height = getDisplayHeight(app);
        int margin = dp(app, SCREEN_MARGIN_DP);
        int bubbleHeight = dp(app, BUBBLE_DP);
        int maxY = Math.max(margin, height - bubbleHeight - margin);
        return Math.min(maxY, Math.max(margin, y));
    }

    private static int getDisplayWidth(Context app) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            return app.getResources().getDisplayMetrics().widthPixels;
        }
        return app.getResources().getDisplayMetrics().widthPixels;
    }

    private static int getDisplayHeight(Context app) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            return app.getResources().getDisplayMetrics().heightPixels;
        }
        return app.getResources().getDisplayMetrics().heightPixels;
    }

    private static int dp(Context app, int dp) {
        float density = app.getResources().getDisplayMetrics().density;
        return Math.round(dp * density);
    }

    private static String formatCount(int count) {
        if (count > 99) return "99+";
        return String.valueOf(Math.max(1, count));
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
