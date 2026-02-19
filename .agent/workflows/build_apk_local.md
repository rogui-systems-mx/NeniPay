# Build APK Local - NeniPay

## Paso 1: Instalar Java JDK 17

Java no está instalado. Descarga e instala **JDK 17** (obligatorio):

👉 https://adoptium.net/temurin/releases/?version=17

Elige: **Windows x64 → .msi**

Después de instalar, verifica en PowerShell:
```powershell
java -version
# Debe mostrar: openjdk version "17.x.x"
```

---

## Paso 2: Instalar Android Studio (incluye el SDK)

👉 https://developer.android.com/studio

Durante la instalación, asegúrate de instalar:
- ✅ Android SDK
- ✅ Android SDK Platform (API 35)
- ✅ Android Build Tools 35.0.0

El SDK se instala por defecto en:
```
C:\Users\<tu-usuario>\AppData\Local\Android\Sdk
```

---

## Paso 3: Configurar Variables de Entorno

En Windows → Buscar "Variables de entorno del sistema":

| Variable | Valor |
|----------|-------|
| `ANDROID_HOME` | `C:\Users\<tu-usuario>\AppData\Local\Android\Sdk` |
| `JAVA_HOME` | `C:\Program Files\Eclipse Adoptium\jdk-17.x.x-hotspot` |

En **PATH** agregar:
```
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\tools
%JAVA_HOME%\bin
```

---

## Paso 4: Crear local.properties

En la carpeta `android/` del proyecto, crear el archivo `local.properties`:

```
sdk.dir=C:\\Users\\<tu-usuario>\\AppData\\Local\\Android\\Sdk
```

> ⚠️ Reemplaza `<tu-usuario>` con tu nombre de usuario de Windows.

---

## Paso 5: Generar el APK

```powershell
cd c:\Users\Usuario\.gemini\antigravity\scratch\nenipay\android
.\gradlew assembleRelease
```

APK generado en:
```
android\app\build\outputs\apk\release\app-release.apk
```

### Alternativa: APK de debug (sin firma, para pruebas rápidas)
```powershell
.\gradlew assembleDebug
```
APK en: `android\app\build\outputs\apk\debug\app-debug.apk`

---

## Firma del APK Release (solo si es necesario)

Si el APK release no está firmado, créa un keystore:

```powershell
keytool -genkeypair -v -storetype PKCS12 -keystore nenipay.keystore -alias nenipay -keyalg RSA -keysize 2048 -validity 10000
```

Luego agrega en `android/app/build.gradle` dentro del bloque `android {}`:

```gradle
signingConfigs {
    release {
        storeFile file('../../nenipay.keystore')
        storePassword 'TU_PASSWORD'
        keyAlias 'nenipay'
        keyPassword 'TU_PASSWORD'
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
    }
}
```

---

## Solución de Problemas

| Error | Solución |
|-------|----------|
| `ANDROID_HOME not set` | Configura la variable de entorno |
| `SDK location not found` | Verifica `android/local.properties` |
| `Java version mismatch` | Usa JDK 17, no 11 ni 21 |
| `License not accepted` | Ejecuta `sdkmanager --licenses` |
| Build falla misteriosamente | Ejecuta `.\gradlew clean` primero |
