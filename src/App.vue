<template>
  <div class="game-container">
    <canvas id="backgroundCanvas" ref="backgroundCanvas" :width="canvasSize.width" :height="canvasSize.height"></canvas>
    <canvas id="objectsCanvas" ref="objectsCanvas" :width="canvasSize.width" :height="canvasSize.height"></canvas>
    <canvas id="gameCanvas" ref="gameCanvas" :width="canvasSize.width" :height="canvasSize.height"></canvas>
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
      gameSize: {
        width: 800,
        height: 600
      },
      canvasSize: {
        width: 0,
        height: 0
      },
      tileSize: 16,
      tileBorder: 1,
      tilemapImage: null,
      tiles: [],
      objectTiles: [],
      availableTiles: {
        ground: [0, 1, 2],
        decoration: [39,40,41,42,43],
        objects: [27,28,29]
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
      backgroundCtx: null,
      objectsCtx: null
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
    const objectsCanvas = this.$refs.objectsCanvas
    this.gameCtx = gameCanvas.getContext('2d')
    this.backgroundCtx = backgroundCanvas.getContext('2d')
    this.objectsCtx = objectsCanvas.getContext('2d')

    // Carica gli assets
    await this.loadTiles()
    await this.loadCharacterSprite()

    // Imposta le dimensioni iniziali del canvas
    this.updateCanvasSize()
    
    // Event listeners per i tasti
    window.addEventListener('keydown', this.keyDown)
    window.addEventListener('keyup', this.keyUp)
    window.addEventListener('resize', this.updateCanvasSize)
    
    // Avvia il game loop
    this.animate(0)
  },
  beforeUnmount() {
    // Rimuove gli event listener quando il componente viene distrutto
    window.removeEventListener('keydown', this.keyDown)
    window.removeEventListener('keyup', this.keyUp)
    window.removeEventListener('resize', this.updateCanvasSize)
    cancelAnimationFrame(this.animationFrame)
  },
  methods: {
    async loadTiles() {
      // Carica la tilemap
      this.tilemapImage = new Image()
      this.tilemapImage.src = new URL(`./assets/tilemap.png`, import.meta.url).href
      await this.tilemapImage.decode()
    },
    async loadCharacterSprite() {
      // Carica la sprite del personaggio
      this.sprite = new Image()
      this.sprite.src = new URL(`./assets/sprite.png`, import.meta.url).href
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
      this.objectTiles = []

      // Calcola il numero di tile necessari per riempire il canvas
      const tilesX = Math.ceil(this.canvasSize.width / this.tileSize)
      const tilesY = Math.ceil(this.canvasSize.height / this.tileSize)
      
      // Genera una mappa casuale
      for (let y = 0; y < tilesY; y++) {
        const row = []
        const objectRow = []
        for (let x = 0; x < tilesX; x++) {
          // Determina il tipo di tile da generare
          const rand = Math.random()
          let tileArray
          if (rand < 0.01) { // 1% probabilità di oggetti fisici
            tileArray = this.availableTiles.objects
            const tileIndex = tileArray[Math.floor(Math.random() * tileArray.length)]
            objectRow.push(tileIndex)
            row.push(this.availableTiles.ground[Math.floor(Math.random() * this.availableTiles.ground.length)])
          } else if (rand < 0.11) { // 10% probabilità di decorazioni
            tileArray = this.availableTiles.decoration
            const randomIndex = Math.floor(Math.random() * tileArray.length)
            row.push(tileArray[randomIndex])
            objectRow.push(-1)
          } else { // 80% probabilità di terreno
            tileArray = this.availableTiles.ground
            const randomIndex = Math.floor(Math.random() * tileArray.length)
            row.push(tileArray[randomIndex])
            objectRow.push(-1)
          }
        }
        this.tiles.push(row)
        this.objectTiles.push(objectRow)
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
        newX = Math.max(0, Math.min(newX, this.canvasSize.width - this.player.width))
        newY = Math.max(0, Math.min(newY, this.canvasSize.height - this.player.height))

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
    drawBackground() {    
      // Pulisci il canvas di background
      this.backgroundCtx.clearRect(0, 0, this.canvasSize.width, this.canvasSize.height)

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
    drawObjects() {
      // Pulisci il canvas degli oggetti
      this.objectsCtx.clearRect(0, 0, this.canvasSize.width, this.canvasSize.height)

      // Disegna gli oggetti
      for (let y = 0; y < this.objectTiles.length; y++) {
        for (let x = 0; x < this.objectTiles[y].length; x++) {
          const tileIndex = this.objectTiles[y][x]
          if (tileIndex !== -1) {
            const { x: srcX, y: srcY } = this.getTileCoordinates(tileIndex)
            this.objectsCtx.drawImage(
              this.tilemapImage,
              srcX,
              srcY,
              this.tileSize,
              this.tileSize,
              x * this.tileSize,
              y * this.tileSize,
              this.tileSize,
              this.tileSize
            )
          }
        }
      }
    },
    drawSprite() {
      // Pulisci il canvas del gioco
      this.gameCtx.clearRect(0, 0, this.canvasSize.width, this.canvasSize.height)

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
    updateCanvasSize() {
      // Imposta le dimensioni del canvas in base alla dimensione della viewport
      this.setCanvasSize()

      // Se i canvas esistono, aggiorna i context
      if (this.gameCtx && this.backgroundCtx && this.objectsCtx) {
        // Aggiorna le dimensioni dei canvas
        this.changeCanvasSize(this.gameCtx)
        this.changeCanvasSize(this.backgroundCtx)
        this.changeCanvasSize(this.objectsCtx)

        // Rigenera la mappa con le nuove dimensioni
        this.generateRandomMap()
        // Ridisegna lo sfondo nel prossimo tick per essere sicuri di avere la sprite disponibile nel render loop del browser
        requestAnimationFrame(this.drawBackground)
        requestAnimationFrame(this.drawObjects)
        // Centra il personaggio
        this.centerPlayer()
      }
    },
    getViewportSize() {
      return {
        width: Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0),
        height: Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)
      }
    },
    setCanvasSize() {
      // Ottieni le dimensioni della viewport
      const {width: vw, height: vh} = this.getViewportSize()

      // Se la viewport é più alta che larga (modalità portrait)
      const isPortrait = vh > vw
      
      // In modalità portrait invertiamo width e height del gioco
      const newSize = {
        width: isPortrait ? this.gameSize.height : this.gameSize.width,
        height: isPortrait ? this.gameSize.width : this.gameSize.height
      }
      
      this.canvasSize = newSize
    },
    changeCanvasSize(ctx) {
      ctx.canvas.width = this.canvasSize.width
      ctx.canvas.height = this.canvasSize.height
    },
    centerPlayer() {
      // Calcola il centro del canvas
      this.player.x = (this.canvasSize.width - this.player.width) / 2
      this.player.y = (this.canvasSize.height - this.player.height) / 2
    },
  }
}
</script>

<style>
.game-container {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

canvas {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

#backgroundCanvas {
  z-index: 1;
}

#objectsCanvas {
  z-index: 2;
}

#gameCanvas {
  z-index: 3;
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
