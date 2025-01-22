import { ref } from 'vue'
import { PlayerSize } from '../utils/constants'

export function usePlayer() {

    const player = ref({
        position: { 
            x: 400, 
            y: 300 
        },
        speed: 5,
        frameX: 0,
        frameY: 14,
        moving: false,
        lastDirection: 'down'
    })

    const centerPlayer = (canvasSizeWidth, canvasSizeHeight) => {
        //Calcola il centro del canvas da implementare con la costante
        player.value.position.x = (canvasSizeWidth - PlayerSize.width) / 2
        player.value.position.y = (canvasSizeHeight - PlayerSize.height) / 2
    }

    return {
        player,
        centerPlayer
    }

}