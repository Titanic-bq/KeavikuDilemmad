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

let isHost = false, myName = "", gamePin = "", roomRef = null;
let players = [], scores = {}, hasVotedThisRound = false;
let phaseIndex = 0;
const phases = ["DILEMMAD", "RÜHMAVAIM", "STRATEEGIA"];

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

function hostGame() {
    isHost = true;
    gamePin = Math.floor(1000 + Math.random() * 9000).toString();
    roomRef = db.ref('rooms/' + gamePin);
    roomRef.set({ status: "waiting", currentQ: "VALMISTUN..." }).then(() => {
        document.getElementById("status-msg").innerHTML = `PIN: <span class="blink-text" style="color:#0f4; font-size:2rem;">${gamePin}</span>`;
        document.getElementById("start-btn").style.display = "block";
        listenForData();
    });
}

function joinGame() {
    myName = document.getElementById("player-name").value.trim().toUpperCase();
    if (!myName) return alert("SÕDUR, NIMI!");
    let inputPin = prompt("SISESTA PIN:");
    if (!inputPin) return;
    db.ref('rooms/' + inputPin).once('value', (snap) => {
        if (snap.exists()) {
            gamePin = inputPin; roomRef = db.ref('rooms/' + gamePin);
            roomRef.child('players/' + myName).set({ score: 0 });
            document.getElementById("home-screen").style.display = "none";
            document.getElementById("player-controller").style.display = "flex";
            listenForData();
        } else alert("VALE PIN!");
    });
}

function listenForData() {
    roomRef.child('players').on('value', (snap) => {
        scores = snap.val() || {}; players = Object.keys(scores);
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
    });
}

function startGame() {
    phaseIndex = 0;
    roomRef.update({ status: "started" });
    renderCurrentPhase();
}

function renderCurrentPhase() {
    const currentPhase = phases[phaseIndex];
    document.querySelectorAll(".phase-step").forEach((el, idx) => {
        el.classList.toggle("active", idx === phaseIndex);
    });

    document.getElementById("folder-title").innerHTML = "MISSIOON:<br>" + currentPhase;
    document.getElementById("page-title").innerText = currentPhase + " RAPORT";

    let q = "";
    if (phaseIndex === 0) {
        q = `KAS EELISTAKSID:\n> ${Generator.vocab.dilemmad[Math.floor(Math.random()*5)]}\n\nVÕI:\n> ${Generator.vocab.asjad[Math.floor(Math.random()*5)]}?`;
    } else if (phaseIndex === 1) {
        q = `KES TEIE HULGAST:\n> ${Generator.vocab.ryhmavaim[Math.floor(Math.random()*5)]}?`;
    } else {
        q = `MISSIOON: ${Generator.vocab.missioon[Math.floor(Math.random()*4)]}\nKRIIS: ${Generator.vocab.kriis[Math.floor(Math.random()*4)]}`;
    }

    document.getElementById("task-text").innerText = q;
    document.getElementById("task-img").src = Generator.images[phaseIndex % Generator.images.length];
    document.getElementById("card-num").innerText = (phaseIndex + 1).toString().padStart(2, "0");
    document.getElementById("card-num-2").innerText = (phaseIndex + 1);
    
    if (isHost) roomRef.update({ currentQ: q });

    const nextBtn = document.querySelector(".metal-btn-large");
    nextBtn.innerText = (phaseIndex < 2) ? "JÄRGMINE ETAPP >>" : "VAATA LÕPPRAPORTIT";
}

function nextCard() {
    if (phaseIndex < 2) {
        phaseIndex++;
        document.getElementById("folder").classList.replace("folder-open", "folder-closed");
        setTimeout(renderCurrentPhase, 400);
    } else {
        showEndScreen();
    }
}

function showEndScreen() {
    document.getElementById("game-content").style.display = "none";
    document.getElementById("end-screen-content").style.display = "block";
    const sorted = Object.entries(scores).sort((a,b) => b[1].score - a[1].score);
    if (sorted.length > 0) {
        document.getElementById("winner-box").innerHTML = `
            <h2 style="color:#bc0000; font-size: 2rem;">VÕITJA: ${sorted[0][0]}</h2>
            <h3>SKOOR: ${sorted[0][1].score} PUNKTI</h3>
        `;
    }
    document.getElementById("final-stats").innerHTML = sorted.map(p => `<div>${p[0]}: ${p[1].score} pts</div>`).join("");
}

function renderButtons() {
    const container = document.getElementById("remote-vote-btns");
    if (!container || hasVotedThisRound) return;
    
    // Filtreerime välja enda nime ja tekitame nupud
    if (players.length <= 1) {
        container.innerHTML = "<div style='color:#666; text-align:center;'>OOTAME TEISI SÕDUREID...</div>";
        return;
    }

    container.innerHTML = players.filter(p => p !== myName).map(p => 
        `<button class="vote-btn-metal" onclick="vote('${p}')">SÕDUR: ${p}</button>`
    ).join("");
}


function vote(target) {
    hasVotedThisRound = true;
    roomRef.child('players/' + target + '/score').transaction(s => (s || 0) + 1);
    document.getElementById("remote-vote-btns").innerHTML = "<div class='voted-msg'>VALIK SAADETUD</div>";
}

function updateScoreDisplay() {
    const display = document.getElementById("score-display");
    if (!display) return;
    display.innerHTML = Object.entries(scores).sort((a,b) => b[1].score - a[1].score)
        .map(p => `<div style="display:flex;justify-content:space-between;border-bottom:1px solid #999;font-size:0.8rem;color:#000;"><span>${p[0]}</span><span>${p[1].score} PTS</span></div>`).join("");
}

function openFolder() { document.getElementById("folder").classList.replace("folder-closed", "folder-open"); }
function endGame() { if(confirm("ABORT MISSION?")) location.reload(); }