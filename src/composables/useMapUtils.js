import { TileMapDimension } from '../utils/constants'

export function useMapUtils() {

    const getTileCoordinates = (tileIndex) => {
        // Calcola le coordinate x,y nella tilemap
        const tileWithBorder = TileMapDimension.tileSize + TileMapDimension.tileBorder
        // Non aggiungere il bordo iniziale, solo tra i tile
        const x = (tileIndex % TileMapDimension.tilesPerRow) * tileWithBorder
        const y = Math.floor(tileIndex / TileMapDimension.tilesPerRow) * tileWithBorder
        return { x, y }
    }

    const getViewportSize = () => {
        return {
          width: Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0),
          height: Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)
        }
      }

    return {
        getTileCoordinates,
        getViewportSize
    }

}