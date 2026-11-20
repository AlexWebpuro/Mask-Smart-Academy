# Smart Clases (prueba personal)

App Android que abre la web real de Smart y le aplica la interfaz mejorada
(`app/src/main/assets/smart-ui.js`, el mismo script de Tampermonkey).

- La primera vez pide la dirección de la página de inicio de sesión de Smart.
- Para cambiarla: Ajustes del teléfono → Apps → Smart Clases → Almacenamiento → Borrar datos.
- Para actualizar la interfaz: reemplaza `smart-ui.js` y vuelve a compilar.

Compilar: abre esta carpeta en Android Studio y pulsa Run ▶, o `./gradlew assembleDebug`.
