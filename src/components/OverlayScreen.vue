<template>
    <div>
        <div v-if="gameStatus === GameStatuses.TOBESTARTED" class="overlay" :style="{ width: canvasWidth + 'px', height: canvasHeight + 'px' }">
            <div class="overlay-message align-left">
                <span>Benvenuto nel gioco Roguelike</span><br><br>
                <span>Prendi tutti i materiali per completare il gioco</span><br><br><br>
                <span>Per muoverti premi W A S D</span><br>
                <span>Per raccogliere gli oggetti premi E</span><br>
                <span>Per aprire o chiudere l'inventario premi I</span><br>
            </div>
            <button class="start-button" @click="startGame">Inizia</button>
        </div>
        <div v-if="gameStatus === GameStatuses.COMPLETED" class="overlay completion-overlay" :style="{ width: canvasWidth + 'px', height: canvasHeight + 'px' }">
            <div class="overlay-message align-center">Complimenti! Hai raccolto tutti i materiali</div>
            <button class="start-button" @click="startGame">Ricomincia</button>
        </div>
        <div v-if="gameStatus === GameStatuses.FAILED" class="overlay completion-overlay" :style="{ width: canvasWidth + 'px', height: canvasHeight + 'px' }">
            <div class="overlay-message align-center">Ops sei esploso su una bomba :(</div>
            <button class="start-button" @click="startGame">Ricomincia</button>
        </div>
    </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';
import { GameStatuses } from '../utils/constants.js';

defineOptions({
    name: 'OverlayScreen'
});

const props = defineProps({
    canvasWidth: {
        type: Number,
        required: true
    },
    canvasHeight: {
        type: Number,
        required: true
    },
    gameStatus: {
        type: String,
        required: true
    }
});

const emit = defineEmits(['start-game']);

const startGame = () => {
    emit('start-game');
};
</script>

<style>
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
</style>