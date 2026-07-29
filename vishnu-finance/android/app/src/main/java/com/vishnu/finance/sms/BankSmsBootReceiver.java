package com.vishnu.finance.sms;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import androidx.core.content.ContextCompat;

/** Restarts bank SMS foreground sync after reboot when the user opted in. */
public class BankSmsBootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) return;
        if (!BankSmsStore.isAutoReadEnabled(context)) return;

        Intent service = new Intent(context, BankSmsForegroundService.class);
        service.setAction(BankSmsForegroundService.ACTION_START);
        ContextCompat.startForegroundService(context, service);

        if (BankSmsStore.isOverlayEnabled(context)) {
            Intent overlay = new Intent(context, BankSmsOverlayService.class);
            overlay.setAction(BankSmsOverlayService.ACTION_UPDATE);
            overlay.putExtra(BankSmsOverlayService.EXTRA_COUNT, BankSmsStore.getPendingCount(context));
            ContextCompat.startForegroundService(context, overlay);
        }
    }
}
