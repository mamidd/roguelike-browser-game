<template>
  <div class="game-container">
    <div v-if="showStartingScreen" class="overlay" :style="{ width: canvasSize.width + 'px', height: canvasSize.height + 'px' }">
      <div class="overlay-message align-left">
        <span>Benvenuto nel gioco Roguelike</span><br><br>
        <span>Prendi tutti i materiali per completare il gioco</span><br><br><br>
        <span>Per muoverti premi W A S D</span><br>
        <span>Per raccogliere gli oggetti premi E</span><br>
        <span>Per aprire o chiudere l'inventario premi I</span><br>
      </div>
      <button class="start-button" @click="startGame">Inizia</button>
    </div>
    <canvas id="backgroundCanvas" ref="backgroundCanvas" :width="canvasSize.width" :height="canvasSize.height"></canvas>
    <canvas id="objectsCanvas" ref="objectsCanvas" :width="canvasSize.width" :height="canvasSize.height"></canvas>
    <canvas id="gameCanvas" ref="gameCanvas" :width="canvasSize.width" :height="canvasSize.height"></canvas>
    <div v-if="showGameOver" class="overlay completion-overlay" :style="{ width: canvasSize.width + 'px', height: canvasSize.height + 'px' }">
      <div class="overlay-message align-center">Complimenti! Hai raccolto tutti i materiali</div>
      <button class="start-button" @click="startGame">Ricomincia</button>
    </div>
    <div class="inventory-panel" v-show="showInventory" :style="{ transform: 'translate(-' + canvasSize.width/2 + 'px, -' + canvasSize.height/2 + 'px)' }">
      <div class="inventory-row">
        <div class="inventory-text"><strong>INVENTARIO ( premi i )</strong></div>
      </div>
      <div class="inventory-row">
        <canvas ref="icon1" :width="tileSize" :height="tileSize" class="inventory-icon reset-positioning"></canvas>
        <div class="inventory-text">Alberi gialli: {{ objectsGathered.yellowTrees }}</div>
      </div>
      <div class="inventory-row">
        <canvas ref="icon2" :width="tileSize" :height="tileSize" class="inventory-icon reset-positioning"></canvas>
        <div class="inventory-text">Alberi verdi: {{ objectsGathered.greenTrees }}</div>
      </div>
      <div class="inventory-row">
        <canvas ref="icon3" :width="tileSize" :height="tileSize" class="inventory-icon reset-positioning"></canvas>
        <div class="inventory-text">Funghi: {{ objectsGathered.mushrooms }}</div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'App',
  data() {
    return {
      showInventory: true,
      showStartingScreen: true,
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
        height: 640
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
      totalObjects: 0,
      objectsGathered: {
        yellowTrees: 0,
        greenTrees: 0,
        mushrooms: 0
      },
      availableTiles: {
        ground: [0, 1, 2],
        decoration: [39,40,41,42,43],
        objects: [27,28,29],
        traps: [105]
      },
      keys: {
        w: false,
        a: false,
        s: false,
        d: false,
        e: false,
        i: false
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
      objectsCtx: null,
      showGameOver: false,
    }
  },
  computed: {
    frameInterval() {
      return 1000/this.characterAnimationFps
    },
  },
  async mounted() {
    // Initialize canvas and load assets
    this.initializeCanvas()
    await this.loadAssets()

    // Set initial canvas size
    this.setCanvasSize()
    
    // Add event listeners
    this.addEventListner()
  },
  beforeUnmount() {
    this.handleGameOver()

    // Rimuovi i listener degli eventi
    this.removeEventListner()
  },
  methods: {
    async loadAssets() {
      // Carica gli assets
      await this.loadTiles()
      await this.loadCharacterSprite()
      this.drawInfoIcons()
    },
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
    drawInfoIcons() {
      for (let i = 1; i <= 3; i++) {
        const canvas = this.$refs['icon' + i]
        if (canvas) {
          const ctx = canvas.getContext('2d')
          const tileIndex = this.availableTiles.objects[i - 1]
          const { x: sourceX, y: sourceY } = this.getTileCoordinates(tileIndex)
          
          ctx.drawImage(
            this.tilemapImage,
            sourceX,
            sourceY,
            this.tileSize,
            this.tileSize,
            0,
            0,
            16,
            16
          )
        }
      }
    },
    initializeCanvas() {
      // Inizializza i contesti dei canvas
      const gameCanvas = this.$refs.gameCanvas
      const backgroundCanvas = this.$refs.backgroundCanvas
      const objectsCanvas = this.$refs.objectsCanvas
      this.gameCtx = gameCanvas.getContext('2d')
      this.backgroundCtx = backgroundCanvas.getContext('2d')
      this.objectsCtx = objectsCanvas.getContext('2d')
    },
    addEventListner() {
      // Event listeners per i tasti
      window.addEventListener('keydown', this.keyDown)
      window.addEventListener('keyup', this.keyUp)
      window.addEventListener('resize', this.updateCanvasSize)
    },
    removeEventListner() {
      // Rimuove gli event listener
      window.removeEventListener('keydown', this.keyDown)
      window.removeEventListener('keyup', this.keyUp)
      window.removeEventListener('resize', this.updateCanvasSize)
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
    isCollidingWithObjects(x, y) {
      const { tileX, tileY } = this.getCollidingObject(x, y)
      return tileX !== -1 && tileY !== -1
    },
    getObjectsCollidingArea(x , y) {
      // Calcola l'area dei piedi (2 tile centrali della quarta riga)
      const feetX = x + this.tileSize  // salta il primo tile
      const feetY = y + this.tileSize * 3  // prendi l'ultima riga
      const feetWidth = this.tileSize * 2  // larghezza di 2 tile
      const feetHeight = this.tileSize  // altezza di 1 tile

      // Converti le coordinate dei piedi in coordinate della griglia per il controllo delle collisioni con oggetti
      const startTileX = Math.floor(feetX / this.tileSize)
      const startTileY = Math.floor(feetY / this.tileSize)
      const endTileX = Math.floor((feetX + feetWidth) / this.tileSize)
      const endTileY = Math.floor((feetY + feetHeight) / this.tileSize)

      // Log per DEBUG
      // console.log('NewX ' + x, 'NewY ' + y, 'FeetX ' + feetX, 'FeetY ' + feetY, 'startTileX ' + startTileX, 'startTileY ' + startTileY, 'endTileX ' + endTileX, 'endTileY ' + endTileY)

      return {startTileX, startTileY, endTileX, endTileY}
    },
    getCollidingObject(x, y) {
      const { startTileX, startTileY, endTileX, endTileY } = this.getObjectsCollidingArea(x, y)

      // Controlla tutte le tile che intersecano i piedi del player
      for (let tileY = startTileY; tileY <= endTileY; tileY++) {
        for (let tileX = startTileX; tileX <= endTileX; tileX++) {
          const tileValue = this.objectTiles[tileY][tileX]
          // Verifica che il tile non sia vuoto (-1) e sia un oggetto collezionabile
          if (tileValue !== -1 && this.availableTiles.objects.includes(tileValue)) {
            return { tileX, tileY }
          }
        }
      }

      return { tileX: -1, tileY: -1 }
    },
    isCollidingWithBorderCanvas(x, y) {
      // Controlla se le colonne centrali del player sono fuori dalla mappa
      const playerCenterX = x + this.tileSize  // inizio delle colonne centrali
      const playerFullHeight = 4 * this.tileSize  // altezza totale del player
      const centerTileStartX = Math.floor(playerCenterX / this.tileSize)
      const centerTileEndX = Math.floor((playerCenterX + this.tileSize * 2) / this.tileSize)
      const tileStartY = Math.floor(y / this.tileSize)
      const tileEndY = Math.floor((y + playerFullHeight) / this.tileSize)

      // Controlla se le colonne centrali sono fuori dalla mappa
      if (tileStartY < 0 || tileEndY >= this.objectTiles.length || 
          centerTileStartX < 0 || centerTileEndX >= this.objectTiles[0].length) {
        return true
      }

      return false
    },
    removeObject(tileX, tileY) {
      if(tileX === -1 || tileY === -1) return

      // Ottieni il tipo di oggetto prima di rimuoverlo
      const objectType = this.objectTiles[tileY][tileX]

      // Incrementa il contatore appropriato in base al tipo di oggetto
      switch(objectType) {
        case this.availableTiles.objects[0]: // 27 - Albero giallo
          this.objectsGathered.yellowTrees++
          break
        case this.availableTiles.objects[1]: // 28 - Albero verde
          this.objectsGathered.greenTrees++
          break
        case this.availableTiles.objects[2]: // 29 - Fungo
          this.objectsGathered.mushrooms++
          break
      }

      // Rimuovi l'oggetto dal canvas degli oggetti
      this.clearObjectTile(tileX, tileY)

      // Rimuovi l'oggetto quando c'è una collisione
      this.objectTiles[tileY][tileX] = -1

      // Decrementa il contatore degli oggetti
      this.totalObjects--

      // Controlla se tutti gli oggetti sono stati rimossi
      if (this.totalObjects === 0) {
        requestAnimationFrame(() => {
          this.handleGameOver()
        })
      }
    },
    clearObjectTile(tileX, tileY) {
      // Pulisci il tile specifico nel canvas degli oggetti
      this.objectsCtx.clearRect(
        tileX * this.tileSize,
        tileY * this.tileSize,
        this.tileSize,
        this.tileSize
      )
    },
    generateRandomMap() {
      // Pulisce la mappa esistente
      this.tiles = []
      this.objectTiles = []
      this.totalObjects = 0

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
          
          if (rand < 0.003 && y > 3) { // 0.3% probabilità di trappole dopo la terza riga
            tileArray = this.availableTiles.traps
            const tileIndex = tileArray[Math.floor(Math.random() * tileArray.length)]
            objectRow.push(tileIndex)
            row.push(this.availableTiles.ground[Math.floor(Math.random() * this.availableTiles.ground.length)])
          } else if (rand < 0.013 && y > 3) { // 1% probabilità di oggetti fisici dopo la terza riga
            tileArray = this.availableTiles.objects
            const tileIndex = tileArray[Math.floor(Math.random() * tileArray.length)]
            objectRow.push(tileIndex)
            this.totalObjects++
            row.push(this.availableTiles.ground[Math.floor(Math.random() * this.availableTiles.ground.length)])
          } else if (rand < 0.113) { // 10% probabilità di decorazioni
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
          break
        case 'a':
          this.keys.a = true
          break
        case 's':
          this.keys.s = true
          break
        case 'd':
          this.keys.d = true
          break
        case 'e':
          this.keys.e = true
          this.actionOnNearestCollision()
          break
        case 'i':
          this.keys.i = true
          this.showInventory = !this.showInventory
          break
      }
    },
    keyUp(e) {
      switch(e.key.toLowerCase()) {
        case 'w':
          this.keys.w = false
          break
        case 'a':
          this.keys.a = false
          break
        case 's':
          this.keys.s = false
          break
        case 'd':
          this.keys.d = false
          break
        case 'e':
          this.keys.e = false
          break
        case 'i':
          this.keys.i = false
          break
      }
    },
    actionOnNearestCollision() {
      const { newX, newY } = this.getNewPosition()
      const { tileX, tileY } = this.getCollidingObject(newX, newY)
      this.removeObject(tileX, tileY)
    },
    movePlayer() {
      this.player.moving = this.isMoving(this.keys)
      this.setLastDirection(this.keys)
      const { newX, newY } = this.getNewPosition()

      if(this.player.moving) {
        // Applica il movimento solo se non ci sono collisioni
        if (!this.isCollidingWithBorderCanvas(newX, newY) && !this.isCollidingWithObjects(newX, newY)) {
          this.setNewPosition(newX, newY)
        } else {
          // Se c'è una collisione, il player si ferma
          this.player.moving = false
        }
      }

      // Aggiorna l'animazione del personaggio
      this.setAnimationType(this.player.lastDirection, this.player.moving)
    },
    isMoving(keys) {
      return keys.w || keys.s || keys.a || keys.d
    },
    setLastDirection(keys) {
      if (keys.w) {
        this.player.lastDirection = 'up'
      } else if (keys.s) {
        this.player.lastDirection = 'down'
      } else if (keys.a) {
        this.player.lastDirection = 'left'
      } else if (keys.d) {
        this.player.lastDirection = 'right'
      }
    },
    setNewPosition(newX, newY) {
      this.player.x = newX
      this.player.y = newY
    },
    getNewPosition() {
      let newX = this.player.x
      let newY = this.player.y

      switch(this.player.lastDirection) {
        case 'up':
          newY -= this.player.speed
          break
        case 'left':
          newX -= this.player.speed
          break
        case 'down':
          newY += this.player.speed
          break
        case 'right':
          newX += this.player.speed
          break
      }
      return { newX, newY }
    },
    setAnimationType(lastDirection, isMoving) {
      switch(lastDirection) {
        case 'up':
          this.player.frameY = isMoving ? 8 : 12
          break
        case 'left':
          this.player.frameY = isMoving ? 9 : 13
          break
        case 'down':
          this.player.frameY = isMoving ? 10 : 14
          break
        case 'right':
          this.player.frameY = isMoving ? 11 : 15
          break
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
    drawObjectsCollidingArea() {
      // Prende le nuove coordinate in base all'ultima direzione di movimento
      const { newX: x, newY: y } = this.getNewPosition()

      // Calcola le celle della mappa per l'area di collisione
      const { startTileX, startTileY, endTileX, endTileY } = this.getObjectsCollidingArea(x, y)

      // Disegna l'area di collisione
      this.gameCtx.fillStyle = 'rgba(255, 255, 0, 0.3)'
      this.gameCtx.fillRect(
        startTileX * this.tileSize, 
        startTileY * this.tileSize, 
        (endTileX - startTileX + 1) * this.tileSize, 
        (endTileY - startTileY + 1) * this.tileSize
      )
    },
    drawFeetArea() {
      // Disegna il bordo della hitbox dei piedi
      this.gameCtx.strokeStyle = 'red'
      this.gameCtx.lineWidth = 1
      this.gameCtx.strokeRect(
        this.player.x + this.tileSize,  // x + 16 (salta il primo tile)
        this.player.y + this.tileSize * 3,  // y + 48 (prendi l'ultima riga)
        this.tileSize * 2,  // larghezza di 2 tile (32px)
        this.tileSize  // altezza di 1 tile (16px)
      )
    },
    drawSprite() {
      // Pulisci il canvas del gioco
      this.gameCtx.clearRect(0, 0, this.canvasSize.width, this.canvasSize.height)

      // Disegna l'area dei piedi
      this.drawFeetArea()

      // Disegna l'area in cui calcola le collisioni (per DEBUG)
      this.drawObjectsCollidingArea()

      // Disegna il bordo della hitbox del personaggio
      this.gameCtx.strokeStyle = 'black'
      this.gameCtx.lineWidth = 2
      this.gameCtx.strokeRect(this.player.x, this.player.y, this.player.width, this.player.height)

      // Disegna il personaggio
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
    handleGameOver() {
      // Mostra l'overlay di completamento
      this.showGameOver = true
      
      // Stoppa l'animazione
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame)
        this.animationFrame = null
      }
    
      // Resetta i tasti premuti
      this.keys = {
        w: false,
        a: false,
        s: false,
        d: false,
        e: false,
        i: false
      }
      
      // Ferma il movimento del player
      this.player.moving = false
    },
    resetInventory() {
      // Resetta l'inventario
      this.objectsGathered = {
        yellowTrees: 0,
        greenTrees: 0,
        mushrooms: 0
      }
    },
    startGame() {
      this.showStartingScreen = false
      this.showGameOver = false
      this.resetInventory()
      this.updateCanvasSize()
      this.animate(0)
    }
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

.overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(0, 0, 0);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 99;
}

.completion-overlay {
  background-color: rgba(0, 0, 0, 0.7);
}

.overlay-message {
  color: white;
  font-size: 24px;
  font-weight: bold;
}

.align-center {
  text-align: center;
}

.align-left {
  text-align: left;
}

.start-button {
  margin-top: 30px;
  padding: 15px 40px;
  font-size: 20px;
  font-weight: bold;
  color: white;
  background-color: #4CAF50;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.start-button:hover {
  background-color: #45a049;
}



.inventory-panel {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 250px;
  background-color: rgba(0, 0, 0, 0.7);
  padding: 20px;
  color: white;
  font-size: 16px;
  margin-left: auto;
  z-index: 4;
}

.inventory-row {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.inventory-icon {
  margin-right: 10px;
  image-rendering: pixelated;
}

/* Reset CSS per rimuovere margini e padding di default */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.reset-positioning {
  position: relative;
  top: auto;
  left: auto;
  transform: none;
}

body {
  overflow: hidden;
}
</style>