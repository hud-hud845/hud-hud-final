package com.hudhud.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
// Import plugin yang dibutuhkan
import com.capacitorjs.plugins.pushnotifications.PushNotificationsPlugin;
import com.capacitorjs.plugins.app.AppPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Daftarkan plugin secara manual di sini
        registerPlugin(PushNotificationsPlugin.class);
        registerPlugin(AppPlugin.class);
    }
}