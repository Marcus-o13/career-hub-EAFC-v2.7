/* =========================================================
   CAREER HUB — FUTEBOL
   APP.JS COMPLETO

   - Múltiplas carreiras
   - Jogador
   - Treinador
   - Temporadas
   - Transferências
   - Compra
   - Venda
   - Empréstimo
   - Troca
   - Pré-contrato
   - Títulos
   - Prêmios
   - Galeria
   - Fotos
   - Escudos
   - Overall
   - Atributos
   - LocalStorage
   - Offline
   - PC + celular
========================================================= */

"use strict";

/* =========================================================
   CONFIGURAÇÃO
========================================================= */

const STORAGE_KEY = "careerHubFootball_v2";

let careers = [];
let currentCareerId = null;
let currentTab = "seasons";
let currentStatsTab = "clubs";
let careerCategoriesOpen = false;
let selectedCareerCategory = null;
let currentGalleryFilter = "career";

const STATS_STORAGE_KEY = "careerHubStats_v1";
let statsHubData = { awardCategories: [], customStats: [], histories: [] };


/* =========================================================
   ELEMENTOS
========================================================= */

const $ = (selector) => document.querySelector(selector);

const $$ = (selector) => document.querySelectorAll(selector);


/* =========================================================
   UTILIDADES
========================================================= */

function uid(prefix = "id") {
    return (
        prefix +
        "_" +
        Date.now().toString(36) +
        "_" +
        Math.random().toString(36).slice(2, 8)
    );
}


function escapeHTML(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function number(value) {
    const n = Number(value);

    return Number.isFinite(n) ? n : 0;
}


function formatNumber(value) {
    return number(value).toLocaleString("pt-BR");
}


function today() {
    return new Date().toLocaleDateString("pt-BR");
}


function showToast(message, type = "success") {
    const toast = $("#toast");

    if (!toast) return;

    toast.textContent = message;

    toast.className = "toast show " + type;

    clearTimeout(showToast.timer);

    showToast.timer = setTimeout(() => {
        toast.className = "toast";
    }, 2500);
}


/* =========================================================
   IMAGENS / BASE64
========================================================= */

function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            resolve("");
            return;
        }

        const reader = new FileReader();

        reader.onload = () => {
            resolve(reader.result);
        };

        reader.onerror = () => {
            reject(reader.error);
        };

        reader.readAsDataURL(file);
    });
}


async function getFileInputData(id) {
    const input = document.getElementById(id);

    if (!input || !input.files || !input.files[0]) {
        return "";
    }

    return await fileToDataURL(input.files[0]);
}


/* =========================================================
   LOCAL STORAGE
========================================================= */

const DB_NAME = "careerHubOfflineDB";
const DB_VERSION = 2;
const DB_STORE = "app";
const DB_STATS_STORE = "stats";


function openOfflineDB() {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) {
            reject(new Error("IndexedDB indisponível"));
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(DB_STORE)) {
                db.createObjectStore(DB_STORE);
            }
            if (!db.objectStoreNames.contains(DB_STATS_STORE)) {
                db.createObjectStore(DB_STATS_STORE);
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}


async function saveDataToIndexedDB() {
    try {
        const db = await openOfflineDB();
        await new Promise((resolve, reject) => {
            const tx = db.transaction(DB_STORE, "readwrite");
            tx.objectStore(DB_STORE).put(
                JSON.stringify(careers),
                STORAGE_KEY
            );
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });
        db.close();
    } catch (error) {
        console.warn("Backup offline IndexedDB indisponível:", error);
    }
}


async function loadDataFromIndexedDB() {
    try {
        const db = await openOfflineDB();
        const saved = await new Promise((resolve, reject) => {
            const tx = db.transaction(DB_STORE, "readonly");
            const request = tx.objectStore(DB_STORE).get(STORAGE_KEY);
            request.onsuccess = () => resolve(request.result || "");
            request.onerror = () => reject(request.error);
        });
        db.close();

        if (!saved) return false;

        const parsed = JSON.parse(saved);
        if (!Array.isArray(parsed)) return false;

        careers = parsed.map(normalizeCareer);
        return true;
    } catch (error) {
        console.warn("Não foi possível recuperar o backup offline:", error);
        return false;
    }
}


function saveData() {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(careers)
        );
    } catch (error) {
        console.warn("LocalStorage atingiu o limite; usando IndexedDB.", error);
    }

    saveDataToIndexedDB();

    try {
        navigator.storage?.persist?.();
    } catch (error) {
        console.warn(error);
    }
}


async function loadData() {
    // IndexedDB é a fonte principal porque suporta muito mais dados que
    // LocalStorage. Isso é especialmente importante para fotos em Base64.
    const restored = await loadDataFromIndexedDB();
    if (restored) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(careers));
        } catch (_) {}
        return;
    }

    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            careers = Array.isArray(parsed) ? parsed.map(normalizeCareer) : [];
        } else {
            careers = [];
        }
    } catch (error) {
        console.warn("Não foi possível recuperar as carreiras locais:", error);
        careers = [];
    }
}


/* =========================================================
   NORMALIZAÇÃO
========================================================= */

function normalizeCareer(career) {

    const normalized = {
        id: career.id || uid("career"),

        type:
            career.type === "coach"
                ? "coach"
                : "player",

        name: career.name || "Sem nome",

        position: career.position || "ATA",

        nation:
            career.nation ||
            "🇧🇷 Brasil",

        club:
            career.club ||
            "Sem clube",

        age: number(career.age),

        height: number(career.height) || 180,

        weight: number(career.weight) || 75,

        overall: career.overall !== undefined && career.overall !== null ? number(career.overall) : "",

        style:
            career.style ||
            "Ofensivo",

        photo:
            career.photo ||
            "",

        seasons:
            Array.isArray(career.seasons)
                ? career.seasons
                : [],

        transfers:
            Array.isArray(career.transfers)
                ? career.transfers
                : [],

        titles:
            Array.isArray(career.titles)
                ? career.titles
                : [],

        awards:
            Array.isArray(career.awards)
                ? career.awards
                : [],

        gallery:
            Array.isArray(career.gallery)
                ? career.gallery
                : [],

        trophyShelf:
            Array.isArray(career.trophyShelf)
                ? career.trophyShelf
                : [],

        history:
            Array.isArray(career.history)
                ? career.history
                : [],

        attributes:
            career.attributes ||
            defaultAttributes(),

        createdAt:
            career.createdAt ||
            today(),

        updatedAt:
            career.updatedAt ||
            today()
    };

    normalized.seasons = normalized.seasons.map(season => ({
        ...season,
        selection: season.selection || ""
    }));

    return normalized;
}


/* =========================================================
   ATRIBUTOS PADRÃO
========================================================= */

function defaultAttributes() {
    return {

        pace: 0,
        shooting: 0,
        passing: 0,
        dribbling: 0,
        defending: 0,
        physical: 0,

        finishing: 0,
        shotPower: 0,
        longShots: 0,
        volleys: 0,
        penalties: 0,

        vision: 0,
        crossing: 0,
        freeKick: 0,
        shortPassing: 0,
        longPassing: 0,
        curve: 0,

        agility: 0,
        balance: 0,
        reactions: 0,
        ballControl: 0,
        composure: 0,

        interceptions: 0,
        heading: 0,
        marking: 0,
        standingTackle: 0,
        slidingTackle: 0,

        acceleration: 0,
        stamina: 0,
        strength: 0,
        aggression: 0,
        jumping: 0
    };
}


/* =========================================================
   ATRIBUTOS — NOMES
========================================================= */

const ATTRIBUTE_GROUPS = [

    {
        title: "⚡ Ritmo",
        attributes: [
            ["pace", "Ritmo"],
            ["acceleration", "Aceleração"]
        ]
    },

    {
        title: "🎯 Finalização",
        attributes: [
            ["shooting", "Finalização"],
            ["finishing", "Precisão"],
            ["shotPower", "Força do chute"],
            ["longShots", "Chutes de longe"],
            ["volleys", "Voleios"],
            ["penalties", "Pênaltis"]
        ]
    },

    {
        title: "🎯 Passe",
        attributes: [
            ["passing", "Passe"],
            ["vision", "Visão"],
            ["crossing", "Cruzamento"],
            ["freeKick", "Falta"],
            ["shortPassing", "Passe curto"],
            ["longPassing", "Passe longo"],
            ["curve", "Curva"]
        ]
    },

    {
        title: "🪄 Drible",
        attributes: [
            ["dribbling", "Drible"],
            ["agility", "Agilidade"],
            ["balance", "Equilíbrio"],
            ["reactions", "Reações"],
            ["ballControl", "Controle de bola"],
            ["composure", "Compostura"]
        ]
    },

    {
        title: "🛡️ Defesa",
        attributes: [
            ["defending", "Defesa"],
            ["interceptions", "Interceptações"],
            ["heading", "Cabeceio"],
            ["marking", "Marcação"],
            ["standingTackle", "Desarme em pé"],
            ["slidingTackle", "Carrinho"]
        ]
    },

    {
        title: "💪 Físico",
        attributes: [
            ["physical", "Físico"],
            ["stamina", "Fôlego"],
            ["strength", "Força"],
            ["aggression", "Agressividade"],
            ["jumping", "Impulsão"]
        ]
    }
];


/* =========================================================
   CALCULAR OVERALL
========================================================= */

function calculateOverall(career) {

    if (!career || career.type !== "player") {
        return 0;
    }

    // Overall da carreira é manual. Para carreiras antigas sem valor salvo,
    // mantém o cálculo anterior apenas como fallback.
    if (career.overall !== undefined && career.overall !== null && String(career.overall).trim() !== "") {
        return number(career.overall);
    }

    const attrs = career.attributes || {};

    const main = [
        number(attrs.pace),
        number(attrs.shooting),
        number(attrs.passing),
        number(attrs.dribbling),
        number(attrs.defending),
        number(attrs.physical)
    ].filter(v => v > 0);

    if (!main.length) {
        return 0;
    }

    return Math.round(
        main.reduce((a, b) => a + b, 0) /
        main.length
    );
}


/* =========================================================
   CARREIRA ATUAL
========================================================= */

function getCurrentCareer() {

    return careers.find(
        career =>
            career.id === currentCareerId
    ) || null;
}


/* =========================================================
   ESTATÍSTICAS
========================================================= */

function getCareerTotals(career) {

    const seasons = career.seasons || [];

    // Os números de temporadas continuam sendo a base automática.
    // Para jogadores, as estatísticas manuais de seleção cadastradas em
    // "Adicionar seleção" também entram no resumo geral da carreira.
    const seasonGames = seasons.reduce(
        (total, season) => total + number(season.games),
        0
    );

    const seasonGoals = seasons.reduce(
        (total, season) => total + number(season.goals),
        0
    );

    const seasonAssists = seasons.reduce(
        (total, season) => total + number(season.assists),
        0
    );

    let selectionGames = 0;
    let selectionGoals = 0;
    let selectionAssists = 0;

    if (career.type === "player") {
        const careerName = normalizedKey(career.name);
        (statsHubData.selectionStats || []).forEach(item => {
            if (normalizedKey(item.playerName) !== careerName) return;
            selectionGames += number(item.games);
            selectionGoals += number(item.goals);
            selectionAssists += number(item.assists);
        });
    }

    return {
        seasons: seasons.length,

        games: seasonGames + selectionGames,

        wins: seasons.reduce(
            (total, season) =>
                total + number(season.wins),
            0
        ),

        losses: seasons.reduce(
            (total, season) =>
                total + number(season.losses),
            0
        ),

        draws: seasons.reduce(
            (total, season) =>
                total + number(season.draws),
            0
        ),

        goals: seasonGoals + selectionGoals,

        goalsAgainst: seasons.reduce(
            (total, season) =>
                total + number(season.goalsAgainst),
            0
        ),

        assists: seasonAssists + selectionAssists,

        titles: (career.titles || []).reduce(
            (total, title) =>
                total + number(title.count || 1),
            0
        ),

        awards: (career.awards || []).reduce(
            (total, award) =>
                total + number(award.count || 1),
            0
        ),

        transfers:
            (career.transfers || []).length
    };
}


/* =========================================================
   CRIAR CARREIRA
========================================================= */

function createCareer(data) {

    const career = normalizeCareer({

        id: uid("career"),

        type: data.type,

        name: data.name,

        position: data.position,

        nation: data.nation,

        club: data.club,

        age: data.age,

        height: data.height,

        weight: data.weight,

        overall: data.overall ?? "",

        style: data.style,

        photo: data.photo,

        seasons: [],

        transfers: [],

        titles: [],

        awards: [],

        gallery: [],

        attributes: defaultAttributes(),

        createdAt: today(),

        updatedAt: today()
    });

    careers.push(career);

    saveData();

    currentCareerId = career.id;

    return career;
}


/* =========================================================
   RENDER — LISTA DE CARREIRAS
========================================================= */

function renderCareerList() {
    const grid = $("#careerGrid");
    const empty = $("#emptyState");
    if (!grid || !empty) return;

    grid.innerHTML = "";

    if (!careers.length) {
        empty.classList.remove("hidden");
        grid.classList.remove("career-grid-open");
        grid.setAttribute("aria-hidden", "true");
        updateCareerCategoriesToggle();
        return;
    }

    empty.classList.add("hidden");

    const playerCareers = careers.filter(c => c.type === "player").sort((a,b) => a.name.localeCompare(b.name, "pt-BR", {sensitivity:"base"}));
    const coachCareers = careers.filter(c => c.type === "coach").sort((a,b) => a.name.localeCompare(b.name, "pt-BR", {sensitivity:"base"}));

    if (careerCategoriesOpen && !selectedCareerCategory) {
        const chooser = document.createElement("div");
        chooser.className = "career-category-chooser";
        chooser.innerHTML = `
            <button type="button" class="career-category-btn" data-career-category="player">Carreira Jogador <span>${playerCareers.length}</span></button>
            <button type="button" class="career-category-btn" data-career-category="coach">Carreira Treinador <span>${coachCareers.length}</span></button>
        `;
        chooser.querySelectorAll("[data-career-category]").forEach(btn => {
            btn.addEventListener("click", () => {
                selectedCareerCategory = btn.dataset.careerCategory;
                renderCareerList();
            });
        });
        grid.appendChild(chooser);
    }

    const selectedList = selectedCareerCategory === "player" ? playerCareers : selectedCareerCategory === "coach" ? coachCareers : [];

    if (careerCategoriesOpen && selectedCareerCategory) {
        const back = document.createElement("button");
        back.type = "button";
        back.className = "career-category-back";
        back.textContent = "← Escolher outra carreira";
        back.addEventListener("click", () => {
            selectedCareerCategory = null;
            renderCareerList();
        });
        grid.appendChild(back);

        if (!selectedList.length) {
            const msg = document.createElement("div");
            msg.className = "empty-state";
            msg.innerHTML = `<h3>Nenhuma carreira encontrada</h3><p>Não há carreiras cadastradas nessa categoria.</p>`;
            grid.appendChild(msg);
        } else {
            const groupGrid = document.createElement("div");
            groupGrid.className = "career-grid career-selected-grid";
            selectedList.forEach(career => {
                const totals = getCareerTotals(career);
                const overall = calculateOverall(career);
                const card = document.createElement("article");
                card.className = "career-card";
                card.dataset.id = career.id;
                const photoHTML = career.photo ? `<img src="${career.photo}" alt="${escapeHTML(career.name)}">` : `<span>⚽</span>`;
                card.innerHTML = `
                    <div class="career-card-top"><div class="career-avatar">${photoHTML}</div><div>
                    <span class="career-type">${career.type === "coach" ? "TREINADOR" : "JOGADOR"}</span>
                    <h3>${escapeHTML(career.name)}</h3><p style="color:var(--muted);font-size:.72rem;margin-top:3px;">${escapeHTML(career.club || "Sem clube")}</p></div></div>
                    <div class="career-card-info">${career.type === "player" ? `<div class="mini-stat"><span>Overall</span><strong>${overall || "—"}</strong></div><div class="mini-stat"><span>Temporadas</span><strong>${totals.seasons}</strong></div><div class="mini-stat"><span>Jogos</span><strong>${formatNumber(totals.games)}</strong></div><div class="mini-stat"><span>Gols</span><strong>${formatNumber(totals.goals)}</strong></div>` : `<div class="mini-stat"><span>Temporadas</span><strong>${totals.seasons}</strong></div><div class="mini-stat"><span>Clubes</span><strong>${getUniqueClubs(career)}</strong></div><div class="mini-stat"><span>Títulos</span><strong>${formatNumber(totals.titles)}</strong></div><div class="mini-stat"><span>Vitórias</span><strong>${formatNumber(totals.wins)}</strong></div>`}</div>
                    <div class="career-card-footer"><span>Criada em ${escapeHTML(career.createdAt)}</span><span>Abrir →</span></div>`;
                card.addEventListener("click", () => openCareer(career.id));
                groupGrid.appendChild(card);
            });
            grid.appendChild(groupGrid);
        }
    }

    grid.classList.toggle("career-grid-open", careerCategoriesOpen);
    grid.setAttribute("aria-hidden", careerCategoriesOpen ? "false" : "true");
    updateCareerCategoriesToggle();
}

function updateCareerCategoriesToggle() {
    const toggle = $("#careerCategoriesToggle");
    const grid = $("#careerGrid");
    const chevron = $("#careerCategoriesChevron");
    if (!toggle || !grid) return;

    toggle.setAttribute("aria-expanded", careerCategoriesOpen ? "true" : "false");
    grid.classList.toggle("career-grid-open", careerCategoriesOpen);
    grid.setAttribute("aria-hidden", careerCategoriesOpen ? "false" : "true");
    if (chevron) chevron.textContent = careerCategoriesOpen ? "⌃" : "⌄";
}

function toggleCareerCategories() {
    careerCategoriesOpen = !careerCategoriesOpen;
    selectedCareerCategory = null;
    renderCareerList();
}

/* =========================================================
   CLUBES ÚNICOS
========================================================= */

function getUniqueClubs(career) {

    const clubs = [];

    (career.seasons || []).forEach(
        season => {

            if (season.club) {
                clubs.push(
                    season.club.trim()
                );
            }

        }
    );

    if (career.club) {
        clubs.push(
            career.club.trim()
        );
    }

    return new Set(
        clubs.filter(Boolean)
    ).size;
}


/* =========================================================
   ABRIR CARREIRA
========================================================= */

function openCareer(id) {

    const career =
        careers.find(
            item => item.id === id
        );

    if (!career) return;

    currentCareerId = id;
    careerCategoriesOpen = false;
    selectedCareerCategory = null;

    document.body.classList.add("career-open");

    currentTab = "seasons";

    $("#careerListView")
        ?.classList.add("hidden");

    $("#careerView")
        ?.classList.remove("hidden");

    renderCareer();

    switchTab("seasons");
}


/* =========================================================
   FECHAR CARREIRA
========================================================= */

function closeCareer() {

    currentCareerId = null;
    careerCategoriesOpen = false;
    selectedCareerCategory = null;
    document.body.classList.remove("career-open");

    $("#careerView")
        ?.classList.add("hidden");

    $("#careerListView")
        ?.classList.remove("hidden");

    renderCareerList();
}


/* =========================================================
   RENDER CARREIRA
========================================================= */

function renderCareer() {

    const career =
        getCurrentCareer();

    if (!career) return;

    renderProfile(career);

    renderTabs(career);

    renderSeasons(career);

    renderTransfers(career);

    renderTitles(career);

    renderAwards(career);

    renderGallery(career);
    renderTrophyShelf(career);
    renderRecognitions(career);
    renderCareerHistory(career);

    renderTotals(career);
    updateTransferSeasonVisibility();

    renderAttributes(career);
}


/* =========================================================
   PERFIL
========================================================= */

function renderProfile(career) {

    const profilePhoto =
        $("#profilePhoto");

    const placeholder =
        $("#profilePlaceholder");


    if (career.photo) {

        profilePhoto.src =
            career.photo;

        profilePhoto.classList.remove(
            "hidden"
        );

        placeholder.classList.add(
            "hidden"
        );

    } else {

        profilePhoto.removeAttribute(
            "src"
        );

        profilePhoto.classList.add(
            "hidden"
        );

        placeholder.classList.remove(
            "hidden"
        );
    }


    $("#profileType").textContent =
        career.type === "coach"
            ? "TREINADOR"
            : "JOGADOR";


    $("#profileName").textContent =
        career.name;


    $("#profilePosition").textContent =
        career.type === "coach"
            ? career.style || "Treinador"
            : career.position || "ATA";


    $("#profileNation").textContent =
        career.nation || "";


    $("#profileClub").textContent =
        career.club || "Sem clube";


    $("#profileAge").textContent =
        career.age
            ? `${career.age} anos`
            : "";


    const totals =
        getCareerTotals(career);


    const playerStats =
        $("#playerQuickStats");

    const coachStats =
        $("#coachQuickStats");


    if (career.type === "player") {

        playerStats.classList.remove(
            "hidden"
        );

        coachStats.classList.add(
            "hidden"
        );


        const overallInput = $("#headerOverall");
        if (overallInput) {
            overallInput.value = calculateOverall(career) || "";
        }


        $("#headerSeasons").textContent =
            totals.seasons;


        $("#headerGames").textContent =
            formatNumber(totals.games);


        $("#headerGoals").textContent =
            formatNumber(totals.goals);

        const headerAssists = $("#headerAssists");
        if (headerAssists) headerAssists.textContent = formatNumber(totals.assists);

        const headerTitles = $("#headerTitles");
        if (headerTitles) headerTitles.textContent = formatNumber(totals.titles);

    } else {

        playerStats.classList.add(
            "hidden"
        );

        coachStats.classList.remove(
            "hidden"
        );


        $("#coachSeasons").textContent =
            totals.seasons;


        $("#coachClubs").textContent =
            getUniqueClubs(career);


        $("#coachTitles").textContent =
            formatNumber(totals.titles);


        $("#coachWins").textContent =
            formatNumber(totals.wins);
    }
}


/* =========================================================
   TABS
========================================================= */

function renderTabs(career) {

    const tabs = $("#tabs");

    if (!tabs) return;


    const baseTabs = [

        ["seasons", "📅 Temporadas"],

        ["transfers", "🔄 Transferências"],

        ["totals", "📊 Números"],

        ["titles", "🏆 Títulos"],

        ["awards", "🥇 Prêmios"],

        ["gallery", "🖼️ Galeria"],

        ["shelf", "🏆 Prateleira de Troféus"],

        ["career-history", "📖 História"]

    ];


    if (career.type === "coach") {

        baseTabs.push(
            ["tactics", "🧠 Mesa Tática"]
        );
    }


    if (career.type === "player") {

        baseTabs.push(
            ["overall", "⭐ Overall"]
        );
    }


    tabs.innerHTML = "";


    baseTabs.forEach(
        ([id, label]) => {

            const button =
                document.createElement("button");

            button.className =
                "tab-btn" +
                (
                    id === currentTab
                        ? " active"
                        : ""
                );

            button.dataset.tab = id;

            button.textContent = label;


            button.addEventListener(
                "click",
                () => switchTab(id)
            );


            tabs.appendChild(button);
        }
    );
}


/* =========================================================
   TROCAR ABA
========================================================= */

function switchTab(tab) {

    currentTab = tab;


    $$(".tab-btn").forEach(
        button => {

            button.classList.toggle(
                "active",
                button.dataset.tab === tab
            );

        }
    );


    $$(".tab-panel").forEach(
        panel => {

            panel.classList.remove(
                "active"
            );

        }
    );


    const panel =
        document.getElementById(
            "tab-" + tab
        );


    if (panel) {
        panel.classList.add("active");
    }

    if (tab === "tactics") {
        renderTacticalTab();
    }
}


/* =========================================================
   PRATELEIRA DE TROFÉUS
========================================================= */

let currentShelfView = "trophy";
function renderTrophyShelf(career) {
    const container = $("#titleShelf");
    const empty = $("#titleShelfEmpty");
    if (!container) return;

    // Mantém exatamente a estrutura visual da prateleira antiga:
    // três fileiras grandes + área fixa dos escudos dos times.
    container.innerHTML = `
        <div class="shelf-row"></div>
        <div class="shelf-row"></div>
        <div class="shelf-row"></div>
        <div class="shelf-shields-title">ESCUDOS DOS TIMES DA CARREIRA</div>
        <div class="shelf-shields"></div>
    `;

    const manual = career.trophyShelf || [];
    const groupedAwards = {};
    (career.awards || [])
        .filter(a => (a.category || "individual") === "individual")
        .forEach(a => {
            const key = (a.name || "Prêmio").trim().toLowerCase();
            if (!groupedAwards[key]) {
                groupedAwards[key] = {
                    name: a.name || "Prêmio",
                    count: 0,
                    photo: a.photo || "",
                    season: a.season || ""
                };
            }
            groupedAwards[key].count += Math.max(1, number(a.count));
            if (!groupedAwards[key].photo && a.photo) groupedAwards[key].photo = a.photo;
        });

    const autoAwards = Object.values(groupedAwards).map(x => ({ ...x, type: "award", auto: true }));
    const selected = currentShelfView === "award"
        ? [...manual.filter(x => x.type === "award"), ...autoAwards]
        : manual.filter(x => x.type === "trophy");
    const shields = manual.filter(x => x.type === "shield");

    if (empty) empty.classList.toggle("hidden", selected.length > 0);

    const fallback = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 140"><text x="60" y="85" text-anchor="middle" font-size="70">🏆</text></svg>'
    );

    const createItem = (item, index, isShield = false) => {
        const el = document.createElement("div");
        el.className = "shelf-item " + (item.auto ? "shelf-auto-award" : "shelf-free-item") + (isShield ? " shield" : "");
        const row = Number(item.row ?? item.shelfRow ?? Math.floor(index / 6) % 3);
        const left = Number(item.x);
        const fallbackLeft = isShield ? 4 + (index % 10) * 9 : 5 + (index % 6) * 15;
        el.style.left = `${Number.isFinite(left) ? left : fallbackLeft}%`;
        el.style.top = isShield ? "88%" : `${Number.isFinite(Number(item.y)) ? item.y : 7 + (row % 3) * 25.7}%`;
        el.innerHTML = `${!item.auto ? '<button type="button" class="shelf-item-remove">×</button><button type="button" class="shelf-item-resize">↗</button>' : ''}<img src="${item.photo || fallback}" alt="${escapeHTML(item.name)}"><div class="shelf-item-name">${escapeHTML(item.name)}</div><div class="shelf-item-season">${item.auto ? item.count + 'x' : escapeHTML(item.season || '')}</div>`;

        if (!item.auto) {
            el.dataset.shelfIndex = career.trophyShelf.indexOf(item);
            el.querySelector('.shelf-item-remove').onclick = () => {
                if (confirm('Remover este item da prateleira?')) {
                    career.trophyShelf.splice(Number(el.dataset.shelfIndex), 1);
                    saveData();
                    renderTrophyShelf(career);
                }
            };
            enableShelfItemResize(el, career);
            enableShelfItemDragForCanvas(el, career, container);
        }
        container.appendChild(el);
    };

    selected.forEach((item, index) => createItem(item, index, false));
    shields.forEach((item, index) => createItem(item, index, true));
}
function renderRecognitions(career){const c=$("#recognitionsList");if(!c)return;const map={};(career.awards||[]).filter(a=>a.category==="recognition").forEach(a=>map[a.name]=(map[a.name]||0)+Math.max(1,number(a.count)));const entries=Object.entries(map);c.innerHTML=entries.length?entries.map(([n,v])=>`<article class="stats-card"><h3>${escapeHTML(n)}</h3><strong>${formatNumber(v)}x</strong></article>`).join(""):emptyRecord("","Nenhum reconhecimento","Cadastre Melhor em Campo, Jogador da Semana, Jogador do Mês e outros reconhecimentos.");}

function enableShelfItemDragForCanvas(el,career,canvas){ el.addEventListener("pointerdown",event=>{if(event.target.closest("button"))return;const item=career.trophyShelf[Number(el.dataset.shelfIndex)];if(!item)return;const rect=canvas.getBoundingClientRect(), er=el.getBoundingClientRect();const ox=event.clientX-er.left,oy=event.clientY-er.top;el.setPointerCapture?.(event.pointerId);const move=e=>{item.x=Math.max(0,Math.min(90,(e.clientX-rect.left-ox)/rect.width*100));item.y=Math.max(0,Math.min(85,(e.clientY-rect.top-oy)/rect.height*100));el.style.left=item.x+"%";el.style.top=item.y+"%"};const up=()=>{saveData();el.removeEventListener("pointermove",move);el.removeEventListener("pointerup",up)};el.addEventListener("pointermove",move);el.addEventListener("pointerup",up);});}
function renderRecognitions(career){const c=$("#recognitionsList");if(!c)return;const map={};(career.awards||[]).filter(a=>a.category==="recognition").forEach(a=>map[a.name]=(map[a.name]||0)+Math.max(1,number(a.count)));const entries=Object.entries(map);c.innerHTML=entries.length?entries.map(([n,v])=>`<article class="stats-card"><h3>${escapeHTML(n)}</h3><strong>${formatNumber(v)}x</strong></article>`).join(""):emptyRecord("","Nenhum reconhecimento","Cadastre Melhor em Campo, Jogador da Semana, Jogador do Mês e outros reconhecimentos.");}

function enableShelfItemResize(el, career) {
    const handle = el.querySelector(".shelf-item-resize");
    if (!handle) return;
    handle.addEventListener("pointerdown", (event) => {
        event.stopPropagation();
        event.preventDefault();
        const index = Number(el.dataset.shelfIndex);
        const item = career.trophyShelf[index];
        if (!item) return;
        const startX = event.clientX;
        const startY = event.clientY;
        const startSize = Number(item.size) || 100;
        const startW = el.getBoundingClientRect().width;
        const startH = el.getBoundingClientRect().height;
        el.setPointerCapture?.(event.pointerId);
        el.classList.add("resizing");
        const move = (e) => {
            const distance = Math.max(e.clientX - startX, e.clientY - startY);
            const factor = 1 + distance / Math.max(70, Math.max(startW, startH));
            item.size = Math.max(35, Math.min(220, Math.round(startSize * factor)));
            const image = el.querySelector("img");
            const baseW = item.type === "shield" ? 58 : 68;
            const baseH = item.type === "shield" ? 62 : 78;
            image.style.width = `${baseW * item.size / 100}px`;
            image.style.height = `${baseH * item.size / 100}px`;
        };
        const up = () => {
            el.classList.remove("resizing");
            career.updatedAt = today();
            saveData();
            el.removeEventListener("pointermove", move);
            el.removeEventListener("pointerup", up);
            el.removeEventListener("pointercancel", up);
        };
        el.addEventListener("pointermove", move);
        el.addEventListener("pointerup", up);
        el.addEventListener("pointercancel", up);
    });
}

function enableShelfItemDrag(el, career) {
    el.addEventListener("pointerdown", (event) => {
        if (event.target.closest(".shelf-item-remove")) return;
        const index = Number(el.dataset.shelfIndex);
        const item = career.trophyShelf[index];
        if (!item) return;

        const canvas = document.getElementById("trophyShelf");
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        const offsetX = event.clientX - elRect.left;
        const offsetY = event.clientY - elRect.top;

        el.classList.add("dragging");
        el.setPointerCapture?.(event.pointerId);
        event.preventDefault();

        const move = (e) => {
            const maxX = Math.max(0, rect.width - elRect.width);
            const maxY = Math.max(0, rect.height - elRect.height);
            const x = Math.max(0, Math.min(maxX, e.clientX - rect.left - offsetX));
            const y = Math.max(0, Math.min(maxY, e.clientY - rect.top - offsetY));
            const xp = rect.width ? (x / rect.width) * 100 : 0;
            const yp = rect.height ? (y / rect.height) * 100 : 0;
            el.style.left = `${xp}%`;
            el.style.top = `${yp}%`;
            item.x = xp;
            item.y = yp;
        };

        const up = () => {
            el.classList.remove("dragging");
            career.updatedAt = today();
            saveData();
            el.removeEventListener("pointermove", move);
            el.removeEventListener("pointerup", up);
            el.removeEventListener("pointercancel", up);
        };
        el.addEventListener("pointermove", move);
        el.addEventListener("pointerup", up);
        el.addEventListener("pointercancel", up);
    });
}

async function handleShelfItemSubmit(event) {
    event.preventDefault();
    const career = getCurrentCareer();
    if (!career) return;
    const input = $("#shelfItemPhoto");
    const file = input?.files?.[0];
    if (!file) {
        showToast("Escolha uma imagem.", "error");
        return;
    }
    const photo = await fileToDataURL(file);
    career.trophyShelf = Array.isArray(career.trophyShelf) ? career.trophyShelf : [];
    career.trophyShelf.push({
        id: uid("shelf"),
        type: $("#shelfItemType").value,
        name: $("#shelfItemName").value.trim(),
        season: $("#shelfItemSeason").value.trim(),
        row: number($("#shelfItemRow").value),
        photo,
        x: null,
        y: null,
        size: 100
    });
    career.updatedAt = today();
    saveData();
    closeDialog("shelfItemDialog");
    $("#shelfItemForm").reset();
    $("#shelfItemType").disabled = false;
    renderTrophyShelf(career);
    showToast("Item adicionado à prateleira!");
}

function openCareerHistoryModal(id = "") {
    const career = getCurrentCareer();
    if (!career) return;
    const item = (career.history || []).find(x => x.id === id);
    $("#careerHistoryId").value = item?.id || "";
    $("#careerHistoryTitle").value = item?.title || "";
    $("#careerHistoryPeriod").value = item?.period || "";
    $("#careerHistoryStory").value = item?.story || "";
    const photo = $("#careerHistoryPhoto");
    if (photo) photo.value = "";
    $("#careerHistoryDialogTitle").textContent = item ? "Editar história" : "Adicionar história";
    openDialog("careerHistoryDialog");
}

async function handleCareerHistorySubmit(event) {
    event.preventDefault();
    const career = getCurrentCareer();
    if (!career) return;
    career.history = Array.isArray(career.history) ? career.history : [];
    const id = $("#careerHistoryId").value;
    const old = career.history.find(x => x.id === id);
    const file = $("#careerHistoryPhoto")?.files?.[0];
    const photo = file ? await fileToDataURL(file) : (old?.photo || "");
    const data = {
        id: id || uid("career-history"),
        title: $("#careerHistoryTitle").value.trim(),
        period: $("#careerHistoryPeriod").value.trim(),
        story: $("#careerHistoryStory").value.trim(),
        photo
    };
    if (id) {
        const index = career.history.findIndex(x => x.id === id);
        if (index !== -1) career.history[index] = data;
    } else {
        career.history.push(data);
    }
    career.updatedAt = today();
    saveData();
    closeDialog("careerHistoryDialog");
    renderCareerHistory(career);
    showToast(id ? "História atualizada!" : "História adicionada!");
}

function renderCareerHistory(career) {
    const container = $("#careerHistoryList");
    if (!container) return;
    const items = Array.isArray(career.history) ? career.history : [];
    if (!items.length) {
        container.innerHTML = emptyRecord("📖", "Nenhuma história", "Adicione fotos e conte a trajetória desta carreira.");
        return;
    }
    container.innerHTML = items.map(item => `
        <article class="career-history-card">
            <div class="career-history-photo">${item.photo ? `<img src="${item.photo}" alt="${escapeHTML(item.title)}">` : "📖"}</div>
            <div>
                <h3>${escapeHTML(item.title)}</h3>
                ${item.period ? `<div class="career-history-meta">${escapeHTML(item.period)}</div>` : ""}
                ${item.story ? `<div class="career-history-story">${escapeHTML(item.story)}</div>` : ""}
                <div class="career-history-actions">
                    <button type="button" class="edit-btn" data-career-history-edit="${item.id}">✏️ Editar</button>
                    <button type="button" class="delete-btn" data-career-history-delete="${item.id}">🗑️ Excluir</button>
                </div>
            </div>
        </article>
    `).join("");
}

function handleCareerHistoryDelegation(event) {
    const target = event.target.closest("button");
    if (!target) return;
    const career = getCurrentCareer();
    if (!career) return;
    const editId = target.dataset.careerHistoryEdit;
    const deleteId = target.dataset.careerHistoryDelete;
    if (editId) openCareerHistoryModal(editId);
    if (deleteId) {
        if (!confirm("Excluir esta história?")) return;
        career.history = (career.history || []).filter(x => x.id !== deleteId);
        career.updatedAt = today();
        saveData();
        renderCareerHistory(career);
    }
}

/* =========================================================
   MESA TÁTICA — MODO TREINADOR
========================================================= */

function renderTacticalTab() {

    const panel = document.getElementById("tab-tactics");
    const career = getCurrentCareer();

    if (!panel || !career || career.type !== "coach") return;

    let iframe = panel.querySelector(".careerhub-tactical-frame");

    if (!iframe) {

        panel.innerHTML = `
            <div class="section-head">
                <div>
                    <h2>🧠 Mesa Tática</h2>
                    <p>Uma mesa tática independente para cada temporada.</p>
                </div>
            </div>

            <div class="careerhub-tactical-season">
                <label for="careerHubTacticalSeason">Temporada</label>
                <select id="careerHubTacticalSeason"></select>
            </div>

            <iframe
                class="careerhub-tactical-frame"
                src="./mesa-tatica.html"
                title="Mesa Tática"
            ></iframe>
        `;

        iframe = panel.querySelector(".careerhub-tactical-frame");

        const select = panel.querySelector("#careerHubTacticalSeason");

        function populateSeasons() {

            select.innerHTML = "";

            const seasons = Array.isArray(career.seasons)
                ? career.seasons
                : [];

            seasons.forEach(season => {

                const option = document.createElement("option");
                option.value = season.id;
                option.textContent = season.name || "Temporada";
                select.appendChild(option);
            });

            if (!seasons.length) {

                const option = document.createElement("option");
                option.value = "default";
                option.textContent = "Crie uma temporada primeiro";
                select.appendChild(option);
            }
        }

        function sendSeason() {

            iframe.contentWindow?.postMessage(
                {
                    type: "careerHubTacticalSeason",
                    careerId: career.id,
                    seasonId: select.value || "default"
                },
                "*"
            );
        }

        populateSeasons();

        select.addEventListener("change", sendSeason);
        iframe.addEventListener("load", sendSeason);

    } else {

        const select = panel.querySelector("#careerHubTacticalSeason");

        if (select) {

            const current = select.value;
            select.innerHTML = "";

            const seasons = Array.isArray(career.seasons)
                ? career.seasons
                : [];

            seasons.forEach(season => {

                const option = document.createElement("option");
                option.value = season.id;
                option.textContent = season.name || "Temporada";
                select.appendChild(option);
            });

            if (!seasons.length) {

                const option = document.createElement("option");
                option.value = "default";
                option.textContent = "Crie uma temporada primeiro";
                select.appendChild(option);

            } else {

                select.value =
                    seasons.some(s => s.id === current)
                        ? current
                        : seasons[0].id;
            }
        }
    }

    const select = panel.querySelector("#careerHubTacticalSeason");

    iframe.contentWindow?.postMessage(
        {
            type: "careerHubTacticalSeason",
            careerId: career.id,
            seasonId: select?.value || "default"
        },
        "*"
    );
}


/* =========================================================
   MODAIS
========================================================= */

function openDialog(id) {

    const dialog =
        document.getElementById(id);

    if (!dialog) return;

    if (typeof dialog.showModal === "function") {

        if (!dialog.open) {
            dialog.showModal();
        }

    } else {

        dialog.setAttribute(
            "open",
            ""
        );
    }
}


function closeDialog(id) {

    const dialog =
        document.getElementById(id);

    if (!dialog) return;

    if (
        typeof dialog.close === "function" &&
        dialog.open
    ) {

        dialog.close();

    } else {

        dialog.removeAttribute(
            "open"
        );
    }
}


/* =========================================================
   FORM CARREIRA
========================================================= */

function updateCareerTypeFields() {

    const type =
        $("#careerType")?.value;


    const playerFields =
        $("#playerCareerFields");

    const coachFields =
        $("#coachCareerFields");


    if (type === "coach") {

        playerFields?.classList.add(
            "hidden"
        );

        coachFields?.classList.remove(
            "hidden"
        );

    } else {

        playerFields?.classList.remove(
            "hidden"
        );

        coachFields?.classList.add(
            "hidden"
        );
    }
}


/* =========================================================
   NOVA CARREIRA
========================================================= */

function openNewCareerModal() {

    const form =
        $("#careerForm");

    if (!form) return;


    form.reset();


    $("#careerId").value = "";

    $("#careerDialogTitle").textContent =
        "Nova carreira";


    $("#careerType").value =
        "player";


    $("#careerNation").value =
        "🇧🇷 Brasil";


    $("#coachNation").value =
        "🇧🇷 Brasil";


    $("#careerAge").value =
        18;


    $("#coachAge").value =
        35;


    $("#careerHeight").value =
        180;


    $("#careerWeight").value =
        75;


    updateCareerTypeFields();

    openDialog("careerDialog");
}


/* =========================================================
   EDITAR CARREIRA
========================================================= */

function openEditCareerModal() {

    const career =
        getCurrentCareer();

    if (!career) return;


    $("#careerId").value =
        career.id;


    $("#careerDialogTitle").textContent =
        "Editar carreira";


    $("#careerType").value =
        career.type;


    $("#careerName").value =
        career.name || "";


    $("#careerPosition").value =
        career.position || "";


    $("#careerNation").value =
        career.nation || "";


    $("#careerClub").value =
        career.club || "";


    $("#careerAge").value =
        career.age || 0;


    $("#careerHeight").value =
        career.height || 180;


    $("#careerWeight").value =
        career.weight || 75;


    $("#coachNation").value =
        career.nation || "";


    $("#coachClub").value =
        career.club || "";


    $("#coachAge").value =
        career.age || 35;


    $("#coachStyle").value =
        career.style || "";

    const overallInput = $("#headerOverall");
    if (overallInput && career.type === "player") {
        overallInput.value = calculateOverall(career) || "";
    }


    updateCareerTypeFields();

    openDialog("careerDialog");
}


/* =========================================================
   SALVAR CARREIRA
========================================================= */

async function handleCareerSubmit(event) {

    event.preventDefault();


    const id =
        $("#careerId").value;


    const type =
        $("#careerType").value;


    const name =
        $("#careerName").value.trim();


    if (!name) {

        showToast(
            "Digite o nome da carreira.",
            "error"
        );

        return;
    }


    let nation;
    let club;
    let age;
    let position;
    let height;
    let weight;
    let style;


    if (type === "player") {

        nation =
            $("#careerNation").value.trim();

        club =
            $("#careerClub").value.trim();

        age =
            number($("#careerAge").value);

        position =
            $("#careerPosition").value.trim() ||
            "ATA";

        height =
            number($("#careerHeight").value) ||
            180;

        weight =
            number($("#careerWeight").value) ||
            75;

        style = "";

    } else {

        nation =
            $("#coachNation").value.trim();

        club =
            $("#coachClub").value.trim();

        age =
            number($("#coachAge").value);

        style =
            $("#coachStyle").value.trim() ||
            "Ofensivo";

        position = "";

        height = 0;
        weight = 0;
    }


    if (id) {

        const career =
            careers.find(
                item => item.id === id
            );

        if (!career) return;


        career.type = type;

        career.name = name;

        career.nation = nation;

        career.club = club;

        career.age = age;

        career.position = position;

        career.height = height;

        career.weight = weight;

        career.style = style;

        career.updatedAt = today();


        saveData();

        closeDialog("careerDialog");

        renderCareerList();

        renderCareer();

        showToast(
            "Carreira atualizada!"
        );

    } else {

        const career =
            createCareer({

                type,
                name,
                nation,
                club,
                age,
                position,
                height,
                weight,
                style,
                photo: ""

            });


        closeDialog("careerDialog");

        $("#careerListView")
            ?.classList.add("hidden");

        $("#careerView")
            ?.classList.remove("hidden");


        renderCareer();

        switchTab("seasons");


        showToast(
            "Carreira criada com sucesso!"
        );
    }
}


/* =========================================================
   EXCLUIR CARREIRA
========================================================= */

function deleteCurrentCareer() {

    const career =
        getCurrentCareer();

    if (!career) return;


    const confirmed =
        confirm(
            `Excluir a carreira "${career.name}"?\n\nEssa ação não pode ser desfeita.`
        );


    if (!confirmed) return;


    careers =
        careers.filter(
            item =>
                item.id !== career.id
        );


    saveData();

    closeCareer();

    showToast(
        "Carreira excluída."
    );
}


/* =========================================================
   FOTO DO PERFIL
========================================================= */

async function handleProfilePhoto() {

    const career =
        getCurrentCareer();

    if (!career) return;


    const image =
        await getFileInputData(
            "profilePhotoInput"
        );


    if (!image) return;


    career.photo = image;

    career.updatedAt = today();


    saveData();

    renderCareer();

    renderCareerList();


    showToast(
        "Foto do perfil atualizada!"
    );
}


/* =========================================================
   TEMPORADAS
========================================================= */

function resetSeasonForm() {

    $("#seasonForm").reset();

    $("#seasonId").value = "";

    $("#seasonDialogTitle").textContent =
        "Nova temporada";

    $("#seasonGames").value = 0;
    $("#seasonWins").value = 0;
    $("#seasonDraws").value = 0;
    $("#seasonGoals").value = 0;
    $("#seasonGoalsAgainst").value = 0;
    $("#seasonAssists").value = 0;
    $("#seasonLosses").value = 0;
    $("#seasonOverall").value = 0;

    $("#seasonPhotoPreview").removeAttribute(
        "src"
    );

    const clubPhotoInput = $("#seasonClubPhoto");
    if (clubPhotoInput) clubPhotoInput.value = "";

    $("#seasonTrophyEditor").innerHTML = "";
}


function updateSeasonCoachFields() {

    const career = getCurrentCareer();
    const coach = career?.type === "coach";

    document.querySelectorAll("[data-player-season-only]").forEach(el => {
        el.style.display = coach ? "none" : "";
    });

    document.querySelectorAll("[data-coach-season-only]").forEach(el => {
        el.style.display = coach ? "" : "none";
    });
}


function openNewSeasonModal() {

    resetSeasonForm();
    updateSeasonCoachFields();

    openDialog("seasonDialog");
}


function openEditSeasonModal(id) {

    const career =
        getCurrentCareer();

    if (!career) return;


    const season =
        career.seasons.find(
            item => item.id === id
        );

    if (!season) return;


    $("#seasonId").value =
        season.id;


    $("#seasonDialogTitle").textContent =
        "Editar temporada";


    $("#seasonName").value =
        season.name || "";


    $("#seasonClub").value =
        season.club || "";

    $("#seasonSelection").value =
        season.selection || "";


    $("#seasonGames").value =
        number(season.games);


    $("#seasonWins").value =
        number(season.wins);


    $("#seasonDraws").value =
        number(season.draws);


    $("#seasonGoals").value =
        number(season.goals);


    $("#seasonGoalsAgainst").value =
        number(season.goalsAgainst);


    $("#seasonAssists").value =
        number(season.assists);


    $("#seasonLosses").value =
        number(season.losses);


    $("#seasonOverall").value =
        number(season.overall);


    $("#seasonNotes").value =
        season.notes || "";


    if (season.photo) {

        $("#seasonPhotoPreview").src =
            season.photo;
    }


    renderSeasonTrophiesEditor(
        season.trophies || []
    );

    updateSeasonCoachFields();

    openDialog("seasonDialog");
}


function renderSeasonTrophiesEditor(
    trophies = []
) {

    const editor =
        $("#seasonTrophyEditor");

    if (!editor) return;


    editor.innerHTML = "";


    trophies.forEach(
        trophy =>
            addSeasonTrophyRow(trophy)
    );
}


function addSeasonTrophyRow(
    trophy = {
        name: "",
        count: 1,
        photo: ""
    }
) {

    const editor =
        $("#seasonTrophyEditor");

    if (!editor) return;

    const row =
        document.createElement("div");

    row.className =
        "trophy-editor-row";

    row.innerHTML = `

        <div class="trophy-editor-main">

            <input
                class="trophy-name"
                placeholder="Ex.: Brasileirão"
                value="${escapeHTML(trophy.name)}"
            >

            <input
                class="trophy-count"
                type="number"
                min="1"
                value="${number(trophy.count) || 1}"
            >

            <label class="upload-box trophy-photo-upload">
                📷 Foto
                <input
                    class="trophy-photo"
                    type="file"
                    accept="image/*"
                    hidden
                >
            </label>

            <img
                class="trophy-photo-preview"
                alt=""
                ${trophy.photo ? `src="${trophy.photo}"` : ""}
            >

            <button
                type="button"
                class="remove-trophy"
                title="Remover"
            >
                ×
            </button>

        </div>

    `;

    const input = row.querySelector(".trophy-photo");
    const preview = row.querySelector(".trophy-photo-preview");

    input.addEventListener("change", async () => {
        const file = input.files?.[0];
        if (!file) return;
        preview.src = await fileToDataURL(file);
    });

    row.querySelector(
        ".remove-trophy"
    ).addEventListener(
        "click",
        () => row.remove()
    );

    editor.appendChild(row);
}


async function getSeasonTrophiesFromForm() {

    const rows = [
        ...document.querySelectorAll(
            "#seasonTrophyEditor .trophy-editor-row"
        )
    ];

    const result = [];

    for (const row of rows) {

        const name =
            row.querySelector(".trophy-name")?.value.trim() || "";

        if (!name) continue;

        const file =
            row.querySelector(".trophy-photo")?.files?.[0];

        let photo =
            row.querySelector(".trophy-photo-preview")?.getAttribute("src") || "";

        if (file) {
            photo = await fileToDataURL(file);
        }

        result.push({
            name,
            count: number(
                row.querySelector(".trophy-count")?.value
            ) || 1,
            photo
        });
    }

    return result;
}


function removeGeneratedSeasonTitles(career, seasonId) {

    career.titles = (career.titles || []).filter(
        title =>
            !(
                title.source === "season-trophy" &&
                title.sourceSeasonId === seasonId
            )
    );
}


function syncSeasonTrophiesToTitles(career, season) {

    if (!career || !season) return;

    removeGeneratedSeasonTitles(
        career,
        season.id
    );

    career.titles = Array.isArray(career.titles)
        ? career.titles
        : [];

    (season.trophies || []).forEach(trophy => {

        career.titles.push({
            id: uid("title"),
            name: trophy.name,
            season: season.name || "",
            club: season.club || "",
            count: number(trophy.count) || 1,
            notes: "",
            photo: trophy.photo || "",
            source: "season-trophy",
            sourceSeasonId: season.id
        });
    });
}


async function handleSeasonSubmit(event) {

    event.preventDefault();


    const career =
        getCurrentCareer();

    if (!career) return;


    const id =
        $("#seasonId").value;


    const photo =
        await getFileInputData(
            "seasonPhoto"
        );

    const clubPhoto =
        await getFileInputData(
            "seasonClubPhoto"
        );


    const trophies =
        await getSeasonTrophiesFromForm();


    const data = {

        id:
            id || uid("season"),

        name:
            $("#seasonName").value.trim(),

        club:
            $("#seasonClub").value.trim(),

        selection:
            $("#seasonSelection").value.trim(),

        games:
            number($("#seasonGames").value),

        wins:
            number($("#seasonWins").value),

        draws:
            number($("#seasonDraws").value),

        goals:
            number($("#seasonGoals").value),

        goalsAgainst:
            number($("#seasonGoalsAgainst").value),

        assists:
            number($("#seasonAssists").value),

        losses:
            number($("#seasonLosses").value),

        overall:
            number($("#seasonOverall").value),

        notes:
            $("#seasonNotes").value.trim(),

        trophies

    };


    if (!data.name) {

        showToast(
            "Digite a temporada.",
            "error"
        );

        return;
    }


    if (!data.club) {

        showToast(
            "Digite o clube.",
            "error"
        );

        return;
    }


    if (photo) {

        data.photo = photo;

    } else if (id) {

        const old =
            career.seasons.find(
                item => item.id === id
            );

        data.photo =
            old?.photo || "";
    }

    if (clubPhoto) {
        data.clubPhoto = clubPhoto;
    } else if (id) {
        const old = career.seasons.find(item => item.id === id);
        data.clubPhoto = old?.clubPhoto || "";
    }

    if (data.club && data.clubPhoto) {
        setStatsMetaPhoto("club", data.club, data.clubPhoto);
    }


    if (id) {

        const index =
            career.seasons.findIndex(
                item => item.id === id
            );


        if (index !== -1) {

            career.seasons[index] =
                data;
        }

    } else {

        career.seasons.push(data);
    }

    const savedSeason =
        career.seasons.find(
            item => item.id === data.id
        );

    syncSeasonTrophiesToTitles(
        career,
        savedSeason
    );


    career.updatedAt = today();

    saveData();

    closeDialog("seasonDialog");

    renderCareer();

    showToast(
        id
            ? "Temporada atualizada!"
            : "Temporada adicionada!"
    );
}


/* =========================================================
   RENDER TEMPORADAS
========================================================= */

function calculateCoachWinRate(season) {

    const games = number(season?.games);
    const wins = number(season?.wins);

    if (games <= 0) return "0.0";

    const draws = number(season?.draws);
    const points = (wins * 3) + draws;
    const maxPoints = games * 3;

    return maxPoints > 0
        ? ((points / maxPoints) * 100).toFixed(1)
        : "0.0";
}


function renderSeasons(career) {

    const container =
        $("#seasonList");

    if (!container) return;


    container.innerHTML = "";


    if (!career.seasons.length) {

        container.innerHTML = emptyRecord(
            "📅",
            "Nenhuma temporada",
            "Adicione sua primeira temporada."
        );

        return;
    }


    career.seasons.forEach(
        season => {

            const card =
                document.createElement("article");

            card.className =
                "season-card";


            const trophies =
                season.trophies || [];


            const trophyText =
                trophies.length
                    ? trophies
                        .map(
                            trophy =>
                                `${escapeHTML(trophy.name)}${number(trophy.count) > 1 ? ` x${number(trophy.count)}` : ""}`
                        )
                        .join(" • ")
                    : "";


            card.innerHTML = `

                ${
                    season.photo
                        ? `
                            <img
                                class="season-photo"
                                src="${season.photo}"
                                alt=""
                            >
                        `
                        : `
                            <div
                                class="season-photo"
                                style="
                                    display:grid;
                                    place-items:center;
                                    font-size:1.8rem;
                                "
                            >
                                ⚽
                            </div>
                        `
                }


                <div class="season-info">

                    <h3>
                        ${escapeHTML(season.name)}
                    </h3>

                    <p>
                        🏟️ ${escapeHTML(season.club)}
                    </p>

                    ${
                        season.selection
                            ? `<p>🌎 ${escapeHTML(season.selection)}</p>`
                            : ""
                    }


                    <div class="season-numbers">

                        <span class="season-number">
                            Jogos:
                            <strong>
                                ${formatNumber(season.games)}
                            </strong>
                        </span>

                        <span class="season-number">
                            Vitórias:
                            <strong>
                                ${formatNumber(season.wins)}
                            </strong>
                        </span>

                        ${
                            career.type === "coach"
                                ? `
                                    <span class="season-number">
                                        Empates:
                                        <strong>${formatNumber(season.draws)}</strong>
                                    </span>

                                    <span class="season-number">
                                        Gols pró:
                                        <strong>${formatNumber(season.goals)}</strong>
                                    </span>

                                    <span class="season-number">
                                        Gols sofridos:
                                        <strong>${formatNumber(season.goalsAgainst)}</strong>
                                    </span>

                                    <span class="season-number">
                                        Derrotas:
                                        <strong>${formatNumber(season.losses)}</strong>
                                    </span>

                                    <span class="season-number">
                                        Aproveitamento:
                                        <strong>${calculateCoachWinRate(season)}%</strong>
                                    </span>
                                `
                                : `
                                    <span class="season-number">
                                        Gols:
                                        <strong>${formatNumber(season.goals)}</strong>
                                    </span>

                                    <span class="season-number">
                                        Assist:
                                        <strong>${formatNumber(season.assists)}</strong>
                                    </span>

                                    <span class="season-number">
                                        Derrotas:
                                        <strong>${formatNumber(season.losses)}</strong>
                                    </span>

                                    ${season.overall ? `
                                        <span class="season-number">
                                            OVR:
                                            <strong>${season.overall}</strong>
                                        </span>
                                    ` : ""}
                                `
                        }

                    </div>


                    ${
                        trophyText
                            ? `
                                <p style="
                                    margin-top:9px;
                                    color:var(--yellow);
                                ">
                                    🏆 ${trophyText}
                                </p>
                            `
                            : ""
                    }

                </div>


                <div class="season-actions">

                    <button
                        class="edit-btn"
                        data-action="edit"
                    >
                        ✏️
                    </button>

                    <button
                        class="delete-btn"
                        data-action="delete"
                    >
                        🗑️
                    </button>

                </div>
            `;


            card.querySelector(
                '[data-action="edit"]'
            ).addEventListener(
                "click",
                () =>
                    openEditSeasonModal(
                        season.id
                    )
            );


            card.querySelector(
                '[data-action="delete"]'
            ).addEventListener(
                "click",
                () =>
                    deleteSeason(
                        season.id
                    )
            );


            container.appendChild(card);
        }
    );
}


/* =========================================================
   EXCLUIR TEMPORADA
========================================================= */

function deleteSeason(id) {

    const career =
        getCurrentCareer();

    if (!career) return;


    const season =
        career.seasons.find(
            item => item.id === id
        );


    if (!season) return;


    if (
        !confirm(
            `Excluir a temporada "${season.name}"?`
        )
    ) {
        return;
    }


    removeGeneratedSeasonTitles(
        career,
        id
    );

    career.seasons =
        career.seasons.filter(
            item => item.id !== id
        );


    career.updatedAt = today();

    saveData();

    renderCareer();

    showToast(
        "Temporada excluída."
    );
}


/* =========================================================
   TRANSFERÊNCIAS
========================================================= */

function updateTransferSeasonVisibility() {

    const wrap = $("#transferSeasonWrap");
    const career = getCurrentCareer();

    if (!wrap) return;

    if (career?.type === "coach") {
        wrap.style.display = "";
        populateTransferSeasonSelect($("#transferSeason")?.value || "");
    } else {
        wrap.style.display = "none";
    }
}


function resetTransferForm() {

    $("#transferForm").reset();

    $("#transferId").value = "";

    $("#transferType").value =
        "Compra";

    populateTransferSeasonSelect();
    updateTransferSeasonVisibility();

    $("#transferPhotoPreview")
        .removeAttribute("src");

    $("#transferFromLogoPreview")
        .removeAttribute("src");

    $("#transferToLogoPreview")
        .removeAttribute("src");
}


function openNewTransferModal() {

    resetTransferForm();

    openDialog("transferDialog");
}


function openEditTransferModal(id) {

    const career =
        getCurrentCareer();

    if (!career) return;


    const transfer =
        career.transfers.find(
            item => item.id === id
        );

    if (!transfer) return;


    $("#transferId").value =
        transfer.id;


    $("#transferPlayer").value =
        transfer.player || "";


    $("#transferDate").value =
        transfer.date || "";

    populateTransferSeasonSelect(
        transfer.seasonId || ""
    );


    $("#transferType").value =
        transfer.type || "Compra";


    $("#transferValue").value =
        transfer.value || "";


    $("#transferFrom").value =
        transfer.from || "";


    $("#transferTo").value =
        transfer.to || "";


    $("#transferNotes").value =
        transfer.notes || "";


    if (transfer.photo) {

        $("#transferPhotoPreview").src =
            transfer.photo;
    }


    if (transfer.fromLogo) {

        $("#transferFromLogoPreview").src =
            transfer.fromLogo;
    }


    if (transfer.toLogo) {

        $("#transferToLogoPreview").src =
            transfer.toLogo;
    }


    openDialog("transferDialog");
}


async function handleTransferSubmit(event) {

    event.preventDefault();


    const career =
        getCurrentCareer();

    if (!career) return;


    const id =
        $("#transferId").value;


    const photo =
        await getFileInputData(
            "transferPhoto"
        );


    const fromLogo =
        await getFileInputData(
            "transferFromLogo"
        );


    const toLogo =
        await getFileInputData(
            "transferToLogo"
        );


    const data = {

        id:
            id || uid("transfer"),

        player:
            $("#transferPlayer").value.trim(),

        date:
            $("#transferDate").value.trim(),

        seasonId:
            $("#transferSeason")?.value || "",

        season:
            getTransferSeasonName(
                $("#transferSeason")?.value || ""
            ),

        type:
            $("#transferType").value,

        value:
            $("#transferValue").value.trim(),

        from:
            $("#transferFrom").value.trim(),

        to:
            $("#transferTo").value.trim(),

        notes:
            $("#transferNotes").value.trim(),

        photo,
        fromLogo,
        toLogo

    };


    if (!data.player) {

        showToast(
            "Digite o nome do jogador.",
            "error"
        );

        return;
    }


    if (!data.from) {

        showToast(
            "Digite o clube de origem.",
            "error"
        );

        return;
    }


    if (!data.to) {

        showToast(
            "Digite o clube de destino.",
            "error"
        );

        return;
    }


    if (id) {

        const old =
            career.transfers.find(
                item => item.id === id
            );


        if (old) {

            if (!data.photo) {
                data.photo =
                    old.photo || "";
            }

            if (!data.fromLogo) {
                data.fromLogo =
                    old.fromLogo || "";
            }

            if (!data.toLogo) {
                data.toLogo =
                    old.toLogo || "";
            }
        }


        const index =
            career.transfers.findIndex(
                item => item.id === id
            );


        if (index !== -1) {

            career.transfers[index] =
                data;
        }

    } else {

        career.transfers.push(data);
    }


    career.updatedAt = today();

    saveData();

    closeDialog("transferDialog");

    renderCareer();

    showToast(
        id
            ? "Transferência atualizada!"
            : "Transferência adicionada!"
    );
}


/* =========================================================
   RENDER TRANSFERÊNCIAS
========================================================= */

function populateTransferSeasonSelect(selectedId = "") {

    const select = $("#transferSeason");
    if (!select) return;

    const career = getCurrentCareer();
    if (!career) return;

    select.innerHTML = "";

    const none = document.createElement("option");
    none.value = "";
    none.textContent = "Sem temporada";
    select.appendChild(none);

    (career.seasons || []).forEach(season => {
        const option = document.createElement("option");
        option.value = season.id;
        option.textContent = season.name || "Temporada";
        select.appendChild(option);
    });

    select.value = selectedId || "";
}


function getTransferSeasonName(seasonId) {

    const career = getCurrentCareer();
    const season = (career?.seasons || []).find(
        item => item.id === seasonId
    );

    return season?.name || "";
}


function groupTransfersBySeason(career) {

    const groups = [];
    const map = new Map();

    (career.transfers || []).forEach(transfer => {

        const key = transfer.seasonId || transfer.season || "__none__";
        const name = transfer.season || "Sem temporada";

        if (!map.has(key)) {
            const group = { name, transfers: [] };
            map.set(key, group);
            groups.push(group);
        }

        map.get(key).transfers.push(transfer);
    });

    return groups;
}


function renderTransfers(career) {

    const container =
        $("#transferList");

    if (!container) return;


    container.innerHTML = "";


    if (!career.transfers.length) {

        container.innerHTML = emptyRecord(
            "🔄",
            "Nenhuma transferência",
            "Registre compras, vendas, empréstimos, trocas ou pré-contratos."
        );

        return;
    }


    const transferList =
        career.type === "coach"
            ? groupTransfersBySeason(career)
            : [{ name: "", transfers: career.transfers }];


    transferList.forEach(group => {

        if (career.type === "coach") {
            const heading = document.createElement("div");
            heading.className = "transfer-season-heading";
            heading.textContent = "📅 " + (group.name || "Sem temporada");
            container.appendChild(heading);
        }

        group.transfers.forEach(
        transfer => {

            const card =
                document.createElement("article");

            card.className =
                "transfer-card";


            card.innerHTML = `

                <div class="transfer-header">

                    <span class="transfer-type">
                        ${escapeHTML(transfer.type)}
                    </span>

                    <div class="record-actions">

                        <button
                            class="edit-btn"
                            data-action="edit"
                        >
                            ✏️
                        </button>

                        <button
                            class="delete-btn"
                            data-action="delete"
                        >
                            🗑️
                        </button>

                    </div>

                </div>


                <div class="transfer-body">


                    <div class="transfer-player">

                        ${
                            transfer.photo
                                ? `
                                    <img
                                        class="transfer-player-photo"
                                        src="${transfer.photo}"
                                        alt=""
                                    >
                                `
                                : `
                                    <div
                                        class="transfer-player-photo"
                                        style="
                                            display:grid;
                                            place-items:center;
                                            font-size:1.5rem;
                                        "
                                    >
                                        👤
                                    </div>
                                `
                        }


                        <div>

                            <h3>
                                ${escapeHTML(transfer.player)}
                            </h3>

                            <p>
                                ${escapeHTML(transfer.date || "Sem data")}
                            </p>

                        </div>

                    </div>



                    <div class="transfer-clubs">


                        <div class="transfer-club">

                            ${
                                transfer.fromLogo
                                    ? `
                                        <img
                                            src="${transfer.fromLogo}"
                                            alt=""
                                        >
                                    `
                                    : `
                                        <div class="club-placeholder">
                                            🛡️
                                        </div>
                                    `
                            }

                            <span>
                                ${escapeHTML(transfer.from)}
                            </span>

                        </div>


                        <div class="transfer-arrow">
                            →
                        </div>


                        <div class="transfer-club">

                            ${
                                transfer.toLogo
                                    ? `
                                        <img
                                            src="${transfer.toLogo}"
                                            alt=""
                                        >
                                    `
                                    : `
                                        <div class="club-placeholder">
                                            🛡️
                                        </div>
                                    `
                            }

                            <span>
                                ${escapeHTML(transfer.to)}
                            </span>

                        </div>

                    </div>



                    <div class="transfer-value">

                        <span>
                            Valor
                        </span>

                        <strong>
                            ${
                                escapeHTML(
                                    transfer.value || "Grátis"
                                )
                            }
                        </strong>

                    </div>


                    ${
                        transfer.notes
                            ? `
                                <p style="
                                    color:var(--muted);
                                    font-size:.72rem;
                                    margin-top:12px;
                                ">
                                    ${escapeHTML(transfer.notes)}
                                </p>
                            `
                            : ""
                    }

                </div>

            `;


            card.querySelector(
                '[data-action="edit"]'
            ).addEventListener(
                "click",
                () =>
                    openEditTransferModal(
                        transfer.id
                    )
            );


            card.querySelector(
                '[data-action="delete"]'
            ).addEventListener(
                "click",
                () =>
                    deleteTransfer(
                        transfer.id
                    )
            );


            container.appendChild(card);
        }
        );
    });
}


/* =========================================================
   EXCLUIR TRANSFERÊNCIA
========================================================= */

function deleteTransfer(id) {

    const career =
        getCurrentCareer();

    if (!career) return;


    if (
        !confirm(
            "Excluir esta transferência?"
        )
    ) {
        return;
    }


    career.transfers =
        career.transfers.filter(
            item => item.id !== id
        );


    career.updatedAt = today();

    saveData();

    renderCareer();

    showToast(
        "Transferência excluída."
    );
}


/* =========================================================
   TÍTULOS
========================================================= */

function resetTitleForm() {

    $("#titleForm").reset();

    $("#titleId").value = "";

    $("#titleCount").value = 1;

    $("#titlePhotoPreview")
        ?.removeAttribute("src");
}


function openNewTitleModal() {

    resetTitleForm();

    openDialog("titleDialog");
}


function openEditTitleModal(id) {

    const career =
        getCurrentCareer();

    if (!career) return;


    const title =
        career.titles.find(
            item => item.id === id
        );

    if (!title) return;


    $("#titleId").value =
        title.id;


    $("#titleName").value =
        title.name || "";


    $("#titleSeason").value =
        title.season || "";


    $("#titleClub").value =
        title.club || "";


    $("#titleCount").value =
        number(title.count) || 1;


    $("#titleNotes").value =
        title.notes || "";


    $("#titlePhotoPreview")
        ?.removeAttribute("src");

    if (title.photo) {
        $("#titlePhotoPreview").src =
            title.photo;
    }


    openDialog("titleDialog");
}


async function handleTitleSubmit(event) {

    event.preventDefault();


    const career =
        getCurrentCareer();

    if (!career) return;


    const id =
        $("#titleId").value;


    const photo =
        await getFileInputData(
            "titlePhoto"
        );


    const data = {

        id:
            id || uid("title"),

        name:
            $("#titleName").value.trim(),

        season:
            $("#titleSeason").value.trim(),

        club:
            $("#titleClub").value.trim(),

        count:
            number($("#titleCount").value) || 1,

        notes:
            $("#titleNotes").value.trim(),

        photo

    };


    if (!data.name) {

        showToast(
            "Digite o nome da competição.",
            "error"
        );

        return;
    }


    if (id) {

        const index =
            career.titles.findIndex(
                item => item.id === id
            );


        if (index !== -1) {

            const oldTitle =
                career.titles[index];

            if (!data.photo) {
                data.photo =
                    oldTitle.photo || "";
            }

            career.titles[index] =
                data;
        }

    } else {

        career.titles.push(data);
    }


    career.updatedAt = today();

    saveData();

    closeDialog("titleDialog");

    renderCareer();

    showToast(
        id
            ? "Título atualizado!"
            : "Título adicionado!"
    );
}


/* =========================================================
   RENDER TÍTULOS
========================================================= */

function renderTitles(career) {

    const container =
        $("#titleList");

    if (!container) return;


    container.innerHTML = "";


    if (!career.titles.length) {

        container.innerHTML = emptyRecord(
            "🏆",
            "Nenhum título",
            "Adicione os títulos conquistados."
        );

        return;
    }


    career.titles.forEach(
        title => {

            const card =
                document.createElement("article");

            card.className =
                "title-card";


            card.innerHTML = `

                <div class="title-heading-row">
                    ${
                        title.photo
                            ? `
                                <img
                                    class="title-photo"
                                    src="${title.photo}"
                                    alt="Foto do título"
                                >
                            `
                            : `
                                <span class="title-trophy-inline">🏆</span>
                            `
                    }
                    <h3>
                        ${escapeHTML(title.name)}
                    </h3>
                </div>


                <p>
                    ${escapeHTML(title.club || "Clube não informado")}
                </p>


                <p>
                    ${escapeHTML(title.season || "Temporada não informada")}
                </p>


                ${
                    title.notes
                        ? `
                            <p style="
                                margin-top:8px;
                            ">
                                ${escapeHTML(title.notes)}
                            </p>
                        `
                        : ""
                }


                <div class="title-card-footer">

                    <strong style="
                        color:var(--yellow);
                    ">
                        ${
                            number(title.count) > 1
                                ? `x${number(title.count)}`
                                : "1x"
                        }
                    </strong>


                    <div class="record-actions">

                        <button
                            class="edit-btn"
                            data-action="edit"
                        >
                            ✏️
                        </button>

                        <button
                            class="delete-btn"
                            data-action="delete"
                        >
                            🗑️
                        </button>

                    </div>

                </div>
            `;


            card.querySelector(
                '[data-action="edit"]'
            ).addEventListener(
                "click",
                () =>
                    openEditTitleModal(
                        title.id
                    )
            );


            card.querySelector(
                '[data-action="delete"]'
            ).addEventListener(
                "click",
                () =>
                    deleteTitle(
                        title.id
                    )
            );


            container.appendChild(card);
        }
    );
}


/* =========================================================
   EXCLUIR TÍTULO
========================================================= */

function deleteTitle(id) {

    const career =
        getCurrentCareer();

    if (!career) return;


    if (
        !confirm(
            "Excluir este título?"
        )
    ) {
        return;
    }


    career.titles =
        career.titles.filter(
            item => item.id !== id
        );


    career.updatedAt = today();

    saveData();

    renderCareer();

    showToast(
        "Título excluído."
    );
}


/* =========================================================
   PRÊMIOS
========================================================= */

function resetAwardForm() {

    $("#awardForm").reset();

    $("#awardId").value = "";

    $("#awardCount").value = 1;

    $("#awardPhotoPreview")
        .removeAttribute("src");
}


function openNewAwardModal() {

    resetAwardForm();

    openDialog("awardDialog");
}


function openEditAwardModal(id) {

    const career =
        getCurrentCareer();

    if (!career) return;


    const award =
        career.awards.find(
            item => item.id === id
        );

    if (!award) return;


    $("#awardId").value =
        award.id;


    $("#awardName").value =
        award.name || "";


    $("#awardSeason").value =
        award.season || "";


    $("#awardClub").value = award.club || "";
    $("#awardCompetition").value = award.competition || "";

    $("#awardCategory").value = award.category || "individual";

    $("#awardCount").value =
        number(award.count) || 1;


    $("#awardNotes").value =
        award.notes || "";


    if (award.photo) {

        $("#awardPhotoPreview").src =
            award.photo;
    }


    openDialog("awardDialog");
}


async function handleAwardSubmit(event) {

    event.preventDefault();


    const career =
        getCurrentCareer();

    if (!career) return;


    const id =
        $("#awardId").value;


    const photo =
        await getFileInputData(
            "awardPhoto"
        );


    const data = {

        id:
            id || uid("award"),

        category:
            $("#awardCategory")?.value || "individual",

        name:
            $("#awardName").value.trim(),

        season:
            $("#awardSeason").value.trim(),

        club:
            $("#awardClub").value.trim(),

        competition:
            $("#awardCompetition").value.trim(),

        count:
            number($("#awardCount").value) || 1,

        notes:
            $("#awardNotes").value.trim(),

        photo

    };


    if (!data.name) {

        showToast(
            "Digite o nome do prêmio.",
            "error"
        );

        return;
    }


    if (id) {

        const old =
            career.awards.find(
                item => item.id === id
            );


        if (
            old &&
            !data.photo
        ) {

            data.photo =
                old.photo || "";
        }


        const index =
            career.awards.findIndex(
                item => item.id === id
            );


        if (index !== -1) {

            career.awards[index] =
                data;
        }

    } else {

        career.awards.push(data);
    }


    career.updatedAt = today();

    saveData();

    closeDialog("awardDialog");

    renderCareer();

    showToast(
        id
            ? "Prêmio atualizado!"
            : "Prêmio adicionado!"
    );
}


/* =========================================================
   RENDER PRÊMIOS
========================================================= */

function renderAwards(career) {

    const container =
        $("#awardList");

    if (!container) return;


    container.innerHTML = "";


    if (!career.awards.length) {

        container.innerHTML = emptyRecord(
            "🥇",
            "Nenhum prêmio",
            "Adicione os prêmios individuais."
        );

        return;
    }


    career.awards.forEach(
        award => {

            const card =
                document.createElement("article");

            card.className =
                "award-card";


            card.innerHTML = `

                <div class="award-content">

                    <div class="title-heading-row award-heading-row">
                        ${
                            award.photo
                                ? `
                                    <img
                                        class="award-photo"
                                        src="${award.photo}"
                                        alt="Foto do prêmio"
                                    >
                                `
                                : `
                                    <span class="title-trophy-inline">🥇</span>
                                `
                        }
                        <h3>
                            ${escapeHTML(award.name)}
                        </h3>
                    </div>


                    <p>
                        ${escapeHTML(award.season || "Temporada não informada")}
                    </p>


                    <p>${escapeHTML(award.club || "Clube/Seleção não informado")}</p>
                    <p>${escapeHTML(award.competition || "Competição/Âmbito não informado")}</p>

                    ${
                        award.notes
                            ? `
                                <p style="
                                    margin-top:8px;
                                ">
                                    ${escapeHTML(award.notes)}
                                </p>
                            `
                            : ""
                    }


                    <div class="award-footer">

                        <strong style="
                            color:var(--yellow);
                        ">
                            ${
                                number(award.count) > 1
                                    ? `x${number(award.count)}`
                                    : "1x"
                            }
                        </strong>


                        <div class="record-actions">

                            <button
                                class="edit-btn"
                                data-action="edit"
                            >
                                ✏️
                            </button>

                            <button
                                class="delete-btn"
                                data-action="delete"
                            >
                                🗑️
                            </button>

                        </div>

                    </div>

                </div>
            `;


            card.querySelector(
                '[data-action="edit"]'
            ).addEventListener(
                "click",
                () =>
                    openEditAwardModal(
                        award.id
                    )
            );


            card.querySelector(
                '[data-action="delete"]'
            ).addEventListener(
                "click",
                () =>
                    deleteAward(
                        award.id
                    )
            );


            container.appendChild(card);
        }
    );
}


/* =========================================================
   EXCLUIR PRÊMIO
========================================================= */

function deleteAward(id) {

    const career =
        getCurrentCareer();

    if (!career) return;


    if (
        !confirm(
            "Excluir este prêmio?"
        )
    ) {
        return;
    }


    career.awards =
        career.awards.filter(
            item => item.id !== id
        );


    career.updatedAt = today();

    saveData();

    renderCareer();

    showToast(
        "Prêmio excluído."
    );
}


/* =========================================================
   GALERIA
========================================================= */

function resetGalleryForm() {

    $("#galleryForm").reset();

    $("#galleryId").value = "";

    $("#galleryPhotoPreview")
        .removeAttribute("src");
}


function openNewGalleryModal() {

    resetGalleryForm();

    openDialog("galleryDialog");
}


function openEditGalleryModal(id) {

    const career =
        getCurrentCareer();

    if (!career) return;


    const item =
        career.gallery.find(
            photo => photo.id === id
        );

    if (!item) return;


    $("#galleryId").value =
        item.id;


    if ($("#galleryCategory")) $("#galleryCategory").value = item.category || "career";

    $("#galleryClub").value =
        item.club || "";


    $("#gallerySeason").value =
        item.season || "";


    $("#galleryTitle").value =
        item.title || "";


    $("#galleryNotes").value =
        item.notes || "";


    if (item.photo) {

        $("#galleryPhotoPreview").src =
            item.photo;
    }


    openDialog("galleryDialog");
}


async function handleGallerySubmit(event) {

    event.preventDefault();


    const career =
        getCurrentCareer();

    if (!career) return;


    const id =
        $("#galleryId").value;


    const photo =
        await getFileInputData(
            "galleryPhoto"
        );


    const data = {

        id:
            id || uid("gallery"),

        category:
            $("#galleryCategory")?.value || "career",

        club:
            $("#galleryClub").value.trim(),

        season:
            $("#gallerySeason").value.trim(),

        title:
            $("#galleryTitle").value.trim(),

        notes:
            $("#galleryNotes").value.trim(),

        photo

    };


    if (!data.club) {

        showToast(
            "Digite o clube.",
            "error"
        );

        return;
    }


    if (!data.photo && !id) {

        showToast(
            "Escolha uma foto.",
            "error"
        );

        return;
    }


    if (id) {

        const old =
            career.gallery.find(
                item => item.id === id
            );


        if (
            old &&
            !data.photo
        ) {

            data.photo =
                old.photo || "";
        }


        const index =
            career.gallery.findIndex(
                item => item.id === id
            );


        if (index !== -1) {

            career.gallery[index] =
                data;
        }

    } else {

        career.gallery.push(data);
    }


    career.updatedAt = today();

    saveData();

    closeDialog("galleryDialog");

    renderCareer();

    showToast(
        id
            ? "Foto atualizada!"
            : "Foto adicionada à galeria!"
    );
}


/* =========================================================
   RENDER GALERIA
========================================================= */

function renderGallery(career) {

    const container =
        $("#galleryList");

    if (!container) return;


    container.innerHTML = "";


    const visibleGallery = career.gallery.filter(item => currentGalleryFilter === "all" || (item.category || "career") === currentGalleryFilter);

    if (!visibleGallery.length) {

        container.innerHTML = emptyRecord(
            "🖼️",
            "Galeria vazia",
            "Adicione fotos dos seus clubes e momentos."
        );

        return;
    }


    career.gallery.filter(item => currentGalleryFilter === "all" || (item.category || "career") === currentGalleryFilter).forEach(
        item => {

            const card =
                document.createElement("article");

            card.className =
                "gallery-card";


            card.innerHTML = `

                ${
                    item.photo
                        ? `
                            <img
                                class="gallery-photo"
                                src="${item.photo}"
                                alt=""
                            >
                        `
                        : `
                            <div
                                class="gallery-photo"
                                style="
                                    display:grid;
                                    place-items:center;
                                    font-size:3rem;
                                "
                            >
                                📷
                            </div>
                        `
                }


                <div class="gallery-content">

                    <h3>
                        ${escapeHTML(item.title || item.club)}
                    </h3>


                    <p>
                        ${escapeHTML(item.club)}
                    </p>


                    <div class="gallery-meta">

                        <span>
                            ${escapeHTML(item.season || "")}
                        </span>


                        <div class="record-actions">

                            <button
                                class="edit-btn"
                                data-action="edit"
                            >
                                ✏️
                            </button>

                            <button
                                class="delete-btn"
                                data-action="delete"
                            >
                                🗑️
                            </button>

                        </div>

                    </div>


                    ${
                        item.notes
                            ? `
                                <p style="
                                    margin-top:8px;
                                ">
                                    ${escapeHTML(item.notes)}
                                </p>
                            `
                            : ""
                    }

                </div>
            `;


            card.querySelector(
                '[data-action="edit"]'
            ).addEventListener(
                "click",
                () =>
                    openEditGalleryModal(
                        item.id
                    )
            );


            card.querySelector(
                '[data-action="delete"]'
            ).addEventListener(
                "click",
                () =>
                    deleteGalleryItem(
                        item.id
                    )
            );


            container.appendChild(card);
        }
    );
}


/* =========================================================
   EXCLUIR GALERIA
========================================================= */

function deleteGalleryItem(id) {

    const career =
        getCurrentCareer();

    if (!career) return;


    if (
        !confirm(
            "Excluir esta foto da galeria?"
        )
    ) {
        return;
    }


    career.gallery =
        career.gallery.filter(
            item => item.id !== id
        );


    career.updatedAt = today();

    saveData();

    renderCareer();

    showToast(
        "Foto excluída."
    );
}


/* =========================================================
   TOTAIS
========================================================= */

function renderTotals(career) {

    const summary =
        $("#summaryGrid");

    const head =
        $("#totalsHead");

    const body =
        $("#totalsBody");


    if (!summary || !head || !body) {
        return;
    }


    const totals =
        getCareerTotals(career);

    const quickSelection = $("#playerSelectionQuickAdd");
    if (quickSelection) {
        quickSelection.classList.toggle("hidden", career.type !== "player");
    }


    if (career.type === "player") {

        summary.innerHTML = `

            ${summaryCard(
                "⚽",
                "Jogos",
                formatNumber(totals.games)
            )}

            ${summaryCard(
                "🥅",
                "Gols",
                formatNumber(totals.goals)
            )}

            ${summaryCard(
                "🎯",
                "Assistências",
                formatNumber(totals.assists)
            )}

            ${summaryCard(
                "🏆",
                "Títulos",
                formatNumber(totals.titles)
            )}

            ${summaryCard(
                "🥇",
                "Prêmios",
                formatNumber(totals.awards)
            )}

            ${summaryCard(
                "🔄",
                "Transferências",
                formatNumber(totals.transfers)
            )}

        `;


        head.innerHTML = `

            <tr>
                <th>Clube / Seleção</th>
                <th>Jogos</th>
                <th>Gols</th>
                <th>Assist.</th>
                <th>Vitórias</th>
                <th>Derrotas</th>
            </tr>

        `;

    } else {

        const coachGames = totals.games;
        const coachPoints =
            (totals.wins * 3) + totals.draws;
        const coachMaxPoints =
            coachGames * 3;
        const coachWinRate =
            coachMaxPoints > 0
                ? ((coachPoints / coachMaxPoints) * 100).toFixed(1)
                : "0.0";

        summary.innerHTML = `

            ${summaryCard(
                "📅",
                "Temporadas",
                formatNumber(totals.seasons)
            )}

            ${summaryCard(
                "🏟️",
                "Clubes",
                formatNumber(
                    getUniqueClubs(career)
                )
            )}

            ${summaryCard(
                "🏆",
                "Títulos",
                formatNumber(totals.titles)
            )}

            ${summaryCard(
                "🎮",
                "Jogos",
                formatNumber(totals.games)
            )}

            ${summaryCard(
                "✅",
                "Vitórias",
                formatNumber(totals.wins)
            )}

            ${summaryCard(
                "🤝",
                "Empates",
                formatNumber(totals.draws)
            )}

            ${summaryCard(
                "❌",
                "Derrotas",
                formatNumber(totals.losses)
            )}

            ${summaryCard(
                "⚽",
                "Gols pró",
                formatNumber(totals.goals)
            )}

            ${summaryCard(
                "🥅",
                "Gols sofridos",
                formatNumber(totals.goalsAgainst)
            )}

            ${summaryCard(
                "📊",
                "Aproveitamento",
                `${coachWinRate}%`
            )}

        `;


        head.innerHTML = `

            <tr>
                <th>Clube</th>
                <th>Temporadas</th>
                <th>Jogos</th>
                <th>Vitórias</th>
                <th>Empates</th>
                <th>Derrotas</th>
                <th>Gols pró</th>
                <th>Gols sofridos</th>
                <th>Aproveitamento</th>
                <th>Títulos</th>
            </tr>

        `;
    }


    const clubs =
        {};


    (career.seasons || []).forEach(
        season => {

            const club =
                season.club ||
                "Sem clube";


            if (!clubs[club]) {

                clubs[club] = {

                    seasons: 0,
                    games: 0,
                    wins: 0,
                    draws: 0,
                    losses: 0,
                    goals: 0,
                    goalsAgainst: 0,
                    assists: 0,
                    titles: 0,
                    photo: ""

                };
            }


            clubs[club].seasons++;

            clubs[club].games +=
                number(season.games);

            clubs[club].wins +=
                number(season.wins);

            clubs[club].draws +=
                number(season.draws);

            clubs[club].losses +=
                number(season.losses);

            clubs[club].goals +=
                number(season.goals);

            clubs[club].goalsAgainst +=
                number(season.goalsAgainst);

            clubs[club].assists +=
                number(season.assists);

            if (!clubs[club].photo && season.clubPhoto) {
                clubs[club].photo = season.clubPhoto;
            }


            (season.trophies || []).forEach(
                trophy => {

                    clubs[club].titles +=
                        number(trophy.count) || 1;
                }
            );
        }
    );


    const selections = {};

    // Seleções informadas diretamente nas temporadas entram automaticamente
    // nos totais da carreira.
    (career.seasons || []).forEach(season => {
        const selection = String(season.selection || "").trim();
        if (!selection) return;
        if (!selections[selection]) selections[selection] = { games: 0, goals: 0, assists: 0 };
        selections[selection].games += number(season.games);
        selections[selection].goals += number(season.goals);
        selections[selection].assists += number(season.assists);
    });

    // Registros manuais de seleção também entram nos mesmos totais.
    (statsHubData.selectionStats || []).forEach(item => {
        if (normalizedKey(item.playerName) !== normalizedKey(career.name)) return;
        const selection = String(item.selection || "").trim();
        if (!selection) return;
        if (!selections[selection]) selections[selection] = { games: 0, goals: 0, assists: 0 };
        selections[selection].games += number(item.games);
        selections[selection].goals += number(item.goals);
        selections[selection].assists += number(item.assists);
    });

    const clubNames =
        Object.keys(clubs);


    if (!clubNames.length && !Object.keys(selections).length) {

        body.innerHTML = `

            <tr>

                <td
                    colspan="6"
                    style="
                        color:var(--muted);
                        text-align:center;
                        padding:30px;
                    "
                >
                    Nenhum dado registrado ainda.
                </td>

            </tr>

        `;

        return;
    }


    body.innerHTML =
        clubNames.map(
            club => {

                const c =
                    clubs[club];


                if (career.type === "player") {

                    return `

                        <tr>

                            <td>
                                <div class="stat-team-heading" style="justify-content:flex-start;gap:8px;">
                                    <div class="stat-team-avatar" style="width:28px;height:28px;min-width:28px;">
                                        ${getStatsMeta("club", club).photo || c.photo ? `<img src="${getStatsMeta("club", club).photo || c.photo}" alt="">` : "🏟️"}
                                    </div>
                                    <strong>${escapeHTML(club)}</strong>
                                </div>
                            </td>

                            <td>
                                ${formatNumber(c.games)}
                            </td>

                            <td>
                                ${formatNumber(c.goals)}
                            </td>

                            <td>
                                ${formatNumber(c.assists)}
                            </td>

                            <td>
                                ${formatNumber(c.wins)}
                            </td>

                            <td>
                                ${formatNumber(c.losses)}
                            </td>

                        </tr>

                    `;

                }


                const clubMaxPoints = c.games * 3;
                const clubPoints = (c.wins * 3) + c.draws;
                const clubRate = clubMaxPoints > 0
                    ? ((clubPoints / clubMaxPoints) * 100).toFixed(1)
                    : "0.0";

                return `

                    <tr>

                        <td>
                            <div class="stat-team-heading" style="justify-content:flex-start;gap:8px;">
                                <div class="stat-team-avatar" style="width:28px;height:28px;min-width:28px;">
                                    ${getStatsMeta("club", club).photo || c.photo ? `<img src="${getStatsMeta("club", club).photo || c.photo}" alt="">` : "🏟️"}
                                </div>
                                <strong>${escapeHTML(club)}</strong>
                            </div>
                        </td>

                        <td>
                            ${formatNumber(c.seasons)}
                        </td>

                        <td>
                            ${formatNumber(c.games)}
                        </td>

                        <td>
                            ${formatNumber(c.wins)}
                        </td>

                        <td>
                            ${formatNumber(c.draws)}
                        </td>

                        <td>
                            ${formatNumber(c.losses)}
                        </td>

                        <td>
                            ${formatNumber(c.goals)}
                        </td>

                        <td>
                            ${formatNumber(c.goalsAgainst)}
                        </td>

                        <td>
                            ${clubRate}%
                        </td>

                        <td>
                            ${formatNumber(c.titles)}
                        </td>

                    </tr>

                `;
            }
        ).join("") + (career.type === "player" ? Object.keys(selections).map(selection => {
            const c = selections[selection];
            const photo = getStatsMeta("selection", selection).photo || "";
            return `
                <tr>
                    <td>
                        <div class="stat-team-heading" style="justify-content:flex-start;gap:8px;">
                            <div class="stat-team-avatar" style="width:28px;height:28px;min-width:28px;">
                                ${photo ? `<img src="${photo}" alt="">` : "🌎"}
                            </div>
                            <strong>${escapeHTML(selection)}</strong>
                        </div>
                    </td>
                    <td>${formatNumber(c.games)}</td>
                    <td>${formatNumber(c.goals)}</td>
                    <td>${formatNumber(c.assists)}</td>
                    <td>—</td>
                    <td>—</td>
                </tr>
            `;
        }).join("") : "");

    renderCoachSquad(career);
}


function normalizeSquadPlayer(player = {}) {
    return {
        id: player.id || uid("squad"),
        name: player.name || "",
        position: player.position || "GOL",
        photo: player.photo || "",
        games: number(player.games),
        goals: number(player.goals),
        assists: number(player.assists),
        cleanSheets: number(player.cleanSheets),
        goalsFor: number(player.goalsFor),
        goalsAgainst: number(player.goalsAgainst)
    };
}


function getCoachSquadSeason(season) {
    season.squad = Array.isArray(season.squad)
        ? season.squad.map(normalizeSquadPlayer)
        : [];
    return season.squad;
}


function renderCoachSquad(career) {

    const root = $("#coachSquadManager");
    if (!root) return;

    if (career.type !== "coach") {
        root.innerHTML = "";
        root.classList.add("hidden");
        return;
    }

    root.classList.remove("hidden");

    const seasons = career.seasons || [];

    if (!seasons.length) {
        root.innerHTML = `
            <div class="card-title-row"><h3>👥 Plantel por temporada</h3></div>
            <p style="color:var(--muted);">Crie uma temporada primeiro.</p>
        `;
        return;
    }

    const selected = root.dataset.seasonId || seasons[0].id;
    const season = seasons.find(s => s.id === selected) || seasons[0];
    root.dataset.seasonId = season.id;

    const squad = getCoachSquadSeason(season);

    root.innerHTML = `
        <div class="card-title-row">
            <div>
                <h3>👥 Plantel por temporada</h3>
                <p style="color:var(--muted);margin:4px 0 0;">Cadastre o elenco e os números de cada jogador.</p>
            </div>
            <button type="button" class="small-btn" id="addSquadPlayerBtn">＋ Adicionar jogador</button>
        </div>

        <label class="coach-season-selector">
            Temporada
            <select id="coachSquadSeason">
                ${seasons.map(s => `<option value="${s.id}" ${s.id === season.id ? "selected" : ""}>${escapeHTML(s.name || "Temporada")}</option>`).join("")}
            </select>
        </label>

        <div id="coachSquadList" class="coach-squad-list">
            ${squad.length ? squad.map(renderSquadPlayerCard).join("") : `<p style="color:var(--muted);padding:20px 0;">Nenhum jogador cadastrado nesta temporada.</p>`}
        </div>
    `;

    $("#coachSquadSeason").addEventListener("change", event => {
        root.dataset.seasonId = event.target.value;
        renderCoachSquad(career);
    });

    $("#addSquadPlayerBtn").addEventListener("click", () => {
        openSquadPlayerModal(season.id);
    });

    root.querySelectorAll("[data-edit-squad]").forEach(btn => {
        btn.addEventListener("click", () => openSquadPlayerModal(season.id, btn.dataset.editSquad));
    });

    root.querySelectorAll("[data-delete-squad]").forEach(btn => {
        btn.addEventListener("click", () => deleteSquadPlayer(season.id, btn.dataset.deleteSquad));
    });
}


function renderSquadPlayerCard(player) {
    return `
        <article class="coach-player-card">
            <div class="coach-player-main">
                ${player.photo ? `<img src="${player.photo}" alt="">` : `<div class="coach-player-placeholder">👤</div>`}
                <div>
                    <strong>${escapeHTML(player.name || "Sem nome")}</strong>
                    <span>${escapeHTML(player.position)}</span>
                </div>
            </div>
            <div class="coach-player-stats">
                <span>Jogos <b>${player.games}</b></span>
                <span>Gols <b>${player.goals}</b></span>
                <span>Assist. <b>${player.assists}</b></span>
                <span>SG <b>${player.cleanSheets}</b></span>
                <span>GF <b>${player.goalsFor}</b></span>
                <span>GS <b>${player.goalsAgainst}</b></span>
            </div>
            <div class="record-actions">
                <button class="edit-btn" data-edit-squad="${player.id}">✏️</button>
                <button class="delete-btn" data-delete-squad="${player.id}">🗑️</button>
            </div>
        </article>
    `;
}


function openSquadPlayerModal(seasonId, playerId = "") {

    const career = getCurrentCareer();
    const season = career?.seasons.find(s => s.id === seasonId);
    if (!season) return;

    const existing = (season.squad || []).find(p => p.id === playerId);

    let dialog = $("#squadPlayerDialog");
    if (!dialog) {
        dialog = document.createElement("dialog");
        dialog.id = "squadPlayerDialog";
        dialog.innerHTML = `
            <form method="dialog" id="squadPlayerForm" class="modal-form">
                <div class="modal-head"><h2 id="squadDialogTitle">Jogador do plantel</h2><button type="button" class="icon-btn" id="closeSquadDialog">×</button></div>
                <input type="hidden" id="squadPlayerId">
                <input type="hidden" id="squadSeasonId">
                <div class="form-grid">
                    <label>Nome<input id="squadPlayerName" required></label>
                    <label>Posição<select id="squadPlayerPosition"><option>GOL</option><option>ZAG</option><option>LE</option><option>LD</option><option>VOL</option><option>MC</option><option>MEI</option><option>PE</option><option>PD</option><option>SA</option><option>ATA</option></select></label>
                    <label>Jogos<input id="squadGames" type="number" min="0" value="0"></label>
                    <label>Gols<input id="squadGoals" type="number" min="0" value="0"></label>
                    <label>Assistências<input id="squadAssists" type="number" min="0" value="0"></label>
                    <label>Jogos sem sofrer gol<input id="squadCleanSheets" type="number" min="0" value="0"></label>
                    <label>Gols feitos pelo time<input id="squadGoalsFor" type="number" min="0" value="0"></label>
                    <label>Gols sofridos pelo time<input id="squadGoalsAgainst" type="number" min="0" value="0"></label>
                </div>
                <div class="photo-upload-row"><img id="squadPhotoPreview" class="thumb large" alt=""><label class="upload-box">📷 Foto do jogador<input id="squadPlayerPhoto" type="file" accept="image/*" hidden></label></div>
                <div class="modal-actions"><button type="button" class="ghost" id="cancelSquadDialog">Cancelar</button><button class="primary" type="submit">Salvar jogador</button></div>
            </form>
        `;
        document.body.appendChild(dialog);
        $("#closeSquadDialog").addEventListener("click", () => dialog.close());
        $("#cancelSquadDialog").addEventListener("click", () => dialog.close());
        $("#squadPlayerPhoto").addEventListener("change", async e => {
            const file = e.target.files?.[0];
            if (file) $("#squadPhotoPreview").src = await fileToDataURL(file);
        });
        $("#squadPlayerForm").addEventListener("submit", async e => {
            e.preventDefault();
            const c = getCurrentCareer();
            const sid = $("#squadSeasonId").value;
            const s = c?.seasons.find(x => x.id === sid);
            if (!s) return;
            s.squad = Array.isArray(s.squad) ? s.squad : [];
            const pid = $("#squadPlayerId").value || uid("squad");
            const file = $("#squadPlayerPhoto").files?.[0];
            const old = s.squad.find(x => x.id === pid);
            const photo = file ? await fileToDataURL(file) : (old?.photo || "");
            const player = normalizeSquadPlayer({
                id: pid,
                name: $("#squadPlayerName").value.trim(),
                position: $("#squadPlayerPosition").value,
                games: $("#squadGames").value,
                goals: $("#squadGoals").value,
                assists: $("#squadAssists").value,
                cleanSheets: $("#squadCleanSheets").value,
                goalsFor: $("#squadGoalsFor").value,
                goalsAgainst: $("#squadGoalsAgainst").value,
                photo
            });
            if (!player.name) return;
            const index = s.squad.findIndex(x => x.id === pid);
            if (index >= 0) s.squad[index] = player; else s.squad.push(player);
            c.updatedAt = today();
            saveData();
            dialog.close();
            renderCareer();
            showToast("Jogador salvo!");
        });
    }

    $("#squadSeasonId").value = seasonId;
    $("#squadPlayerId").value = existing?.id || "";
    $("#squadPlayerName").value = existing?.name || "";
    $("#squadPlayerPosition").value = existing?.position || "GOL";
    $("#squadGames").value = existing?.games || 0;
    $("#squadGoals").value = existing?.goals || 0;
    $("#squadAssists").value = existing?.assists || 0;
    $("#squadCleanSheets").value = existing?.cleanSheets || 0;
    $("#squadGoalsFor").value = existing?.goalsFor || 0;
    $("#squadGoalsAgainst").value = existing?.goalsAgainst || 0;
    $("#squadPhotoPreview").src = existing?.photo || "";
    $("#squadPlayerPhoto").value = "";
    dialog.showModal();
}


function deleteSquadPlayer(seasonId, playerId) {
    const career = getCurrentCareer();
    const season = career?.seasons.find(s => s.id === seasonId);
    if (!season) return;
    if (!confirm("Excluir este jogador do plantel?")) return;
    season.squad = (season.squad || []).filter(p => p.id !== playerId);
    career.updatedAt = today();
    saveData();
    renderCareer();
    showToast("Jogador removido.");
}


function summaryCard(
    icon,
    label,
    value
) {

    return `

        <div class="summary-card">

            <div class="summary-icon">
                ${icon}
            </div>

            <span>
                ${label}
            </span>

            <strong>
                ${value}
            </strong>

        </div>

    `;
}


/* =========================================================
   OVERALL / ATRIBUTOS
========================================================= */

function renderAttributes(career) {

    if (!career) return;


    const groups =
        $("#attributeGroups");

    if (!groups) return;


    const cardPhoto =
        $("#cardPhoto");


    if (career.photo) {

        cardPhoto.src =
            career.photo;

    } else {

        cardPhoto.removeAttribute(
            "src"
        );
    }


    $("#cardName").textContent =
        career.name || "NOME";


    $("#cardPosition").textContent =
        career.position || "ATA";


    $("#cardNation").textContent =
        career.nation || "🇧🇷";


    $("#cardClub").textContent =
        career.club || "CLUBE";


    $("#cardPhysical").textContent =
        career.height
            ? `${career.height} cm · ${career.weight} kg`
            : "";


    $("#cardOverall").textContent =
        calculateOverall(career) || "0";


    groups.innerHTML = "";


    if (career.type !== "player") {
        return;
    }


    const attrs =
        career.attributes ||
        defaultAttributes();


    ATTRIBUTE_GROUPS.forEach(
        group => {

            const section =
                document.createElement("div");

            section.className =
                "attribute-group";


            section.innerHTML = `

                <h3>
                    ${group.title}
                </h3>

                <div class="attribute-list">

                    ${
                        group.attributes.map(
                            ([key, label]) => `

                                <label class="attribute">

                                    <span class="attribute-name">
                                        ${label}
                                    </span>

                                    <input
                                        type="number"
                                        min="0"
                                        max="99"
                                        data-attribute="${key}"
                                        value="${number(attrs[key])}"
                                    >

                                </label>

                            `
                        ).join("")
                    }

                </div>
            `;


            groups.appendChild(section);
        }
    ); + Object.keys(selections).map(selection => {
            const v = selections[selection];
            return `
                <tr>
                    <td><strong>${escapeHTML(selection)}</strong> <span class="stat-type-badge">Seleção</span></td>
                    <td>${formatNumber(v.games)}</td>
                    <td>${formatNumber(v.goals)}</td>
                    <td>${formatNumber(v.assists)}</td>
                    <td>—</td>
                    <td>—</td>
                </tr>`;
        }).join("")
}


/* =========================================================
   SALVAR ATRIBUTOS
========================================================= */

function saveAttributes() {

    const career =
        getCurrentCareer();

    if (!career) return;


    if (career.type !== "player") {
        return;
    }


    if (!career.attributes) {
        career.attributes =
            defaultAttributes();
    }


    $$(
        "#attributeGroups input[data-attribute]"
    ).forEach(
        input => {

            const key =
                input.dataset.attribute;


            let value =
                number(input.value);


            value =
                Math.max(
                    0,
                    Math.min(
                        99,
                        value
                    )
                );


            career.attributes[key] =
                value;

        }
    );


    career.updatedAt = today();

    saveData();

    renderProfile(career);

    renderCareerList();


    $("#cardOverall").textContent =
        calculateOverall(career) || "0";


    showToast(
        "Atributos salvos!"
    );
}


/* =========================================================
   EMPTY RECORD
========================================================= */

function emptyRecord(
    icon,
    title,
    text
) {

    return `

        <div
            class="empty-state"
            style="
                grid-column:1/-1;
                padding:45px 20px;
            "
        >

            <div class="empty-icon">
                ${icon}
            </div>

            <h3>
                ${title}
            </h3>

            <p>
                ${text}
            </p>

        </div>

    `;
}


/* =========================================================
   PREVIEW DAS IMAGENS
========================================================= */

function setupImagePreview(
    inputId,
    previewId
) {

    const input =
        document.getElementById(inputId);

    const preview =
        document.getElementById(previewId);


    if (!input || !preview) return;


    input.addEventListener(
        "change",
        async () => {

            const file =
                input.files?.[0];


            if (!file) return;


            const data =
                await fileToDataURL(file);


            preview.src = data;
        }
    );
}



/* =========================================================
   ESTATÍSTICAS GERAIS + HISTÓRIA
========================================================= */

const DEFAULT_AWARD_CATEGORIES = [
    "Melhor Jogador da UEFA",
    "Bola de Ouro",
    "Chuteira de Ouro",
    "The Best da FIFA",
    "Melhor Goleiro do Ano",
    "Melhor Jogador com Kaká",
    "Melhor Jogador da Oceania",
    "Melhor Jogador da África",
    "Melhor Jogador da Ásia",
    "Melhor Treinador do Mundo",
    "Rei da América"
];

function normalizeStatsHubData(data) {
    const d = data && typeof data === "object" ? data : {};
    let awardCategories = Array.isArray(d.awardCategories)
        ? d.awardCategories
        : [];

    // Na primeira utilização, cria as categorias sugeridas.
    // Depois disso, os nomes ficam totalmente livres para o usuário editar.
    if (!awardCategories.length) {
        awardCategories = DEFAULT_AWARD_CATEGORIES.map(name => ({
            id: uid("awardcat"),
            name,
            notes: ""
        }));
    }

    return {
        awardCategories: awardCategories.filter(item => item && item.name),
        customStats: Array.isArray(d.customStats) ? d.customStats : [],
        histories: Array.isArray(d.histories) ? d.histories : [],
        selectionStats: Array.isArray(d.selectionStats) ? d.selectionStats : [],
        clubStatsMeta: d.clubStatsMeta && typeof d.clubStatsMeta === "object" ? d.clubStatsMeta : {},
        selectionStatsMeta: d.selectionStatsMeta && typeof d.selectionStatsMeta === "object" ? d.selectionStatsMeta : {}
    };
}

async function loadStatsHubData() {
    let localData = null;
    let hasLocalStats = false;
    try {
        const saved = localStorage.getItem(STATS_STORAGE_KEY);
        if (saved) {
            localData = JSON.parse(saved);
            hasLocalStats = localData && typeof localData === "object";
        }
    } catch (error) {
        console.warn("Não foi possível ler as estatísticas do LocalStorage:", error);
    }

    // Para estatísticas, IndexedDB também tem prioridade sobre LocalStorage.
    // Assim um conjunto grande de dados não perde alterações por limite de quota.
    try {
        const db = await openOfflineDB();
        const saved = await new Promise((resolve, reject) => {
            const tx = db.transaction(DB_STATS_STORE, "readonly");
            const request = tx.objectStore(DB_STATS_STORE).get(STATS_STORAGE_KEY);
            request.onsuccess = () => resolve(request.result || "");
            request.onerror = () => reject(request.error);
        });
        db.close();

        if (saved) {
            const parsed = JSON.parse(saved);
            statsHubData = normalizeStatsHubData(parsed);
            try {
                localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(statsHubData));
            } catch (_) {}
            hasLocalStats = true;
        }
    } catch (error) {
        console.warn("Não foi possível recuperar as estatísticas offline:", error);
    }

    // Atualiza as áreas que dependem desses dados depois da recuperação assíncrona.
    try {
        renderStatsView();
    } catch (_) {}
    try {
        renderHistory();
    } catch (_) {}
}

async function saveStatsHubData() {
    statsHubData = normalizeStatsHubData(statsHubData);
    const serialized = JSON.stringify(statsHubData);
    try {
        localStorage.setItem(STATS_STORAGE_KEY, serialized);
    } catch (error) {
        console.warn("LocalStorage das estatísticas atingiu o limite; usando IndexedDB.", error);
    }

    try {
        const db = await openOfflineDB();
        await new Promise((resolve, reject) => {
            const tx = db.transaction(DB_STATS_STORE, "readwrite");
            tx.objectStore(DB_STATS_STORE).put(serialized, STATS_STORAGE_KEY);
            tx.oncomplete = resolve;
            tx.onerror = () => reject(tx.error);
        });
        db.close();
    } catch (error) {
        console.warn("Não foi possível salvar as estatísticas no armazenamento offline:", error);
    }

    try {
        navigator.storage?.persist?.();
    } catch (error) {
        console.warn(error);
    }
}

function normalizedKey(value) {
    return String(value || "").trim().toLocaleLowerCase("pt-BR");
}

function getPlayerCareers() {
    return careers.filter(career => career.type === "player");
}

function aggregateByField(field) {
    const map = new Map();

    getPlayerCareers().forEach(career => {
        (career.seasons || []).forEach(season => {
            const name = String(season[field] || "").trim();
            if (!name) return;

            const key = normalizedKey(name);

            if (!map.has(key)) {
                map.set(key, {
                    name,
                    players: new Map(),
                    games: 0,
                    goals: 0,
                    assists: 0,
                    wins: 0,
                    losses: 0,
                    draws: 0,
                    seasons: 0
                });
            }

            const group = map.get(key);
            group.seasons += 1;
            group.games += number(season.games);
            group.goals += number(season.goals);
            group.assists += number(season.assists);
            group.wins += number(season.wins);
            group.losses += number(season.losses);
            group.draws += number(season.draws);

            if (!group.players.has(career.id)) {
                group.players.set(career.id, {
                    id: career.id,
                    name: career.name,
                    photo: career.photo || "",
                    games: 0,
                    goals: 0,
                    assists: 0,
                    seasons: 0
                });
            }

            const player = group.players.get(career.id);
            player.games += number(season.games);
            player.goals += number(season.goals);
            player.assists += number(season.assists);
            player.seasons += 1;
        });
    });

    return [...map.values()]
        .sort((a,b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));
}

function statsMetricCards(group) {
    return `
        <div class="stats-metrics">
            <div><strong>${formatNumber(group.games)}</strong><span>Jogos</span></div>
            <div><strong>${formatNumber(group.goals)}</strong><span>Gols</span></div>
            <div><strong>${formatNumber(group.assists)}</strong><span>Assistências</span></div>
            <div><strong>${formatNumber(group.seasons)}</strong><span>Temporadas</span></div>
        </div>
    `;
}

function getStatsMeta(kind, name) {
    const source = kind === "club" ? statsHubData.clubStatsMeta : statsHubData.selectionStatsMeta;
    return source?.[normalizedKey(name)] || {};
}

function setStatsMetaPhoto(kind, name, photo) {
    const key = normalizedKey(name);
    if (!key) return;
    const sourceKey = kind === "club" ? "clubStatsMeta" : "selectionStatsMeta";
    statsHubData[sourceKey] = statsHubData[sourceKey] || {};
    statsHubData[sourceKey][key] = {
        ...(statsHubData[sourceKey][key] || {}),
        photo: photo || ""
    };
    saveStatsHubData();
    renderStatsView();
}

function openStatsTeamPhotoPicker(kind, name) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.style.display = "none";
    document.body.appendChild(input);
    input.addEventListener("change", () => {
        const file = input.files?.[0];
        if (!file) {
            input.remove();
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            setStatsMetaPhoto(kind, name, String(reader.result || ""));
            input.remove();
        };
        reader.readAsDataURL(file);
    });
    input.click();
}

function removeStatsTeamPhoto(kind, name) {
    if (!confirm(`Remover a foto de ${name}?`)) return;
    setStatsMetaPhoto(kind, name, "");
}

function renderClubStats() {
    const container = $("#clubStatsList");
    if (!container) return;

    const groups = aggregateByField("club");

    if (!groups.length) {
        container.innerHTML = emptyRecord("🏟️", "Nenhum clube", "Cadastre temporadas de jogadores para criar as estatísticas por clube.");
        return;
    }

    container.innerHTML = groups.map(group => {
        const players = [...group.players.values()]
            .sort((a,b) => b.games - a.games || a.name.localeCompare(b.name, "pt-BR"));

        return `
            <article class="hub-stat-card">
                <div class="hub-stat-head">
                    <div class="stat-team-heading">
                        <div class="stat-team-avatar">
                            ${getStatsMeta("club", group.name).photo ? `<img src="${getStatsMeta("club", group.name).photo}" alt="">` : "🏟️"}
                        </div>
                        <div>
                            <span class="eyebrow">CLUBE</span>
                            <h3>${escapeHTML(group.name)}</h3>
                        </div>
                    </div>
                    <div class="record-actions">
                        <span class="stat-count">${players.length} jogador${players.length === 1 ? "" : "es"}</span>
                        <button type="button" class="edit-btn" data-stats-photo-kind="club" data-stats-photo-name="${escapeHTML(group.name)}">✏️ Foto</button>
                    </div>
                </div>
                <div class="stat-player-list">
                    ${players.map(player => `
                        <div class="stat-player-row">
                            <div class="stat-player-main">
                                <div class="stat-mini-avatar">
                                    ${player.photo ? `<img src="${player.photo}" alt="">` : "⚽"}
                                </div>
                                <strong>${escapeHTML(player.name)}</strong>
                            </div>
                            <span>${formatNumber(player.games)} jogos</span>
                            <span>${formatNumber(player.goals)} gols</span>
                            <span>${formatNumber(player.assists)} assist.</span>
                        </div>
                    `).join("")}
                </div>
            </article>
        `;
    }).join("");
}

function renderSelectionStats() {
    const container = $("#selectionStatsList");
    if (!container) return;

    const groups = aggregateByField("selection");
    const manual = Array.isArray(statsHubData.selectionStats) ? statsHubData.selectionStats : [];

    if (!groups.length && !manual.length) {
        container.innerHTML = emptyRecord("🌎", "Nenhuma seleção", "Adicione uma seleção manualmente ou preencha a seleção nas temporadas dos jogadores.");
        return;
    }

    const automaticBySelection = new Map();
    groups.forEach(group => {
        automaticBySelection.set(normalizedKey(group.name), group);
    });

    const manualBySelection = new Map();
    manual.forEach(item => {
        const key = normalizedKey(item.selection);
        if (!key) return;
        if (!manualBySelection.has(key)) manualBySelection.set(key, []);
        manualBySelection.get(key).push(item);
    });

    const keys = [...new Set([...automaticBySelection.keys(), ...manualBySelection.keys()])]
        .sort((a,b) => {
            const na = automaticBySelection.get(a)?.name || manualBySelection.get(a)?.[0]?.selection || "";
            const nb = automaticBySelection.get(b)?.name || manualBySelection.get(b)?.[0]?.selection || "";
            return na.localeCompare(nb, "pt-BR", { sensitivity: "base" });
        });

    container.innerHTML = keys.map(key => {
        const group = automaticBySelection.get(key);
        const manualRows = manualBySelection.get(key) || [];
        const players = group ? [...group.players.values()] : [];
        const selectionName = group?.name || manualRows[0]?.selection || "Seleção";

        const rows = [
            ...players.map(player => ({
                id: `auto_${player.id}`,
                playerName: player.name,
                photo: player.photo || "",
                games: player.games,
                goals: player.goals,
                assists: player.assists,
                manual: false
            })),
            ...manualRows.map(item => ({
                id: item.id,
                playerName: item.playerName || "Estatística manual",
                photo: item.photo || "",
                games: number(item.games),
                goals: number(item.goals),
                assists: number(item.assists),
                manual: true
            }))
        ].sort((a,b) => b.games - a.games || a.playerName.localeCompare(b.playerName, "pt-BR"));

        return `
            <article class="hub-stat-card">
                <div class="hub-stat-head">
                    <div class="stat-team-heading">
                        <div class="stat-team-avatar">
                            ${getStatsMeta("selection", selectionName).photo ? `<img src="${getStatsMeta("selection", selectionName).photo}" alt="">` : "🌎"}
                        </div>
                        <div>
                            <span class="eyebrow">SELEÇÃO</span>
                            <h3>${escapeHTML(selectionName)}</h3>
                        </div>
                    </div>
                    <div class="record-actions">
                        <button type="button" class="edit-btn" data-stats-photo-kind="selection" data-stats-photo-name="${escapeHTML(selectionName)}">✏️ Foto</button>
                        <button type="button" class="small-btn" data-add-selection="${escapeHTML(selectionName)}">＋ Adicionar seleção</button>
                    </div>
                </div>
                <div class="stat-player-list">
                    ${rows.map(row => `
                        <div class="stat-player-row">
                            <div class="stat-player-main">
                                <div class="stat-mini-avatar">
                                    ${row.photo ? `<img src="${row.photo}" alt="">` : "🌎"}
                                </div>
                                <strong>${escapeHTML(row.playerName)}</strong>
                                ${row.manual ? `<span class="stat-manual-label">Manual</span>` : ""}
                            </div>
                            <span>${formatNumber(row.games)} jogos</span>
                            <span>${formatNumber(row.goals)} gols</span>
                            <span>${formatNumber(row.assists)} assist.</span>
                            ${row.manual ? `<div class="record-actions"><button class="edit-btn" data-selection-edit="${row.id}">✏️</button><button class="delete-btn" data-selection-delete="${row.id}">🗑️</button></div>` : ""}
                        </div>
                    `).join("")}
                </div>
            </article>
        `;
    }).join("");

    // Quando não há nenhuma seleção cadastrada ainda, oferece o botão fora de um card.
    if (!keys.length) {
        container.innerHTML = `<div class="section-head"><button type="button" class="primary" data-add-selection="">＋ Adicionar seleção</button></div>`;
    }
}

function normalizeSelectionStat(item = {}) {
    return {
        id: item.id || uid("selectionstat"),
        playerName: item.playerName || "",
        selection: item.selection || "",
        games: number(item.games),
        goals: number(item.goals),
        assists: number(item.assists),
        photo: item.photo || ""
    };
}

function openSelectionStatModal(id = "", selection = "") {
    const item = (statsHubData.selectionStats || []).find(x => x.id === id);

    $("#selectionStatId").value = item?.id || "";
    $("#selectionStatPlayer").value = item?.playerName || "";
    $("#selectionStatName").value = item?.selection || selection || "";
    $("#selectionStatGames").value = number(item?.games);
    $("#selectionStatGoals").value = number(item?.goals);
    $("#selectionStatAssists").value = number(item?.assists);
    const photoPreview = $("#selectionStatPhotoPreview");
    if (photoPreview) {
        photoPreview.src = item?.photo || "";
        photoPreview.style.display = item?.photo ? "block" : "none";
    }
    $("#selectionStatDialogTitle").textContent = item ? "Editar estatística de seleção" : "Adicionar seleção";

    openDialog("selectionStatDialog");
}

async function handleSelectionStatSubmit(event) {
    event.preventDefault();

    const id = $("#selectionStatId").value;
    const photo = await getFileInputData("selectionStatPhoto");
    const old = id ? (statsHubData.selectionStats || []).find(item => item.id === id) : null;
    const data = normalizeSelectionStat({
        id: id || uid("selectionstat"),
        playerName: $("#selectionStatPlayer").value.trim(),
        selection: $("#selectionStatName").value.trim(),
        games: $("#selectionStatGames").value,
        goals: $("#selectionStatGoals").value,
        assists: $("#selectionStatAssists").value,
        photo: photo || old?.photo || ""
    });

    if (!data.selection) {
        showToast("Digite o nome da seleção.", "error");
        return;
    }

    if (!data.playerName) {
        showToast("Digite o nome do jogador.", "error");
        return;
    }

    statsHubData.selectionStats = Array.isArray(statsHubData.selectionStats) ? statsHubData.selectionStats : [];

    if (id) {
        const index = statsHubData.selectionStats.findIndex(item => item.id === id);
        if (index !== -1) statsHubData.selectionStats[index] = data;
    } else {
        statsHubData.selectionStats.push(data);
    }

    saveStatsHubData();
    closeDialog("selectionStatDialog");
    renderSelectionStats();
    showToast(id ? "Estatística de seleção atualizada!" : "Seleção adicionada!");
}

function deleteSelectionStat(id) {
    if (!confirm("Excluir esta estatística de seleção?")) return;
    statsHubData.selectionStats = (statsHubData.selectionStats || []).filter(item => item.id !== id);
    saveStatsHubData();
    renderSelectionStats();
}

function aggregateAwards() {
    const map = new Map();

    careers.forEach(career => {
        (career.awards || []).forEach(award => {
            const name = String(award.name || "").trim();
            if (!name) return;

            const key = normalizedKey(name);
            if (!map.has(key)) {
                map.set(key, {
                    id: uid("aggaward"),
                    name,
                    winners: new Map(),
                    total: 0
                });
            }

            const group = map.get(key);
            const count = number(award.count) || 1;
            group.total += count;

            if (!group.winners.has(career.id)) {
                group.winners.set(career.id, {
                    id: career.id,
                    name: career.name,
                    photo: career.photo || "",
                    count: 0,
                    records: []
                });
            }

            const winner = group.winners.get(career.id);
            winner.count += count;
            winner.records.push(award);
        });
    });

    return [...map.values()].sort((a,b) =>
        a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" })
    );
}

function openStatsAwardCategoryModal(id = "") {
    const item = statsHubData.awardCategories.find(x => x.id === id);

    $("#statsAwardCategoryId").value = item?.id || "";
    $("#statsAwardCategoryName").value = item?.name || "";
    $("#statsAwardCategoryNotes").value = item?.notes || "";
    $("#statsAwardCategoryTitle").textContent = item ? "Editar prêmio" : "Adicionar prêmio";

    openDialog("statsAwardCategoryDialog");
}

function renderStatsAwards() {
    const container = $("#statsAwardsList");
    if (!container) return;

    const aggregated = aggregateAwards();
    const customCategories = statsHubData.awardCategories || [];

    const allNames = new Map();

    customCategories.forEach(category => {
        allNames.set(normalizedKey(category.name), {
            ...category,
            aggregate: aggregated.find(item => normalizedKey(item.name) === normalizedKey(category.name))
        });
    });

    aggregated.forEach(group => {
        if (!allNames.has(normalizedKey(group.name))) {
            allNames.set(normalizedKey(group.name), {
                id: "",
                name: group.name,
                notes: "",
                aggregate: group
            });
        } else {
            allNames.get(normalizedKey(group.name)).aggregate = group;
        }
    });

    const list = [...allNames.values()].sort((a,b) =>
        a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" })
    );

    container.innerHTML = list.map(category => {
        const group = category.aggregate;
        const winners = group ? [...group.winners.values()].sort((a,b) =>
            b.count - a.count || a.name.localeCompare(b.name, "pt-BR")
        ) : [];

        return `
            <article class="hub-stat-card">
                <div class="hub-stat-head">
                    <div>
                        <span class="eyebrow">PRÊMIO INDIVIDUAL</span>
                        <h3>${escapeHTML(category.name)}</h3>
                    </div>
                    <div class="record-actions">
                        ${category.id ? `<button class="edit-btn" data-stats-award-edit="${category.id}">✏️ Editar nome</button>` : ""}
                        ${category.id
                            ? `<button class="delete-btn" data-stats-award-delete="${category.id}">🗑️</button>`
                            : ""}
                    </div>
                </div>
                ${group ? `
                    <div class="award-total-banner"><strong>${formatNumber(group.total)}</strong><span>vez${group.total === 1 ? "" : "es"} conquistado</span></div>
                    <div class="stat-player-list">
                        ${winners.map(winner => `
                            <div class="stat-player-row">
                                <div class="stat-player-main">
                                    <div class="stat-mini-avatar">
                                        ${winner.photo ? `<img src="${winner.photo}" alt="">` : "🥇"}
                                    </div>
                                    <strong>${escapeHTML(winner.name)}</strong>
                                </div>
                                <span>${formatNumber(winner.count)}x</span>
                            </div>
                        `).join("")}
                    </div>
                ` : `
                    <div class="empty-inline">Nenhuma conquista cadastrada nas carreiras ainda.</div>
                `}
            </article>
        `;
    }).join("");
}

function getGlobalPlayerStats() {
    return getPlayerCareers().map(career => {
        const totals = getCareerTotals(career);
        return {
            career,
            games: number(totals.games),
            goals: number(totals.goals),
            assists: number(totals.assists)
        };
    });
}

function renderCustomStats() {
    const container = $("#customStatsList");
    if (!container) return;

    const rows = [...statsHubData.customStats];

    const global = getGlobalPlayerStats();
    const totalGames = global.reduce((sum, item) => sum + item.games, 0);
    const totalGoals = global.reduce((sum, item) => sum + item.goals, 0);
    const totalAssists = global.reduce((sum, item) => sum + item.assists, 0);
    const mostGames = [...global].sort((a,b) => b.games - a.games)[0];
    const mostGoals = [...global].sort((a,b) => b.goals - a.goals)[0];
    const mostAssists = [...global].sort((a,b) => b.assists - a.assists)[0];

    const automatic = [
        ["Números Totais de Jogos", formatNumber(totalGames)],
        ["Jogador com mais Assistências", mostAssists ? `${mostAssists.career.name} — ${formatNumber(mostAssists.assists)}` : "—"],
        ["Jogador que fez mais Gols", mostGoals ? `${mostGoals.career.name} — ${formatNumber(mostGoals.goals)}` : "—"],
        ["Jogador com mais Partidas", mostGames ? `${mostGames.career.name} — ${formatNumber(mostGames.games)}` : "—"],
        ["Números Totais de Gols", formatNumber(totalGoals)],
        ["Números Totais de Assistências", formatNumber(totalAssists)]
    ];

    container.innerHTML = `
        <article class="hub-stat-card full-span">
            <div class="hub-stat-head">
                <div>
                    <span class="eyebrow">AUTOMÁTICAS</span>
                    <h3>📈 Destaques gerais</h3>
                </div>
                <span class="stat-count">calculadas pelas carreiras</span>
            </div>
            <div class="custom-stat-grid">
                ${automatic.map(([name,value]) => `
                    <div class="custom-stat-box">
                        <span>${escapeHTML(name)}</span>
                        <strong>${escapeHTML(value)}</strong>
                    </div>
                `).join("")}
            </div>
        </article>

        ${rows.map(stat => `
            <article class="hub-stat-card">
                <div class="hub-stat-head">
                    <div>
                        <span class="eyebrow">EDITÁVEL</span>
                        <h3>${escapeHTML(stat.name)}</h3>
                    </div>
                    <div class="record-actions">
                        <button class="edit-btn" data-custom-stat-edit="${stat.id}">✏️ Editar</button>
                        <button class="delete-btn" data-custom-stat-delete="${stat.id}">🗑️ Excluir</button>
                    </div>
                </div>
                <div class="custom-stat-value">${escapeHTML(stat.value)}</div>
                ${stat.notes ? `<p class="custom-stat-notes">${escapeHTML(stat.notes)}</p>` : ""}
            </article>
        `).join("")}
    `;

    if (!rows.length) {
        container.insertAdjacentHTML("beforeend", `
            <article class="hub-stat-card empty-inline full-span">
                Clique em "Adicionar estatística" para criar seus próprios recordes, como "Campeão do Mundo", "Melhor assistente", "Rei da América" ou qualquer outro.
            </article>
        `);
    }
}

function renderStatsView() {
    renderClubStats();
    renderSelectionStats();
    renderStatsAwards();
    renderCustomStats();
}

function switchStatsTab(tab) {
    currentStatsTab = tab;

    $$(".hub-tab").forEach(button => {
        button.classList.toggle("active", button.dataset.statsTab === tab);
    });

    $$(".stats-panel").forEach(panel => panel.classList.add("hidden"));
    $(`#stats-panel-${tab}`)?.classList.remove("hidden");
}

function openStatsView() {
    $("#careerListView")?.classList.add("hidden");
    $("#careerView")?.classList.add("hidden");
    $("#historyView")?.classList.add("hidden");
    $("#statsView")?.classList.remove("hidden");

    renderStatsView();
    switchStatsTab(currentStatsTab);
}

function closeStatsView() {
    careerCategoriesOpen = false;
    $("#statsView")?.classList.add("hidden");
    $("#careerListView")?.classList.remove("hidden");
    renderCareerList();
}

function openHistoryView() {
    $("#careerListView")?.classList.add("hidden");
    $("#careerView")?.classList.add("hidden");
    $("#statsView")?.classList.add("hidden");
    $("#historyView")?.classList.remove("hidden");
    renderHistory();
}

function closeHistoryView() {
    careerCategoriesOpen = false;
    $("#historyView")?.classList.add("hidden");
    $("#careerListView")?.classList.remove("hidden");
    renderCareerList();
}

function openCustomStatModal(id = "") {
    const item = statsHubData.customStats.find(x => x.id === id);

    $("#customStatId").value = item?.id || "";
    $("#customStatName").value = item?.name || "";
    $("#customStatValue").value = item?.value || "";
    $("#customStatNotes").value = item?.notes || "";
    $("#customStatDialogTitle").textContent = item ? "Editar estatística" : "Adicionar estatística";

    openDialog("customStatDialog");
}

function openHistoryModal(id = "") {
    const item = statsHubData.histories.find(x => x.id === id);

    $("#historyId").value = item?.id || "";
    $("#historyCareer").innerHTML = `
        <option value="">História independente</option>
        ${getPlayerCareers().sort((a,b) => a.name.localeCompare(b.name, "pt-BR")).map(career =>
            `<option value="${career.id}">${escapeHTML(career.name)}</option>`
        ).join("")}
    `;
    $("#historyCareer").value = item?.careerId || "";
    $("#historyName").value = item?.name || "";
    $("#historyPosition").value = item?.position || "";
    $("#historyNation").value = item?.nation || "";
    $("#historyPeriod").value = item?.period || "";
    $("#historyGames").value = number(item?.games);
    $("#historyGoals").value = number(item?.goals);
    $("#historyAssists").value = number(item?.assists);
    $("#historyTitles").value = number(item?.titles);
    $("#historyStory").value = item?.story || "";

    const input = $("#historyPhoto");
    input.value = "";
    input.dataset.existingPhoto = item?.photo || "";

    $("#historyDialogTitle").textContent = item ? "Editar história" : "Adicionar história";

    openDialog("historyDialog");
}

function fillHistoryFromCareer() {
    const careerId = $("#historyCareer").value;
    const career = careers.find(item => item.id === careerId);
    if (!career) return;

    const totals = getCareerTotals(career);
    $("#historyName").value = career.name || "";
    $("#historyPosition").value = career.position || "";
    $("#historyNation").value = career.nation || "";
    $("#historyGames").value = number(totals.games);
    $("#historyGoals").value = number(totals.goals);
    $("#historyAssists").value = number(totals.assists);
    $("#historyTitles").value = number(totals.titles);
    $("#historyPeriod").value = career.seasons?.length
        ? `${career.seasons[0].name || ""} — ${career.seasons[career.seasons.length - 1].name || ""}`
        : "";
}

async function handleStatsAwardCategorySubmit(event) {
    event.preventDefault();

    const id = $("#statsAwardCategoryId").value;
    const data = {
        id: id || uid("awardcat"),
        name: $("#statsAwardCategoryName").value.trim(),
        notes: $("#statsAwardCategoryNotes").value.trim()
    };

    if (!data.name) return;

    if (id) {
        const index = statsHubData.awardCategories.findIndex(item => item.id === id);

        if (index !== -1) {
            const oldName = statsHubData.awardCategories[index].name;

            // Renomear a categoria também renomeia o mesmo prêmio nas carreiras.
            if (oldName && normalizedKey(oldName) !== normalizedKey(data.name)) {
                careers.forEach(career => {
                    (career.awards || []).forEach(award => {
                        if (normalizedKey(award.name) === normalizedKey(oldName)) {
                            award.name = data.name;
                        }
                    });
                });
                saveData();
            }

            statsHubData.awardCategories[index] = data;
        }
    } else {
        statsHubData.awardCategories.push(data);
    }

    saveStatsHubData();
    closeDialog("statsAwardCategoryDialog");
    renderStatsView();
    showToast(id ? "Prêmio atualizado!" : "Prêmio adicionado!");
}

async function handleCustomStatSubmit(event) {
    event.preventDefault();

    const id = $("#customStatId").value;
    const data = {
        id: id || uid("customstat"),
        name: $("#customStatName").value.trim(),
        value: $("#customStatValue").value.trim(),
        notes: $("#customStatNotes").value.trim()
    };

    if (!data.name) {
        showToast("Digite o nome da estatística.", "error");
        return;
    }

    if (id) {
        const index = statsHubData.customStats.findIndex(item => item.id === id);
        if (index !== -1) statsHubData.customStats[index] = data;
    } else {
        statsHubData.customStats.push(data);
    }

    saveStatsHubData();
    closeDialog("customStatDialog");
    renderCustomStats();
    showToast(id ? "Estatística atualizada!" : "Estatística adicionada!");
}

async function handleHistorySubmit(event) {
    event.preventDefault();

    const id = $("#historyId").value;
    const photoInput = $("#historyPhoto");
    let photo = photoInput.dataset.existingPhoto || "";

    if (photoInput.files?.[0]) {
        photo = await fileToDataURL(photoInput.files[0]);
    }

    const data = {
        id: id || uid("history"),
        careerId: $("#historyCareer").value,
        name: $("#historyName").value.trim(),
        position: $("#historyPosition").value.trim(),
        nation: $("#historyNation").value.trim(),
        period: $("#historyPeriod").value.trim(),
        games: number($("#historyGames").value),
        goals: number($("#historyGoals").value),
        assists: number($("#historyAssists").value),
        titles: number($("#historyTitles").value),
        photo,
        story: $("#historyStory").value.trim()
    };

    if (!data.name) {
        showToast("Digite o nome do jogador.", "error");
        return;
    }

    if (id) {
        const index = statsHubData.histories.findIndex(item => item.id === id);
        if (index !== -1) statsHubData.histories[index] = data;
    } else {
        statsHubData.histories.push(data);
    }

    saveStatsHubData();
    closeDialog("historyDialog");
    renderHistory();
    showToast(id ? "História atualizada!" : "História adicionada!");
}

function renderHistory() {
    const container = $("#historyList");
    if (!container) return;

    const histories = [...statsHubData.histories].sort((a,b) =>
        a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" })
    );

    if (!histories.length) {
        container.innerHTML = emptyRecord("📖", "Nenhuma história", "Adicione a história de um jogador para criar sua galeria de trajetórias.");
        return;
    }

    container.innerHTML = histories.map(item => `
        <article class="history-card">
            <div class="history-photo">
                ${item.photo ? `<img src="${item.photo}" alt="${escapeHTML(item.name)}">` : "⚽"}
            </div>
            <div class="history-content">
                <div class="hub-stat-head">
                    <div>
                        <span class="eyebrow">HISTÓRIA</span>
                        <h3>${escapeHTML(item.name)}</h3>
                        <p>${escapeHTML([item.position, item.nation, item.period].filter(Boolean).join(" • "))}</p>
                    </div>
                    <div class="record-actions">
                        <button class="edit-btn" data-history-edit="${item.id}">✏️ Editar</button>
                        <button class="delete-btn" data-history-delete="${item.id}">🗑️ Excluir</button>
                    </div>
                </div>

                <div class="history-metrics">
                    <div><strong>${formatNumber(item.games)}</strong><span>Jogos</span></div>
                    <div><strong>${formatNumber(item.goals)}</strong><span>Gols</span></div>
                    <div><strong>${formatNumber(item.assists)}</strong><span>Assistências</span></div>
                    <div><strong>${formatNumber(item.titles)}</strong><span>Títulos</span></div>
                </div>

                ${item.story ? `<p class="history-story">${escapeHTML(item.story)}</p>` : ""}
            </div>
        </article>
    `).join("");
}

function deleteStatsAwardCategory(id) {
    const item = statsHubData.awardCategories.find(x => x.id === id);
    if (!item) return;

    if (!confirm(`Excluir a categoria "${item.name}"? Os prêmios nas carreiras não serão apagados.`)) return;

    statsHubData.awardCategories = statsHubData.awardCategories.filter(x => x.id !== id);
    saveStatsHubData();
    renderStatsAwards();
}

function deleteCustomStat(id) {
    if (!confirm("Excluir esta estatística personalizada?")) return;
    statsHubData.customStats = statsHubData.customStats.filter(x => x.id !== id);
    saveStatsHubData();
    renderCustomStats();
}

function deleteHistory(id) {
    if (!confirm("Excluir esta história?")) return;
    statsHubData.histories = statsHubData.histories.filter(x => x.id !== id);
    saveStatsHubData();
    renderHistory();
}

function handleStatsDelegation(event) {
    const target = event.target.closest("button");
    if (!target) return;

    const editAward = target.dataset.statsAwardEdit;
    const deleteAward = target.dataset.statsAwardDelete;
    const editCustom = target.dataset.customStatEdit;
    const deleteCustom = target.dataset.customStatDelete;
    const editHistory = target.dataset.historyEdit;
    const deleteHistoryId = target.dataset.historyDelete;
    const addSelection = target.dataset.addSelection;
    const editSelection = target.dataset.selectionEdit;
    const deleteSelection = target.dataset.selectionDelete;
    const statsPhotoKind = target.dataset.statsPhotoKind;
    const statsPhotoName = target.dataset.statsPhotoName;

    if (editAward) openStatsAwardCategoryModal(editAward);
    if (deleteAward) deleteStatsAwardCategory(deleteAward);
    if (editCustom) openCustomStatModal(editCustom);
    if (deleteCustom) deleteCustomStat(deleteCustom);
    if (editHistory) openHistoryModal(editHistory);
    if (deleteHistoryId) deleteHistory(deleteHistoryId);
    if (addSelection !== undefined) openSelectionStatModal("", addSelection);
    if (editSelection) openSelectionStatModal(editSelection);
    if (deleteSelection) deleteSelectionStat(deleteSelection);
    if (statsPhotoKind && statsPhotoName) openStatsTeamPhotoPicker(statsPhotoKind, statsPhotoName);
}

/* =========================================================
   EVENTOS
========================================================= */

function setupEvents() {

    /* NOVA CARREIRA */

    $("#newCareerBtn")
        ?.addEventListener(
            "click",
            openNewCareerModal
        );

    $("#openStatsBtn")
        ?.addEventListener("click", openStatsView);

    $("#openHistoryBtn")
        ?.addEventListener("click", openHistoryView);

    $("#backFromStatsBtn")
        ?.addEventListener("click", closeStatsView);

    $("#backFromHistoryBtn")
        ?.addEventListener("click", closeHistoryView);

    $("#addHistoryBtn")
        ?.addEventListener("click", () => openHistoryModal());

    $("#addCustomStatBtn")
        ?.addEventListener("click", () => openCustomStatModal());

    $("#addStatsAwardCategoryBtn")
        ?.addEventListener("click", () => openStatsAwardCategoryModal());

    $("#selectionStatForm")
        ?.addEventListener("submit", handleSelectionStatSubmit);

    $("#statsAwardCategoryForm")
        ?.addEventListener("submit", handleStatsAwardCategorySubmit);

    $("#customStatForm")
        ?.addEventListener("submit", handleCustomStatSubmit);

    $("#historyForm")
        ?.addEventListener("submit", handleHistorySubmit);

    $("#historyCareer")
        ?.addEventListener("change", fillHistoryFromCareer);

    $$(".hub-tab").forEach(button => {
        button.addEventListener("click", () => switchStatsTab(button.dataset.statsTab));
    });

    $("#statsView")
        ?.addEventListener("click", handleStatsDelegation);

    $("#historyView")
        ?.addEventListener("click", handleStatsDelegation);


    $("#emptyNewBtn")
        ?.addEventListener(
            "click",
            openNewCareerModal
        );


    /* VOLTAR */

    $("#backBtn")
        ?.addEventListener(
            "click",
            closeCareer
        );


    /* EDITAR */

    $("#editCareerBtn")
        ?.addEventListener(
            "click",
            openEditCareerModal
        );


    /* EXCLUIR */

    $("#deleteCareerBtn")
        ?.addEventListener(
            "click",
            deleteCurrentCareer
        );


    /* FOTO PERFIL */

    $("#profilePhotoInput")
        ?.addEventListener(
            "change",
            handleProfilePhoto
        );


    /* TIPO */

    $("#careerType")
        ?.addEventListener(
            "change",
            updateCareerTypeFields
        );


    /* SELETOR DE CARREIRAS */

    $("#careerCategoriesToggle")
        ?.addEventListener("click", toggleCareerCategories);


    /* ADICIONAR SELEÇÃO PELOS NÚMEROS DO JOGADOR */

    $("#addPlayerSelectionStatBtn")
        ?.addEventListener("click", () => {
            const career = getCurrentCareer();
            const defaultPlayer = career?.name || "";
            $("#selectionStatId").value = "";
            $("#selectionStatPlayer").value = defaultPlayer;
            $("#selectionStatName").value = "";
            $("#selectionStatGames").value = 0;
            $("#selectionStatGoals").value = 0;
            $("#selectionStatAssists").value = 0;
            $("#selectionStatDialogTitle").textContent = "Adicionar seleção";
            openDialog("selectionStatDialog");
        });


    /* FORM CARREIRA */

    $("#careerForm")
        ?.addEventListener(
            "submit",
            handleCareerSubmit
        );


    /* TEMPORADA */

    $("#addSeasonBtn")
        ?.addEventListener(
            "click",
            openNewSeasonModal
        );


    $("#seasonForm")
        ?.addEventListener(
            "submit",
            handleSeasonSubmit
        );


    $("#addSeasonTrophyBtn")
        ?.addEventListener(
            "click",
            () => addSeasonTrophyRow()
        );


    /* TRANSFERÊNCIA */

    $("#addTransferBtn")
        ?.addEventListener(
            "click",
            openNewTransferModal
        );


    $("#transferForm")
        ?.addEventListener(
            "submit",
            handleTransferSubmit
        );


    /* TÍTULO */

    $("#addTitleBtn")
        ?.addEventListener(
            "click",
            openNewTitleModal
        );


    $("#titleForm")
        ?.addEventListener(
            "submit",
            handleTitleSubmit
        );


    /* PRÊMIO */

    $("#addAwardBtn")
        ?.addEventListener(
            "click",
            openNewAwardModal
        );


    $("#awardForm")
        ?.addEventListener(
            "submit",
            handleAwardSubmit
        );


    /* GALERIA */

    $("#addGalleryBtn")
        ?.addEventListener(
            "click",
            openNewGalleryModal
        );


    $("#galleryForm")
        ?.addEventListener(
            "submit",
            handleGallerySubmit
        );


    $$(".gallery-filter").forEach(btn => btn.addEventListener("click", () => { currentGalleryFilter = btn.dataset.galleryFilter; $$(".gallery-filter").forEach(b=>b.classList.toggle("active",b===btn)); const career=getCurrentCareer(); if(career) renderGallery(career); }));
    $("#addShelfTitleBtn")?.addEventListener("click",()=>{
        const type = currentShelfView === "award" ? "award" : "trophy";
        $("#shelfItemType").value=type;
        $("#shelfItemType").disabled=true;
        openDialog("shelfItemDialog");
    });
    $$(".shelf-filter").forEach(btn=>btn.addEventListener("click",()=>{
        currentShelfView=btn.dataset.shelfView || "trophy";
        $$(".shelf-filter").forEach(b=>b.classList.toggle("active",b===btn));
        const title=$("#shelfViewTitle"); if(title) title.textContent=currentShelfView === "award" ? "Prateleira de Prêmios Individuais" : "Prateleira de Troféus";
        const career=getCurrentCareer(); if(career) renderTrophyShelf(career);
    }));
    // Prateleira de prêmios individuais é automática e alimentada pelos registros de prêmios.
    
    /* PRATELEIRA DE TROFÉUS */
    $("#addShelfItemBtn")?.addEventListener("click", () => openDialog("shelfItemDialog"));
    $("#shelfItemForm")?.addEventListener("submit", handleShelfItemSubmit);

    /* HISTÓRIA DA CARREIRA */
    $("#addCareerHistoryBtn")?.addEventListener("click", () => openCareerHistoryModal());
    $("#careerHistoryForm")?.addEventListener("submit", handleCareerHistorySubmit);
    $("#careerHistoryList")?.addEventListener("click", handleCareerHistoryDelegation);


    /* OVERALL MANUAL DA CARREIRA */

    $("#headerOverall")?.addEventListener("change", () => {
        const career = getCurrentCareer();
        if (!career || career.type !== "player") return;
        career.overall = number($("#headerOverall").value);
        career.updatedAt = today();
        saveData();
        renderCareerList();
        renderCareer();
        showToast("Overall atualizado!");
    });


    /* OVERALL */

    $("#saveOverallBtn")
        ?.addEventListener(
            "click",
            saveAttributes
        );


    /* FECHAR MODAIS */

    $$("[data-close]").forEach(
        button => {

            button.addEventListener(
                "click",
                () =>
                    closeDialog(
                        button.dataset.close
                    )
            );

        }
    );


    /* FECHAR AO CLICAR FORA */

    $$("dialog").forEach(
        dialog => {

            dialog.addEventListener(
                "click",
                event => {

                    if (
                        event.target ===
                        dialog
                    ) {

                        closeDialog(
                            dialog.id
                        );
                    }
                }
            );
        }
    );


    /* PREVIEWS */

    setupImagePreview(
        "seasonPhoto",
        "seasonPhotoPreview"
    );


    setupImagePreview(
        "transferPhoto",
        "transferPhotoPreview"
    );


    setupImagePreview(
        "transferFromLogo",
        "transferFromLogoPreview"
    );


    setupImagePreview(
        "transferToLogo",
        "transferToLogoPreview"
    );


    setupImagePreview(
        "awardPhoto",
        "awardPhotoPreview"
    );


    setupImagePreview(
        "titlePhoto",
        "titlePhotoPreview"
    );


    setupImagePreview(
        "galleryPhoto",
        "galleryPhotoPreview"
    );


    setupImagePreview(
        "selectionStatPhoto",
        "selectionStatPhotoPreview"
    );
}


/* =========================================================
   INICIALIZAÇÃO
========================================================= */

async function init() {

    await loadData();
    await loadStatsHubData();

    setupEvents();

    updateCareerTypeFields();
    updateTransferSeasonVisibility();

    renderCareerList();


    console.log(
        "Career Hub iniciado.",
        careers.length,
        "carreiras carregadas."
    );
}


/* =========================================================
   START
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    init
);

// Subabas da prateleira
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".shelf-filter");
  if (!btn) return;
  const filter = btn.dataset.shelfFilter;
  document.querySelectorAll(".shelf-filter").forEach(b => b.classList.toggle("active", b === btn));
  document.getElementById("shelfTitlesPanel")?.classList.toggle("hidden", filter !== "titles");
  document.getElementById("shelfAwardsPanel")?.classList.toggle("hidden", filter !== "awards");
});
