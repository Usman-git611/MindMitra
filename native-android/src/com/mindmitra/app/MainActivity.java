package com.mindmitra.app;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.MimeTypeMap;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Locale;
import org.json.JSONObject;

public final class MainActivity extends Activity {
    private static final String APP_ORIGIN = "https://mindmitra.local";
    private static final int FILE_CHOOSER_REQUEST = 101;
    private static final int MICROPHONE_PERMISSION_REQUEST = 102;
    private WebView webView;
    private ValueCallback<Uri[]> fileChooserCallback;
    private SpeechRecognizer speechRecognizer;
    private TextToSpeech textToSpeech;
    private String pendingSpeechLanguage = "en-IN";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(251, 247, 236));
        getWindow().setNavigationBarColor(Color.rgb(251, 247, 236));
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(251, 247, 236));
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setUserAgentString(settings.getUserAgentString() + " MindMitraAndroid/1.3");

        webView.setWebViewClient(new MindMitraClient());
        webView.addJavascriptInterface(new MindMitraVoiceBridge(), "MindMitraNative");
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileChooserCallback != null) fileChooserCallback.onReceiveValue(null);
                fileChooserCallback = callback;
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("image/*");
                try {
                    startActivityForResult(intent, FILE_CHOOSER_REQUEST);
                    return true;
                } catch (ActivityNotFoundException error) {
                    fileChooserCallback = null;
                    return false;
                }
            }
        });

        textToSpeech = new TextToSpeech(this, status -> {
            if (status != TextToSpeech.SUCCESS) emitSpeechEvent("error", "tts_unavailable");
        });

        setContentView(webView);
        webView.loadUrl(APP_ORIGIN + "/index.html");
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode != MICROPHONE_PERMISSION_REQUEST) return;
        if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) startNativeListening(pendingSpeechLanguage);
        else emitSpeechEvent("error", "permission_denied");
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != FILE_CHOOSER_REQUEST || fileChooserCallback == null) return;
        Uri[] selection = resultCode == RESULT_OK ? WebChromeClient.FileChooserParams.parseResult(resultCode, data) : null;
        fileChooserCallback.onReceiveValue(selection);
        fileChooserCallback = null;
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        stopNativeListening();
        if (textToSpeech != null) {
            textToSpeech.stop();
            textToSpeech.shutdown();
            textToSpeech = null;
        }
        if (webView != null) {
            webView.loadUrl("about:blank");
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }

    private void requestNativeListening(String languageTag) {
        pendingSpeechLanguage = languageTag == null || languageTag.trim().isEmpty() ? "en-IN" : languageTag;
        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            emitSpeechEvent("error", "recognition_unavailable");
            return;
        }
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            emitSpeechEvent("state", "requesting_permission");
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, MICROPHONE_PERMISSION_REQUEST);
            return;
        }
        startNativeListening(pendingSpeechLanguage);
    }

    private void startNativeListening(String languageTag) {
        stopNativeListening();
        speechRecognizer = SpeechRecognizer.createSpeechRecognizer(this);
        speechRecognizer.setRecognitionListener(new RecognitionListener() {
            @Override public void onReadyForSpeech(Bundle params) { emitSpeechEvent("state", "listening"); }
            @Override public void onBeginningOfSpeech() { emitSpeechEvent("state", "hearing"); }
            @Override public void onRmsChanged(float rmsdB) { }
            @Override public void onBufferReceived(byte[] buffer) { }
            @Override public void onEndOfSpeech() { emitSpeechEvent("state", "processing"); }
            @Override public void onError(int error) {
                String code = error == SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS ? "permission_denied" :
                    error == SpeechRecognizer.ERROR_RECOGNIZER_BUSY ? "recognizer_busy" :
                    error == SpeechRecognizer.ERROR_NO_MATCH ? "no_match" :
                    error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT ? "speech_timeout" : "recognition_failed";
                emitSpeechEvent("error", code);
                stopNativeListening();
            }
            @Override public void onResults(Bundle results) {
                ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                if (matches != null && !matches.isEmpty()) emitSpeechEvent("result", matches.get(0));
                else emitSpeechEvent("error", "no_match");
                stopNativeListening();
            }
            @Override public void onPartialResults(Bundle partialResults) {
                ArrayList<String> matches = partialResults.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                if (matches != null && !matches.isEmpty()) emitSpeechEvent("partial", matches.get(0));
            }
            @Override public void onEvent(int eventType, Bundle params) { }
        });

        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, languageTag);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, languageTag);
        intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
        intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3);
        speechRecognizer.startListening(intent);
    }

    private void stopNativeListening() {
        if (speechRecognizer != null) {
            SpeechRecognizer recognizer = speechRecognizer;
            speechRecognizer = null;
            recognizer.cancel();
            recognizer.destroy();
        }
    }

    private void speakNative(String text, String languageTag) {
        if (textToSpeech == null || text == null || text.trim().isEmpty()) return;
        Locale locale = Locale.forLanguageTag(languageTag == null ? "en-IN" : languageTag);
        textToSpeech.setLanguage(locale);
        textToSpeech.speak(text, TextToSpeech.QUEUE_FLUSH, null, "mindmitra-response");
    }

    private void emitSpeechEvent(String type, String value) {
        if (webView == null) return;
        String script = "window.dispatchEvent(new CustomEvent('mindmitra:native-speech',{detail:{type:" +
            JSONObject.quote(type) + ",value:" + JSONObject.quote(value == null ? "" : value) + "}}));";
        webView.post(() -> webView.evaluateJavascript(script, null));
    }

    private final class MindMitraVoiceBridge {
        @JavascriptInterface public boolean isAvailable() { return SpeechRecognizer.isRecognitionAvailable(MainActivity.this); }
        @JavascriptInterface public void startListening(String languageTag) { runOnUiThread(() -> requestNativeListening(languageTag)); }
        @JavascriptInterface public void cancelListening() { runOnUiThread(MainActivity.this::stopNativeListening); }
        @JavascriptInterface public void speak(String text, String languageTag) { runOnUiThread(() -> speakNative(text, languageTag)); }
        @JavascriptInterface public void stopSpeaking() { runOnUiThread(() -> { if (textToSpeech != null) textToSpeech.stop(); }); }
    }

    private final class MindMitraClient extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if ("mindmitra.local".equals(uri.getHost())) return false;
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, uri));
            } catch (ActivityNotFoundException ignored) {
                // Keep MindMitra open if the phone cannot handle the external link.
            }
            return true;
        }

        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (!"mindmitra.local".equals(uri.getHost())) return super.shouldInterceptRequest(view, request);
            String relativePath = uri.getPath();
            if (relativePath == null || relativePath.equals("/")) relativePath = "/index.html";
            relativePath = relativePath.substring(1);
            if (relativePath.contains("..")) return response(403, "text/plain", "Blocked path");
            try {
                InputStream stream = getAssets().open("public/" + relativePath);
                return new WebResourceResponse(mimeType(relativePath), "UTF-8", 200, "OK", Collections.singletonMap("Cache-Control", "no-cache"), stream);
            } catch (IOException error) {
                return response(404, "text/plain", "Not found");
            }
        }

        private WebResourceResponse response(int status, String mime, String text) {
            return new WebResourceResponse(mime, "UTF-8", status, status == 404 ? "Not Found" : "Forbidden", Collections.emptyMap(), new ByteArrayInputStream(text.getBytes(StandardCharsets.UTF_8)));
        }

        private String mimeType(String path) {
            String extension = MimeTypeMap.getFileExtensionFromUrl(path);
            String mime = MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension);
            if (mime != null) return mime;
            if (path.endsWith(".js")) return "application/javascript";
            if (path.endsWith(".json") || path.endsWith(".webmanifest")) return "application/json";
            return "application/octet-stream";
        }
    }
}
