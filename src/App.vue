<template>
  <div class="game-container">
    <canvas id="backgroundCanvas" ref="backgroundCanvas" :width="canvasWidth" :height="canvasHeight"></canvas>
    <canvas id="gameCanvas" ref="gameCanvas" :width="canvasWidth" :height="canvasHeight"></canvas>
  </div>
</template>

<script>
export default {
  name: 'App',
  data() {
    return {
      player: {
        x: 400,
        y: 300,
        width: 64,
        height: 64,
        speed: 5,
        frameX: 0,
        frameY: 14,
        moving: false,
        lastDirection: 'down'
      },
      minWidth: 320,
      minHeight: 480,
      maxWidth: 1600,
      maxHeight: 1200,
      canvasWidth: 1600,
      canvasHeight: 1200,
      tileSize: 16,
      tileBorder: 1,
      tilemapImage: null,
      tiles: [],
      availableTiles: {
        ground: [0, 1, 2],
        decoration: [39,40,41,42,43]
      },
      keys: {
        w: false,
        a: false,
        s: false,
        d: false
      },
      animationFrames: {
        walk: 9,
        idle: 6
      },
      sprite: null,
      background: null,
      animationFrame: null,
      lastTime: 0,
      characterAnimationFps: 12,
      frameTimer: 0,
      gameCtx: null,
      backgroundCtx: null
    }
  },
  computed: {
    frameInterval() {
      return 1000/this.characterAnimationFps
    },
  },
  async mounted() {
    // Inizializza i contesti dei canvas
    const gameCanvas = this.$refs.gameCanvas
    const backgroundCanvas = this.$refs.backgroundCanvas
    this.gameCtx = gameCanvas.getContext('2d')
    this.backgroundCtx = backgroundCanvas.getContext('2d')
  
    // Genera la mappa iniziale
    this.generateRandomMap()
    // Disegna la mappa di sfondo una sola volta
    await this.drawBackground()

    // Carica la sprite del personaggio
    await this.loadCharacterSprite()

    // Centra il personaggio
    this.centerPlayer()

    // Imposta le dimensioni iniziali
    await this.updateCanvasSize()
    
    // Event listeners per i tasti
    window.addEventListener('keydown', this.keyDown)
    window.addEventListener('keyup', this.keyUp)
    
    // Aggiunge listener per il ridimensionamento
    window.addEventListener('resize', this.updateCanvasSize)
    
    // Avvia il game loop
    this.animate(0)
  },
  beforeUnmount() {
    // Rimuove gli event listener quando il componente viene distrutto
    window.removeEventListener('resize', this.updateCanvasSize)
    window.removeEventListener('keydown', this.keyDown)
    window.removeEventListener('keyup', this.keyUp)
    cancelAnimationFrame(this.animationFrame)
  },
  methods: {
    async loadTiles() {
      // Carica la tilemap
      this.tilemapImage = new Image()
      this.tilemapImage.src = '/tilemap.png'
      await this.tilemapImage.decode()
    },
    async loadCharacterSprite() {
      // Carica la sprite del personaggio
      this.sprite = new Image()
      this.sprite.src = '/sprite.png'
      await this.sprite.decode()
    },
    getTileCoordinates(tileIndex) {
      // Calcola le coordinate x,y nella tilemap
      const tilesPerRow = 12
      const tileWithBorder = this.tileSize + this.tileBorder
      // Non aggiungere il bordo iniziale, solo tra i tile
      const x = (tileIndex % tilesPerRow) * tileWithBorder
      const y = Math.floor(tileIndex / tilesPerRow) * tileWithBorder
      return { x, y }
    },
    generateRandomMap() {
      // Pulisce la mappa esistente
      this.tiles = []

      // Calcola il numero di tile necessari per riempire il canvas
      const tilesX = Math.ceil(this.canvasWidth / this.tileSize)
      const tilesY = Math.ceil(this.canvasHeight / this.tileSize)
      
      // Genera una mappa casuale
      for (let y = 0; y < tilesY; y++) {
        const row = []
        for (let x = 0; x < tilesX; x++) {
          // 90% probabilità di tile ground, 10% di decoration
          const useDecoration = Math.random() < 0.1
          const tileArray = useDecoration ? this.availableTiles.decoration : this.availableTiles.ground
          const randomIndex = Math.floor(Math.random() * tileArray.length)
          row.push(tileArray[randomIndex])
        }
        this.tiles.push(row)
      }
    },
    keyDown(e) {
      switch(e.key.toLowerCase()) {
        case 'w':
          this.keys.w = true
          this.player.frameY = 8
          break
        case 's':
          this.keys.s = true
          this.player.frameY = 10
          break
        case 'a':
          this.keys.a = true
          this.player.frameY = 9
          break
        case 'd':
          this.keys.d = true
          this.player.frameY = 11
          break
      }
    },
    keyUp(e) {
      switch(e.key.toLowerCase()) {
        case 'w':
          this.keys.w = false
          break
        case 's':
          this.keys.s = false
          break
        case 'a':
          this.keys.a = false
          break
        case 'd':
          this.keys.d = false
          break
      }
    },
    movePlayer() {
      let dx = 0
      let dy = 0

      if (this.keys.w) dy -= this.player.speed
      if (this.keys.s) dy += this.player.speed
      if (this.keys.a) dx -= this.player.speed
      if (this.keys.d) dx += this.player.speed

      // Normalizza la velocità in diagonale
      if (dx !== 0 && dy !== 0) {
        const factor = 1 / Math.sqrt(2)
        dx *= factor
        dy *= factor
      }

      if (dx !== 0 || dy !== 0) {
        this.player.moving = true
        
        // Calcola la nuova posizione
        let newX = this.player.x + dx
        let newY = this.player.y + dy

        // Limita il movimento ai bordi del canvas
        newX = Math.max(0, Math.min(newX, this.canvasWidth - this.player.width))
        newY = Math.max(0, Math.min(newY, this.canvasHeight - this.player.height))

        // Aggiorna la posizione
        this.player.x = newX
        this.player.y = newY

        // Determina la direzione della sprite in base al movimento
        if (Math.abs(dx) > Math.abs(dy)) {
          // Movimento orizzontale predominante
          this.player.frameY = dx > 0 ? 11 : 9  // 11 per destra, 9 per sinistra
          this.player.lastDirection = dx > 0 ? 'right' : 'left'
        } else {
          // Movimento verticale predominante
          this.player.frameY = dy > 0 ? 10 : 8  // 10 per giù, 8 per su
          this.player.lastDirection = dy > 0 ? 'down' : 'up'
        }
      } else {
        this.player.moving = false
        // Imposta l'animazione idle in base all'ultima direzione
        switch(this.player.lastDirection) {
          case 'up':
            this.player.frameY = 12
            break
          case 'left':
            this.player.frameY = 13
            break
          case 'down':
            this.player.frameY = 14
            break
          case 'right':
            this.player.frameY = 15
            break
        }
      }
    },
    handlePlayerFrame() {
      const maxFrames = this.player.moving ? this.animationFrames.walk : this.animationFrames.idle
      this.player.frameX = (this.player.frameX + 1) % maxFrames
    },
    async drawBackground() {    
      // Carica l'immagine dei Tiles
      await this.loadTiles()

      // Pulisci il canvas di background
      this.backgroundCtx.clearRect(0, 0, this.canvasWidth, this.canvasHeight)

      // Disegna la mappa di tile sul canvas di background
      for (let y = 0; y < this.tiles.length; y++) {
        for (let x = 0; x < this.tiles[y].length; x++) {
          const tileIndex = this.tiles[y][x]
          const { x: sourceX, y: sourceY } = this.getTileCoordinates(tileIndex)
          
          this.backgroundCtx.drawImage(
            this.tilemapImage,
            sourceX,
            sourceY,
            this.tileSize,
            this.tileSize,
            x * this.tileSize,
            y * this.tileSize,
            this.tileSize,
            this.tileSize
          )
        }
      }
    },
    drawSprite() {
      // Pulisci il canvas del gioco
      this.gameCtx.clearRect(0, 0, this.canvasWidth, this.canvasHeight)

      // Disegna solo il personaggio
      this.gameCtx.drawImage(
        this.sprite,
        this.player.frameX * this.player.width,
        this.player.frameY * this.player.height,
        this.player.width,
        this.player.height,
        this.player.x,
        this.player.y,
        this.player.width,
        this.player.height
      )
    },
    animate(timestamp) {
      const deltaTime = timestamp - this.lastTime
      this.lastTime = timestamp

      if (this.frameTimer > this.frameInterval) {
        this.handlePlayerFrame()
        this.frameTimer = 0
      } else {
        this.frameTimer += deltaTime
      }

      this.movePlayer()
      this.drawSprite()
      this.animationFrame = requestAnimationFrame(this.animate)
    },
    async updateCanvasSize() {
      // Ottiene le dimensioni della viewport
      const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0)
      const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)

      // Calcola le nuove dimensioni mantenendo le proporzioni e i limiti
      this.canvasWidth = Math.min(this.maxWidth, Math.max(this.minWidth, vw))
      this.canvasHeight = Math.min(this.maxHeight, Math.max(this.minHeight, vh))

      // Se i canvas esistono, aggiorna i context
      if (this.gameCtx && this.backgroundCtx) {
        // Aggiorna le dimensioni dei canvas
        this.gameCtx.canvas.width = this.canvasWidth
        this.gameCtx.canvas.height = this.canvasHeight
        this.backgroundCtx.canvas.width = this.canvasWidth
        this.backgroundCtx.canvas.height = this.canvasHeight

        // Rigenera la mappa con le nuove dimensioni
        this.generateRandomMap()
        // Ridisegna lo sfondo
        await this.drawBackground()
        // Centra il personaggio
        this.centerPlayer()
      }
    },
    centerPlayer() {
      // Calcola il centro del canvas
      this.player.x = (this.canvasWidth - this.player.width) / 2
      this.player.y = (this.canvasHeight - this.player.height) / 2
    },
  }
}
</script>

<style>
.game-container {
  width: 100%;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  margin: 0;
  padding: 0;
  position: relative;
}

canvas {
  position: absolute;
  max-width: 1600px;
  max-height: 1200px;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

/* Reset CSS per rimuovere margini e padding di default */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  overflow: hidden;
}
</style>
