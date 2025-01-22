<template>
    <div>
        <canvas id="backgroundCanvas" ref="backgroundCanvas" :width="canvasSize.width" :height="canvasSize.height"></canvas>
        <canvas id="objectsCanvas" ref="objectsCanvas" :width="canvasSize.width" :height="canvasSize.height"></canvas>
        <canvas id="gameCanvas" ref="gameCanvas" :width="canvasSize.width" :height="canvasSize.height"></canvas>
    </div>
</template>

<script setup>
    import { onMounted, onBeforeUnmount, ref, defineExpose } from 'vue';
    import { GameSize, TileMapDimension, AvailableTiles, PlayerSize } from '../utils/constants';

    defineOptions({
        name: 'MapCanvas'
    });

    var canvasSize = ref({
        width: GameSize.width,
        height: GameSize.height
    })

    const gameCanvas = ref(null)
    const backgroundCanvas = ref(null)
    const objectsCanvas = ref(null)

    const context = {
        game: null,
        background: null,
        objects: null
    }

    var tileMapImage = null
    var spriteImage = null

    var tiles = []
    var objectTiles = ref([])
    var totalObjects = ref(0)

    onMounted(async () => {
        initializeCanvas()
        await loadAssets()
        setCanvasSize()

        addEventListner()
    })

    onBeforeUnmount(() => {
        removeEventListner()
    })

    const initializeCanvas = () => {
        context.game = gameCanvas.value.getContext('2d')
        context.background = backgroundCanvas.value.getContext('2d')
        context.objects = objectsCanvas.value.getContext('2d')
    }

    const loadAssets = async () => {
        // Carica gli assets
        await loadTiles()
        await loadCharacterSprite()
    }

    const loadTiles = async () => {
      // Carica la tilemap
      tileMapImage = new Image()
      tileMapImage.src = new URL(`../assets/tilemap.png`, import.meta.url).href
      await tileMapImage.decode()
    }

    const loadCharacterSprite = async () => {
      // Carica la sprite del personaggio
      spriteImage = new Image()
      spriteImage.src = new URL(`../assets/sprite.png`, import.meta.url).href
      await spriteImage.decode()
    }

    // TODO Potrebbe aver senso spostarlo sul padre
    const setCanvasSize = () => {
      // Ottieni le dimensioni della viewport
      const {width: vw, height: vh} = getViewportSize()

      // Se la viewport é più alta che larga (modalità portrait)
      const isPortrait = vh > vw
      
      // In modalità portrait invertiamo width e height del gioco
      const newSize = {
        width: isPortrait ? GameSize.height : GameSize.width,
        height: isPortrait ? GameSize.width : GameSize.height
      }
      
      canvasSize.value = newSize
    }

    // TODO Può essere un composable
    const getViewportSize = () => {
      return {
        width: Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0),
        height: Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)
      }
    }

    const addEventListner = () => {
      window.addEventListener('resize', updateCanvasSize)
    } 

    const removeEventListner = () => {
      window.removeEventListener('resize', updateCanvasSize)
    } 

    const updateCanvasSize = () => {
      // Imposta le dimensioni del canvas in base alla dimensione della viewport
      setCanvasSize()

      // Se i canvas esistono, aggiorna i context
      if (context.game && context.background && context.objects) {
        // Aggiorna le dimensioni dei canvas
        changeCanvasSize(context.game)
        changeCanvasSize(context.background)
        changeCanvasSize(context.objects)

        // Rigenera la mappa con le nuove dimensioni
        generateRandomMap()

        // Ridisegna lo sfondo nel prossimo tick per essere sicuri di avere la sprite disponibile nel render loop del browser
        requestAnimationFrame(drawBackground)
        requestAnimationFrame(drawObjects)
        // TODO Centra il personaggio (da implementare qui dentro)
        // this.centerPlayer()
      }
    }

    const changeCanvasSize = (ctx) => {
      ctx.canvas.width = canvasSize.value.width
      ctx.canvas.height = canvasSize.value.height
    }

    const generateRandomMap = () => {
      // Pulisce la mappa esistente
      tiles = []
      objectTiles.value = []
      totalObjects.value = 0

      // Calcola il numero di tile necessari per riempire il canvas
      const tilesX = Math.ceil(canvasSize.value.width / TileMapDimension.tileSize)
      const tilesY = Math.ceil(canvasSize.value.height / TileMapDimension.tileSize)
      
      // Genera una mappa casuale
      for (let y = 0; y < tilesY; y++) {
        const row = []
        const objectRow = []
        for (let x = 0; x < tilesX; x++) {
          // Determina il tipo di tile da generare
          const rand = Math.random()
          let tileArray
          
          if (rand < 0.003 && y > 3) { // 0.3% probabilità di trappole dopo la terza riga
            tileArray = AvailableTiles.traps
            const tileIndex = tileArray[Math.floor(Math.random() * tileArray.length)]
            objectRow.push(tileIndex)
            row.push(AvailableTiles.ground[Math.floor(Math.random() * AvailableTiles.ground.length)])
          } else if (rand < 0.013 && y > 3) { // 1% probabilità di oggetti fisici dopo la terza riga
            tileArray = AvailableTiles.objects
            const tileIndex = tileArray[Math.floor(Math.random() * tileArray.length)]
            objectRow.push(tileIndex)
            totalObjects.value++
            row.push(AvailableTiles.ground[Math.floor(Math.random() * AvailableTiles.ground.length)])
          } else if (rand < 0.113) { // 10% probabilità di decorazioni
            tileArray = AvailableTiles.decoration
            const randomIndex = Math.floor(Math.random() * tileArray.length)
            row.push(tileArray[randomIndex])
            objectRow.push(-1)
          } else { // 80% probabilità di terreno
            tileArray = AvailableTiles.ground
            const randomIndex = Math.floor(Math.random() * tileArray.length)
            row.push(tileArray[randomIndex])
            objectRow.push(-1)
          }
        }
        tiles.push(row)
        objectTiles.value.push(objectRow)
      }
    }

    const drawBackground = () => {    
      // Pulisci il canvas di background
      context.background.clearRect(0, 0, canvasSize.value.width, canvasSize.value.height)

      // Disegna la mappa di tile sul canvas di background
      for (let y = 0; y < tiles.length; y++) {
        for (let x = 0; x < tiles[y].length; x++) {
          const tileIndex = tiles[y][x]
          const { x: sourceX, y: sourceY } = getTileCoordinates(tileIndex)
          
          context.background.drawImage(
            tileMapImage,
            sourceX,
            sourceY,
            TileMapDimension.tileSize,
            TileMapDimension.tileSize,
            x * TileMapDimension.tileSize,
            y * TileMapDimension.tileSize,
            TileMapDimension.tileSize,
            TileMapDimension.tileSize
          )
        }
      }
    }

    const drawObjects = () => {
      // Pulisci il canvas degli oggetti
      context.objects.clearRect(0, 0, canvasSize.value.width, canvasSize.value.height)

      // Disegna gli oggetti
      for (let y = 0; y < objectTiles.value.length; y++) {
        for (let x = 0; x < objectTiles.value[y].length; x++) {
          const tileIndex = objectTiles.value[y][x]
          if (tileIndex !== -1) {
            const { x: srcX, y: srcY } = getTileCoordinates(tileIndex)

            context.objects.drawImage(
              tileMapImage,
              srcX,
              srcY,
              TileMapDimension.tileSize,
              TileMapDimension.tileSize,
              x * TileMapDimension.tileSize,
              y * TileMapDimension.tileSize,
              TileMapDimension.tileSize,
              TileMapDimension.tileSize
            )
          }
        }
      }
    }

    // TODO Può essere un composable
    const getTileCoordinates = (tileIndex) => {
        // Calcola le coordinate x,y nella tilemap
        const tileWithBorder = TileMapDimension.tileSize + TileMapDimension.tileBorder
        // Non aggiungere il bordo iniziale, solo tra i tile
        const x = (tileIndex % TileMapDimension.tilesPerRow) * tileWithBorder
        const y = Math.floor(tileIndex / TileMapDimension.tilesPerRow) * tileWithBorder
        return { x, y }
    }

    const drawSprite = (playerX, playerY, playerFrameX, playerFrameY) => {
      // Pulisci il canvas del gioco
      context.game.clearRect(0, 0, canvasSize.value.width, canvasSize.value.height)

      // Disegna l'area dei piedi
      drawFeetArea(playerX, playerY)

      // TODO Disegna l'area in cui calcola le collisioni (per DEBUG) (da implementare)
      //this.drawObjectsCollidingArea()

      // Disegna il bordo della hitbox del personaggio
      context.game.strokeStyle = 'black'
      context.game.lineWidth = 2
      context.game.strokeRect(playerX, playerY, PlayerSize.width, PlayerSize.height)

      // Disegna il personaggio
      context.game.drawImage(
        spriteImage,
        playerFrameX * PlayerSize.width,
        playerFrameY * PlayerSize.height,
        PlayerSize.width,
        PlayerSize.height,
        playerX,
        playerY,
        PlayerSize.width,
        PlayerSize.height
      )
    }

    const drawFeetArea = (playerX, playerY) => {
      // Disegna il bordo della hitbox dei piedi
      context.game.strokeStyle = 'red'
      context.game.lineWidth = 1
      context.game.strokeRect(
        playerX + TileMapDimension.tileSize,  // x + 16 (salta il primo tile)
        playerY + TileMapDimension.tileSize * 3,  // y + 48 (prendi l'ultima riga)
        TileMapDimension.tileSize * 2,  // larghezza di 2 tile (32px)
        TileMapDimension.tileSize  // altezza di 1 tile (16px)
      )
    }

    const drawObjectsCollidingArea = () => {
      // Prende le nuove coordinate in base all'ultima direzione di movimento
      const { newX: x, newY: y } = this.getNewPosition()

      // Calcola le celle della mappa per l'area di collisione
      const { startTileX, startTileY, endTileX, endTileY } = this.getObjectsCollidingArea(x, y)

      // Disegna l'area di collisione
      context.game.fillStyle = 'rgba(255, 255, 0, 0.3)'
      context.game.fillRect(
        startTileX * TileMapDimension.tileSize, 
        startTileY * TileMapDimension.tileSize, 
        (endTileX - startTileX + 1) * TileMapDimension.tileSize, 
        (endTileY - startTileY + 1) * TileMapDimension.tileSize
      )
    }

    const clearObjectTile = (tileX, tileY) => {
      // Pulisci il tile specifico nel canvas degli oggetti
      context.objects.clearRect(
        tileX * TileMapDimension.tileSize,
        tileY * TileMapDimension.tileSize,
        TileMapDimension.tileSize,
        TileMapDimension.tileSize
      )
    }

    defineExpose({
        canvasSize,
        objectTiles,
        totalObjects,
        updateCanvasSize,
        drawSprite,
        clearObjectTile
    })

</script>

<style>
    #backgroundCanvas {
    z-index: 1;
    }

    #objectsCanvas {
    z-index: 2;
    }

    #gameCanvas {
    z-index: 3;
    }
</style>