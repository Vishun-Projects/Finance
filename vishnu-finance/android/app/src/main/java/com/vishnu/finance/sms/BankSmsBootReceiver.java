package com.vishnu.finance.sms;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** After reboot, restore bubble if sync + overlay were enabled (no sticky FGS). */
public class BankSmsBootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) return;
        String action = intent.getAction();
        if (!Intent.ACTION_BOOT_COMPLETED.equals(action)
            && !Intent.ACTION_LOCKED_BOOT_COMPLETED.equals(action)
            && !Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
            return;
        }
        if (!BankSmsStore.isAutoReadEnabled(context)) return;

        if (BankSmsStore.isOverlayEnabled(context)) {
            BankSmsBubbleController.update(context, BankSmsStore.getPendingCount(context));
        }
    }
}
