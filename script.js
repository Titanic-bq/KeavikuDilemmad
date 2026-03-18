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
    roomRef.set({ status: "waiting", currentQ: "VALMISTUN...", phaseIndex: 0 }).then(() => {
        document.getElementById("status-msg").innerHTML = `PIN: <span class="blink-text" style="color:#0f4; font-size:2rem;">${gamePin}</span>`;
        document.getElementById("start-btn").style.display = "block";
        listenForData();
    });
}

function joinGame() {
    myName = document.getElementById("player-name").value.trim().toUpperCase();
    if (!myName) return alert("NIMI!");
    let inputPin = prompt("PIN:");
    if (!inputPin) return;
    db.ref('rooms/' + inputPin).once('value', (snap) => {
        if (snap.exists()) {
            gamePin = inputPin; roomRef = db.ref('rooms/' + gamePin);
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

        // Vaadete sünkroonimine
        if (data.status === "started") {
            document.getElementById("home-screen").style.display = "none";
            document.getElementById("game-interface").style.display = "block";
            if (isHost) document.getElementById("host-next-btn").style.display = "block";
        }

        if (data.status === "ended") {
            showEndScreen();
        }

        // Sisu uuendamine (Sama pilt ja tekst kõigile!)
        if (data.currentQ) {
            document.getElementById("task-text").innerText = data.currentQ;
            document.getElementById("task-img").src = data.currentImg || "";
            document.getElementById("card-num").innerText = (phaseIndex + 1).toString().padStart(2, "0");
            
            const currentPhase = phases[phaseIndex];
            document.getElementById("page-title").innerText = currentPhase + " RAPORT";
            
            // Hotbari sünkro
            document.querySelectorAll(".phase-step").forEach((el, idx) => {
                el.classList.toggle("active", idx === phaseIndex);
            });

            if (!isHost) renderButtons();
        }
        updateScoreDisplay();
    });
}

function startGame() {
    const q = generateQuestion("DILEMMAD");
    const img = Generator.images[0];
    roomRef.update({ 
        status: "started", 
        currentQ: q, 
        currentImg: img,
        phaseIndex: 0 
    });
}

function nextCard() {
    if (phaseIndex < 2) {
        phaseIndex++;
        const currentPhase = phases[phaseIndex];
        const q = generateQuestion(currentPhase);
        const img = Generator.images[phaseIndex % Generator.images.length];
        
        roomRef.update({
            currentQ: q,
            currentImg: img,
            phaseIndex: phaseIndex
        });
    } else {
        roomRef.update({ status: "ended" });
    }
}

function generateQuestion(p) {
    if (p === "DILEMMAD") return `KAS EELISTAKSID:\n> ${Generator.vocab.dilemmad[Math.floor(Math.random()*5)]}\n\nVÕI:\n> ${Generator.vocab.asjad[Math.floor(Math.random()*5)]}?`;
    if (p === "RÜHMAVAIM") return `KES TEIE HULGAST KÕIGE TÕENÄOLISEMALT:\n> ${Generator.vocab.ryhmavaim[Math.floor(Math.random()*5)]}?`;
    return `MISSIOON: ${Generator.vocab.missioon[Math.floor(Math.random()*4)]}\nKRIIS: ${Generator.vocab.kriis[Math.floor(Math.random()*4)]}`;
}

function renderButtons() {
    const container = document.getElementById("remote-vote-btns");
    if (hasVotedThisRound) {
        container.innerHTML = "<div class='voted-msg'>VALIK TEHTUD</div>";
        return;
    }
    container.innerHTML = players.filter(p => p !== myName).map(p => 
        `<button class="vote-btn-metal" onclick="vote('${p}')">SÕDUR ${p}</button>`
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
    display.innerHTML = Object.entries(scores).sort((a,b) => b[1].score - a[1].score)
        .map(p => `<div style="display:flex;justify-content:space-between;border-bottom:1px solid #999;font-size:0.7rem;color:#000;padding:2px 0;"><span>${p[0]}</span><span>${p[1].score} PTS</span></div>`).join("");
}

function showEndScreen() {
    document.getElementById("game-content").style.display = "none";
    document.getElementById("end-screen-content").style.display = "block";
    const sorted = Object.entries(scores).sort((a,b) => b[1].score - a[1].score);
    if (sorted.length > 0) {
        document.getElementById("winner-box").innerHTML = `
            <h2 style="color:#bc0000; font-size: 1.8rem;">VÕITJA: ${sorted[0][0]}</h2>
            <p>TULEMUS: ${sorted[0][1].score} PUNKTI</p>
        `;
    }
}

function endGame() { if(confirm("ABORT?")) location.reload(); }