package com.vishnu.finance;

import android.os.Bundle;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Enable Edge-to-Edge support for immersive experience
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
    }
}
