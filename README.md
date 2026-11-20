# Mask Smart Academy

Una interfaz más simple para programar clases en el sistema de la Academia de Idiomas Smart
(`schoolpack.smart.edu.co`). Es un **userscript**: funciona encima de la página oficial de Smart,
en tu propio navegador. Tu usuario y contraseña van directo a Smart; el script no guarda ni envía
datos a ningún lado.

> Proyecto personal en fase piloto. No es una herramienta oficial de Smart.

## Qué hace

- Al iniciar sesión, salta directo a **Programación de clases**.
- Botón **"+ Programar clase"**: selecciona tu plan e inicia en un solo clic.
- **Programar clases**: en vez de la tabla, un selector con tus próximas 5 clases y filtros tipo chips
  (Pendientes · Programadas · Tomadas · Todas).
- **Selección de clases**: buscador de sedes, días como botones y horas en cuadrícula. Recuerda tu sede
  y tu hora habituales.
- Al confirmar: **agregar al calendario** (Google Calendar o `.ics`) y **cómo llegar** (Google Maps,
  Waze o copiar el destino para Didi/taxi).
- Botón abajo a la izquierda para **apagar/encender** la interfaz mejorada.

## Instalación

### En computador (Chrome, Edge o Firefox)

1. Instala la extensión **Tampermonkey**.
2. Solo en Chrome/Edge: en los detalles de la extensión, activa **"Permitir scripts de usuario"**.
3. Abre este enlace y pulsa **Instalar**:
   https://raw.githubusercontent.com/AlexWebpuro/Mask-Smart-Academy/main/smart-mejorado.user.js

### En celular Android

1. Instala **Firefox** desde la Play Store.
2. Menú **⋮ → Complementos** → busca **Tampermonkey** → **Agregar**.
3. Abre en Firefox el mismo enlace de arriba y pulsa **Instalar**.

Las actualizaciones llegan solas: Tampermonkey revisa este repositorio periódicamente.

## Estructura

- `smart-mejorado.user.js` — el userscript (todo el código de la interfaz).
- `android-app/` — prueba de app Android (WebView) que aplica el mismo script. En pausa.
- `.github/workflows/build-apk.yml` — compila la app a mano desde la pestaña *Actions*.

## Publicar una nueva versión

Sube el número de `@version` en la cabecera del script antes de hacer push; si no cambia,
Tampermonkey no detecta la actualización.
