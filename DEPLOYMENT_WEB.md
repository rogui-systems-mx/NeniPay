# Guía de Despliegue: NeniPay Web (v2.6) con Firebase

He configurado esta carpeta (`nenipay-web`) para que puedas subir la app directamente a tu cuenta de **Firebase Hosting**. Esto es lo más profesional y rápido para tus usuarias de iPhone.

## 🚀 Pasos para Publicar en Firebase

1.  **En tu computadora**: Abre una terminal en la carpeta `nenipay-web`.
2.  **Instala las herramientas de Firebase** (si no las tienes):
    ```bash
    npm install -g firebase-tools
    ```
3.  **Inicia sesión en Firebase**:
    ```bash
    firebase login
    ```
4.  **Genera la versión web de NeniPay**:
    ```bash
    npx expo export --platform web
    ```
    *(Esto creará la carpeta `dist` con los archivos finales).*
5.  **Despliega a tu cuenta**:
```bash
    npx firebase deploy
    ```
    *La consola te dará una URL final (ej: `https://nenipay-b1b66.web.app`).*

## 🛠️ ¿Problemas con el despliegue? (Timeout Error)
Si te sale un error de "Timed out" o "Unexpected error" al intentar subirla:

1.  **Re-autenticación**: Ejecuta `npx firebase login --reauth`.
2.  **Subida Manual (Plan B)**: Si la terminal sigue fallando, puedes subirla arrastrando la carpeta:
    -   Ve a: [Firebase Hosting Console](https://console.firebase.google.com/project/nenipay-b1b66/hosting/main)
    -   Busca el botón de "Publicar" o subida manual.
    -   Arrastra el contenido de la carpeta **`dist`** que generamos.

## 📱 Cómo instalar en iPhone (Safari)

Una vez que tengas tu URL de Firebase:
1.  Ábrela en **Safari**.
2.  Presiona el botón de **"Compartir"** (cuadrado con flecha arriba).
3.  Selecciona **"Añadir a la pantalla de inicio"**.

## 🔐 Configuración Adicional (Google Sign-In)
Para que el inicio de sesión con Google funcione en la web:
1.  Ve a tu **Firebase Console** > Authentication > Settings > Authorized Domains.
2.  Asegúrate de que tu nueva URL (ej: `nenipay-b1b66.web.app`) esté en la lista de dominios autorizados.

---
**NeniPay Web (v2.6)** - Lista para producción.
