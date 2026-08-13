# Vintage Player 📻

[![Vue 3](https://img.shields.io/badge/Vue-3.x-4fc08d?style=for-the-badge&logo=vue.js&logoColor=white)](https://vuejs.org/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind-v4-06b6d4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%2C%20Firestore%2C%20Storage-ffca28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)

**Vintage Player** es una aplicación web personal de reproducción y biblioteca musical retro con estética analógica, que utiliza Firebase para la persistencia de datos y almacenamiento de audio.

<!-- [PLACEHOLDER: Inserta una captura de pantalla o GIF animado aquí para mostrar la estética vintage de la aplicación] -->

---

## 🚀 Características Principales

*   **Autenticación Multiusuario**: Registro e inicio de sesión seguro con correo electrónico/contraseña y proveedores sociales (Google y GitHub).
*   **Biblioteca en Tiempo Real**: Sincronización instantánea de metadatos mediante Firestore listeners aislados a nivel de usuario.
*   **Subida con Barra de Progreso**: Subida de audios y portadas personalizadas a Storage, estimando la duración exacta en milisegundos en el cliente y animando el progreso con GSAP.
*   **Reproductor Fijo Persistente**: Barra de control inferior unificada sobre un singleton `HTMLAudioElement` que permite navegar por la app sin interrumpir la música.
*   **Estética Vintage & Premium**: Diseñada meticulosamente en base a Tailwind CSS v4, con tipografías retro, sombras de bloque desplazadas, transiciones GSAP y micro-interacciones interactivas con Anime.js.
*   **Acciones Accesibles**: Todos los botones de solo icono cuentan con etiquetas `aria-label` descriptivas y morphicons responsivos.

---

## 🛠️ Stack Técnico

| Tecnología | Rol en el Proyecto |
| :--- | :--- |
| **Vue 3 (Composition API)** | Framework core y estructuración reactiva con `<script setup>`. |
| **TypeScript** | Tipado estricto en stores, componentes y configuraciones de enrutamiento. |
| **Tailwind CSS v4** | Sistema de diseño, tokens de color vintage y estilos globales. |
| **Pinia** | Gestión de estados globales desacoplados (Auth, Player y Library). |
| **Vite + Rolldown** | Entorno de desarrollo rápido y bundler ESM optimizado. |
| **Firebase Services** | Firebase Auth (sesión), Firestore (metadatos) y Cloud Storage (media files). |
| **GSAP** | Animaciones físicas de transiciones de subidor y entrada de tarjetas staggered. |
| **Anime.js v4** | Micro-interacciones de pulso en botones e interacciones táctiles elásticas. |
| **Morphicons** | Iconos vectoriales compatibles con Lucide que transicionan suavemente sus SVG. |

---

## 📂 Estructura de Carpetas

```
src/
├── assets/          # Estilos base, fuentes y definición de vectores (Google, GitHub, Hearts)
├── components/      # UI Cards y Consolas (AudioPlayer, FileUploader, SongCard, SongList)
├── composables/     # Lógica reutilizable de Vue (useAudioMetadata para leer duración de pistas)
├── firebase/        # Inicialización de servicios e interfaces de datos de Firebase
├── router/          # Enrutamiento de vistas y Guards de seguridad de acceso
├── stores/          # Estados de Pinia (authStore, libraryStore, playerStore)
└── views/           # Páginas de inicio y formularios de acceso (HomeView, LoginView, SignupView)
```

---

## ⚙️ Instalación y Puesta en Marcha

Sigue estos sencillos pasos para levantar el proyecto en menos de 5 minutos:

### 1. Clonar e Instalar Dependencias
```bash
git clone https://github.com/tu-usuario/vintage-player.git
cd vintage-player
npm install
```

### 2. Configurar Firebase
1. Ve a la [Consola de Firebase](https://console.firebase.google.com/) y crea un nuevo proyecto.
2. Habilita los siguientes servicios:
   *   **Authentication**: Activa el proveedor de Correo/Contraseña, Google y GitHub (este último requiere configurar las credenciales OAuth en GitHub).
   *   **Firestore Database**: Crea la base de datos en modo producción.
   *   **Cloud Storage**: Inicializa el cubo de almacenamiento por defecto.
3. Copia el archivo `.env.example` como `.env` y rellena las variables de entorno con la configuración de tu aplicación web de Firebase:
   ```bash
   cp .env.example .env
   ```

### 3. Desplegar Reglas de Seguridad
Asegúrate de tener instalado `firebase-tools` globalmente (`npm install -g firebase-tools`). Inicia sesión y despliega las reglas de seguridad locales que aíslan los datos de cada usuario:
```bash
firebase login
firebase deploy --only firestore:rules,storage:rules
```

### 4. Lanzar Servidor de Desarrollo
```bash
npm run dev
```
Para probar la aplicación directamente desde tu celular en la misma red local Wi-Fi, abre el navegador de tu dispositivo móvil y accede a la dirección IP indicada en tu terminal (gracias al flag `--host` habilitado en Vite).

---

## 📜 Scripts Disponibles

*   `npm run dev`: Levanta el servidor de desarrollo local con soporte host.
*   `npm run build`: Compila y optimiza la aplicación para producción en la carpeta `/dist` utilizando `vue-tsc` para chequeo de tipos.
*   `npm run preview`: Sirve localmente el bundle compilado en producción para validaciones rápidas.

---

## 🗺️ Roadmap de Mejoras

- [ ] **Playlists Personalizadas**: Crear, renombrar y ordenar colecciones de pistas personalizadas.
- [ ] **Modo Offline**: Soporte para caché de audio local y Service Workers (PWA) para reproducir música sin conexión.
- [ ] **Letras Sincronizadas**: Soporte para archivos `.lrc` que muestren las letras de las canciones en tiempo real con efecto karaoke.
- [ ] **Ecualizador Visual Vintage**: Un ecualizador analógico de agujas o analizador de espectro de barras animado en base a frecuencias Web Audio API.

---

## 📄 Licencia

Este proyecto está bajo la Licencia **MIT**. Puedes usarlo de forma libre y gratuita.
