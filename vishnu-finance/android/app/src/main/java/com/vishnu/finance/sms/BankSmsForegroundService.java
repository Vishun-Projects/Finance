package com.vishnu.finance.sms;

import android.app.Service;
import android.content.Intent;
import android.os.IBinder;

/**
 * No-op compatibility stub. Notification Listener keeps capture alive without a sticky FGS.
 */
public class BankSmsForegroundService extends Service {
    public static final String ACTION_START = "com.vishnu.finance.sms.START";
    public static final String ACTION_STOP = "com.vishnu.finance.sms.STOP";

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : ACTION_START;
        if (ACTION_STOP.equals(action)) {
            BankSmsStore.setAutoReadEnabled(this, false);
            BankSmsBubbleController.remove();
            BankSmsAlertNotifier.cancel(this);
            stopSelf();
            return START_NOT_STICKY;
        }

        BankSmsStore.setAutoReadEnabled(this, true);
        // Do not startForeground — avoids always-on status bar notification.
        stopSelf();
        return START_NOT_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
