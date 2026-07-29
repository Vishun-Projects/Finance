package com.vishnu.finance;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;

import androidx.core.view.WindowCompat;

import com.getcapacitor.BridgeActivity;
import com.vishnu.finance.sms.SmsBankReaderPlugin;

public class MainActivity extends BridgeActivity {
    public static final String EXTRA_OPEN_SMS_REVIEW = "com.vishnu.finance.OPEN_SMS_REVIEW";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(SmsBankReaderPlugin.class);
        super.onCreate(savedInstanceState);
        // Enable Edge-to-Edge support for immersive experience
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        handleSmsReviewIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleSmsReviewIntent(intent);
    }

    private void handleSmsReviewIntent(Intent intent) {
        if (intent == null) return;
        boolean flagged = intent.getBooleanExtra(EXTRA_OPEN_SMS_REVIEW, false);
        Uri data = intent.getData();
        boolean fromUri = false;
        if (data != null) {
            String host = data.getHost();
            String path = data.getPath();
            fromUri = "sms-review".equals(host)
                || (path != null && path.contains("sms-review"))
                || "sms-review".equals(data.getSchemeSpecificPart());
        }
        if (flagged || fromUri) {
            SmsBankReaderPlugin.emitReviewRequested();
            // Clear so resume/rotation does not re-open forever
            intent.removeExtra(EXTRA_OPEN_SMS_REVIEW);
            intent.setData(null);
        }
    }
}
