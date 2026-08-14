import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

export function useTutorials() {
  const config = {
    showProgress: true,
    animate: true,
    allowClose: true,
    doneBtnText: '¡Listo!',
    nextBtnText: 'Siguiente',
    prevBtnText: 'Anterior',
  }

  const startPlayerTutorial = () => {
    driver({
      ...config,
      steps: [
        {
          element: '.progress-slider',
          popover: { title: 'Barra de Progreso', description: 'Aquí puedes ver el avance de la canción y, si es por WebRTC, la barra de descarga por debajo.' }
        },
        {
          element: 'button[title="Reproducir / Pausar"]',
          popover: { title: 'Controles de Reproducción', description: 'Pausa o reanuda la música.' }
        },
        {
          element: 'button[title="Añadir a Favoritos"]',
          popover: { title: 'Favoritos', description: 'Guarda esta canción en tu biblioteca para siempre.' }
        },
        {
          element: 'button[title="Añadir a Lista de Reproducción"]',
          popover: { title: 'Listas', description: 'Añade la pista a una lista de reproducción personalizada.' }
        },
        {
          element: 'button[title="Cola de Reproducción"]',
          popover: { title: 'Siguientes', description: 'Mira qué canciones siguen en la cola.' }
        }
      ]
    }).drive()
  }

  const startSenderTutorial = () => {
    driver({
      ...config,
      steps: [
        {
          popover: { title: 'Modo Compartir (Celular)', description: 'Este modo convierte tu celular en un servidor para transmitir música a tu PC.' }
        },
        {
          popover: { title: 'Iniciar Transmisión', description: 'Presiona "Iniciar Transmisión al PC" para abrir la conexión y estar listo para enviar archivos.' }
        },
        {
          popover: { title: 'Cambiar Carpeta', description: 'Si deseas cambiar los archivos que compartes, usa el botón "Cambiar".' }
        }
      ]
    }).drive()
  }

  const startReceiverTutorial = () => {
    driver({
      ...config,
      steps: [
        {
          popover: { title: 'Modo Reproducir (PC)', description: 'Este modo escucha a tu celular y recibe los archivos de audio en tiempo real.' }
        },
        {
          popover: { title: 'Habilitar', description: 'Activa el receptor para conectarse automáticamente al celular presionando "Habilitar Recepción".' }
        },
        {
          popover: { title: 'Descarga Masiva', description: 'Puedes descargar y cachear todas las canciones a la vez para poder escucharlas offline usando el botón de descargar todas.' }
        }
      ]
    }).drive()
  }

  return {
    startPlayerTutorial,
    startSenderTutorial,
    startReceiverTutorial
  }
}
