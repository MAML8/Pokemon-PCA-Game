import {PCA, reconstrucao} from './pca.js';
// Configurações
const POKE_SIZE = 160;
const NUM_POKE_RIGHT = 3;
const NUM_POKE_DOWN = 2;
const WIDTH = POKE_SIZE * NUM_POKE_RIGHT;
const HEIGHT = POKE_SIZE * NUM_POKE_DOWN;
const POKE_TOTAL = NUM_POKE_DOWN * NUM_POKE_RIGHT;

let pcaData = { r: null, g: null, b: null };

let currentPokemon = [[]];
let currentCorrect = 0;
let currentK = 1;
const MAX_K = 25;
const FREE_REVEAL = 10;
const WRONG_REVEAL = 3;

const MAX_TIME = 90*100;
let runningGame = false;
let currentTime = 0;
let end_game;
let timer;


let currentScore = 0;

// Referências DOM
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const inputEl = document.getElementById('guess');
const btnGuess = document.getElementById('btnGuess');
const btnSkip = document.getElementById('btnSkip');
const compCountEl = document.getElementById('compCount');
const scoreCountEl = document.getElementById('scoreCount');
const timeCountEl = document.getElementById('timeCount');

canvas.width = WIDTH;
canvas.height = HEIGHT;

// --------------------- Processamento dos Dados -----------------------

export function tick_time(){
    if(runningGame){
        currentTime++;
        const minutes = Math.floor((MAX_TIME-currentTime)/(60*100));
        const seconds = Math.floor((MAX_TIME-currentTime)/(100)) % 60;
        const miliseconds = (MAX_TIME-currentTime) % 100;
        timeCountEl.innerText = `${minutes}:${seconds>=10 ? seconds : ('0'+seconds)}:${miliseconds >= 10 ? miliseconds : ('0' + miliseconds)}`;
        if(currentTime>=MAX_TIME){
            disableControls();
            end_game(currentScore);
        }
    }
}

async function tratar_dados(data){
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = data.sprites.other['official-artwork'].front_default;
    await new Promise(r => img.onload = r);
    return {
        name: normalize(data.species.name),
        img: img,
        crie: data.cries.latest,
        found: false
    };
}

function set_currentPokemon(data){
    currentPokemon = data;
}

export function startGame(endGame) {
    resetUI();
    end_game = endGame;
    currentCorrect = 0;
    currentTime = 0;
    currentScore = 0;
    nextImage();
    if(timer)
        clearInterval(timer);
    timer = setInterval(tick_time, 10);
}

async function nextImage(){
    statusEl.innerText = "Procurando Pokémon selvagens...";
    statusEl.style.color = "#333";
    currentCorrect = 0;
    try {
        const poke_data = new Array(NUM_POKE_DOWN);
        for(let i = 0; i<NUM_POKE_DOWN; i++){
            poke_data[i] = new Array(NUM_POKE_RIGHT);
            for(let j = 0; j< NUM_POKE_RIGHT; j++){
                const data = await get_random_pokemon();

                poke_data[i][j] = await tratar_dados(data);
            }
        }

        set_currentPokemon(poke_data);

        statusEl.innerText = "Processando matemática...";
        // Pequeno delay para a UI não travar antes de escrever o texto
        setTimeout(() => processImage(), 10);
    } catch (e) {
        statusEl.innerText = "Erro na conexão API :(";
        console.error(e);
        btnSkip.disabled = false;
    }
}

async function processImage() {
    const collageCanvas = document.createElement('canvas');
    collageCanvas.width = WIDTH;
    collageCanvas.height = HEIGHT;
    const collageCtx = collageCanvas.getContext('2d');
    collageCtx.clearRect(0, 0, WIDTH, HEIGHT);

    for(let i = 0; i<NUM_POKE_DOWN; i++){
        for(let j = 0; j<NUM_POKE_RIGHT; j++){
            collageCtx.drawImage(currentPokemon[i][j].img, j*POKE_SIZE, i*POKE_SIZE, POKE_SIZE, POKE_SIZE);
        }
    }
    
    const imgData = collageCtx.getImageData(0, 0, WIDTH, HEIGHT);
    
    // Separa os canais de cor
    const r = [], g = [], b = [];
    for (let i = 0; i < HEIGHT; i++) {
        r[i] = []; g[i] = []; b[i] = [];
        for (let j = 0; j < WIDTH; j++) {
            const idx = (i * WIDTH + j) * 4;
            r[i][j] = imgData.data[idx];
            g[i][j] = imgData.data[idx+1];
            b[i][j] = imgData.data[idx+2];
        }
    }

    try {
        pcaData.r = PCA(r);
        pcaData.g = PCA(g);
        pcaData.b = PCA(b);

        currentK = 0;
        reconstruct(currentK);
        enableControls();
        statusEl.innerText = "Quem são?";
        console.log("Resposta (Cheat):", currentPokemon);
    } catch(err) {
        console.error(err);
        statusEl.innerText = "Erro no cálculo PCA";
    }
}

function reconstruct(k) {
    compCountEl.innerText = (k+FREE_REVEAL) + " / " + (MAX_K + FREE_REVEAL);
    
    // Reconstrói cada canal separadamente
    const newR = reconstrucao(pcaData.r, MAX_K - k + 1, MAX_K + FREE_REVEAL);
    const newG = reconstrucao(pcaData.g, MAX_K - k + 1, MAX_K + FREE_REVEAL);
    const newB = reconstrucao(pcaData.b, MAX_K - k + 1, MAX_K + FREE_REVEAL);

    // Joga pixels de volta no canvas
    const finalImgData = ctx.createImageData(WIDTH, HEIGHT);
    for (let i = 0; i < HEIGHT; i++) {
        for (let j = 0; j < WIDTH; j++) {
            const idx = (i * WIDTH + j) * 4;
            // .get(linha, coluna)
            finalImgData.data[idx] = clamp(newR.get(i, j));
            finalImgData.data[idx+1] = clamp(newG.get(i, j));
            finalImgData.data[idx+2] = clamp(newB.get(i, j));
            finalImgData.data[idx+3] = 255; // Alpha total
        }
    }
    ctx.putImageData(finalImgData, 0, 0);
    show_found();
}

function show_found(or_all = false){
    for(let i = 0; i<NUM_POKE_DOWN; i++){
        for(let j = 0; j<NUM_POKE_RIGHT; j++){
            if(!currentPokemon[i][j].found&&!or_all) continue;

            ctx.clearRect(j*POKE_SIZE, i*POKE_SIZE, POKE_SIZE, POKE_SIZE);
            ctx.drawImage(currentPokemon[i][j].img, j*POKE_SIZE, i*POKE_SIZE, POKE_SIZE, POKE_SIZE);
        }
    }
}

// --- Controles e UI ---

function checkGuess() {
    const userGuess = normalize(inputEl.value);
    let incorrect = true;
    inputEl.value = "";
    inputEl.focus();
    for(let i = 0; i<NUM_POKE_DOWN; i++){
        for(let j = 0; j<NUM_POKE_RIGHT; j++){
            if(currentPokemon[i][j].found) continue;

            if (userGuess === currentPokemon[i][j].name) {
                score(i,j);
                incorrect = false;
                break;
            }
        }
    }

    if(incorrect){
        statusEl.innerText = "Errou! Melhorando a imagem...";
        statusEl.style.color = "#e84118";
        
        // Aumenta a clareza
        currentK += WRONG_REVEAL;
        if(currentK > MAX_K) currentK = MAX_K;
        reconstruct(currentK);
        
        setTimeout(() => {
            statusEl.style.color = "#2f3542";
            statusEl.innerText = "Tente de novo!";
        }, 1000);
    }
}

function score(i, j){
    currentPokemon[i][j].found = true;
    show_found();
    statusEl.innerText = `ACERTOU O ${currentPokemon[i][j].name.toUpperCase()}!!`;
    statusEl.style.color = "#44bd32";
    currentScore += Math.floor((MAX_K - currentK + WRONG_REVEAL) / WRONG_REVEAL);
    scoreCountEl.innerText = currentScore;


    setTimeout(()=>{
        statusEl.style.color = "#2f3542";
        statusEl.innerText = "Continue!";
    }, 1000)
    currentCorrect++;
    if(currentCorrect>=POKE_TOTAL){
        endImage(true);
    }
}

function endImage(win) {
    disableControls();
    
    if(win) {
        statusEl.innerText = `ACERTOU TODOS!!`;
        statusEl.style.color = "#44bd32";
        currentScore += 2*Math.floor((MAX_K - currentK + WRONG_REVEAL) / WRONG_REVEAL);
        scoreCountEl.innerHTML = currentScore;
    } else {
        show_found(true);
        statusEl.innerText = `Pouxa Pulou :(`;
        statusEl.style.color = "#0097e6";
    }
    
    setTimeout(nextImage, 4000);
}

function normalize(str) { 
    return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace('-', ' ');
}

function clamp(v) { return Math.max(0, Math.min(255, Math.round(v))); }

function resetUI() {
    inputEl.value = "";
    scoreCountEl.innerText = "0";
    timeCountEl.innerText = "1:30:000"
    disableControls();
    statusEl.style.color = "#2f3542";
    ctx.clearRect(0,0,WIDTH, HEIGHT);
}

function enableControls() {
    inputEl.disabled = false;
    btnGuess.disabled = false;
    btnSkip.disabled = false;
    runningGame = true;
    inputEl.focus();
}

function disableControls() {
    inputEl.disabled = true;
    btnGuess.disabled = true;
    btnSkip.disabled = true;
    runningGame = false;
}

// Event Listeners (Isso substitui o onclick do HTML)
btnGuess.addEventListener('click', checkGuess);
btnSkip.addEventListener('click', () => endImage(false));
inputEl.addEventListener('keypress', (e) => {
    if(e.key === 'Enter') checkGuess();
    else if(e.key === 'Ctrl') endImage(false);
});