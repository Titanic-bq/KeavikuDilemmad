/**
 * KAEVIKUDRAAMA - Mängumootor v1.1
 * Autor: Gemini (Adaptive AI Collaborator)
 */

const Generator = {
  usedWords: new Set(),
  vocab: {
    dilemmad: [
      "kanda öisel rünnakul helendavat neoonvesti, et olla 'nähtav juht'",
      "süüa rühmavanema silme all ära tema viimane ja ainus soe toidupakk",
      "kaotada oma relva lukk täpselt 5 minutit enne suurt inspekteerimist",
      "veeta terve talvise õppuse kummikutes, kuhu rühmakaaslane 'kogemata' kuses",
      "tassida üksi tagasi kogu rühma varustus, olles ise ainus 'ellujääja'",
      "puhastada hambaharjaga välikäimlat, kuni teised lähevad linnaloale",
      "magada kaevikus, mis on poolenisti täitunud lörtsi ja kaaslaste pisaratega",
      "teatada rühmale, et sinu näpovea tõttu tühistati kõigi puhkused",
      "kaevata endale kaevik paekivisse, kasutades ainult plastikust lusikat",
      "asendada oma relva salv banaaniga ja loota, et keegi ei märka",
    ],
    asjad: [
      "sinu kuulivest on täidetud vana ajalehepaberiga",
      "sinu ainus soojusallikas on märg tikk ja lootusetus",
      "sinu salvedes on paukpadrunite asemel tühjad kestad",
      "sinu automaat on nii roostes, et see on nüüd ametlikult külmrelv",
      "toidupakis on ainult üks kuivanud küpsis ja kiri 'Edu, sõdur!'",
      "sinu märgades sokkides on arenenud uus ja agressiivne tsivilisatsioon",
      "sinu kiiver kukub silmadele iga kord, kui sa proovid sihtida",
    ],
    tegu_r: [
      "astuks miini peale isegi siis, kui see on lipukestega tähistatud",
      "hakkaks rünnaku ajal vaenlasega linnaloa tingimuste üle kauplema",
      "viskaks granaadi asemel oma käekella ja jätaks splindi kätte",
      "jääks magama täpselt sel hetkel, kui rühmavanem küsib: 'Kes valvab?'",
      "hakkaks kaevikus lõket tegema, kasutades kütuseks rühma ainsat kaarti",
      "laseks kogemata puruks rühma viimase ellujäämispaki",
      "kaotaks öise häire ajal püksid ja jookseks rünnakule aluspesus",
      "müüks rühma asukoha maha ühe sooja burgeri ja külma joogi eest",
    ],
    missioon: [
      "Vallutada tagasi üksuse välikäimla",
      "Hävitada vaenlase kütuseauto, kasutades ainult kive",
      "Toimetada salajane armastuskiri läbi rindejoone",
      "Peatada pealetungiv tankikolonn tühja rinnaga",
      "Evakueerida haavatud rühmavanem, kes kaalub 120 kilo",
      "Kaitsta rühma viimast ja ainsat kohvivaru",
      "Hävitada vaenlase raadiomast ilma tööriistadeta",
    ],
    kriis: [
      "kogu üksus on 48 tundi magamata ja näeb hallutsinatsioone",
      "laskemoon on asendatud kuivatatud hernestega",
      "vaenlane kasutab ründamiseks näljaseid pesukarusid",
      "teie asukoht reedeti helendavate saabaste tõttu",
      "side on maas ja rühmavanem nutab looteasendis",
      "olete ümber piiratud ja teil on jäänud ainult üks suitsupomm",
    ],
    vahend: [
      "rull teipi ja poolik märg küpsis",
      "üksainus depressiivne ja treenitud orav",
      "kakskümmend liitrit hapuks läinud piima",
      "vana megafon ja nimekiri rühmavanema solvangutest",
      "katkine sandaal ja pakk aegunud närimiskummi",
      "papist tankimudelid ja liigselt enesekindlust",
    ],
  },
  images: [
    "https://images.unsplash.com/photo-1508614589041-895b88991e3e?w=500",
    "https://images.unsplash.com/photo-1599408162165-8b111666e191?w=500",
    "https://images.unsplash.com/photo-1595438662299-5d7540450b3d?w=500",
  ],
};

let DB = {
  dilemmad: { cards: [] },
  ryhmavaim: { cards: [] },
  strateegia: { cards: [] },
};

let players = [];
let scores = {};
let gameMode = "locked";
let currentTheme = "dilemmad";
let phaseCounters = { dilemmad: 0, ryhmavaim: 0, strateegia: 0 };
const themeOrder = ["dilemmad", "ryhmavaim", "strateegia"];

/**
 * Valib unikaalse sõna sõnastikust. Kui sõnad otsas, tühjendab ajaloo.
 */
function getUniqueRand(key) {
  const list = Generator.vocab[key];
  if (!list) return "ERROR";

  let available = list.filter((word) => !Generator.usedWords.has(word));

  if (available.length === 0) {
    list.forEach((word) => Generator.usedWords.delete(word));
    available = list;
  }

  const picked = available[Math.floor(Math.random() * available.length)];
  Generator.usedWords.add(picked);
  return picked;
}

/**
 * Genereerib kõik kaardid sessiooni alguses.
 */
function generateSessionCards() {
  Generator.usedWords.clear();
  themeOrder.forEach((theme) => {
    DB[theme].cards = [];
    for (let i = 0; i < 20; i++) {
      let q = "";
      if (theme === "dilemmad") {
        q = `KAS SA EELISTAKSID PIGEM:\n> ${getUniqueRand("dilemmad")}\n\nVÕI SEDA, ET:\n> ${getUniqueRand("asjad")}?`;
      } else if (theme === "ryhmavaim") {
        q = `KES TEIE HULGAST KÕIGE TÕENÄOLISEMALT:\n> ${getUniqueRand("tegu_r")}?`;
      } else {
        q = `MISSIOON: ${getUniqueRand("missioon")}\nKRIIS: ${getUniqueRand("kriis")}\n\nABI: ${getUniqueRand("vahend")}`;
      }

      DB[theme].cards.push({
        q: q,
        img: Generator.images[
          Math.floor(Math.random() * Generator.images.length)
        ],
      });
    }
  });
}

/**
 * Mängija lisamine
 */
function addPlayer() {
  const input = document.getElementById("player-name");
  if (!input) return;

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
  const list = document.getElementById("player-list");
  if (list) {
    list.innerHTML = players
      .map((p) => `<span class="player-tag">${p}</span>`)
      .join("");
  }
  const startBtn = document.getElementById("start-btn");
  if (startBtn) {
    startBtn.style.display = players.length >= 2 ? "inline-block" : "none";
  }
}

/**
 * Mängu käivitamine
 */
function startGame() {
  generateSessionCards();
  const modeInput = document.querySelector('input[name="game-mode"]:checked');
  gameMode = modeInput ? modeInput.value : "locked";

  playSnd("snd-click");
  document.getElementById("home-screen").style.display = "none";
  document.getElementById("game-interface").style.display = "block";

  setupPhase("dilemmad");
  updateScoreDisplay();
  updateVoteButtons();
}

function setupPhase(key) {
  currentTheme = key;
  const phaseTitle = document.getElementById("current-phase-name");
  if (phaseTitle) phaseTitle.innerText = key.toUpperCase();

  document.querySelectorAll(".nav-toggle").forEach((b) => {
    b.classList.remove("active");
    b.style.pointerEvents = gameMode === "locked" ? "none" : "auto";
  });

  const activeBtn = document.getElementById("btn-" + key);
  if (activeBtn) activeBtn.classList.add("active");

  renderCard();
}

function changePhaseManual(key) {
  if (gameMode === "free") {
    playSnd("snd-click");
    setupPhase(key);
  }
}

function renderCard() {
  const card = DB[currentTheme].cards[phaseCounters[currentTheme]];
  if (card) {
    document.getElementById("task-text").innerText = card.q;
    document.getElementById("task-img").src = card.img;
    document.getElementById("card-num").innerText = (
      phaseCounters[currentTheme] + 1
    )
      .toString()
      .padStart(2, "0");
  }
}

/**
 * Kausta avamise animatsioon
 */
function openFolder() {
  const f = document.getElementById("folder");
  if (f && f.classList.contains("folder-closed")) {
    playSnd("snd-folder");
    f.classList.replace("folder-closed", "folder-open");
  }
}

/**
 * Punktisüsteem
 */
function givePoint(player) {
  if (scores.hasOwnProperty(player)) {
    scores[player]++;
    playSnd("snd-click");
    updateScoreDisplay();
  }
}

function updateScoreDisplay() {
  const container = document.getElementById("score-display");
  if (container) {
    container.innerHTML = players
      .map(
        (p) =>
          `<div class="score-row"><span>${p}</span><span class="player-score-value">${scores[p]} PTS</span></div>`,
      )
      .join("");
  }
}

function updateVoteButtons() {
  const container = document.getElementById("vote-btns-container");
  if (container) {
    container.innerHTML = players
      .map(
        (p) =>
          `<button class="vote-btn" onclick="givePoint('${p}')">${p}</button>`,
      )
      .join("");
  }
}

/**
 * Audio kontroll
 */
function playSnd(id) {
  const a = document.getElementById(id);
  if (a) {
    a.currentTime = 0;
    a.play().catch(() => {}); // Väldib vigu brauserites, mis blokivad autoplyad
  }
}

/**
 * Järgmise kaardi loogika
 */
function nextCard(e) {
  if (e) e.stopPropagation();
  playSnd("snd-paper");

  if (gameMode === "locked") {
    // Liigub automaatselt järgmisesse faasi
    let nextIdx = (themeOrder.indexOf(currentTheme) + 1) % themeOrder.length;
    phaseCounters[currentTheme] = (phaseCounters[currentTheme] + 1) % 20;

    const f = document.getElementById("folder");
    f.classList.replace("folder-open", "folder-closed");

    setTimeout(() => {
      setupPhase(themeOrder[nextIdx]);
      f.classList.replace("folder-closed", "folder-open");
    }, 600);
  } else {
    // Püsib samas faasis, lihtsalt järgmine kaart
    phaseCounters[currentTheme] = (phaseCounters[currentTheme] + 1) % 20;
    renderCard();
  }
}
