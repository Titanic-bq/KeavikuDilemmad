// --- 1. FIREBASE KONFIGURATSIOON ---
const firebaseConfig = {
    apiKey: "AIzaSyAXGJ5lGVFCKa0JO6ga6KuOy51xPbMdzlY",
    authDomain: "kaevikudilemmad.firebaseapp.com",
    databaseURL: "https://kaevikudilemmad-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "kaevikudilemmad",
    storageBucket: "kaevikudilemmad.firebasestorage.app",
    messagingSenderId: "292604369801",
    appId: "1:292604369801:web:425c7d17c97843ddbb5f58"
};

// Algatame Firebase'i (compat versioon)
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// --- 2. GLOBAALSED MUUTUJAD ---
let isHost = false;
let myName = "";
let gamePin = "";
let roomRef = null;
let players = [];
let scores = {};
let hasVotedThisRound = false;

// Sisu generaator (Dilemmad ja pildid)
const Generator = {
    vocab: {
        dilemmad: ["kanda neoonvesti rünnakul", "süüa rühmavanema toidupakk", "kaotada relva lukk", "kummikutesse kusemine", "välikäimla puhastamine hambaharjaga", "magada valves olles", "kaotada linnaluba"],
        asjad: ["kuulivest ajalehega", "märg tikk", "tühjad kestad salves", "kiiver silmadel", "märgades sokkides tsivilisatsioon", "tühi veepudel"],
    },
    images: [
        "https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=500", 
        "https://images.unsplash.com/photo-1599408162165-8b111666e191?w=500",
        "https://images.unsplash.com/photo-1579546671585-7844a13a969a?w=500",
        "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500"
    ]
};

// --- 3. MÄNGUGA LIITUMINE JA LOOMINE ---

function hostGame() {
    isHost = true;
    gamePin = Math.floor(1000 + Math.random() * 9000).toString(); // Genereerib 4-kohalise PIN-i
    roomRef = db.ref('rooms/' + gamePin);
    
    roomRef.set({
        status: "waiting",
        currentQ: "VALMISTUMINE..."
    }).then(() => {
        document.getElementById("status-msg").innerHTML = `MÄNGU PIN: <span style="color:#0f4; font-size:2.5rem; font-weight:bold;">${gamePin}</span>`;
        document.getElementById("start-btn").style.display = "block";
        listenForData();
    });
}

function joinGame() {
    isHost = false;
    myName = document.getElementById("player-name").value.trim().toUpperCase();
    
    if (!myName) {
        alert("SÕDUR, SISESTA OMA NIMI!");
        return;
    }

    let inputPin = prompt("SISESTA 4-KOHALINE MÄNGU PIN:");
    if (!inputPin) return;

    db.ref('rooms/' + inputPin).once('value', (snap) => {
        if (snap.exists()) {
            gamePin = inputPin;
            roomRef = db.ref('rooms/' + gamePin);
            
            // Lisame mängija andmebaasi
            roomRef.child('players/' + myName).set({ score: 0 });
            
            // Vahetame vaadet
            document.getElementById("home-screen").style.display = "none";
            document.getElementById("player-controller").style.display = "flex";
            listenForData();
        } else {
            alert("VALE PIN-KOOD! KONTROLLI HOSTI EKRAANILT.");
        }
    });
}

// --- 4. ANDMETE KUULAMINE REAALAJAS ---

function listenForData() {
    // 1. Skoorid ja mängijate nimekiri
    roomRef.child('players').on('value', (snap) => {
        scores = snap.val() || {};
        players = Object.keys(scores);
        
        // Uuendame lobby nimekirja avakuval (hostile)
        const lobby = document.getElementById("player-list");
        if(lobby) lobby.innerHTML = players.map(p => `<span class="player-tag">${p}</span>`).join("");
        
        updateScoreDisplay();
        if (!isHost && !hasVotedThisRound) renderButtons();
    });

    // 2. Küsimuse muutumine (telefonis)
    roomRef.child('currentQ').on('value', (snap) => {
        if (!isHost && snap.val()) {
            hasVotedThisRound = false; 
            document.getElementById("controller-status").innerText = snap.val();
            renderButtons();
        }
    });

    // 3. Mängu staatuse muutumine (start/end)
    roomRef.child('status').on('value', (snap) => {
        const status = snap.val();
        if (status === "started" && isHost) {
            document.getElementById("home-screen").style.display = "none";
            document.getElementById("game-interface").style.display = "block";
        }
        if (status === "ended") {
            location.reload(); // See taastab algse puhta disaini kõigil
        }
    });
}

// --- 5. MÄNGU KULG ---

function startGame() {
    roomRef.update({ status: "started" });
    nextCard();
}

function nextCard() {
    // Genereerime uue dilemma
    const d = Generator.vocab.dilemmad[Math.floor(Math.random() * Generator.vocab.dilemmad.length)];
    const a = Generator.vocab.asjad[Math.floor(Math.random() * Generator.vocab.asjad.length)];
    const q = `KAS SA EELISTAKSID:\n> ${d.toUpperCase()}\n\nVÕI:\n> ${a.toUpperCase()}?`;
    
    // Valime juhusliku pildi
    const img = Generator.images[Math.floor(Math.random() * Generator.images.length)];
    
    // Uuendame Host'i ekraani (Kaustas olevat paberit)
    document.getElementById("task-text").innerText = q;
    document.getElementById("task-img").src = img;
    
    // Suletud kaust avaneb klõpsuga, aga kaardi vahetamisel paneme korraks kinni/lahti efekti jaoks
    const folder = document.getElementById("folder");
    if(folder.classList.contains("folder-open")) {
        folder.classList.replace("folder-open", "folder-closed");
    }

    // Saadame küsimuse andmebaasi mängijatele
    if (isHost) {
        roomRef.update({ currentQ: q });
    }
}

function renderButtons() {
    const container = document.getElementById("remote-vote-btns");
    if (!container || hasVotedThisRound) return;

    // Tekitame nupud teiste mängijate nimedega
    container.innerHTML = players.filter(p => p !== myName).map(p => 
        `<button class="vote-btn" onclick="vote('${p}')">${p}</button>`
    ).join("");
}

function vote(target) {
    if (hasVotedThisRound) return;
    hasVotedThisRound = true;
    
    // Lisame punkti sihtmärgile
    roomRef.child('players/' + target + '/score').transaction(s => (s || 0) + 1);
    document.getElementById("remote-vote-btns").innerHTML = "<div class='voted-msg'>HÄÄL ANTUD!</div>";
}

function updateScoreDisplay() {
    const display = document.getElementById("score-display");
    if (!display) return;
    
    // Sorteerime mängijad skooride järgi ja kuvame paberil
    display.innerHTML = Object.entries(scores)
        .sort((a,b) => b[1].score - a[1].score)
        .map(p => `<div style="display:flex;justify-content:space-between;border-bottom:1px solid #999;font-size:0.85rem;color:#000;padding:2px 0;">
            <span>${p[0]}</span>
            <span>${p[1].score} PTS</span>
        </div>`).join("");
}

// --- 6. ABI-FUNKTSIOONID ---

function openFolder() {
    const folder = document.getElementById("folder");
    if(folder.classList.contains("folder-closed")) {
        folder.classList.replace("folder-closed", "folder-open");
    }
}

function endGame() {
    if (confirm("KAS LÕPETAME MISSIOONI JA KUSTUTAME TOA?")) {
        roomRef.update({ status: "ended" }).then(() => {
            roomRef.remove(); // Puhastab andmebaasi
        });
    }
}