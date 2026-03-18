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

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// --- 2. MUUTUJAD ---
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
    images: ["https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=500"]
};

let currentTheme = "dilemmad";
let phaseCounters = { dilemmad: 0, ryhmavaim: 0, strateegia: 0 };
let DB = { dilemmad: { cards: [] }, ryhmavaim: { cards: [] }, strateegia: { cards: [] } };
const themeOrder = ["dilemmad", "ryhmavaim", "strateegia"];

// --- 3. KAHOOT-STYLE JOIN & HOST ---
function hostGame() {
    isHost = true;
    // Genereerime PIN-i
    gamePin = Math.floor(1000 + Math.random() * 9000).toString();
    myName = "HOST";
    
    // Loome viite konkreetsele toale
    roomRef = db.ref('rooms/' + gamePin);

    // KIRJUTAME ANDMED ANDMEBAASI (et see PIN eksisteeriks)
    roomRef.set({
        status: "waiting",
        createdAt: Date.now(),
        currentQ: "OOTAME ALGUST..."
    }).then(() => {
        console.log("Tuba loodud PIN-iga:", gamePin);
        document.getElementById("status-msg").innerHTML = `MÄNGU PIN: <span style="font-size:2.5rem; color:#0f4; font-weight:bold;">${gamePin}</span>`;
        document.getElementById("start-btn").style.display = "inline-block";
        listenForData();
    }).catch(err => {
        console.error("Viga toa loomisel:", err);
        alert("FIREBASE VIGA: Kontrolli 'Rules' vahelehte Firebase-is!");
    });
}

function joinGame() {
    isHost = false;
    myName = document.getElementById("player-name").value.trim().toUpperCase();
    
    if (!myName) return alert("SISESTA NIMI!");

    let inputPin = prompt("SISESTA 4-KOHALINE PIN:");
    if (!inputPin) return;

    gamePin = inputPin.trim();
    console.log("Proovin liituda PIN-iga:", gamePin);

    // Kontrollime otse seda PIN-i kausta
    db.ref('rooms/' + gamePin).once('value')
        .then((snap) => {
            if (snap.exists()) {
                console.log("PIN leitud! Liitun...");
                roomRef = db.ref('rooms/' + gamePin);
                
                // Lisame mängija
                roomRef.child('players/' + myName).set({ score: 0 })
                    .then(() => {
                        document.getElementById("home-screen").style.display = "none";
                        document.getElementById("player-controller").style.display = "block";
                        listenForData();
                    });
            } else {
                console.log("Sellist PIN-i ei leitud andmebaasist.");
                alert("VALE PIN-KOOD! Kas Host vajutas 'Tee uus mäng'?");
            }
        })
        .catch(err => {
            console.error("Viga liitumisel:", err);
            alert("Ühenduse viga!");
        });
}

// --- 4. SÜNKROONIMINE ---
function listenForData() {
    roomRef.child('players').on('value', (snap) => {
        const data = snap.val() || {};
        players = Object.keys(data);
        scores = data;
        
        // Lobby nimekiri hosti ekraanil
        const lobbyList = document.getElementById("player-list");
        if(lobbyList) lobbyList.innerHTML = players.map(p => `<span class="player-tag">${p}</span>`).join("");
        
        updateScoreDisplay();
        if (!isHost && !hasVotedThisRound) renderRemoteButtons();
    });

    roomRef.child('currentQ').on('value', (snap) => {
        if (!isHost && snap.val()) {
            hasVotedThisRound = false;
            document.getElementById("controller-status").innerText = snap.val();
            renderRemoteButtons();
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
    if (isHost) roomRef.update({ currentQ: card.q });
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
    roomRef.child('players/' + target + '/score').transaction(s => (s || 0) + 1);
    document.getElementById("remote-vote-btns").innerHTML = "<div class='voted-msg'>HÄÄL ANTUD!</div>";
}

function updateScoreDisplay() {
    const display = document.getElementById("score-display");
    if (!display) return;
    display.innerHTML = Object.entries(scores)
        .sort((a,b) => b[1].score - a[1].score)
        .map(p => `<div style="display:flex;justify-content:space-between;border-bottom:1px solid #555;padding:5px 0;"><span>${p[0]}</span><span>${p[1].score} PTS</span></div>`).join("");
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

function endGame() { roomRef.update({ status: "ended" }); }