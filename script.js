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
const phases = ["DILEMMAD", "STRATEEGIA", "ELLUJÄÄMINE"];

const quotes = [
    "\"Ainult surnud on näinud sõja lõppu.\" – Platon",
    "\"Sõda ei otsusta, kellel on õigus, vaid ainult seda, kes jääb järele.\" – Bertrand Russell",
    "\"Kõik sõjapidamine põhineb petmisel.\" – Sun Tzu",
    "\"Distsipliin on rünnaku hing.\" – George Washington"
];

const Generator = {
    vocab: {
        dilemmad: ["kanda neoonvesti rünnakul", "süüa rühmavanema toidupakk", "kaotada relva lukk", "kummikutesse kusemine", "välikäimla puhastamine hambaharjaga"],
        asjad: ["kuulivest ajalehega", "märg tikk", "tühjad kestad salves", "kiiver silmadel", "märgades sokkides tsivilisatsioon"],
        ryhmavaim: ["astuks miinile teiste eest", "kaupleks linnaloa üle", "viskaks kella granaadi asemel", "jääks magama valves", "müüks asukoha burgeri eest"],
        missioon: ["Vallutada välikäimla", "Hävitada kütuseauto", "Kaitsta kohvivaru", "Evakueerida rühmavanem"],
        kriis: ["48h magamata", "laskemoon on herned", "side on maas", "pesukarude rünnak"]
    },
    // KASUTAB KOHALIKKE FAILE (peavad olema HTML-iga samas kaustas)
    phaseImages: {
        "DILEMMAD": [
            "taku1.png", 
            "taku2.png",
            "taku3.png",
        ],
        "STRATEEGIA": [
            "sõda1.png",
            "sõda2.png",
            "sõda3.png",
            "sõda4.png",
            "sõda5.png",
            "sõda6.png",
            "sõda7.png",
            "sõda8.png",
            "sõda9.png",
            "sõda10.png",
            "sõda11.png",
            "sõda12.png",
            "sõda13.png",
            "sõda14.png",
            "sõda15.png"
        ],
        "ELLUJÄÄMINE": [
            "propa1.png",
            "propa2.png",
            "propa3.png",
            "propa4.png",
            "propa5.png"
        ]
    }
};

// --- JUHEND ---
function openManual() {
    document.getElementById("home-screen").style.display = "none";
    document.getElementById("manual-screen").style.display = "flex";
}
function closeManual() {
    document.getElementById("manual-screen").style.display = "none";
    document.getElementById("home-screen").style.display = "flex";
}

// --- MÄNGU LOOMINE ---
function hostGame() {
    isHost = true;
    myName = "HOST"; 
    gamePin = Math.floor(1000 + Math.random() * 9000).toString();
    roomRef = db.ref('rooms/' + gamePin);
    
    roomRef.set({ 
        status: "waiting", 
        phaseIndex: 0, 
        currentQ: "OOTAME ÜKSUSE KOGUNEMIST...",
        players: {} 
    }).then(() => {
        document.getElementById("status-msg").innerHTML = `PIN: <span style="color:#0f4; font-size:2.5rem; font-weight:bold;">${gamePin}</span>`;
        document.getElementById("start-btn").style.display = "block";
        listenForData();
    });
}

function joinGame() {
    myName = document.getElementById("player-name").value.trim().toUpperCase();
    if (!myName || myName === "HOST") return alert("SÕDUR, IDENTIFITSEERI ENNAST!");
    let inputPin = prompt("SISESTA PIN:");
    if (!inputPin) return;

    db.ref('rooms/' + inputPin).once('value', (snap) => {
        if (snap.exists()) {
            gamePin = inputPin;
            roomRef = db.ref('rooms/' + gamePin);
            roomRef.child('players/' + myName).set({ score: 0 });
            listenForData();
        } else alert("VALE PIN!");
    });
}

function listenForData() {
    roomRef.on('value', (snap) => {
        const data = snap.val();
        if (!data) return;
        scores = data.players || {};
        players = Object.keys(scores);
        phaseIndex = data.phaseIndex || 0;

        const pList = document.getElementById("player-list");
        if(pList) pList.innerHTML = "ÜKSUS: " + (players.length > 0 ? players.map(p => `<span class="player-tag">${p}</span>`).join(" ") : "OOTEL...");

        if (data.status === "started") {
            document.getElementById("bg-home").classList.remove("active");
            document.getElementById("bg-game").classList.add("active");
            document.getElementById("home-screen").style.display = "none";
            document.getElementById("game-interface").style.display = "block";
            if (isHost) {
                document.getElementById("host-next-btn").style.display = "block";
                document.getElementById("host-end-btn").style.display = "block";
            }
        }

        if (data.currentQ) {
            const taskEl = document.getElementById("task-text");
            if (taskEl.innerText !== data.currentQ) hasVotedThisRound = false; 
            taskEl.innerText = data.currentQ;
            
            // Pildi kuvamine
            const taskImg = document.getElementById("task-img");
            if (data.currentImg) {
                taskImg.src = data.currentImg;
                taskImg.style.display = "block";
            }

            document.getElementById("page-title").innerText = data.status === "waiting" ? "OOTEREŽIIM" : "ETAPP: " + phases[phaseIndex];
            document.querySelectorAll(".phase-step").forEach((el, idx) => el.classList.toggle("active", idx === phaseIndex));
            
            if (!isHost && data.status === "started") renderButtons();
        }

        if (data.status === "ended") showEndScreen(data.finalQuote);
        updateScoreDisplay();
    });
}

function startGame() { nextCard(); }

function nextCard() {
    // 1. Millist faasi me hetkel kuvame?
    const currentPhaseName = phases[phaseIndex];
    
    // 2. Vali pilt vastavalt praegusele faasile
    const phaseList = Generator.phaseImages[currentPhaseName];
    const img = phaseList[Math.floor(Math.random() * phaseList.length)];
    
    // 3. Genereeri küsimus
    const q = generateQuestion(currentPhaseName);
    
    // 4. Arvuta JÄRGMINE faas tuleviku jaoks
    let nextPhaseIdx = (phaseIndex + 1) % 3;
    
    // 5. Saada Firebase'i
    roomRef.update({ 
        status: "started", 
        currentQ: q, 
        currentImg: img,
        phaseIndex: nextPhaseIdx
    });
}

function generateQuestion(p) {
    if (p === "DILEMMAD") return `KAS EELISTAKSID:\n> ${Generator.vocab.dilemmad[Math.floor(Math.random()*5)]}\n\nVÕI:\n> ${Generator.vocab.asjad[Math.floor(Math.random()*5)]}?`;
    if (p === "RÜHMAVAIM") return `KES TEIE HULGAST KÕIGE TÕENÄOLISEMALT:\n> ${Generator.vocab.ryhmavaim[Math.floor(Math.random()*5)]}?`;
    return `MISSIOON: ${Generator.vocab.missioon[Math.floor(Math.random()*4)]}\nKRIIS: ${Generator.vocab.kriis[Math.floor(Math.random()*4)]}`;
}

function renderButtons() {
    const container = document.getElementById("remote-vote-btns");
    if (!container) return;
    if (hasVotedThisRound) {
        container.innerHTML = "<div class='voted-msg'>VALIK SAADETUD</div>";
        return;
    }
    // Host ei hääleta ja enda poolt ei hääleta
    container.innerHTML = players.filter(p => p !== myName && p !== "HOST").map(p => 
        `<button class="vote-btn-metal" onclick="vote('${p}')">${p}</button>`
    ).join("");
}

function vote(target) {
    hasVotedThisRound = true;
    roomRef.child('players/' + target + '/score').transaction(s => (s || 0) + 1);
    renderButtons();
}

function updateScoreDisplay() {
    const display = document.getElementById("score-display");
    if (!display) return;
    display.innerHTML = "<b>ÜKSUSE SKOORID:</b><br>" + Object.entries(scores).sort((a,b) => b[1].score - a[1].score)
        .map(p => `<div style="display:flex;justify-content:space-between;border-bottom:1px solid #999;padding:2px 0;color:#000;"><span>${p[0]}</span><span>${p[1].score}</span></div>`).join("");
}

function terminateMission() {
    roomRef.update({ status: "ended", finalQuote: quotes[Math.floor(Math.random() * quotes.length)] });
}

function showEndScreen(quote) {
    document.getElementById("bg-game").classList.remove("active");
    document.getElementById("bg-final").classList.add("active");
    document.getElementById("game-content").style.display = "none";
    document.getElementById("end-screen-content").style.display = "block";
    if (quote) document.getElementById("war-quote").innerText = quote;
    const sorted = Object.entries(scores).sort((a,b) => b[1].score - a[1].score);
    if (sorted.length > 0) {
        document.getElementById("winner-box").innerHTML = `<h1>VÕITJA: ${sorted[0][0]}</h1><h2>${sorted[0][1].score} PUNKTIGA</h2>`;
    }
}