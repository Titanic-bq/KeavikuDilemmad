// --- 1. FIREBASE CONFIG ---
const firebaseConfig = {
    apiKey: "AIzaSyAXGJ5lGVFCKa0JO6ga6KuOy51xPbMdzlY",
    authDomain: "kaevikudilemmad.firebaseapp.com",
    databaseURL: "https://kaevikudilemmad-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "kaevikudilemmad",
    storageBucket: "kaevikudilemmad.firebasestorage.app",
    messagingSenderId: "292604369801",
    appId: "1:292604369801:web:425c7d17c97843ddbb5f58",
    measurementId: "G-BWS6MQSYNK"
};

// Algatame Firebase'i
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// --- 2. MUUTUJAD JA ANDMED ---
let isHost = false;
let myName = "";
let gamePin = ""; 
let roomRef = null;
let players = [];
let scores = {};
let hasVotedThisRound = false;

const Generator = {
    vocab: {
        dilemmad: ["kanda neoonvesti rünnakul", "süüa rühmavanema toidupakk", "kaotada relva lukk", "kummikutesse kusemine", "välikäimla puhastamine hambaharjaga"],
        asjad: ["kuulivest ajalehega", "märg tikk", "tühjad kestad salves", "kiiver silmadel", "märgades sokkides tsivilisatsioon"],
        tegu_r: ["astuks miinile", "kaupleks linnaloa üle", "viskaks kella granaadi asemel", "jääks magama valves", "müüks asukoha burgeri eest"],
        missioon: ["Vallutada välikäimla", "Hävitada kütuseauto", "Kaitsta kohvivaru", "Evakueerida rühmavanem"],
        kriis: ["48h magamata", "laskemoon on herned", "side on maas", "pesukarude rünnak"],
        vahend: ["rull teipi ja küpsis", "depressiivne orav", "papist tank", "vana megafon"]
    },
    images: [
        "https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=500", 
        "https://images.unsplash.com/photo-1599408162165-8b111666e191?w=500",
        "https://images.unsplash.com/photo-1579546671585-7844a13a969a?w=500",
        "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500"
    ]
};

let currentTheme = "dilemmad";
let phaseCounters = { dilemmad: 0, ryhmavaim: 0, strateegia: 0 };
let DB = { dilemmad: { cards: [] }, ryhmavaim: { cards: [] }, strateegia: { cards: [] } };
const themeOrder = ["dilemmad", "ryhmavaim", "strateegia"];

// --- 3. KAHOOT-STYLE JOIN & HOST ---
function hostGame() {
    isHost = true;
    gamePin = Math.floor(1000 + Math.random() * 9000).toString(); // 4-kohaline PIN
    roomRef = db.ref('rooms/' + gamePin);
    
    // Loome toa andmebaasi
    roomRef.set({ status: "waiting", currentQ: "OOTAME ALGUST..." }).then(() => {
        document.getElementById("status-msg").innerHTML = `MÄNGU PIN: <span class="blink-text" style="color:#0f4; font-size:2.5rem;">${gamePin}</span>`;
        document.getElementById("start-btn").style.display = "block";
        listenForData();
    });
}

function joinGame() {
    isHost = false;
    myName = document.getElementById("player-name").value.trim().toUpperCase();
    if (!myName) return alert("Sisesta nimi!");
    
    let inputPin = prompt("SISESTA 4-KOHALINE PIN:");
    if (!inputPin) return;

    // Kontrollime andmebaasist PIN-i
    db.ref('rooms/' + inputPin).once('value', (snap) => {
        if (snap.exists()) {
            gamePin = inputPin;
            roomRef = db.ref('rooms/' + gamePin);
            // Lisame mängija
            roomRef.child('players/' + myName).set({ score: 0 });
            document.getElementById("home-screen").style.display = "none";
            document.getElementById("player-controller").style.display = "flex";
            listenForData();
        } else {
            alert("VALE PIN-KOOD!");
        }
    });
}

// --- 4. SÜNKROONIMINE ---
function listenForData() {
    // 1. Kuulame mängijaid ja skoore
    roomRef.child('players').on('value', (snap) => {
        scores = snap.val() || {};
        players = Object.keys(scores);
        
        const lobby = document.getElementById("player-list");
        if(lobby) lobby.innerHTML = players.map(p => `<span class="player-tag">${p}</span>`).join("");
        
        updateScoreDisplay();
        if (!isHost && !hasVotedThisRound) renderRemoteButtons();
    });

    // 2. Kuulame jooksvat küsimust telefonis (RESETIB hääletuse)
    roomRef.child('currentQ').on('value', (snap) => {
        if (!isHost && snap.val()) {
            hasVotedThisRound = false; 
            document.getElementById("controller-status").innerText = snap.val();
            renderRemoteButtons();
        }
    });

    // 3. Kuulame staatust (START)
    roomRef.child('status').on('value', (snap) => {
        if (snap.val() === "started" && isHost) {
            document.getElementById("home-screen").style.display = "none";
            document.getElementById("game-interface").style.display = "block";
        }
        if (snap.val() === "ended") location.reload();
    });
}

// --- 5. MÄNGU LOOGIKA ---
function startGame() {
    generateSessionCards();
    roomRef.update({ status: "started" });
    setupPhase("dilemmad");
}

function generateSessionCards() {
    themeOrder.forEach(theme => {
        DB[theme].cards = [];
        for (let i = 0; i < 20; i++) {
            let q = theme === "dilemmad" ? `EELISTAKSID:\n> ${getRand("dilemmad")}\n\nVÕI:\n> ${getRand("asjad")}?` :
                    theme === "ryhmavaim" ? `KES TEIE HULGAST:\n> ${getRand("tegu_r")}?` :
                    `MISSIOON: ${getRand("missioon")}\nKRIIS: ${getRand("kriis")}`;
            // Valime pildi massiivist
            DB[theme].cards.push({ q, img: Generator.images[i % Generator.images.length] });
        }
    });
}

function setupPhase(key) {
    currentTheme = key;
    renderCard();
}

function renderCard() {
    const card = DB[currentTheme].cards[phaseCounters[currentTheme]];
    document.getElementById("task-text").innerText = card.q;
    document.getElementById("task-img").src = card.img;
    const num = (phaseCounters[currentTheme] + 1).toString().padStart(2, "0");
    document.getElementById("card-num").innerText = num;
    document.getElementById("card-num-2").innerText = num;
    
    if (isHost) roomRef.update({ currentQ: card.q });
}

function renderRemoteButtons() {
    const container = document.getElementById("remote-vote-btns");
    if (!container || hasVotedThisRound) return;
    // Mängija ei hääleta enda poolt
    container.innerHTML = players.filter(p => p !== myName).map(p => 
        `<button class="vote-btn" onclick="givePointOnline('${p}')">${p}</button>`
    ).join("");
}

function givePointOnline(target) {
    if (hasVotedThisRound) return;
    hasVotedThisRound = true;
    // Kasutame Transactionit punkti lisamiseks
    roomRef.child('players/' + target + '/score').transaction(s => (s || 0) + 1);
    document.getElementById("remote-vote-btns").innerHTML = "<div class='voted-msg'>HÄÄL SALVESTATUD!</div>";
}

function updateScoreDisplay() {
    const display = document.getElementById("score-display");
    if (!display) return;
    display.innerHTML = Object.entries(scores)
        .sort((a,b) => b[1].score - a[1].score)
        .map(p => `<div style="display:flex;justify-content:space-between;border-bottom:1px solid #777;padding:2px 0;color:#000;"><span>${p[0]}</span><span>${p[1].score} PTS</span></div>`).join("");
}

function nextCard() {
    phaseCounters[currentTheme] = (phaseCounters[currentTheme] + 1) % 20;
    setupPhase(themeOrder[(themeOrder.indexOf(currentTheme) + 1) % 3]);
    const f = document.getElementById("folder");
    f.classList.replace("folder-open", "folder-closed");
}

function openFolder() { 
    document.getElementById("folder").classList.replace("folder-closed", "folder-open"); 
}

function getRand(k) { return Generator.vocab[k][Math.floor(Math.random() * Generator.vocab[k].length)]; }

function endGame() { 
    roomRef.update({ status: "ended" }); 
}