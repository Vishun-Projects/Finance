package com.vishnu.finance.sms;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.provider.Telephony;
import android.telephony.SmsMessage;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;

public class BankSmsReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || !Telephony.Sms.Intents.SMS_RECEIVED_ACTION.equals(intent.getAction())) {
            return;
        }
        if (!BankSmsStore.isAutoReadEnabled(context)) {
            return;
        }

        Bundle bundle = intent.getExtras();
        if (bundle == null) return;

        Object[] pdus = (Object[]) bundle.get("pdus");
        if (pdus == null || pdus.length == 0) return;

        String format = bundle.getString("format");
        StringBuilder body = new StringBuilder();
        String address = null;
        long date = System.currentTimeMillis();

        for (Object pdu : pdus) {
            SmsMessage msg = format != null
                ? SmsMessage.createFromPdu((byte[]) pdu, format)
                : SmsMessage.createFromPdu((byte[]) pdu);
            if (msg == null) continue;
            if (address == null) address = msg.getDisplayOriginatingAddress();
            body.append(msg.getMessageBody());
            date = msg.getTimestampMillis();
        }

        if (address == null || !SmsBankReaderPlugin.isBankSender(address)) return;
        String text = body.toString();
        if (text.isBlank() || SmsBankReaderPlugin.looksLikeOtp(text)) return;

        String smsId = address + ":" + date + ":" + Integer.toHexString(text.hashCode());
        JSObject payload = new JSObject();
        payload.put("id", smsId);
        payload.put("address", address);
        payload.put("body", text);
        payload.put("date", date);

        BankSmsStore.incrementPendingCount(context);
        SmsBankReaderPlugin.emitSmsReceived(payload);

        if (BankSmsStore.isOverlayEnabled(context)) {
            Intent overlay = new Intent(context, BankSmsOverlayService.class);
            overlay.setAction(BankSmsOverlayService.ACTION_UPDATE);
            overlay.putExtra(BankSmsOverlayService.EXTRA_COUNT, BankSmsStore.getPendingCount(context));
            ContextCompat.startForegroundService(context, overlay);
        }
    }
}
