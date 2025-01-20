export const GameStatuses = {
    TOBESTARTED: 'toBeStarted',
    PLAYING: 'playing',
    COMPLETED: 'completed',
    FAILED: 'failed'
}

export const AvailableTiles = {
    ground: [0, 1, 2],
    decoration: [39,40,41,42,43],
    objects: [27,28,29],
    traps: [105]
}

export const TileMapDimension = {
    tilesPerRow: 12,
    tileSize: 16,
    tileBorder: 1
}