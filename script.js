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

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const roomRef = db.ref('session_active');

let isHost = false;
let myName = "";
let players = [];
let scores = {};
let hasVotedThisRound = false;
let currentTheme = "dilemmad";
let phaseCounters = { dilemmad: 0, ryhmavaim: 0, strateegia: 0 };
const themeOrder = ["dilemmad", "ryhmavaim", "strateegia"];

const Generator = {
    vocab: {
        dilemmad: ["kanda neoonvesti rünnakul", "süüa rühmavanema toidupakk", "kaotada relva lukk", "kummikutesse kusemine", "välikäimla puhastamine hambaharjaga"],
        asjad: ["kuulivest ajalehega", "märg tikk", "tühjad kestad salves", "kiiver silmadel", "märgades sokkides tsivilisatsioon"],
        tegu_r: ["astuks miinile", "kaupleks linnaloa üle", "viskaks kella granaadi asemel", "jääks magama valves", "müüks asukoha burgeri eest"],
        missioon: ["Vallutada välikäimla", "Hävitada kütuseauto", "Kaitsta kohvivaru", "Evakueerida rühmavanem"],
        kriis: ["48h magamata", "laskemoon on herned", "side on maas", "pesukarude rünnak"],
        vahend: ["rull teipi ja küpsis", "depressiivne orav", "papist tank", "vana megafon"]
    },
    images: ["https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=500"]
};

let DB = { dilemmad: { cards: [] }, ryhmavaim: { cards: [] }, strateegia: { cards: [] } };

function hostGame() {
    isHost = true;
    myName = document.getElementById("player-name").value.trim().toUpperCase() || "HOST";
    roomRef.remove().then(() => {
        document.getElementById("status-msg").innerText = "HOST AKTIVEERITUD. OOTA ÜKSUST...";
        document.getElementById("start-btn").style.display = "inline-block";
        listenForData();
    });
}

function joinGame() {
    isHost = false;
    myName = document.getElementById("player-name").value.trim().toUpperCase();
    if (!myName) return alert("Sisesta nimi!");
    db.ref('session_active/players/' + myName).set({ score: 0 });
    document.getElementById("home-screen").style.display = "none";
    document.getElementById("player-controller").style.display = "block";
    listenForData();
}

function listenForData() {
    db.ref('session_active/players').on('value', (snap) => {
        const data = snap.val() || {};
        players = Object.keys(data);
        scores = data;
        
        const lobbyList = document.getElementById("player-list");
        if(lobbyList) lobbyList.innerHTML = players.map(p => `<span class="player-tag">${p}</span>`).join("");
        updateScoreDisplay();
        if (!isHost && !hasVotedThisRound) renderRemoteButtons();
    });

    db.ref('session_active/currentQ').on('value', (snap) => {
        if (!isHost && snap.val()) {
            hasVotedThisRound = false; 
            document.getElementById("controller-status").innerText = snap.val();
            renderRemoteButtons();
        }
    });

    db.ref('session_active/status').on('value', (snap) => {
        if (snap.val() === "started" && isHost) {
            document.getElementById("home-screen").style.display = "none";
            document.getElementById("game-interface").style.display = "block";
        }
        if (snap.val() === "ended") location.reload();
    });
}

function startGame() {
    generateSessionCards();
    roomRef.update({ status: "started" });
    setupPhase("dilemmad");
}

function generateSessionCards() {
    themeOrder.forEach(theme => {
        DB[theme].cards = [];
        for (let i = 0; i < 10; i++) {
            let q = theme === "dilemmad" ? `EELISTAKSID:\n> ${getRand("dilemmad")}\n\nVÕI:\n> ${getRand("asjad")}?` :
                    theme === "ryhmavaim" ? `KES TEIE HULGAST:\n> ${getRand("tegu_r")}?` :
                    `MISSIOON: ${getRand("missioon")}\nKRIIS: ${getRand("kriis")}`;
            DB[theme].cards.push({ q, img: Generator.images[0] });
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
    document.getElementById("card-num").innerText = (phaseCounters[currentTheme] + 1).toString().padStart(2, "0");
    if (isHost) db.ref('session_active/currentQ').set(card.q);
}

function renderRemoteButtons() {
    const container = document.getElementById("remote-vote-btns");
    if (!container || hasVotedThisRound) return;
    container.innerHTML = players.map(p => 
        `<button class="vote-btn" onclick="givePointOnline('${p}')">${p}</button>`
    ).join("");
}

function givePointOnline(target) {
    if (hasVotedThisRound) return;
    hasVotedThisRound = true;
    db.ref('session_active/players/' + target + '/score').transaction(s => (s || 0) + 1);
    document.getElementById("remote-vote-btns").innerHTML = "<div class='voted-msg'>HÄÄL SALVESTATUD!</div>";
}

function updateScoreDisplay() {
    const display = document.getElementById("score-display");
    if (!display) return;
    display.innerHTML = Object.entries(scores)
        .sort((a,b) => b[1].score - a[1].score)
        .map(p => `<div>${p[0]}: ${p[1].score}</div>`).join("");
}

function nextCard() {
    phaseCounters[currentTheme] = (phaseCounters[currentTheme] + 1) % 10;
    setupPhase(themeOrder[(themeOrder.indexOf(currentTheme) + 1) % 3]);
    document.getElementById("folder").classList.replace("folder-open", "folder-closed");
}

function openFolder() { document.getElementById("folder").classList.replace("folder-closed", "folder-open"); }
function getRand(k) { return Generator.vocab[k][Math.floor(Math.random() * Generator.vocab[k].length)]; }

function endGame() { 
    roomRef.update({ status: "ended" }); 
}