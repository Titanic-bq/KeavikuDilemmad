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

const Generator = {
    vocab: {
        dilemmad: ["kanda neoonvesti rünnakul", "süüa rühmavanema toidupakk", "kaotada relva lukk", "kummikutesse kusemine", "välikäimla puhastamine hambaharjaga"],
        asjad: ["kuulivest ajalehega", "märg tikk", "tühjad kestad salves", "kiiver silmadel", "märgades sokkides tsivilisatsioon"],
        tegu: ["astuks miinile", "kaupleks linnaloa üle", "viskaks kella granaadi asemel", "jääks magama valves"],
    },
    images: ["https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=500", "https://images.unsplash.com/photo-1599408162165-8b111666e191?w=500"]
};

function hostGame() {
    isHost = true;
    gamePin = Math.floor(1000 + Math.random() * 9000).toString();
    roomRef = db.ref('rooms/' + gamePin);
    roomRef.set({ status: "waiting", currentQ: "OOTAME..." }).then(() => {
        document.getElementById("status-msg").innerHTML = `MÄNGU PIN: <span style="color:#0f4; font-size:2rem;">${gamePin}</span>`;
        document.getElementById("start-btn").style.display = "block";
        listenForData();
    });
}

function joinGame() {
    myName = document.getElementById("player-name").value.trim().toUpperCase();
    if (!myName) return alert("Nimi!");
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
        } else alert("Vale PIN!");
    });
}

function listenForData() {
    roomRef.child('players').on('value', (snap) => {
        scores = snap.val() || {};
        players = Object.keys(scores);
        updateScoreDisplay();
        if (!isHost && !hasVotedThisRound) renderButtons();
    });

    roomRef.child('currentQ').on('value', (snap) => {
        if (!isHost) {
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
    });
}

function startGame() {
    roomRef.update({ status: "started" });
    nextCard();
}

function nextCard() {
    const q = `EELISTAKSID: ${Generator.vocab.dilemmad[Math.floor(Math.random()*5)]} VÕI ${Generator.vocab.asjad[Math.floor(Math.random()*5)]}?`;
    const img = Generator.images[Math.floor(Math.random()*2)];
    
    document.getElementById("task-text").innerText = q;
    document.getElementById("task-img").src = img;
    document.getElementById("folder").classList.replace("folder-open", "folder-closed");
    
    if (isHost) roomRef.update({ currentQ: q });
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
    document.getElementById("remote-vote-btns").innerHTML = "HÄÄL ANTUD!";
}

function updateScoreDisplay() {
    const display = document.getElementById("score-display");
    if (!display) return;
    display.innerHTML = Object.entries(scores).map(p => `<div>${p[0]}: ${p[1].score}</div>`).join("");
}

function openFolder() { document.getElementById("folder").classList.replace("folder-closed", "folder-open"); }