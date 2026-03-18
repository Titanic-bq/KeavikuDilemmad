const firebaseConfig = {
    apiKey: "AIzaSyAXGJ5lGVFCKa0JO6ga6KuOy51xPbMdzlY",
    authDomain: "kaevikudilemmad.firebaseapp.com",
    databaseURL: "https://kaevikudilemmad-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "kaevikudilemmad",
    storageBucket: "kaevikudilemmad.firebasestorage.app",
    messagingSenderId: "292604369801",
    appId: "1:292604369801:web:425c7d17c97843ddbb5f58"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let isHost = false;
let myName = "";
let gamePin = "";
let roomRef = null;
let players = [];
let scores = {};
let hasVotedThisRound = false;

// 3 FAASI ANDMED
const Generator = {
    vocab: {
        dilemmad: ["kanda neoonvesti rünnakul", "süüa rühmavanema toidupakk", "kaotada relva lukk", "kummikutesse kusemine", "välikäimla puhastamine hambaharjaga"],
        asjad: ["kuulivest ajalehega", "märg tikk", "tühjad kestad salves", "kiiver silmadel", "märgades sokkides tsivilisatsioon"],
        ryhmavaim: ["astuks miinile teiste eest", "kaupleks linnaloa üle", "viskaks kella granaadi asemel", "jääks magama valves", "müüks asukoha burgeri eest"],
        missioon: ["Vallutada välikäimla", "Hävitada kütuseauto", "Kaitsta kohvivaru", "Evakueerida rühmavanem"],
        kriis: ["48h magamata", "laskemoon on herned", "side on maas", "pesukarude rünnak"]
    },
    images: [
        "https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=500", 
        "https://images.unsplash.com/photo-1599408162165-8b111666e191?w=500",
        "https://images.unsplash.com/photo-1579546671585-7844a13a969a?w=500",
        "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500"
    ]
};

let phaseIndex = 0;
const phases = ["DILEMMAD", "RÜHMAVAIM", "STRATEEGIA"];
let cardCounter = 1;

function hostGame() {
    isHost = true;
    gamePin = Math.floor(1000 + Math.random() * 9000).toString();
    roomRef = db.ref('rooms/' + gamePin);
    roomRef.set({ status: "waiting", currentQ: "OOTAME ALGUST..." }).then(() => {
        document.getElementById("status-msg").innerHTML = `PIN: <span style="color:#0f4; font-size:2.5rem;">${gamePin}</span>`;
        document.getElementById("start-btn").style.display = "block";
        listenForData();
    });
}

function joinGame() {
    myName = document.getElementById("player-name").value.trim().toUpperCase();
    if (!myName) return alert("SÕDUR, NIMI!");
    let inputPin = prompt("PIN:");
    if (!inputPin) return;
    db.ref('rooms/' + inputPin).once('value', (snap) => {
        if (snap.exists()) {
            gamePin = inputPin;
            roomRef = db.ref('rooms/' + gamePin);
            roomRef.child('players/' + myName).set({ score: 0 });
            document.getElementById("home-screen").style.display = "none";
            document.getElementById("player-controller").style.display = "flex";
            listenForData();
        } else alert("VALE PIN!");
    });
}

function listenForData() {
    roomRef.child('players').on('value', (snap) => {
        scores = snap.val() || {};
        players = Object.keys(scores);
        updateScoreDisplay();
        const lobby = document.getElementById("player-list");
        if(lobby) lobby.innerHTML = players.map(p => `<span class="player-tag">${p}</span>`).join("");
        if (!isHost && !hasVotedThisRound) renderButtons();
    });

    roomRef.child('currentQ').on('value', (snap) => {
        if (!isHost && snap.val()) {
            hasVotedThisRound = false;
            document.getElementById("controller-status").innerText = snap.val();
            renderButtons();
        }
    });

    roomRef.child('status').on('value', (snap) => {
        if (snap.val() === "started" && isHost) {
            document.getElementById("home-screen").style.display = "none";
            document.getElementById("game-interface").style.display = "block";
        }
        if (snap.val() === "ended") location.reload();
    });
}

function startGame() {
    roomRef.update({ status: "started" });
    nextCard();
}

function nextCard() {
    // Iga 5 kaardi järel vahetame faasi
    if (cardCounter % 6 === 0) {
        phaseIndex = (phaseIndex + 1) % 3;
        cardCounter = 1;
        document.getElementById("folder").classList.replace("folder-open", "folder-closed");
    }

    const currentPhase = phases[phaseIndex];
    document.getElementById("current-phase-display").innerText = "FAAS: " + currentPhase;
    document.getElementById("folder-title").innerHTML = "OPERATSIOON:<br>" + currentPhase;
    document.getElementById("page-title").innerText = currentPhase + " RAPORT";

    let q = "";
    if (currentPhase === "DILEMMAD") {
        q = `KAS EELISTAKSID:\n> ${Generator.vocab.dilemmad[Math.floor(Math.random()*5)]}\n\nVÕI:\n> ${Generator.vocab.asjad[Math.floor(Math.random()*5)]}?`;
    } else if (currentPhase === "RÜHMAVAIM") {
        q = `KES TEIE HULGAST KÕIGE TÕENÄOLISEMALT:\n> ${Generator.vocab.ryhmavaim[Math.floor(Math.random()*5)]}?`;
    } else {
        q = `MISSIOON: ${Generator.vocab.missioon[Math.floor(Math.random()*4)]}\nKRIIS: ${Generator.vocab.kriis[Math.floor(Math.random()*4)]}\n\nKUIDAS LAHENDATE?`;
    }

    document.getElementById("task-text").innerText = q;
    document.getElementById("task-img").src = Generator.images[Math.floor(Math.random()*4)];
    document.getElementById("card-num").innerText = cardCounter.toString().padStart(2, "0");
    document.getElementById("card-num-2").innerText = cardCounter;
    
    if (isHost) roomRef.update({ currentQ: q });
    cardCounter++;
}

function renderButtons() {
    const container = document.getElementById("remote-vote-btns");
    if (!container || hasVotedThisRound) return;
    container.innerHTML = players.filter(p => p !== myName).map(p => 
        `<button class="vote-btn" onclick="vote('${p}')">${p}</button>`
    ).join("");
}

function vote(target) {
    hasVotedThisRound = true;
    roomRef.child('players/' + target + '/score').transaction(s => (s || 0) + 1);
    document.getElementById("remote-vote-btns").innerHTML = "<div class='voted-msg'>VALIK TEHTUD!</div>";
}

function updateScoreDisplay() {
    const display = document.getElementById("score-display");
    if (!display) return;
    display.innerHTML = Object.entries(scores)
        .sort((a,b) => b[1].score - a[1].score)
        .map(p => `<div style="display:flex;justify-content:space-between;border-bottom:1px solid #999;font-size:0.8rem;color:#000;"><span>${p[0]}</span><span>${p[1].score} PTS</span></div>`).join("");
}

function openFolder() { document.getElementById("folder").classList.replace("folder-closed", "folder-open"); }
function endGame() { roomRef.update({ status: "ended" }).then(() => roomRef.remove()); }