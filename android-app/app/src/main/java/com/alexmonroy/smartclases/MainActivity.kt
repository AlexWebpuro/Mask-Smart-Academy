package com.alexmonroy.smartclases

import android.annotation.SuppressLint
import android.app.Activity
import android.app.AlertDialog
import android.net.Uri
import android.os.Bundle
import android.text.InputType
import android.webkit.CookieManager
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.EditText
import android.widget.Toast
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature

/**
 * Smart Clases (prueba personal)
 *
 * Abre la web REAL de Smart dentro de la app y le aplica el script de
 * smart-ui.js (carpeta assets). El usuario inicia sesión en la página de Smart:
 * la app no lee, guarda ni envía la contraseña a ningún lado.
 */
class MainActivity : Activity() {

    private lateinit var web: WebView
    private val prefs by lazy { getSharedPreferences("config", MODE_PRIVATE) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        web = WebView(this)
        setContentView(web)

        val url = prefs.getString("smart_url", null)
        if (url.isNullOrBlank()) pedirDireccion() else iniciar(url)
    }

    /** Primera vez: pide la dirección de la página de inicio de sesión de Smart. */
    private fun pedirDireccion() {
        val input = EditText(this).apply {
            hint = "https://…"
            inputType = InputType.TYPE_TEXT_VARIATION_URI
            setPadding(48, 32, 48, 32)
        }
        AlertDialog.Builder(this)
            .setTitle("Dirección de Smart")
            .setMessage("Pega la dirección de la página donde inicias sesión.")
            .setView(input)
            .setCancelable(false)
            .setPositiveButton("Guardar") { _, _ ->
                var u = input.text.toString().trim()
                if (u.isNotEmpty() && !u.startsWith("http")) u = "https://$u"
                if (u.isEmpty()) { finish(); return@setPositiveButton }
                prefs.edit().putString("smart_url", u).apply()
                iniciar(u)
            }
            .show()
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun iniciar(url: String) {
        with(web.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true          // sessionStorage, que usa el script
            useWideViewPort = true            // la página de Smart es de 1024 px:
            loadWithOverviewMode = true       // la ajustamos al ancho del teléfono
            builtInZoomControls = true        // y se puede hacer zoom con los dedos
            displayZoomControls = false
        }
        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, true)

        // Necesario para que funcionen los confirm() de Smart ("¿Desea cerrar sesión?")
        web.webChromeClient = WebChromeClient()

        val script = envolver(assets.open("smart-ui.js").bufferedReader().use { it.readText() })
        val origen = Uri.parse(url).let { "${it.scheme}://${it.host}" }

        if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
            // Inyecta el script en TODAS las páginas y marcos (iframes) de Smart,
            // incluida la ventana "Programar clases".
            WebViewCompat.addDocumentStartJavaScript(web, script, setOf(origen))
            web.webViewClient = WebViewClient()
        } else {
            // Plan B para WebViews viejos: solo la página principal
            web.webViewClient = object : WebViewClient() {
                override fun onPageFinished(view: WebView, u: String) {
                    view.evaluateJavascript(script, null)
                }
            }
            Toast.makeText(this, "WebView antiguo: actualiza 'Android System WebView'", Toast.LENGTH_LONG).show()
        }

        web.loadUrl(url)
    }

    /** El script espera la página cargada; aquí se ejecuta muy temprano, así que esperamos. */
    private fun envolver(js: String) = """
        (function(){
          var run = function(){ try {
            $js
          } catch(e) { console.error('[Smart UI] error', e); } };
          if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
          else run();
        })();
    """.trimIndent()

    @Deprecated("Botón atrás: navega dentro de Smart antes de cerrar la app")
    override fun onBackPressed() {
        if (::web.isInitialized && web.canGoBack()) web.goBack() else super.onBackPressed()
    }

    override fun onPause() {
        super.onPause()
        CookieManager.getInstance().flush()   // conserva la sesión
    }
}
