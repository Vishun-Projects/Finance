package com.vishnu.finance;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;
import com.vishnu.finance.sms.SmsBankReaderPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(SmsBankReaderPlugin.class);
        super.onCreate(savedInstanceState);
        // Enable Edge-to-Edge support for immersive experience
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
    }
}
