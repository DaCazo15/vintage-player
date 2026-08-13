import { ref, onUnmounted, watch } from 'vue'
import { db } from '@/firebase/config'
import { useAuthStore } from '@/stores/authStore'
import { usePlayerStore } from '@/stores/playerStore'
import {
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  arrayUnion
} from 'firebase/firestore'

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp'
      ],
      username: 'openrelay',
      credential: 'openrelay'
    }
  ]
}

export function useRetroCast() {
  const authStore = useAuthStore()
  const playerStore = usePlayerStore()

  // Auto-detect role based on user agent (desktop = receiver, mobile = sender)
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  const role = ref<'sender' | 'receiver'>(isMobile ? 'sender' : 'receiver')

  // States
  const connectionStatus = ref<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const errorMessage = ref<string | null>(null)

  // Sender specific
  const localSongs = ref<File[]>([])
  const folderName = ref('')
  const sharedManifest = ref<any[]>([])
  const uploadProgress = ref<Record<number, number>>({})

  // Receiver specific
  const remoteManifest = ref<any[]>([])
  const downloadProgress = ref<Record<number, number>>({})
  const availableSongs = ref<Record<number, any>>({}) // fileIndex -> Song object

  // WebRTC and Firestore subscription instances
  let peerConnection: RTCPeerConnection | null = null
  let controlChannel: RTCDataChannel | null = null
  let unsubscribeFirestore: (() => void) | null = null
  let connectionTimeoutId: any = null

  function startConnectionTimeout() {
    clearConnectionTimeout()
    connectionTimeoutId = window.setTimeout(() => {
      if (connectionStatus.value !== 'connected') {
        errorMessage.value = 'La conexión P2P está tardando demasiado y ha fallado. Por favor, asegúrate de que ambos dispositivos están conectados a la misma red y que el aislamiento de puntos de acceso (AP Isolation) de tu router no está activado.'
        connectionStatus.value = 'disconnected'
        cleanup()
      }
    }, 15000)
  }

  function clearConnectionTimeout() {
    if (connectionTimeoutId) {
      window.clearTimeout(connectionTimeoutId)
      connectionTimeoutId = null
    }
  }

  const handleFolderSelect = (e: Event) => {
    const target = e.target as HTMLInputElement
    if (target.files && target.files.length > 0) {
      const filesList = Array.from(target.files)
      
      const audioFiles = filesList.filter(file => {
        const isAudioType = file.type.startsWith('audio/')
        const hasAudioExt = /\.(mp3|wav|ogg|m4a|flac|aac)$/i.test(file.name)
        return isAudioType || hasAudioExt
      })

      if (audioFiles.length === 0) {
        errorMessage.value = 'No se encontraron archivos de audio en la carpeta seleccionada.'
        return
      }

      audioFiles.sort((a, b) => a.name.localeCompare(b.name))

      localSongs.value = audioFiles
      errorMessage.value = null
      
      const firstFile = audioFiles[0]
      if (firstFile.webkitRelativePath) {
        const parts = firstFile.webkitRelativePath.split('/')
        if (parts.length > 1) {
          folderName.value = parts[0]
          return
        }
      }
      folderName.value = 'Carpeta Local'
    }
  }

  const changeFolder = () => {
    localSongs.value = []
    folderName.value = ''
    sharedManifest.value = []
    uploadProgress.value = {}
  }

  function cleanup() {
    clearConnectionTimeout()
    if (unsubscribeFirestore) {
      unsubscribeFirestore()
      unsubscribeFirestore = null
    }
    if (peerConnection) {
      try {
        peerConnection.close()
      } catch (e) {}
      peerConnection = null
    }
    controlChannel = null
    
    // Clear Object URLs to prevent memory leaks
    Object.values(availableSongs.value).forEach(song => {
      if (song.audioUrl) URL.revokeObjectURL(song.audioUrl)
    })
    availableSongs.value = {}
    downloadProgress.value = {}
    remoteManifest.value = []
  }

  onUnmounted(() => {
    cleanup()
  })

  watch(role, (newRole) => {
    cleanup()
    errorMessage.value = null
    connectionStatus.value = 'disconnected'
    
    if (newRole === 'receiver') {
      startReceiver()
    }
  }, { immediate: true })

  // Trigger preload manager whenever current song changes
  watch(() => playerStore.currentSong, () => {
    if (role.value === 'receiver' && connectionStatus.value === 'connected' && remoteManifest.value.length > 0) {
      managePreloading()
    }
  })

  // ---------------------------------------------------------
  // RECEIVER LOGIC
  // ---------------------------------------------------------
  async function startReceiver() {
    cleanup()
    connectionStatus.value = 'connecting'
    errorMessage.value = null

    const uid = authStore.user?.uid
    if (!uid) {
      errorMessage.value = 'Debes iniciar sesión para conectar.'
      connectionStatus.value = 'disconnected'
      return
    }

    const sigDocRef = doc(db, 'users', uid, 'signaling', 'webrtc')
    await deleteDoc(sigDocRef).catch(() => {})

    unsubscribeFirestore = onSnapshot(sigDocRef, async (snapshot) => {
      if (!snapshot.exists()) return
      const data = snapshot.data()

      if (data.offer && !peerConnection) {
        await createReceiverPeerConnection(data.offer, sigDocRef)
      }

      if (data.senderCandidates && peerConnection) {
        for (const candidate of data.senderCandidates) {
          try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
          } catch (e) {
            console.warn('Error adding sender ICE candidate:', e)
          }
        }
      }
    })
  }

  async function createReceiverPeerConnection(offerData: any, sigDocRef: any) {
    peerConnection = new RTCPeerConnection(ICE_SERVERS)
    startConnectionTimeout()

    peerConnection.onicecandidate = async (event) => {
      if (event.candidate) {
        await setDoc(sigDocRef, {
          receiverCandidates: arrayUnion(event.candidate.toJSON())
        }, { merge: true })
      }
    }

    peerConnection.onconnectionstatechange = () => {
      if (peerConnection) {
        if (peerConnection.connectionState === 'connected') {
          connectionStatus.value = 'connected'
          clearConnectionTimeout()
        } else if (peerConnection.connectionState === 'disconnected' || peerConnection.connectionState === 'failed') {
          connectionStatus.value = 'disconnected'
          cleanup()
          startReceiver() 
        }
      }
    }

    peerConnection.ondatachannel = (event) => {
      const channel = event.channel
      if (channel.label === 'control') {
        controlChannel = channel
        channel.onopen = () => {
          connectionStatus.value = 'connected'
          clearConnectionTimeout()
        }
        channel.onmessage = (e) => {
          const msg = JSON.parse(e.data)
          if (msg.type === 'manifest') {
            remoteManifest.value = msg.data
            const playlist = msg.data.map((m: any) => ({
              id: `webrtc-${m.id}`,
              title: m.title,
              artist: m.artist,
              audioUrl: '', 
              coverUrl: null,
              duration: 0,
              favorite: false,
              _webrtcIndex: m.id
            }))
            
            // Clear signaling metadata document
            const uid = authStore.user?.uid
            if (uid) {
              deleteDoc(doc(db, 'users', uid, 'signaling', 'webrtc')).catch(() => {})
            }

            // Load playlist into player
            playerStore.loadSong(playlist[0], playlist)
            // Immediately start preloading
            managePreloading()
          }
        }
      }
    }

    try {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offerData))
      const answer = await peerConnection.createAnswer()
      await peerConnection.setLocalDescription(answer)

      await setDoc(sigDocRef, {
        answer: {
          type: answer.type,
          sdp: answer.sdp
        }
      }, { merge: true })
    } catch (err: any) {
      console.error('Error creating WebRTC PeerConnection:', err)
      errorMessage.value = 'No se pudo negociar la conexión local.'
      cleanup()
      connectionStatus.value = 'disconnected'
    }
  }

  function managePreloading() {
    if (!peerConnection) return
    const currentIndex = playerStore.playlist.findIndex(s => s.id === playerStore.currentSong?.id)
    if (currentIndex === -1) return
    
    const total = remoteManifest.value.length
    const indicesToLoad = new Set<number>()
    
    // Window: -5 to +5
    for (let i = -5; i <= 5; i++) {
      let idx = currentIndex + i
      if (total > 0) {
        // Wrap around logic
        if (idx < 0) idx = (idx % total) + total
        if (idx >= total) idx = idx % total
        indicesToLoad.add(idx)
      }
    }
    
    // Request missing chunks
    indicesToLoad.forEach(idx => {
      const manifestItem = remoteManifest.value[idx]
      if (!availableSongs.value[idx] && downloadProgress.value[idx] === undefined) {
         requestFile(idx, manifestItem)
      }
    })
    
    // Free memory for songs outside the window
    Object.keys(availableSongs.value).forEach(k => {
      const idx = parseInt(k)
      if (!indicesToLoad.has(idx)) {
         URL.revokeObjectURL(availableSongs.value[idx].audioUrl)
         delete availableSongs.value[idx]
         delete downloadProgress.value[idx]
         if (playerStore.playlist[idx]) {
           playerStore.playlist[idx].audioUrl = ''
         }
      }
    })
  }

  function requestFile(idx: number, manifestItem: any) {
    if (!peerConnection) return
    downloadProgress.value[idx] = 0
    const channel = peerConnection.createDataChannel(`file-${idx}`, { ordered: true })
    
    const receivedChunks: ArrayBuffer[] = []
    let bytesReceived = 0
    
    channel.onmessage = (e) => {
      receivedChunks.push(e.data)
      bytesReceived += e.data.byteLength
      downloadProgress.value[idx] = Math.min(100, Math.round((bytesReceived / manifestItem.totalSize) * 100))
      
      if (bytesReceived >= manifestItem.totalSize) {
        const fileBlob = new Blob(receivedChunks, { type: manifestItem.mimeType })
        const objectUrl = URL.createObjectURL(fileBlob)
        
        availableSongs.value[idx] = {
           id: `webrtc-${idx}`,
           title: manifestItem.title,
           artist: manifestItem.artist,
           audioUrl: objectUrl,
           coverUrl: null,
           duration: 0,
           createdAt: new Date(),
           favorite: false
        }
        
        if (playerStore.playlist[idx]) {
          playerStore.playlist[idx].audioUrl = objectUrl
        }
        
        // If this is the currently waiting song, play it
        if (playerStore.currentSong?.id === `webrtc-${idx}` && playerStore.currentSong.audioUrl === '') {
           playerStore.loadSong(playerStore.playlist[idx], playerStore.playlist)
        }
        
        channel.close()
      }
    }
  }


  // ---------------------------------------------------------
  // SENDER LOGIC
  // ---------------------------------------------------------
  async function startSender() {
    if (localSongs.value.length === 0) {
      errorMessage.value = 'Por favor, selecciona una carpeta de música.'
      return
    }

    cleanup()
    connectionStatus.value = 'connecting'
    errorMessage.value = null

    const uid = authStore.user?.uid
    if (!uid) {
      errorMessage.value = 'Debes iniciar sesión para conectar.'
      connectionStatus.value = 'disconnected'
      return
    }

    const sigDocRef = doc(db, 'users', uid, 'signaling', 'webrtc')
    await deleteDoc(sigDocRef).catch(() => {})

    unsubscribeFirestore = onSnapshot(sigDocRef, async (snapshot) => {
      if (!snapshot.exists()) return
      const data = snapshot.data()

      if (!peerConnection) return

      if (data.answer && !peerConnection.currentRemoteDescription) {
        try {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer))
        } catch (e) {
          console.error('[SENDER/CEL] Error setting remote description:', e)
        }
      }

      if (data.receiverCandidates) {
        for (const candidate of data.receiverCandidates) {
          try {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
          } catch (e) {
            console.warn('[SENDER/CEL] Error adding receiver ICE candidate:', e)
          }
        }
      }
    })

    peerConnection = new RTCPeerConnection(ICE_SERVERS)
    startConnectionTimeout()

    // 1. Control channel for JSON messages
    controlChannel = peerConnection.createDataChannel('control', { ordered: true })
    
    controlChannel.onopen = () => {
      connectionStatus.value = 'connected'
      clearConnectionTimeout()
      
      // Send manifest
      const manifest = localSongs.value.map((f, i) => ({
        id: i,
        title: f.name.substring(0, f.name.lastIndexOf('.')) || f.name,
        artist: 'Local Cast',
        totalSize: f.size,
        mimeType: f.type || 'audio/mpeg'
      }))
      sharedManifest.value = manifest
      controlChannel?.send(JSON.stringify({ type: 'manifest', data: manifest }))
    }

    controlChannel.onclose = () => {
      connectionStatus.value = 'disconnected'
      cleanup()
    }

    // 2. Listen for dynamically requested files
    peerConnection.ondatachannel = (event) => {
      const channel = event.channel
      if (channel.label.startsWith('file-')) {
        const fileId = parseInt(channel.label.split('-')[1])
        sendFileChunks(fileId, channel)
      }
    }

    peerConnection.onicecandidate = async (event) => {
      if (event.candidate) {
        await setDoc(sigDocRef, {
          senderCandidates: arrayUnion(event.candidate.toJSON())
        }, { merge: true })
      }
    }

    peerConnection.onconnectionstatechange = () => {
      if (peerConnection) {
        if (peerConnection.connectionState === 'connected') {
          connectionStatus.value = 'connected'
          clearConnectionTimeout()
        } else if (peerConnection.connectionState === 'disconnected' || peerConnection.connectionState === 'failed') {
          connectionStatus.value = 'disconnected'
          cleanup()
        }
      }
    }

    try {
      const offer = await peerConnection.createOffer()
      await peerConnection.setLocalDescription(offer)

      await setDoc(sigDocRef, {
        offer: { type: offer.type, sdp: offer.sdp }
      }, { merge: true })
    } catch (err: any) {
      console.error('[SENDER/CEL] FALLO al escribir offer:', err)
      errorMessage.value = 'No se pudo iniciar la transmisión. Verifique reglas de Firebase.'
      cleanup()
      connectionStatus.value = 'disconnected'
    }
  }

  function sendFileChunks(fileId: number, channel: RTCDataChannel) {
    const file = localSongs.value[fileId]
    if (!file) return
    
    uploadProgress.value[fileId] = 0

    channel.onopen = () => {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const buffer = e.target?.result as ArrayBuffer
        if (!buffer) return

        const chunkSize = 65536 // 64 KB
        const totalSize = buffer.byteLength
        let offset = 0
        let bytesSent = 0

        function sendNextChunk() {
          if (channel.readyState !== 'open') return

          if (channel.bufferedAmount > 65536) {
            channel.onbufferedamountlow = () => {
              channel.onbufferedamountlow = null
              sendNextChunk()
            }
            return
          }

          if (offset < totalSize) {
            const slice = buffer.slice(offset, offset + chunkSize)
            channel.send(slice)
            offset += chunkSize
            bytesSent += slice.byteLength
            uploadProgress.value[fileId] = Math.min(100, Math.round((bytesSent / totalSize) * 100))
            
            // Allow JS event loop to breathe
            setTimeout(sendNextChunk, 1)
          } else {
            uploadProgress.value[fileId] = 100
            // Channel closes automatically on receiver side once bytes received == totalSize
          }
        }

        sendNextChunk()
      }
      reader.readAsArrayBuffer(file)
    }
  }

  return {
    role,
    connectionStatus,
    errorMessage,
    localSongs,
    folderName,
    sharedManifest,
    uploadProgress,
    remoteManifest,
    downloadProgress,
    availableSongs,
    handleFolderSelect,
    changeFolder,
    startReceiver,
    startSender,
    cleanup
  }
}
