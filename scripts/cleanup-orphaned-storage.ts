import { initializeApp, cert } from 'firebase-admin/app'
import { getStorage } from 'firebase-admin/storage'
import { getFirestore } from 'firebase-admin/firestore'

/**
 * ============================================================================
 * Herramienta de Limpieza de Archivos Huérfanos en Storage
 * ============================================================================
 * 
 * Este script escanea todos los archivos en Firebase Storage y los compara con
 * los documentos de Firestore. Si encuentra archivos en Storage que no están 
 * enlazados en ningún documento de canción, los marca como huérfanos y los elimina.
 * 
 * Requisitos:
 * 1. Descargar el archivo JSON de credenciales de tu cuenta de servicio desde
 *    Configuración del Proyecto > Cuentas de Servicio en Firebase Console.
 * 2. Guardarlo como `service-account-key.json` en la raíz del proyecto.
 * 3. Configurar tu Storage Bucket en este archivo o como variable de entorno.
 * 
 * Uso:
 * npm run cleanup:storage
 */

// NOTA: Reemplazar con el nombre de tu bucket de Storage si no está en las variables
const STORAGE_BUCKET = process.env.VITE_FIREBASE_STORAGE_BUCKET || 'tu-proyecto.appspot.com'

try {
  const serviceAccount = require('../service-account-key.json')
  initializeApp({
    credential: cert(serviceAccount),
    storageBucket: STORAGE_BUCKET
  })
} catch (error) {
  console.error('❌ Error: No se pudo cargar service-account-key.json')
  console.error('Asegúrate de descargar tus credenciales de Firebase y colocarlas en la raíz.')
  process.exit(1)
}

const db = getFirestore()
const bucket = getStorage().bucket()

async function cleanup() {
  console.log('🔍 Iniciando escaneo de archivos huérfanos...')
  
  try {
    // 1. Obtener todos los audios y portadas de Firebase Storage
    const [files] = await bucket.getFiles()
    const storagePaths = files.map(file => file.name)
    console.log(`📁 Archivos encontrados en Storage: ${storagePaths.length}`)

    // 2. Obtener todas las canciones de Firestore (buscamos en las subcolecciones de todos los usuarios)
    // Usamos un collectionGroup para obtener las canciones sin importar a qué usuario pertenezcan.
    const songsSnapshot = await db.collectionGroup('songs').get()
    const validPaths = new Set<string>()

    songsSnapshot.forEach(doc => {
      const data = doc.data()
      // Guardar los paths válidos
      if (data.audioPath) validPaths.add(data.audioPath)
      if (data.coverPath) validPaths.add(data.coverPath)
    })
    console.log(`🎵 Rutas válidas registradas en Firestore: ${validPaths.size}`)

    // 3. Encontrar huérfanos (están en Storage, pero no en Firestore)
    const orphans = storagePaths.filter(path => {
      // Omitir directorios o configuraciones de storage
      if (path.endsWith('/')) return false
      // Asumimos que los archivos relevantes están en las carpetas de users/
      if (!path.startsWith('users/')) return false
      
      return !validPaths.has(path)
    })

    if (orphans.length === 0) {
      console.log('✅ Todo en orden. No hay archivos huérfanos.')
      process.exit(0)
    }

    console.log(`⚠️ Se encontraron ${orphans.length} archivos huérfanos. Eliminando...`)

    // 4. Eliminar huérfanos
    let deleted = 0
    for (const path of orphans) {
      try {
        await bucket.file(path).delete()
        console.log(`  🗑️ Eliminado: ${path}`)
        deleted++
      } catch (err) {
        console.error(`  ❌ Error al eliminar ${path}:`, err)
      }
    }

    console.log(`🎉 Limpieza completada. Se eliminaron ${deleted} archivos.`)

  } catch (error) {
    console.error('Error durante la limpieza:', error)
  }
}

cleanup()
