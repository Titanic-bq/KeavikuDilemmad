// --- 1. FIREBASE CONFIG (ASENDA SEE OMA KOODIGA!) ---

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
// --- 2. GENERATOR JA ANDMED ---
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
        "https://images.unsplash.com/photo-1599408162165-8b111666e191?w=500"
    ]
};

let DB = { dilemmad: { cards: [] }, ryhmavaim: { cards: [] }, strateegia: { cards: [] } };
let players = []; 
let scores = {}; 
let currentTheme = "dilemmad";
let phaseCounters = { dilemmad: 0, ryhmavaim: 0, strateegia: 0 };
let isHost = false;
let myName = "";
const themeOrder = ["dilemmad", "ryhmavaim", "strateegia"];

// --- 3. ONLINE LIITUMISE FUNKTSIOONID ---
function hostGame() {
    isHost = true;
    myName = document.getElementById("player-name").value.trim().toUpperCase() || "HOST";
    document.getElementById("status-msg").innerText = "HOST REŽIIM: OOTAN ÜKSUST...";
    document.getElementById("start-btn").style.display = "inline-block";
    
    roomRef.remove(); // Puhasta vana mäng
    listenForData();
}

function joinGame() {
    isHost = false;
    myName = document.getElementById("player-name").value.trim().toUpperCase();
    if (!myName) return alert("Sisesta nimi!");

    document.getElementById("status-msg").innerText = "LIITUMINE...";
    
    // Lisa mängija andmebaasi
    firebase.ref(db, 'session_active/players/' + myName).set({
        score: 0
    });

    document.getElementById("home-screen").style.display = "none";
    document.getElementById("player-controller").style.display = "block";
    
    listenForData();
}

// --- 4. ANDMETE SÜNKROONIMINE ---
function listenForData() {
    // Kuula mängijaid ja skoore
    firebase.ref(db, 'session_active/players').on('value', (snap) => {
        const data = snap.val() || {};
        players = Object.keys(data);
        scores = data; // Firebase objekt sisaldab skoore

        // Uuenda lobby nimekirja
        const lobbyList = document.getElementById("player-list");
        if(lobbyList) lobbyList.innerHTML = players.map(p => `<span class="player-tag">${p}</span>`).join("");

        // Uuenda skoore ekraanil
        updateScoreDisplay();

        // Kui on mängija, kuva hääletusnupud
        if (!isHost) renderRemoteButtons();
    });

    // Kuula mängu seisundit (kas host alustas mängu)
    firebase.ref(db, 'session_active/status').on('value', (snap) => {
        if (snap.val() === "started" && !isHost) {
            document.getElementById("controller-status").innerText = "VALI SIHTMÄRK:";
        }
        if (snap.val() === "ended") location.reload();
    });

    // Kuula küsimusi (et mängija näeks ka, mille üle hääletatakse)
    firebase.ref(db, 'session_active/currentQ').on('value', (snap) => {
        if (!isHost && snap.val()) {
            document.getElementById("controller-status").innerText = snap.val();
        }
    });
}

// --- 5. MÄNGU JUHTIMINE ---
function startGame() {
    generateSessionCards();
    roomRef.update({ status: "started" });
    
    document.getElementById("bg-home").classList.remove("active");
    document.getElementById("bg-game").classList.add("active");
    document.getElementById("home-screen").style.display = "none";
    document.getElementById("game-interface").style.display = "block";
    setupPhase("dilemmad");
}

function renderCard() {
    const card = DB[currentTheme].cards[phaseCounters[currentTheme]];
    document.getElementById("task-text").innerText = card.q;
    document.getElementById("task-img").src = card.img;
    document.getElementById("card-num").innerText = (phaseCounters[currentTheme] + 1).toString().padStart(2, "0");
    
    // Saada küsimus andmebaasi, et mängijad näeksid seda telefonis
    if (isHost) {
        firebase.ref(db, 'session_active/currentQ').set(card.q);
    }
}

// --- 6. HÄÄLETAMINE ---
function renderRemoteButtons() {
    const container = document.getElementById("remote-vote-btns");
    if (!container) return;
    // Mängija ei saa hääletada iseenda poolt
    container.innerHTML = players
        .filter(p => p !== myName)
        .map(p => `<button class="vote-btn" onclick="givePointOnline('${p}')">${p}</button>`)
        .join("");
}

function givePointOnline(targetPlayer) {
    // Kasutame Firebase Transactioni, et punktid kaduma ei läheks
    firebase.ref(db, 'session_active/players/' + targetPlayer + '/score').transaction((currentScore) => {
        return (currentScore || 0) + 1;
    });
    
    // Tagasiside mängijale
    document.getElementById("remote-vote-btns").innerHTML = "<p style='color:var(--accent)'>HÄÄL SALVESTATUD!</p>";
    setTimeout(renderRemoteButtons, 2000);
}

// --- 7. ABIFUNKTSIOONID (Sinu originaalidest) ---
function generateSessionCards() {
    themeOrder.forEach(theme => {
        DB[theme].cards = [];
        for (let i = 0; i < 20; i++) {
            let q = theme === "dilemmad" ? `EELISTAKSID:\n> ${getRand("dilemmad")}\n\nVÕI:\n> ${getRand("asjad")}?` :
                    theme === "ryhmavaim" ? `KES TEIE HULGAST:\n> ${getRand("tegu_r")}?` :
                    `MISSIOON: ${getRand("missioon")}\nKRIIS: ${getRand("kriis")}\n\nABI: ${getRand("vahend")}`;
            DB[theme].cards.push({ q, img: Generator.images[i % 2] });
        }
    });
}

function getRand(key) { return Generator.vocab[key][Math.floor(Math.random() * Generator.vocab[key].length)]; }

function setupPhase(key) {
    currentTheme = key;
    document.getElementById("current-phase-name").innerText = "FAAS: " + key.toUpperCase();
    renderCard();
}

function updateScoreDisplay() {
    const display = document.getElementById("score-display");
    if (!display) return;
    display.innerHTML = Object.entries(scores)
        .sort((a,b) => b[1].score - a[1].score)
        .map(p => `<div style="display:flex;justify-content:space-between;border-bottom:1px solid #bbb;padding:2px 0;"><span>${p[0]}</span><span>${p[1].score} PTS</span></div>`)
        .join("");
}

function nextCard(e) {
    if (e) e.stopPropagation();
    const f = document.getElementById("folder");
    f.classList.replace("folder-open", "folder-closed");
    setTimeout(() => {
        phaseCounters[currentTheme] = (phaseCounters[currentTheme] + 1) % 20;
        setupPhase(themeOrder[(themeOrder.indexOf(currentTheme) + 1) % 3]);
        f.classList.replace("folder-closed", "folder-open");
    }, 600);
}

function openFolder() {
    const f = document.getElementById("folder");
    if (f && f.classList.contains("folder-closed")) f.classList.replace("folder-closed", "folder-open");
}

function endGame() {
    roomRef.update({ status: "ended" });
    document.getElementById("bg-game").classList.remove("active");
    document.getElementById("bg-final").classList.add("active");
    document.getElementById("game-interface").style.display = "none";
    document.getElementById("debrief-screen").style.display = "flex";
    
    const sorted = Object.entries(scores).sort((a, b) => b[1].score - a[1].score);
    document.getElementById("winner-announcement").innerHTML = `
        <h1 style="color:var(--red); font-size:2rem; text-align:center;">VÕITJA: ${sorted[0][0]}</h1>
    `;
    document.getElementById("final-leaderboard").innerHTML = sorted
        .map(p => `<div style="display:flex;justify-content:space-between;padding:5px;"><span>${p[0]}</span><span>${p[1].score} PTS</span></div>`)
        .join("");
}

function openFinalFolder() {
    const f = document.getElementById("final-folder");
    if (f) f.classList.replace("folder-closed", "folder-open");
}