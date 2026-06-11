# Invitación y Confirmación de Asistencia - Cacho 80 🎉

¡Bienvenidos! Este proyecto contiene la landing page estática y elegante para la confirmación de asistencia al cumpleaños número 80 de Cacho, junto con un panel de administración privado (`admin.html`) para visualizar los resultados de forma ordenada y bonita sin depender de bases de datos complejas.

---

## 📁 Estructura del Proyecto

*   `index.html` - La invitación y el formulario RSVP para los invitados.
*   `admin.html` - El panel administrativo privado para ver las estadísticas y la lista de asistentes.
*   `styles.css` - Estilos compartidos de la landing y del dashboard.
*   `script.js` - Lógica de reproducción musical, inputs dinámicos y envío de datos.
*   `admin.js` - Autenticación (Fetch/JSONP híbrido), filtros, estadísticas y listado expandible.

---

## 🛠️ Guía 1: Configuración de Google Sheets y Apps Script (Persistencia)

Para registrar las confirmaciones y poder verlas en tu panel de administración, seguimos usando Google Sheets como base de datos gratuita. Sigue estos pasos:

### Paso 1: Crear la Hoja de Cálculo
1. Ve a [Google Sheets](https://sheets.google.com) y crea una planilla en blanco.
2. Nómbrala como gustes (ej: *Invitados Cacho 80*).
3. En la primera fila (Fila 1), escribe los encabezados de columna exactamente en este orden (de la columna A a la I):
   `Fecha y Hora` | `Nombre Principal` | `Familia` | `Asiste` | `Cantidad de Adultos` | `Cantidad de Menores` | `Total Asistentes` | `Lista de Asistentes` | `Comentarios`

### Paso 2: Crear el Google Apps Script
1. En tu hoja de cálculo, haz clic en **Extensiones** ➔ **Apps Script**.
2. Borra cualquier código existente en `Código.gs` y pega el siguiente script corregido (se removió la función `.setHeader` que causaba error de tipo en Google Apps Script, manteniendo el soporte nativo de JSONP y CORS):

```javascript
// Google Apps Script para guardar y leer RSVPs de Cacho 80 (Soporta JSONP/CORS)

// Cambia "cacho80" por la contraseña que quieras usar para entrar al panel
var ADMIN_PASSWORD = "cacho80";

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    sheet.appendRow([
      data.timestamp,
      data.fullname,
      data.group,
      data.attending,
      data.adults,
      data.minors,
      data.totalAttendees,
      data.attendeesList,
      data.comments
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
                         .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    var clientPassword = e.parameter.password;
    var callback = e.parameter.callback; // Requerido para JSONP (Evita CORS en local)
    
    // Validar contraseña
    if (clientPassword !== ADMIN_PASSWORD) {
      return outputResponse({ status: 'error', message: 'Contraseña incorrecta o no provista.' }, callback);
    }
    
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var rows = sheet.getDataRange().getValues();
    
    if (rows.length <= 1) {
      return outputResponse({ status: 'success', data: [] }, callback);
    }
    
    var headers = rows[0];
    var data = [];
    
    for (var i = 1; i < rows.length; i++) {
      var row = rows[i];
      var record = {};
      for (var j = 0; j < headers.length; j++) {
        record[headers[j]] = row[j];
      }
      data.push(record);
    }
    
    return outputResponse({ status: 'success', data: data }, callback);
                         
  } catch (error) {
    return outputResponse({ status: 'error', message: error.toString() }, callback);
  }
}

// Función auxiliar para retornar JSON o JSONP sin setHeader (Evita crash de ejecución)
function outputResponse(obj, callback) {
  var JSONString = JSON.stringify(obj);
  
  if (callback) {
    // Si hay un callback de JSONP, envolvemos el JSON
    return ContentService.createTextOutput(callback + '(' + JSONString + ')')
                         .setMimeType(ContentService.MimeType.JAVASCRIPT);
  } else {
    // Si no, devolvemos JSON estándar
    return ContentService.createTextOutput(JSONString)
                         .setMimeType(ContentService.MimeType.JSON);
  }
}

function doOptions(e) {
  return ContentService.createTextOutput("")
                       .setMimeType(ContentService.MimeType.TEXT);
}
```

### Paso 3: Desplegar como Aplicación Web
1. En la esquina superior derecha del editor de Apps Script, haz clic en **Implementar** (Deploy) ➔ **Nueva implementación**.
2. Selecciona **Aplicación web** (haz clic en el engranaje ⚙️ si no aparece).
3. Configura:
   *   **Descripción**: `API Confirmaciones Cacho 80`
   *   **Ejecutar como**: **Tú** (tu cuenta de Gmail).
   *   **Quién tiene acceso**: **Cualquiera** (necesario para conectar el formulario público).
4. Haz clic en **Implementar** y otorga los permisos necesarios a tu cuenta de Google.
5. Copia la **URL de la aplicación web** (ej: `https://script.google.com/macros/s/ABC123xyz.../exec`).

### Paso 4: Vincular en la Web
1. Abre el archivo `script.js` y pega la URL en la variable `APPS_SCRIPT_URL` (Línea 9).
2. Abre el archivo `admin.js` y pega la misma URL en la variable `APPS_SCRIPT_URL` (Línea 9).
3. Guarda los archivos.

---

## 🔒 Guía 2: Acceso y Uso del Panel de Administración (`admin.html`)

Para ver quiénes confirmaron asistencia de forma visual y ordenada:

1. Abre el archivo `admin.html` en tu navegador (o accede a `https://tu-usuario.github.io/tu-repositorio/admin.html` una vez subido a GitHub Pages).
2. Se te presentará una pantalla de login. Ingresa la contraseña configurada en el Apps Script (por defecto, `cacho80`).
3. Al ingresar, el sistema traerá los datos desde Google Sheets y mostrará:
   *   **Tarjetas con Estadísticas**: Cantidad total de personas que asisten (adultos + menores sumados), desglose de adultos, menores y cantidad de personas que no pueden ir.
   *   **Buscador**: Para filtrar al instante por el nombre de la persona, familia o comentarios.
   *   **Filtros rápidos**: Botones para ver "Todos", "Asisten" o "No Asisten".
   *   **Boton Actualizar**: Para consultar si hay nuevos confirmados sin tener que volver a loguearte.

---

## 📷 Guía 3: Reemplazo de Fotos y Música (Invitación y QR)

### Para la Invitación Principal (`index.html`):
*   **Foto de Cacho**: Guardá la foto como `foto.jpg` en la carpeta raíz. Si no existe, mostrará un elegante monograma dorado con la letra **C** y el número **80**.
*   **Música de Fondo**: Guardá el audio como `musica.mp3` o `musica.flac` en la carpeta raíz.

### Para la Sección del Mensaje QR en las Mesas (`mensaje.html`):
*   **Foto de Cacho (Cuadro)**: Guardá la foto como **`abuelo.jpg`** en la carpeta raíz. Si no se encuentra, la página mostrará de forma elegante el monograma dorado de fallback sin romperse.
*   **Audio del Saludo**: Guardá la grabación del abuelo con el nombre **`mensaje.mp3`** o **`mensaje.flac`** en la carpeta raíz. El reproductor inteligente está configurado para detectar ambos formatos.

---

## 📱 Guía 4: Generación del Código QR para las Mesas

Una vez que subas tu web a internet (ver Guía 5), la sección del mensaje será accesible en:
`https://tu-usuario.github.io/tu-repositorio/mensaje.html`

Para generar el código QR que se imprimirá en las tarjetas de las mesas:
1. Copiá la URL de arriba (reemplazando `tu-usuario` y `tu-repositorio` por tus datos reales de GitHub).
2. Entrá a un generador de QR gratuito como [QR Code Generator](https://es.qr-code-generator.com/) o [QRCode Monkey](https://www.qrcode-monkey.com/).
3. Pegá la URL en el campo de texto.
4. (Opcional) Elegí un diseño elegante (se sugiere dorado/negro para combinar con la temática).
5. Descargá el QR en alta resolución e imprimilo para colocarlo en los centros de mesa.

---

## 🚀 Guía 5: Despliegue en GitHub Pages (Gratuito)

1. Sube todos los archivos del proyecto a un repositorio público en tu cuenta de GitHub:
   *   `index.html` (Invitación principal)
   *   `admin.html` (Panel administrativo)
   *   `mensaje.html` (Nueva sección QR)
   *   `styles.css` (Diseño unificado)
   *   `script.js` (Lógica de RSVP)
   *   `admin.js` (Lógica del panel)
   *   *Archivos multimedia*: `foto.jpg`, `musica.mp3` / `musica.flac`, `abuelo.jpg`, `mensaje.mp3` / `mensaje.flac`.
2. En la pestaña **Settings** (Configuración) del repositorio, busca **Pages** en el menú izquierdo.
3. En **Branch**, selecciona `main` (o `master`) y presiona **Save**.
4. ¡Listo! La invitación estará en `https://tu-usuario.github.io/tu-repositorio/` y el mensaje en `https://tu-usuario.github.io/tu-repositorio/mensaje.html`.


