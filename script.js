const Generator = {
  usedWords: new Set(),
  vocab: {
    dilemmad: [
      "olema see rühma loll, kes peab öise rünnaku ajal helendavat vesti kandma",
      "sööma rühmavanema silme all tema viimase ja ainsa sooja toidupaki",
      "kaotama oma relva luku täpselt 5 minutit enne suurt inspekteerimist",
      "veetma terve talvise õppuse kummikutes, kuhu rühmakaaslane 'kogemata' kuses",
      "olema ainus ellujääja rünnakus, aga pead kandma kõigi langenute varustust üksi tagasi",
      "puhastama hambaharjaga välikäimlat, samal ajal kui teised lähevad linnaloale",
      "magama kaevikus, mis on poolenisti täitunud külma lörtsi ja rühmakaaslase pisaratega",
      "teatama rühmale, et tänu sinu näpoveale tühistati kõigi kolme kuu linnaload",
      "kaevama endale kaevikut kivisesse pinda, kasutades ainult plastikust lusikat",
      "asendama oma relva salve banaaniga ja lootma, et vaenlane ei märka",
    ],
    asjad: [
      "sinu kuulivest on tegelikult täidetud vana ajalehepaberiga",
      "sinu ainus soojusallikas on märg tikk ja rühmakaaslase halb hingeõhk",
      "avastad, et sinu salvedes on paukpadrunite asemel tühjad kestad",
      "sinu automaat on nii roostes, et see on nüüd ametlikult külmrelv",
      "toidupakis on ainult üks kuivanud küpsis ja kiri 'Edu, sõdur!'",
      "sinu märgades sokkides on arenenud uus ja agressiivne eluvorm",
      "sinu kiiver katab silmad iga kord, kui sa hingad",
    ],
    tegu_r: [
      "suudaks miini peale astuda isegi siis, kui see on lipukestega tähistatud",
      "hakkaks rünnaku ajal vaenlasega linnaloa tingimuste üle läbi rääkima",
      "unustaks granaadi heitmisel splindi kätte ja viskaks granaadi asemel oma kella",
      "jääks magama täpselt sel hetkel, kui rühmavanem küsib: 'Kes valvab?'",
      "hakkaks kaevikus süüa tegema, kasutades kütuseks rühma ainsat kaarti",
      "tulistaks kogemata rühma ainsa ellujäämispaki puruks",
      "kaotaks oma püksid ära keset öist häiret ja jookseks rünnakule aluspesus",
      "müüks rühma asukoha maha ühe sooja burgeri eest",
    ],
    missioon: [
      "Vallutada tagasi üksuse välikäimla",
      "Hävitada vaenlase kütuseauto",
      "Toimetada salajane sõnum läbi rinde",
      "Peatada pealetungiv tankikolonn",
      "Evakueerida haavatud rühmavanem",
      "Kaitsta rühma viimast kohvivaru",
      "Hävitada vaenlase raadiomast",
    ],
    kriis: [
      "kogu üksus on 48 tundi magamata ja hallutsinatsioonides",
      "laskemoon on asendatud hernestega",
      "vaenlane kasutab ründamiseks näljaseid karusid",
      "teie asukoht reedeti helendavate saabaste tõttu",
      "side on maas ja rühmavanem nutab looteasendis",
      "olete ümber piiratud ja teil on jäänud ainult üks suitsupomm",
    ],
    vahend: [
      "rull teipi ja poolik märg küpsis",
      "üksainus depressiivne treenitud orav",
      "kakskümmend liitrit hapuks läinud piima",
      "vana megafon ja nimekiri rühmavanema solvangutest",
      "katkine sandaal ja pakk närimiskummi",
      "papist tankimudelid ja palju enesekindlust",
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

function getUniqueRand(key) {
  const list = Generator.vocab[key];
  let available = list.filter((word) => !Generator.usedWords.has(word));
  if (available.length === 0) {
    list.forEach((word) => Generator.usedWords.delete(word));
    available = list;
  }
  const picked = available[Math.floor(Math.random() * available.length)];
  Generator.usedWords.add(picked);
  return picked;
}

function generateSessionCards() {
  Generator.usedWords.clear();
  themeOrder.forEach((theme) => {
    DB[theme].cards = [];
    for (let i = 0; i < 20; i++) {
      let q = "";
      if (theme === "dilemmad")
        q = `KAS SA EELISTAKSID PIGEM:\n> ${getUniqueRand("dilemmad")}\n\nVÕI SEDA, ET:\n> ${getUniqueRand("asjad")}?`;
      else if (theme === "ryhmavaim")
        q = `KES TEIE HULGAST KÕIGE TÕENÄOLISEMALT:\n> ${getUniqueRand("tegu_r")}?`;
      else
        q = `MISS: ${getUniqueRand("missioon")}\nKRIIS: ${getUniqueRand("kriis")}\n\nABI: ${getUniqueRand("vahend")}?`;
      DB[theme].cards.push({
        q: q,
        img: Generator.images[
          Math.floor(Math.random() * Generator.images.length)
        ],
      });
    }
  });
}

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
  const list = document.getElementById("player-list");
  list.innerHTML = players
    .map((p) => `<span class="player-tag">${p}</span>`)
    .join("");
  document.getElementById("start-btn").style.display =
    players.length >= 2 ? "inline-block" : "none";
}

function startGame() {
  generateSessionCards();
  gameMode = document.querySelector('input[name="game-mode"]:checked').value;
  playSnd("snd-click");
  document.getElementById("home-screen").style.display = "none";
  document.getElementById("game-interface").style.display = "block";
  setupPhase("dilemmad");
  updateScoreDisplay();
  updateVoteButtons();
}

function setupPhase(key) {
  currentTheme = key;
  document.getElementById("current-phase-name").innerText = key.toUpperCase();
  document.querySelectorAll(".nav-toggle").forEach((b) => {
    b.classList.remove("active");
    b.style.pointerEvents = gameMode === "locked" ? "none" : "auto";
  });
  document.getElementById("btn-" + key).classList.add("active");
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

function openFolder() {
  const f = document.getElementById("folder");
  if (f.classList.contains("folder-closed")) {
    playSnd("snd-folder");
    f.classList.replace("folder-closed", "folder-open");
  }
}

function givePoint(player) {
  scores[player]++;
  playSnd("snd-click");
  updateScoreDisplay();
}

function updateScoreDisplay() {
  const container = document.getElementById("score-display");
  container.innerHTML = players
    .map(
      (p) =>
        `<div class="score-row"><span>${p}</span><span class="player-score-value">${scores[p]} PTS</span></div>`,
    )
    .join("");
}

function updateVoteButtons() {
  const container = document.getElementById("vote-btns-container");
  container.innerHTML = players
    .map(
      (p) =>
        `<button class="vote-btn" onclick="givePoint('${p}')">${p}</button>`,
    )
    .join("");
}

function playSnd(id) {
  const a = document.getElementById(id);
  if (a) {
    a.currentTime = 0;
    a.play().catch((e) => {});
  }
}

function nextCard(e) {
  e.stopPropagation();
  playSnd("snd-paper");
  if (gameMode === "locked") {
    let nextIdx = (themeOrder.indexOf(currentTheme) + 1) % themeOrder.length;
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
