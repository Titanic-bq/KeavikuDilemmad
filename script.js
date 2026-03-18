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
let votesThisRound = 0; 
const themeOrder = ["dilemmad", "ryhmavaim", "strateegia"];

function playSnd(type) { console.log("SND: " + type); }

// NAVIGATSIOON
function openManual() {
    document.getElementById("home-screen").style.display = "none";
    document.getElementById("manual-screen").style.display = "flex";
}

function closeManual() {
    document.getElementById("manual-screen").style.display = "none";
    document.getElementById("home-screen").style.display = "block";
}

function getRand(key) { return Generator.vocab[key][Math.floor(Math.random() * Generator.vocab[key].length)]; }

function addPlayer() {
    const input = document.getElementById("player-name");
    const name = input.value.trim().toUpperCase();
    if (name && players.length < 10 && !players.includes(name)) {
        players.push(name); 
        scores[name] = 0; 
        input.value = "";
        document.getElementById("player-list").innerHTML = players.map(p => 
            `<span style="border:1px solid var(--accent); padding:2px 8px; margin:4px; display:inline-block; font-size:0.75rem;">${p}</span>`
        ).join("");
        if (players.length >= 2) document.getElementById("start-btn").style.display = "inline-block";
    }
}

function hostGame() { addPlayer(); document.getElementById("status-msg").innerText = "HOST REŽIIM: AKTIVEERITUD"; }
function joinGame() { addPlayer(); document.getElementById("status-msg").innerText = "SÕDUR: LIITUNUD"; }

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

function startGame() {
    generateSessionCards();
    document.getElementById("bg-home").classList.remove("active");
    document.getElementById("bg-game").classList.add("active");
    document.getElementById("home-screen").style.display = "none";
    document.getElementById("game-interface").style.display = "block";
    setupPhase("dilemmad");
}

function setupPhase(key) {
    currentTheme = key;
    document.getElementById("current-phase-name").innerText = "FAAS: " + key.toUpperCase();
    renderCard();
}

function renderCard() {
    votesThisRound = 0;
    const card = DB[currentTheme].cards[phaseCounters[currentTheme]];
    document.getElementById("task-text").innerText = card.q;
    document.getElementById("task-img").src = card.img;
    document.getElementById("card-num").innerText = (phaseCounters[currentTheme] + 1).toString().padStart(2, "0");
    document.getElementById("current-date").innerText = new Date().toLocaleDateString('et-EE');
    
    updateVoteButtons();
    updateScoreDisplay();
}

function updateVoteButtons() {
    document.getElementById("vote-btns-container").innerHTML = `
        <div style="font-size:0.6rem; color:#666; margin-bottom:5px; text-transform:uppercase;">Hääli ootel: ${players.length - votesThisRound}</div>
        ${players.map(p => `<button class="vote-btn" onclick="givePoint('${p}')">${p}</button>`).join("")}
    `;
}

function givePoint(p) {
    if (votesThisRound < players.length) {
        scores[p]++; 
        votesThisRound++; 
        updateScoreDisplay(); 
        updateVoteButtons();
        if (votesThisRound >= players.length) {
            document.querySelectorAll(".vote-btn").forEach(b => b.style.opacity = "0.3");
        }
    }
}

function updateScoreDisplay() {
    document.getElementById("score-display").innerHTML = Object.entries(scores)
        .sort((a,b) => b[1] - a[1])
        .map(p => `<div style="display:flex;justify-content:space-between;border-bottom:1px solid #bbb;padding:2px 0;"><span>${p[0]}</span><span>${p[1]} PTS</span></div>`)
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
    if (f.classList.contains("folder-closed")) f.classList.replace("folder-closed", "folder-open");
}

function endGame() {
    document.getElementById("bg-game").classList.remove("active");
    document.getElementById("bg-final").classList.add("active");
    document.getElementById("game-interface").style.display = "none";
    document.getElementById("debrief-screen").style.display = "flex";
    
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    document.getElementById("winner-announcement").innerHTML = `
        <h1 style="color:var(--red); font-size:2rem; text-align:center;">VÕITJA: ${sorted[0][0]}</h1>
    `;
    document.getElementById("final-leaderboard").innerHTML = sorted
        .map(p => `<div style="display:flex;justify-content:space-between;padding:5px;"><span>${p[0]}</span><span>${p[1]} PTS</span></div>`)
        .join("");
}

function openFinalFolder() {
    const f = document.getElementById("final-folder");
    if (f) f.classList.replace("folder-closed", "folder-open");
}

document.getElementById("player-name").addEventListener("keypress", (e) => { if (e.key === "Enter") addPlayer(); });