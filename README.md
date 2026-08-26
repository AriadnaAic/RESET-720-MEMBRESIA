# RESET 720 — Guía paso a paso (sin saber programar)

Esta carpeta ya trae tu app completa, con tu ícono cósmico y el mismo diseño
que ya conoces. Vamos a: 1) crear tu base de datos real en Firebase,
2) subir el código a internet con Netlify, 3) probar que todo funcione.

No necesitas instalar nada en tu compu para la parte de Firebase y Netlify.
Solo para el "Paso 4" (probarlo en tu compu antes de publicar) vas a necesitar
instalar un programa llamado Node.js — es opcional, puedes saltarlo si
prefieres publicar directo.

---

## Paso 1 — Crear tu proyecto en Firebase (tu base de datos real)

1. Ve a **https://console.firebase.google.com** e inicia sesión con tu Gmail.
2. Clic en **"Agregar proyecto"**. Ponle de nombre `reset-720` (o el que quieras).
3. Cuando termine de crearse, en el menú izquierdo entra a **"Compilación" → "Authentication"**.
   - Clic en **"Comenzar"**.
   - Activa el proveedor **"Correo electrónico/contraseña"** (Email/Password). Guarda.
4. Ahora entra a **"Compilación" → "Firestore Database"**.
   - Clic en **"Crear base de datos"**.
   - Elige el modo **"Producción"** (no "modo de prueba").
   - Elige la ubicación más cercana (ej. `us-central` o `southamerica-east1`).
5. Dentro de Firestore, ve a la pestaña **"Reglas"** (arriba). Borra lo que haya
   y pega **todo** el contenido del archivo `firestore.rules` que viene en esta
   carpeta. Clic en **"Publicar"**.

### Obtener tus llaves de conexión

1. Clic en el ⚙️ (engranaje) arriba a la izquierda → **"Configuración del proyecto"**.
2. Baja hasta **"Tus apps"** → clic en el ícono `</>` (Web).
3. Ponle un apodo, ej. `reset720-web`, y clic en **"Registrar app"**.
4. Te va a mostrar un bloque de código con `apiKey`, `authDomain`, etc.
   **Copia esos valores.**
5. Abre el archivo `src/firebase.js` de esta carpeta y reemplaza los valores
   de `firebaseConfig` con los tuyos (donde dice `TU_API_KEY`, `TU_PROYECTO`, etc.).

### Crear tu cuenta de coach (una sola vez)

1. En Firebase, ve a **Authentication → Users → "Agregar usuario"**.
2. Pon tu correo real (ej. `ari@gmail.com`) y una contraseña. Clic en agregar.
3. Copia el **UID** que te muestra junto a tu usuario (una cadena larga de letras/números).
4. Ve a **Firestore Database → Datos → "Iniciar colección"**.
   - ID de la colección: `usuarios`
   - ID del documento: pega el **UID** que copiaste.
   - Agrega dos campos:
     - `nombre` (string) → escribe tu nombre, ej. `Ari`
     - `role` (string) → escribe exactamente `coach`
   - Guarda.

Con esto, cuando entres al panel con "Coach" y ese correo/contraseña, el
sistema te va a reconocer como coach y vas a poder ver a todos tus clientes.

---

## Paso 2 — Subir el código a GitHub (para conectarlo con Netlify)

1. Crea una cuenta gratis en **https://github.com** si no tienes.
2. Clic en **"New repository"**. Nómbralo `reset-720`. Público o privado, tú decides.
3. Sube **todos los archivos de esta carpeta** (arrástralos a la página de GitHub,
   o usa "uploading an existing file" si es un repo nuevo).
4. Clic en **"Commit changes"**.

---

## Paso 3 — Publicar con Netlify

1. Ve a **https://app.netlify.com** y entra con tu cuenta de GitHub.
2. Clic en **"Add new site" → "Import an existing project"**.
3. Elige GitHub, autoriza, y selecciona el repositorio `reset-720`.
4. Netlify va a detectar solo la configuración (gracias al archivo `netlify.toml`
   que ya viene incluido: build = `npm run build`, carpeta = `dist`).
5. Clic en **"Deploy site"**. Espera 1-2 minutos.
6. Cuando termine, te da un link tipo `https://algo-random.netlify.app` — esa
   ya es tu app real, funcionando en internet. 🎉
7. (Opcional) En **"Site settings" → "Change site name"** puedes ponerle
   `reset720` para que el link sea `https://reset720.netlify.app`.
8. (Opcional) En **"Domain settings"** puedes conectar un dominio propio
   que compres (ej. `reset720.com`) si más adelante quieres.

---

## Paso 4 — Probarlo en tu compu antes de publicar (opcional)

Si quieres ver la app en tu computadora antes de subirla:

1. Instala **Node.js** desde https://nodejs.org (botón que diga "LTS").
2. Abre la Terminal (Mac) o PowerShell (Windows) dentro de esta carpeta.
3. Escribe: `npm install` y espera a que termine.
4. Escribe: `npm run dev`
5. Abre en tu navegador la dirección que te muestre (normalmente `http://localhost:5173`).

---

## Sobre el ícono de la app 📱

Ya viene listo en la carpeta `public/`: se ve en la pestaña del navegador,
y si alguien la abre desde su celular y elige **"Agregar a pantalla de inicio"**
(Safari/Chrome), la app aparece con tu ícono cósmico, como cualquier app normal.

Si más adelante la quieres publicar como app de verdad en la App Store o
Google Play (no solo "agregar a pantalla de inicio"), eso ya es un paso extra
que se llama "empaquetarla" (con una herramienta como Capacitor) — te puedo
ayudar con eso cuando llegues a ese punto.

---

## Qué cambia frente a la versión de Claude

- Antes: los datos vivían en el almacenamiento del artefacto de Claude.
- Ahora: viven en **tu propia base de datos de Firebase**, con contraseñas
  reales protegidas por Firebase Auth (no en texto plano) y reglas de
  seguridad reales (`firestore.rules`) que solo dejan a cada cliente ver lo
  suyo, y a ti como coach ver todo.
- El plan gratuito de Firebase ("Spark") es generoso y alcanza perfecto para
  empezar con tus clientas actuales, sin pagar nada.

## Si algo no jala

Regrésame el mensaje de error exacto que te sale (en Firebase, Netlify o el
navegador) y seguimos desde ahí — no necesitas resolverlo solo.
