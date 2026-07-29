package com.vishnu.finance.sms;

import android.app.Service;
import android.content.Intent;
import android.os.IBinder;

/**
 * Legacy entrypoint kept for ACTION_UPDATE/STOP from older APKs / boot.
 * Bubble is drawn via {@link BankSmsBubbleController} (no sticky shade notification).
 */
public class BankSmsOverlayService extends Service {
    public static final String ACTION_UPDATE = "com.vishnu.finance.sms.OVERLAY_UPDATE";
    public static final String ACTION_STOP = "com.vishnu.finance.sms.OVERLAY_STOP";
    public static final String EXTRA_COUNT = "count";

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            BankSmsBubbleController.remove();
            stopSelf();
            return START_NOT_STICKY;
        }

        int count = intent != null
            ? intent.getIntExtra(EXTRA_COUNT, BankSmsStore.getPendingCount(this))
            : BankSmsStore.getPendingCount(this);

        BankSmsStore.setPendingCount(this, count);
        BankSmsBubbleController.update(this, count);

        stopSelf();
        return START_NOT_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
