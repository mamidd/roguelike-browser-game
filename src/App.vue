<template>
  <div class="game-container">
    <overlay-screen 
      :canvas-width="canvasSize.width"
      :canvas-height="canvasSize.height"
      :game-status="gameStatus"
      @start-game="startGame">
    </overlay-screen>
    <map-canvas ref="mapCanvas"></map-canvas>
    <inventory ref="inventory"
      :canvas-width="canvasSize.width"
      :canvas-height="canvasSize.height">
    </inventory>
  </div>
</template>

<script>
import OverlayScreen from './components/OverlayScreen.vue'
import Inventory from './components/Inventory.vue'
import MapCanvas from './components/MapCanvas.vue'
import { GameStatuses, TileMapDimension, AvailableTiles } from './utils/constants'
import { ref } from 'vue'
import { usePlayer } from './composables/usePlayer'

export default {
  name: 'App',
  components: {
    OverlayScreen,
    Inventory,
    MapCanvas
  },
  emit: ['start-game'],
  setup() {
    const { player, centerPlayer } = usePlayer()

    return {
      mapCanvas: ref(null),
      inventory: ref(null),
      player,
      centerPlayer,
      TileMapDimension,
      AvailableTiles
    }
  },
  data() {
    return {
      keys: {
        w: false,
        a: false,
        s: false,
        d: false,
        e: false
      },
      animationFrames: {
        walk: 9,
        idle: 6
      },
      animationFrame: null,
      lastTime: 0,
      characterAnimationFps: 12,
      frameTimer: 0,
      gameStatus: GameStatuses.TOBESTARTED
    }
  },
  computed: {
    frameInterval() {
      return 1000/this.characterAnimationFps
    },
    canvasSize() {
      return {
        width: this.mapCanvas ? this.mapCanvas.canvasSize.width : 0,
        height: this.mapCanvas? this.mapCanvas.canvasSize.height : 0
      }
    }
  },
  async mounted() {
    this.mapCanvas.updateCanvasSize()
    this.addEventListner()
  },
  beforeUnmount() {
    this.handleGameOver()

    // Remove event listeners
    this.removeEventListner()
  },
  methods: {
    addEventListner() {
      // Event listeners per i tasti
      window.addEventListener('keydown', this.keyDown)
      window.addEventListener('keyup', this.keyUp)
    },
    removeEventListner() {
      // Rimuove gli event listener
      window.removeEventListener('keydown', this.keyDown)
      window.removeEventListener('keyup', this.keyUp)
    },
    isCollidingWithObjects(x, y) {
      const { tileX, tileY } = this.getCollidingObject(x, y)
      return tileX !== -1 && tileY !== -1
    },
    getObjectType(tileX, tileY) {
      if(tileX === -1 && tileY === -1) return 'none'

      if(this.AvailableTiles.objects.includes(this.mapCanvas.objectTiles[tileY][tileX])) return 'object'

      if(this.AvailableTiles.traps.includes(this.mapCanvas.objectTiles[tileY][tileX])) return 'trap'

      return 'none'
    },
    getObjectsCollidingArea(x , y) {
      // Calcola l'area dei piedi (2 tile centrali della quarta riga)
      const feetX = x + this.TileMapDimension.tileSize  // salta il primo tile
      const feetY = y + this.TileMapDimension.tileSize * 3  // prendi l'ultima riga
      const feetWidth = this.TileMapDimension.tileSize * 2  // larghezza di 2 tile
      const feetHeight = this.TileMapDimension.tileSize  // altezza di 1 tile

      // Converti le coordinate dei piedi in coordinate della griglia per il controllo delle collisioni con oggetti
      const startTileX = Math.floor(feetX / this.TileMapDimension.tileSize)
      const startTileY = Math.floor(feetY / this.TileMapDimension.tileSize)
      const endTileX = Math.floor((feetX + feetWidth) / this.TileMapDimension.tileSize)
      const endTileY = Math.floor((feetY + feetHeight) / this.TileMapDimension.tileSize)

      // Log per DEBUG
      // console.log('NewX ' + x, 'NewY ' + y, 'FeetX ' + feetX, 'FeetY ' + feetY, 'startTileX ' + startTileX, 'startTileY ' + startTileY, 'endTileX ' + endTileX, 'endTileY ' + endTileY)

      return {startTileX, startTileY, endTileX, endTileY}
    },
    getCollidingObject(x, y) {
      const { startTileX, startTileY, endTileX, endTileY } = this.getObjectsCollidingArea(x, y)

      // Controlla tutte le tile che intersecano i piedi del player
      for (let tileY = startTileY; tileY <= endTileY; tileY++) {
        for (let tileX = startTileX; tileX <= endTileX; tileX++) {

          if(tileX > this.mapCanvas.objectTiles[0].length - 1 || tileY > this.mapCanvas.objectTiles.length - 1) continue

          const tileValue = this.mapCanvas.objectTiles[tileY][tileX]
          // Verifica che il tile non sia vuoto (-1)
          if (tileValue !== -1) {
            return { tileX, tileY }
          }
        }
      }

      return { tileX: -1, tileY: -1 }
    },
    isCollidingWithBorderCanvas(x, y) {
      // Controlla se le colonne centrali del player sono fuori dalla mappa
      const playerCenterX = x + this.TileMapDimension.tileSize  // inizio delle colonne centrali
      const playerFullHeight = 4 * this.TileMapDimension.tileSize  // altezza totale del player
      const centerTileStartX = Math.floor(playerCenterX / this.TileMapDimension.tileSize)
      const centerTileEndX = Math.floor((playerCenterX + this.TileMapDimension.tileSize * 2) / this.TileMapDimension.tileSize)
      const tileStartY = Math.floor(y / this.TileMapDimension.tileSize)
      const tileEndY = Math.floor((y + playerFullHeight) / this.TileMapDimension.tileSize)

      // Controlla se le colonne centrali sono fuori dalla mappa
      if (tileStartY < 0 || tileEndY >= this.mapCanvas.objectTiles.length || 
          centerTileStartX < 0 || centerTileEndX >= this.mapCanvas.objectTiles[0].length) {
        return true
      }

      return false
    },
    removeObject(tileX, tileY) {
      if ( this.getObjectType(tileX, tileY) === 'trap' || this.getObjectType(tileX, tileY) === 'none' ) return 

      // Ottieni il tipo di oggetto prima di rimuoverlo
      const object = this.mapCanvas.objectTiles[tileY][tileX]

      // Incrementa il contatore appropriato in base al tipo di oggetto
      switch(object) {
        case this.AvailableTiles.objects[0]: // 27 - Albero giallo
          this.inventory.objectsGathered.yellowTrees++
          break
        case this.AvailableTiles.objects[1]: // 28 - Albero verde
          this.inventory.objectsGathered.greenTrees++
          break
        case this.AvailableTiles.objects[2]: // 29 - Fungo
          this.inventory.objectsGathered.mushrooms++
          break
      }

      // Rimuovi l'oggetto dal canvas degli oggetti
      this.mapCanvas.clearObjectTile(tileX, tileY)

      // Rimuovi l'oggetto quando c'è una collisione
      this.mapCanvas.objectTiles[tileY][tileX] = -1

      // Decrementa il contatore degli oggetti
      this.mapCanvas.totalObjects--

      // Controlla se tutti gli oggetti sono stati rimossi
      if (this.mapCanvas.totalObjects === 0) {
        this.throwGameComplete()
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
        // Controlla le collisioni con oggetti
        const { tileX, tileY } = this.getCollidingObject(newX, newY)
        const objectType = this.getObjectType(tileX, tileY)
        
        // Controlla le collisioni con i bordi
        const hasBorderCollision = this.isCollidingWithBorderCanvas(newX, newY)
        
        // Se non ci sono collisioni, muovi il player
        if (!hasBorderCollision && objectType === 'none') {
          this.setNewPosition(newX, newY)
        } else {
          // Se c'è una collisione, il player si ferma
          this.player.moving = false
          
          // Se la collisione è con una trappola, gestisci il game over
          if (objectType === 'trap') {
            this.throwGameFailed()
          }
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
      this.player.position.x = newX
      this.player.position.y = newY
    },
    getNewPosition() {
      let newX = this.player.position.x
      let newY = this.player.position.y

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
      this.mapCanvas.drawSprite(this.player.position.x, this.player.position.y, this.player.frameX, this.player.frameY)
      this.animationFrame = requestAnimationFrame(this.animate)
    },
    throwGameFailed() {
      this.gameStatus = GameStatuses.FAILED
      requestAnimationFrame(() => {
        this.handleGameOver()
      })
    },
    throwGameComplete() {
      this.gameStatus = GameStatuses.COMPLETED
      requestAnimationFrame(() => {
        this.handleGameOver()
      })
    },  
    handleGameOver() {     
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
      
      // Resetta il movimento del player
      this.player.moving = false
      this.player.lastDirection = 'down'
    },
    startGame() {      
      this.gameStatus = GameStatuses.PLAYING
      this.inventory.resetInventory()
      this.mapCanvas.updateCanvasSize()
      this.centerPlayer(this.canvasSize.width, this.canvasSize.height)
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

.align-center {
  text-align: center;
}

.align-left {
  text-align: left;
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