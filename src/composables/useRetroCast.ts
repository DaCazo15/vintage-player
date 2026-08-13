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

export function useRetroCast() {
  const authStore = useAuthStore()
  const playerStore = usePlayerStore()

  // Auto-detect role based on user agent (desktop = receiver, mobile = sender)
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  const role = ref<'sender' | 'receiver'>(isMobile ? 'sender' : 'receiver')

  // States
  const connectionStatus = ref<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const transferStatus = ref<'idle' | 'sending' | 'receiving' | 'assembling' | 'completed' | 'error'>('idle')
  const transferProgress = ref(0)
  const errorMessage = ref<string | null>(null)

  // Sender input states
  const audioFile = ref<File | null>(null)
  const audioInput = ref<HTMLInputElement | null>(null)
  const title = ref('')
  const artist = ref('')

  // Folder states
  const localSongs = ref<File[]>([])
  const folderName = ref('')

  // WebRTC and Firestore subscription instances
  let peerConnection: RTCPeerConnection | null = null
  let dataChannel: RTCDataChannel | null = null
  let unsubscribeFirestore: (() => void) | null = null

  // Chunks accumulators
  const receivedChunks: ArrayBuffer[] = []
  const fileHeader = ref<{ title: string; artist: string; totalSize: number; mimeType: string; totalChunks: number } | null>(null)
  let chunksReceivedCount = 0

  // Reset local states
  const resetSenderForm = () => {
    audioFile.value = null
    title.value = ''
    artist.value = ''
    transferStatus.value = 'idle'
    transferProgress.value = 0
    errorMessage.value = null
  }

  const triggerAudioSelect = () => {
    audioInput.value?.click()
  }

  const handleAudioSelect = (e: Event) => {
    const target = e.target as HTMLInputElement
    if (target.files && target.files.length > 0) {
      const file = target.files[0]
      audioFile.value = file
      const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name
      title.value = nameWithoutExt
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

  const selectLocalSong = (file: File) => {
    audioFile.value = file
    const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name
    title.value = nameWithoutExt
    artist.value = 'Local Cast'
    transferProgress.value = 0
    transferStatus.value = 'idle'
  }

  const changeFolder = () => {
    localSongs.value = []
    folderName.value = ''
    audioFile.value = null
    title.value = ''
    artist.value = ''
    transferProgress.value = 0
    transferStatus.value = 'idle'
  }

  // Clean up connections and listeners
  function cleanup() {
    if (unsubscribeFirestore) {
      unsubscribeFirestore()
      unsubscribeFirestore = null
    }
    if (dataChannel) {
      try {
        dataChannel.close()
      } catch (e) {}
      dataChannel = null
    }
    if (peerConnection) {
      try {
        peerConnection.close()
      } catch (e) {}
      peerConnection = null
    }
  }

  onUnmounted(() => {
    cleanup()
  })

  // Watch role toggle to trigger cleanups and auto-start receiver if PC
  watch(role, (newRole) => {
    cleanup()
    errorMessage.value = null
    transferProgress.value = 0
    transferStatus.value = 'idle'
    connectionStatus.value = 'disconnected'
    
    if (newRole === 'receiver') {
      startReceiver()
    }
  }, { immediate: true })

  // WebRTC PC (Receiver) Logic
  async function startReceiver() {
    cleanup()
    connectionStatus.value = 'connecting'
    transferStatus.value = 'idle'
    errorMessage.value = null

    const uid = authStore.user?.uid
    if (!uid) {
      errorMessage.value = 'Debes iniciar sesión para conectar.'
      connectionStatus.value = 'disconnected'
      return
    }

    const sigDocRef = doc(db, 'users', uid, 'signaling', 'webrtc')

    // Clear any leftover signaling document
    await deleteDoc(sigDocRef).catch(() => {})

    // Listen to Firestore signaling document changes
    unsubscribeFirestore = onSnapshot(sigDocRef, async (snapshot) => {
      if (!snapshot.exists()) return
      const data = snapshot.data()

      // 1. On Offer received
      if (data.offer && !peerConnection) {
        await createReceiverPeerConnection(data.offer, sigDocRef)
      }

      // 2. On ICE Candidates received
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
    peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    })

    // Send local ICE candidates to sender
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
        } else if (peerConnection.connectionState === 'disconnected' || peerConnection.connectionState === 'failed') {
          connectionStatus.value = 'disconnected'
          cleanup()
          startReceiver() // Restart waiting mode
        }
      }
    }

    // Bind DataChannel receiver
    peerConnection.ondatachannel = (event) => {
      const channel = event.channel
      if (channel.label === 'audio-transfer') {
        setupReceiverDataChannel(channel)
      }
    }

    // Establish connection
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

  function setupReceiverDataChannel(channel: RTCDataChannel) {
    dataChannel = channel

    channel.onopen = () => {
      connectionStatus.value = 'connected'
      transferStatus.value = 'idle'
    }

    channel.onclose = () => {
      connectionStatus.value = 'disconnected'
      cleanup()
      startReceiver() // Re-enter waiting mode
    }

    channel.onmessage = async (event) => {
      if (typeof event.data === 'string') {
        // Decode headers
        try {
          const message = JSON.parse(event.data)
          if (message.type === 'header') {
            fileHeader.value = message
            receivedChunks.length = 0 // Clear array
            chunksReceivedCount = 0
            transferStatus.value = 'receiving'
            transferProgress.value = 0
          }
        } catch (e) {
          console.error('Header parsing error:', e)
        }
      } else {
        // Accumulate binary chunk data
        if (fileHeader.value) {
          receivedChunks.push(event.data)
          chunksReceivedCount++
          transferProgress.value = Math.min(100, Math.round((chunksReceivedCount / fileHeader.value.totalChunks) * 100))

          if (chunksReceivedCount === fileHeader.value.totalChunks) {
            transferStatus.value = 'assembling'
            
            const fileBlob = new Blob(receivedChunks, { type: fileHeader.value.mimeType })
            const objectUrl = URL.createObjectURL(fileBlob)

            // Load local song into the Pinia Audio Player Store
            const localSong = {
              id: 'webrtc-temp',
              title: fileHeader.value.title,
              artist: fileHeader.value.artist,
              audioUrl: objectUrl,
              coverUrl: null,
              duration: 0,
              createdAt: new Date(),
              favorite: false
            }

            playerStore.loadSong(localSong as any)
            
            transferStatus.value = 'completed'
            setTimeout(() => {
              if (transferStatus.value === 'completed') {
                transferStatus.value = 'idle'
                transferProgress.value = 0
              }
            }, 4000)

            // Clear signaling metadata document
            const uid = authStore.user?.uid
            if (uid) {
              const sigDocRef = doc(db, 'users', uid, 'signaling', 'webrtc')
              await deleteDoc(sigDocRef).catch(() => {})
            }
          }
        }
      }
    }
  }

  // WebRTC Phone (Sender) Logic
  async function startSender() {
    if (!audioFile.value || !title.value || !artist.value) {
      errorMessage.value = 'Por favor, complete todos los campos obligatorios.'
      return
    }

    cleanup()
    connectionStatus.value = 'connecting'
    transferStatus.value = 'idle'
    errorMessage.value = null

    const uid = authStore.user?.uid
    if (!uid) {
      errorMessage.value = 'Debes iniciar sesión para conectar.'
      connectionStatus.value = 'disconnected'
      return
    }

    const sigDocRef = doc(db, 'users', uid, 'signaling', 'webrtc')
    await deleteDoc(sigDocRef).catch(() => {})

    peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    })

    // Create order-preserving transfer channel
    const channel = peerConnection.createDataChannel('audio-transfer', {
      ordered: true
    })
    setupSenderDataChannel(channel)

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
        offer: {
          type: offer.type,
          sdp: offer.sdp
        }
      }, { merge: true })

      // Await Receiver answer & candidates
      unsubscribeFirestore = onSnapshot(sigDocRef, async (snapshot) => {
        if (!snapshot.exists()) return
        const data = snapshot.data()

        if (data.answer && peerConnection && !peerConnection.currentRemoteDescription) {
          await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer))
        }

        if (data.receiverCandidates && peerConnection) {
          for (const candidate of data.receiverCandidates) {
            try {
              await peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
            } catch (e) {
              console.warn('Error adding receiver ICE candidate:', e)
            }
          }
        }
      })
    } catch (err: any) {
      console.error('Error starting sender connection:', err)
      errorMessage.value = 'No se pudo iniciar la transmisión.'
      cleanup()
      connectionStatus.value = 'disconnected'
    }
  }

  function setupSenderDataChannel(channel: RTCDataChannel) {
    dataChannel = channel

    channel.onopen = () => {
      connectionStatus.value = 'connected'
      sendFile()
    }

    channel.onclose = () => {
      connectionStatus.value = 'disconnected'
      cleanup()
    }
  }

  // Slice & transmit raw binary file
  async function sendFile() {
    if (!audioFile.value || !dataChannel || dataChannel.readyState !== 'open') {
      errorMessage.value = 'Conexión cerrada. No se pudo iniciar el envío.'
      return
    }

    transferStatus.value = 'sending'
    transferProgress.value = 0

    const file = audioFile.value
    const reader = new FileReader()

    reader.onload = async (e) => {
      const buffer = e.target?.result as ArrayBuffer
      if (!buffer) {
        errorMessage.value = 'Error al leer el archivo local.'
        transferStatus.value = 'error'
        return
      }

      const chunkSize = 65536 // 64 KB optimal chunk size
      const totalSize = buffer.byteLength
      const totalChunks = Math.ceil(totalSize / chunkSize)

      // 1. Send file headers first
      dataChannel?.send(JSON.stringify({
        type: 'header',
        title: title.value,
        artist: artist.value,
        totalSize: totalSize,
        mimeType: file.type || 'audio/mpeg',
        totalChunks: totalChunks
      }))

      // 2. Chunks Loop with strict congestion controls (bufferedAmount)
      let offset = 0
      let chunkIndex = 0

      function sendNextChunk() {
        if (!dataChannel || dataChannel.readyState !== 'open') return

        // Yield/Pause if RTCDataChannel buffer is congested (max 64KB queued)
        if (dataChannel.bufferedAmount > 65536) {
          dataChannel.onbufferedamountlow = () => {
            if (dataChannel) {
              dataChannel.onbufferedamountlow = null
              sendNextChunk()
            }
          }
          return
        }

        if (offset < totalSize) {
          const slice = buffer.slice(offset, offset + chunkSize)
          dataChannel.send(slice)
          offset += chunkSize
          chunkIndex++
          transferProgress.value = Math.min(100, Math.round((chunkIndex / totalChunks) * 100))

          // Trigger next chunk (small delay to avoid JS thread blocking)
          setTimeout(sendNextChunk, 1)
        } else {
          // Completed transfer successfully!
          transferStatus.value = 'completed'
          setTimeout(() => {
            if (transferStatus.value === 'completed') {
              resetSenderForm()
            }
          }, 4000)
        }
      }

      sendNextChunk()
    }

    reader.readAsArrayBuffer(file)
  }

  return {
    role,
    connectionStatus,
    transferStatus,
    transferProgress,
    errorMessage,
    audioFile,
    audioInput,
    title,
    artist,
    fileHeader,
    localSongs,
    folderName,
    resetSenderForm,
    triggerAudioSelect,
    handleAudioSelect,
    handleFolderSelect,
    selectLocalSong,
    changeFolder,
    startReceiver,
    startSender,
    cleanup
  }
}
