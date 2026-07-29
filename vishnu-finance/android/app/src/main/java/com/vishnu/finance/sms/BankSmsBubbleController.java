package com.vishnu.finance.sms;

import android.annotation.SuppressLint;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.Typeface;
import android.graphics.drawable.AdaptiveIconDrawable;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewConfiguration;
import android.view.WindowManager;
import android.view.animation.OvershootInterpolator;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

import com.vishnu.finance.MainActivity;
import com.vishnu.finance.R;

/**
 * Floating logo bubble with unread badge, drag/snap, entry animation, and long-press menu.
 * Uses WindowManager only — no sticky foreground notification.
 */
public final class BankSmsBubbleController {
    private static final int BUBBLE_DP = 52;
    private static final int BADGE_DP = 18;
    private static final int BADGE_OFFSET_DP = -3;
    private static final int SCREEN_MARGIN_DP = 8;
    private static final int START_TOP_DP = 120;
    private static final int MENU_ITEM_HEIGHT_DP = 44;

    private static WindowManager windowManager;
    private static FrameLayout bubbleView;
    private static TextView badgeView;
    private static WindowManager.LayoutParams layoutParams;
    private static int touchSlop = -1;
    private static boolean isFirstShow = true;

    private static FrameLayout menuView;
    private static WindowManager.LayoutParams menuParams;

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
        dismissMenu();
        if (windowManager != null && bubbleView != null) {
            try {
                windowManager.removeView(bubbleView);
            } catch (Exception ignored) {
            }
        }
        bubbleView = null;
        badgeView = null;
        layoutParams = null;
        isFirstShow = true;
    }

    private static void showOrUpdate(Context app, int count) {
        if (windowManager == null) {
            windowManager = (WindowManager) app.getSystemService(Context.WINDOW_SERVICE);
        }
        if (windowManager == null) return;

        if (bubbleView == null) {
            isFirstShow = true;
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
            if (isFirstShow) {
                animateEntry(bubbleView);
                isFirstShow = false;
            }
        }
        if (badgeView != null) {
            String text = formatCount(count);
            if (!text.equals(badgeView.getText().toString())) {
                badgeView.setText(text);
                badgeView.animate().scaleX(1.3f).scaleY(1.3f).setDuration(120)
                    .withEndAction(() -> badgeView.animate().scaleX(1f).scaleY(1f).setDuration(120).start())
                    .start();
            }
        }
    }

    private static void animateEntry(View view) {
        view.setScaleX(0.5f);
        view.setScaleY(0.5f);
        view.setAlpha(0f);
        view.animate()
            .scaleX(1f).scaleY(1f).alpha(1f)
            .setDuration(300)
            .setInterpolator(new OvershootInterpolator(1.2f))
            .start();
    }

    @SuppressLint("UseCompatLoadingForDrawables")
    private static FrameLayout buildBubbleView(Context app) {
        int bubblePx = dp(app, BUBBLE_DP);
        int badgePx = dp(app, BADGE_DP);

        FrameLayout root = new FrameLayout(app);
        root.setLayoutParams(new FrameLayout.LayoutParams(
            bubblePx + dp(app, 6), bubblePx + dp(app, 6)
        ));
        root.setClipChildren(false);
        root.setClipToPadding(false);
        root.setClickable(true);
        root.setFocusable(false);

        ImageView logo = new ImageView(app);
        Drawable icon = app.getPackageManager().getApplicationIcon(app.getApplicationInfo());
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && icon instanceof AdaptiveIconDrawable) {
            logo.setImageDrawable(((AdaptiveIconDrawable) icon).getForeground());
        } else {
            logo.setImageDrawable(icon);
        }
        logo.setScaleType(ImageView.ScaleType.CENTER_CROP);
        GradientDrawable bubbleBg = new GradientDrawable();
        bubbleBg.setColor(0xFF1A1D21);
        bubbleBg.setShape(GradientDrawable.OVAL);
        bubbleBg.setStroke(dp(app, 1), 0x30FFFFFF);
        logo.setBackground(bubbleBg);
        logo.setClipToOutline(true);
        logo.setElevation(dp(app, 8));
        FrameLayout.LayoutParams logoLp = new FrameLayout.LayoutParams(bubblePx, bubblePx);
        logoLp.gravity = Gravity.CENTER;
        root.addView(logo, logoLp);

        TextView badge = new TextView(app);
        badge.setTextColor(Color.WHITE);
        badge.setTextSize(9f);
        badge.setTypeface(Typeface.DEFAULT_BOLD);
        badge.setGravity(Gravity.CENTER);
        badge.setIncludeFontPadding(false);
        badge.setPadding(dp(app, 2), 0, dp(app, 2), 0);
        GradientDrawable badgeBg = new GradientDrawable();
        badgeBg.setColor(0xFFE53935);
        badgeBg.setCornerRadius(badgePx / 2f);
        badge.setBackground(badgeBg);
        badge.setElevation(dp(app, 10));
        badge.setMinWidth(badgePx);
        badge.setMinHeight(badgePx);
        FrameLayout.LayoutParams badgeLp = new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.WRAP_CONTENT, badgePx
        );
        badgeLp.gravity = Gravity.TOP | Gravity.END;
        badgeLp.topMargin = dp(app, BADGE_OFFSET_DP);
        badgeLp.rightMargin = dp(app, BADGE_OFFSET_DP);
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
                    dismissMenu();
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
                        showMenu(app);
                    } else {
                        openReview(app);
                    }
                    return true;
                default:
                    return false;
            }
        });
    }

    private static void showMenu(Context app) {
        dismissMenu();
        if (windowManager == null || layoutParams == null) return;

        int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            : WindowManager.LayoutParams.TYPE_PHONE;

        String[] labels = {"Hide bubble", "Open Settings", "Stop alerts"};
        Runnable[] actions = {
            () -> {
                dismissMenu();
                BankSmsStore.setOverlayEnabled(app, false);
                remove();
            },
            () -> {
                dismissMenu();
                openReview(app);
            },
            () -> {
                dismissMenu();
                BankSmsStore.setAutoReadEnabled(app, false);
                BankSmsStore.setOverlayEnabled(app, false);
                BankSmsAlertNotifier.cancel(app);
                remove();
            },
        };

        LinearLayout menu = new LinearLayout(app);
        menu.setOrientation(LinearLayout.VERTICAL);
        GradientDrawable menuBg = new GradientDrawable();
        menuBg.setColor(0xF5222529);
        menuBg.setCornerRadius(dp(app, 12));
        menuBg.setStroke(dp(app, 1), 0x30FFFFFF);
        menu.setBackground(menuBg);
        menu.setElevation(dp(app, 12));
        menu.setPadding(0, dp(app, 4), 0, dp(app, 4));

        for (int i = 0; i < labels.length; i++) {
            TextView item = new TextView(app);
            item.setText(labels[i]);
            item.setTextColor(i == labels.length - 1 ? 0xFFEF5350 : Color.WHITE);
            item.setTextSize(14f);
            item.setPadding(dp(app, 16), dp(app, 10), dp(app, 24), dp(app, 10));
            item.setGravity(Gravity.CENTER_VERTICAL);
            final int idx = i;
            item.setOnClickListener(v -> actions[idx].run());
            menu.addView(item, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                dp(app, MENU_ITEM_HEIGHT_DP)
            ));
        }

        menuView = new FrameLayout(app);
        menuView.addView(menu);

        menuParams = new WindowManager.LayoutParams(
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            type,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        );
        menuParams.gravity = Gravity.TOP | Gravity.START;
        int bubblePx = dp(app, BUBBLE_DP);
        boolean onLeft = layoutParams.x + bubblePx / 2 < getDisplayWidth(app) / 2;
        menuParams.x = onLeft ? layoutParams.x + bubblePx + dp(app, 4) : layoutParams.x - dp(app, 160);
        menuParams.y = layoutParams.y;

        try {
            windowManager.addView(menuView, menuParams);
        } catch (Exception e) {
            menuView = null;
        }

        new Handler(Looper.getMainLooper()).postDelayed(BankSmsBubbleController::dismissMenu, 5000);
    }

    private static void dismissMenu() {
        if (windowManager != null && menuView != null) {
            try {
                windowManager.removeView(menuView);
            } catch (Exception ignored) {
            }
        }
        menuView = null;
        menuParams = null;
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
        return app.getResources().getDisplayMetrics().widthPixels;
    }

    private static int getDisplayHeight(Context app) {
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
