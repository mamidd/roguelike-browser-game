<template>
    <div class="inventory-panel" v-show="showInventory" :style="{ transform: 'translate(-' + canvasWidth/2 + 'px, -' + canvasHeight/2 + 'px)' }">
      <div class="inventory-row">
        <div class="inventory-text"><strong>INVENTARIO ( premi i )</strong></div>
      </div>
      <div class="inventory-row">
        <canvas ref="icon1" :width="TileMapDimension.tileSize" :height="TileMapDimension.tileSize" class="inventory-icon reset-positioning"></canvas>
        <div class="inventory-text">Alberi gialli: {{ objectsGathered.yellowTrees }}</div>
      </div>
      <div class="inventory-row">
        <canvas ref="icon2" :width="TileMapDimension.tileSize" :height="TileMapDimension.tileSize" class="inventory-icon reset-positioning"></canvas>
        <div class="inventory-text">Alberi verdi: {{ objectsGathered.greenTrees }}</div>
      </div>
      <div class="inventory-row">
        <canvas ref="icon3" :width="TileMapDimension.tileSize" :height="TileMapDimension.tileSize" class="inventory-icon reset-positioning"></canvas>
        <div class="inventory-text">Funghi: {{ objectsGathered.mushrooms }}</div>
      </div>
    </div>
</template>

<script setup>
import { defineProps, onBeforeUnmount, ref, onMounted } from 'vue';
import { AvailableTiles, TileMapDimension } from '../utils/constants'

defineProps({
    canvasWidth: {
        type: Number,
        required: true
    },
    canvasHeight: {
        type: Number,
        required: true
    },
    objectsGathered: {
        type: Object,
        required: true
    }
});

var showInventory = ref(true)
const tileMapImage = ref(null)
const icon1 = ref(null)
const icon2 = ref(null)
const icon3 = ref(null)
const iconRefs = [icon1, icon2, icon3]

onMounted(async () => {
    await loadTiles()
    drawInventoryIcons()
    addEventListner()
});

onBeforeUnmount(() => {
    removeEventListner()
});

const addEventListner = () => {
    window.addEventListener('keydown', keyDown)
}

const removeEventListner = () => {
    window.removeEventListener('keydown', keyDown)
}

const keyDown = (e) => {
    if (e.key.toLowerCase() == 'i') {
        showInventory.value = !showInventory.value
    }
}

const drawInventoryIcons = () => {
    for (let i = 1; i <= iconRefs.length; i++) {
        const canvas = iconRefs[i-1].value
        if (canvas) {
          const ctx = canvas.getContext('2d')
          const tileIndex = AvailableTiles.objects[i - 1]
          const { x: sourceX, y: sourceY } = getTileCoordinates(tileIndex)
          
          ctx.drawImage(
            tileMapImage.value,
            sourceX,
            sourceY,
            TileMapDimension.tileSize,
            TileMapDimension.tileSize,
            0,
            0,
            16,
            16
          )
        }
    }
}

const loadTiles = async () => {
    // Carica la tilemap
    tileMapImage.value = new Image()
    tileMapImage.value.src = new URL(`../assets/tilemap.png`, import.meta.url).href
    await tileMapImage.value.decode()
}

const getTileCoordinates = (tileIndex) => {
    // Calcola le coordinate x,y nella tilemap
    const tileWithBorder = TileMapDimension.tileSize + TileMapDimension.tileBorder
    // Non aggiungere il bordo iniziale, solo tra i tile
    const x = (tileIndex % TileMapDimension.tilesPerRow) * tileWithBorder
    const y = Math.floor(tileIndex / TileMapDimension.tilesPerRow) * tileWithBorder
    return { x, y }
}
</script>

<style>
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
</style>