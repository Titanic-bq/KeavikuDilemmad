const Generator = {
    usedWords: new Set(),
    vocab: {
        dilemmad: ["kanda öisel rünnakul helendavat neoonvesti", "süüa rühmavanema viimane soe toidupakk", "kaotada relva lukk enne inspekteerimist", "veetma õppus kummikutes, kuhu rühmakaaslane kuses", "puhastada hambaharjaga välikäimlat"],
        asjad: ["kuulivest on täidetud ajalehega", "ainus soojusallikas on märg tikk", "salvedes on tühjad kestad", "kiiver kukub silmadele", "märgades sokkides on arenenud tsivilisatsioon"],
        tegu_r: ["astuks miini peale", "hakkaks rünnaku ajal linnaloa üle kauplema", "viskaks granaadi asemel käekella", "jääks magama kui rühmavanem küsib: kes valvab?", "müüks asukoha burgeri eest"],
        missioon: ["Vallutada välikäimla", "Hävitada kütuseauto", "Kaitsta kohvivaru", "Evakueerida 120kg rühmavanem"],
        kriis: ["üksus on 48h magamata", "laskemoon on herned", "side on maas", "vaenlane kasutab ründamiseks pesukarusid"],
        vahend: ["rull teipi ja märg küpsis", "depressiivne orav", "papist tankimudelid", "vana megafon"]
    },
    // Pildid erinevateks etappideks
    uiImages: {
        start: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800", // Avavaade
        game: [
            "https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=500", 
            "https://images.unsplash.com/photo-1599408162165-8b111666e191?w=500"
        ],
        end: "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800" // Lõpuvaade
    }
};

let DB = { dilemmad: { cards: [] }, ryhmavaim: { cards: [] }, strateegia: { cards: [] } };
let players = []; 
let scores = {}; 
let gameMode = "locked"; 
let currentTheme = "dilemmad";
let phaseCounters = { dilemmad: 0, ryhmavaim: 0, strateegia: 0 };
let votesThisRound = 0; // Jälgib jooksva raundi hääli
const themeOrder = ["dilemmad", "ryhmavaim", "strateegia"];

// --- ABIFUNKTSIOONID ---

function getRand(key) {
    const list = Generator.vocab[key];
    return list[Math.floor(Math.random() * list.length)];
}

function playSnd(id) { 
    const a = document.getElementById(id); 
    if (a) { a.currentTime = 0; a.play().catch(() => {}); } 
}

// --- MÄNGU SEADISTAMINE ---

function addPlayer() {
    const input = document.getElementById("player-name");
    const name = input.value.trim().toUpperCase();
    if (name && players.length < 10 && !players.includes(name)) {
        players.push(name); 
        scores[name] = 0; 
        input.value = "";
        updatePlayerUI();
        playSnd("snd-click");
    }
}

function updatePlayerUI() {
    document.getElementById("player-list").innerHTML = players.map(p => `<span class="player-tag">${p}</span>`).join("");
    document.getElementById("start-btn").style.display = players.length >= 2 ? "inline-block" : "none";
}

function generateSessionCards() {
    themeOrder.forEach(theme => {
        DB[theme].cards = [];
        for (let i = 0; i < 20; i++) {
            let q = theme === "dilemmad" ? `EELISTAKSID PIGEM:\n> ${getRand("dilemmad")}\n\nVÕI SEDA, ET:\n> ${getRand("asjad")}?` :
                    theme === "ryhmavaim" ? `KES TEIE HULGAST TÕENÄOLISEMALT:\n> ${getRand("tegu_r")}?` :
                    `MISSIOON: ${getRand("missioon")}\nKRIIS: ${getRand("kriis")}\n\nABI: ${getRand("vahend")}`;
            
            // Valime mängu piltide hulgast
            DB[theme].cards.push({ q, img: Generator.uiImages.game[i % Generator.uiImages.game.length] });
        }
    });
}

function startGame() {
    if (players.length < 2) return;
    generateSessionCards();
    const modeInput = document.querySelector('input[name="game-mode"]:checked');
    gameMode = modeInput ? modeInput.value : "locked";
    
    document.getElementById("home-screen").style.display = "none";
    document.getElementById("game-interface").style.display = "block";
    
    setupPhase("dilemmad");
    updateScoreDisplay();
    playSnd("snd-click");
}

// --- MÄNGU KULG ---

function setupPhase(key) {
    currentTheme = key;
    document.getElementById("current-phase-name").innerText = key.toUpperCase();
    
    document.querySelectorAll(".nav-toggle").forEach(b => {
        b.classList.remove("active");
        b.style.pointerEvents = gameMode === "locked" ? "none" : "auto";
    });
    
    const activeBtn = document.getElementById("btn-" + key);
    if (activeBtn) activeBtn.classList.add('active');
    
    renderCard();
}

function renderCard() {
    votesThisRound = 0; // Lähtesta hääled uue kaardi puhul
    const card = DB[currentTheme].cards[phaseCounters[currentTheme]];
    
    document.getElementById("task-text").innerText = card.q;
    document.getElementById("task-img").src = card.img;
    document.getElementById("card-num").innerText = (phaseCounters[currentTheme] + 1).toString().padStart(2, "0");
    
    updateVoteButtons(); 
}

function updateVoteButtons() {
    const container = document.getElementById("vote-btns-container");
    container.innerHTML = `
        <div style="margin-bottom: 8px; font-size: 0.75rem; color: #888; font-family: monospace;">
            HÄÄLI JÄÄNUD: <span id="votes-countdown">${players.length - votesThisRound}</span>
        </div>
        ${players.map(p => `<button class="vote-btn" onclick="givePoint('${p}')">${p}</button>`).join("")}
    `;
}

function givePoint(p) {
    // Kontrolli, kas hääli on veel alles
    if (votesThisRound < players.length) {
        if (scores.hasOwnProperty(p)) {
            scores[p]++;
            votesThisRound++;
            playSnd("snd-click");
            
            updateScoreDisplay();
            
            // Uuenda loendurit ekraanil
            const countdown = document.getElementById("votes-countdown");
            if (countdown) countdown.innerText = players.length - votesThisRound;

            // Kui kõik on hääletanud, lukusta nupud
            if (votesThisRound >= players.length) {
                document.querySelectorAll(".vote-btn").forEach(btn => {
                    btn.style.opacity = "0.3";
                    btn.style.pointerEvents = "none";
                });
            }
        }
    }
}

function updateScoreDisplay() {
    document.getElementById("score-display").innerHTML = players
        .map(p => `<div class="score-row"><span>${p}</span><span>${scores[p]} PTS</span></div>`)
        .join("");
}

function nextCard(e) {
    if (e) e.stopPropagation();
    playSnd("snd-paper");
    
    if (gameMode === "locked") {
        let nextIdx = (themeOrder.indexOf(currentTheme) + 1) % 3;
        phaseCounters[currentTheme] = (phaseCounters[currentTheme] + 1) % 20;
        
        const f = document.getElementById("folder");
        f.classList.replace("folder-open", "folder-closed");
        
        setTimeout(() => { 
            setupPhase(themeOrder[nextIdx]); 
            f.classList.replace("folder-closed", "folder-open"); 
        }, 600);
    } else {
        phaseCounters[currentTheme] = (phaseCounters[currentTheme] + 1) % 20;
        renderCard();
    }
}

function openFolder() {
    const f = document.getElementById("folder");
    if (f.classList.contains("folder-closed")) { 
        playSnd("snd-folder"); 
        f.classList.replace("folder-closed", "folder-open"); 
    }
}

function changePhaseManual(key) { 
    if (gameMode === "free") { 
        playSnd("snd-click"); 
        setupPhase(key); 
    } 
}

function endGame() {
    playSnd("snd-click");
    document.getElementById("game-interface").style.display = "none";
    document.getElementById("debrief-screen").style.display = "flex";
    
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    
    document.getElementById("winner-announcement").innerHTML = `
        <h2>PARIM ANALÜÜTIK:</h2>
        <span class="winner-name">${sorted[0][0]}</span>
    `;
    
    document.getElementById("final-leaderboard").innerHTML = sorted
        .map(p => `<div class="final-row"><span>${p[0]}</span><span>${p[1]} PTS</span></div>`)
        .join("");
}

// Kuulajad
document.getElementById("player-name").addEventListener("keypress", (e) => { 
    if (e.key === "Enter") addPlayer(); 
});