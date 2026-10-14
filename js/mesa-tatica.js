// ==========================================
// MESA TÁTICA
// ==========================================


// ==========================================
// DADOS
// ==========================================

let tacticalContext = {
    careerId: "standalone",
    seasonId: "default"
};

let jogadores = [];

function tacticalStorageKey() {
    return `careerHubTactical_${tacticalContext.careerId}_${tacticalContext.seasonId}`;
}


// ==========================================
// ELEMENTOS
// ==========================================

const campo =
    document.getElementById("campo");

const listaJogadores =
    document.getElementById(
        "listaJogadores"
    );

const bancoJogadores =
    document.getElementById(
        "bancoJogadores"
    );

const nomeTime =
    document.getElementById(
        "nomeTime"
    );

const tituloTime =
    document.getElementById(
        "tituloTime"
    );

const nomeTimeCampo =
    document.getElementById(
        "nomeTimeCampo"
    );

const corTime =
    document.getElementById(
        "corTime"
    );

const formulario =
    document.getElementById(
        "formularioJogador"
    );

const formJogador =
    document.getElementById(
        "formJogador"
    );


// ==========================================
// SALVAR
// ==========================================

function salvarDados() {

    const antigo = JSON.parse(
        localStorage.getItem(tacticalStorageKey()) || "{}"
    );

    localStorage.setItem(
        tacticalStorageKey(),
        JSON.stringify({
            jogadores: jogadores,
            nomeTime: nomeTime.value,
            corTime: corTime.value,
            uniformes: antigo.uniformes || {}
        })
    );
}


// ==========================================
// NOME DO TIME
// ==========================================

function atualizarNomeTime() {

    const nome =
        nomeTime.value.trim() ||
        "Meu Time";


    tituloTime.textContent =
        nome;


    nomeTimeCampo.textContent =
        nome.toUpperCase();
}


nomeTime.addEventListener(
    "input",
    function () {

        atualizarNomeTime();

        salvarDados();
    }
);


// ==========================================
// COR DO TIME
// ==========================================

corTime.addEventListener(
    "input",
    function () {

        document.documentElement
            .style
            .setProperty(
                "--cor-time",
                corTime.value
            );

        salvarDados();
    }
);


// ==========================================
// BANDEIRAS
// ==========================================

const bandeiras = {

    "Brasil": "🇧🇷",

    "Argentina": "🇦🇷",

    "Uruguai": "🇺🇾",

    "Chile": "🇨🇱",

    "Colômbia": "🇨🇴",

    "Paraguai": "🇵🇾",

    "Peru": "🇵🇪",

    "Portugal": "🇵🇹",

    "Espanha": "🇪🇸",

    "França": "🇫🇷",

    "Inglaterra": "🏴",

    "Alemanha": "🇩🇪",

    "Itália": "🇮🇹",

    "Holanda": "🇳🇱",

    "Bélgica": "🇧🇪",

    "Croácia": "🇭🇷",

    "Estados Unidos": "🇺🇸",

    "México": "🇲🇽",

    "Japão": "🇯🇵",

    "Coreia do Sul": "🇰🇷"
};


function pegarBandeira(
    nacionalidade
) {

    return bandeiras[
        nacionalidade
    ] || "🌎";
}


// ==========================================
// RENDERIZAR
// ==========================================

function renderizarJogadores() {

    listaJogadores.innerHTML = "";

    bancoJogadores.innerHTML = "";


    jogadores.forEach(
        function (jogador) {


            // =================================
            // CARD DA LISTA
            // =================================

            const card =
                document.createElement(
                    "div"
                );

            card.className =
                "card-jogador";


            const img =
                document.createElement(
                    "img"
                );

            img.src =
                jogador.foto ||
                "https://via.placeholder.com/60";


            const info =
                document.createElement(
                    "div"
                );

            info.className =
                "info-jogador";


            const nome =
                document.createElement(
                    "strong"
                );

            nome.textContent =
                jogador.nome;


            const detalhes =
                document.createElement(
                    "span"
                );


            detalhes.textContent =
                `${pegarBandeira(
                    jogador.nacionalidade
                )} ${
                    jogador.nacionalidade
                } • ${
                    jogador.posicao
                }`;


            info.appendChild(nome);

            info.appendChild(
                detalhes
            );


            // =================================
            // ESCALAR
            // =================================

            const btnEscalar =
                document.createElement(
                    "button"
                );


            btnEscalar.textContent =
                jogador.emCampo
                    ? "Banco"
                    : "Escalar";


            btnEscalar.className =
                jogador.emCampo
                    ? "btn-banco"
                    : "btn-escalar";


            btnEscalar.addEventListener(
                "click",
                function () {

                    jogador.emCampo =
                        !jogador.emCampo;


                    if (
                        jogador.emCampo
                    ) {

                        if (
                            jogador.x ===
                            undefined
                        ) {
                            jogador.x = 50;
                        }


                        if (
                            jogador.y ===
                            undefined
                        ) {
                            jogador.y = 50;
                        }
                    }


                    salvarDados();

                    renderizarJogadores();
                }
            );


            // =================================
            // EXCLUIR
            // =================================

            const btnExcluir =
                document.createElement(
                    "button"
                );


            btnExcluir.textContent =
                "🗑️";


            btnExcluir.className =
                "btn-excluir";


            btnExcluir.addEventListener(
                "click",
                function () {

                    const confirmar =
                        confirm(
                            `Excluir ${jogador.nome}?`
                        );


                    if (!confirmar) {
                        return;
                    }


                    jogadores =
                        jogadores.filter(
                            function (j) {

                                return (
                                    j.id !==
                                    jogador.id
                                );
                            }
                        );


                    salvarDados();

                    renderizarJogadores();
                }
            );


            card.appendChild(img);

            card.appendChild(info);

            card.appendChild(
                btnEscalar
            );

            card.appendChild(
                btnExcluir
            );


            listaJogadores.appendChild(
                card
            );


            // =================================
            // BANCO
            // =================================

            if (!jogador.emCampo) {

                const reserva =
                    document.createElement(
                        "div"
                    );


                reserva.className =
                    "reserva-card";


                const imgReserva =
                    document.createElement(
                        "img"
                    );


                imgReserva.src =
                    jogador.foto ||
                    "https://via.placeholder.com/60";


                const infoReserva =
                    document.createElement(
                        "div"
                    );


                infoReserva.className =
                    "reserva-info";


                const nomeReserva =
                    document.createElement(
                        "strong"
                    );


                nomeReserva.textContent =
                    jogador.nome;


                const detalhesReserva =
                    document.createElement(
                        "span"
                    );


                detalhesReserva.textContent =
                    `${pegarBandeira(
                        jogador.nacionalidade
                    )} ${
                        jogador.posicao
                    }`;


                infoReserva.appendChild(
                    nomeReserva
                );


                infoReserva.appendChild(
                    detalhesReserva
                );


                const btnBanco =
                    document.createElement(
                        "button"
                    );


                btnBanco.textContent =
                    "Escalar";


                btnBanco.className =
                    "btn-escalar";


                btnBanco.addEventListener(
                    "click",
                    function () {

                        jogador.emCampo =
                            true;


                        jogador.x =
                            jogador.x ??
                            50;


                        jogador.y =
                            jogador.y ??
                            50;


                        salvarDados();

                        renderizarJogadores();
                    }
                );


                reserva.appendChild(
                    imgReserva
                );


                reserva.appendChild(
                    infoReserva
                );


                reserva.appendChild(
                    btnBanco
                );


                bancoJogadores.appendChild(
                    reserva
                );
            }

        }
    );


    renderizarCampo();
}


// ==========================================
// CAMPO
// ==========================================

function renderizarCampo() {

    campo
        .querySelectorAll(
            ".jogador-campo"
        )
        .forEach(
            function (elemento) {

                elemento.remove();
            }
        );


    jogadores
        .filter(
            function (jogador) {

                return jogador.emCampo;
            }
        )
        .forEach(
            function (jogador) {

                criarJogadorNoCampo(
                    jogador
                );
            }
        );
}


// ==========================================
// CRIAR JOGADOR NO CAMPO
// ==========================================

function criarJogadorNoCampo(
    jogador
) {

    const elemento =
        document.createElement(
            "div"
        );


    elemento.className =
        "jogador-campo";


    elemento.style.left =
        (jogador.x ?? 50) + "%";


    elemento.style.top =
        (jogador.y ?? 50) + "%";


    const img =
        document.createElement(
            "img"
        );


    img.src =
        jogador.foto ||
        "https://via.placeholder.com/60";


    const nome =
        document.createElement(
            "span"
        );


    nome.textContent =
        jogador.nome;


    const posicao =
        document.createElement(
            "small"
        );


    posicao.textContent =
        jogador.posicao;


    elemento.appendChild(img);

    elemento.appendChild(nome);

    elemento.appendChild(posicao);


    campo.appendChild(
        elemento
    );


    ativarArrastar(
        elemento,
        jogador
    );
}


// ==========================================
// ARRASTAR
// PC + CELULAR
// ==========================================

function ativarArrastar(
    elemento,
    jogador
) {

    let arrastando = false;


    // ==============================
    // MOUSE
    // ==============================

    elemento.addEventListener(
        "mousedown",
        function (evento) {

            if (
                evento.button !== 0
            ) {
                return;
            }


            arrastando = true;

            elemento.style.cursor =
                "grabbing";


            document.addEventListener(
                "mousemove",
                moverMouse
            );


            document.addEventListener(
                "mouseup",
                finalizarMouse
            );
        }
    );


    function moverMouse(evento) {

        moverJogador(
            evento.clientX,
            evento.clientY
        );
    }


    function finalizarMouse() {

        arrastando = false;

        elemento.style.cursor =
            "grab";


        document.removeEventListener(
            "mousemove",
            moverMouse
        );


        document.removeEventListener(
            "mouseup",
            finalizarMouse
        );


        salvarDados();
    }


    // ==============================
    // TOUCH
    // ==============================

    elemento.addEventListener(
        "touchstart",
        function (evento) {

            evento.preventDefault();

            arrastando = true;
        },
        {
            passive: false
        }
    );


    elemento.addEventListener(
        "touchmove",
        function (evento) {

            if (!arrastando) {
                return;
            }


            evento.preventDefault();


            const toque =
                evento.touches[0];


            moverJogador(
                toque.clientX,
                toque.clientY
            );
        },
        {
            passive: false
        }
    );


    elemento.addEventListener(
        "touchend",
        function () {

            arrastando = false;

            salvarDados();
        }
    );


    // ==============================
    // MOVIMENTO
    // ==============================

    function moverJogador(
        clientX,
        clientY
    ) {

        const rect =
            campo.getBoundingClientRect();


        let x =
            (
                (clientX - rect.left)
                /
                rect.width
            ) * 100;


        let y =
            (
                (clientY - rect.top)
                /
                rect.height
            ) * 100;


        x =
            Math.max(
                4,
                Math.min(96, x)
            );


        y =
            Math.max(
                4,
                Math.min(96, y)
            );


        elemento.style.left =
            x + "%";


        elemento.style.top =
            y + "%";


        jogador.x = x;

        jogador.y = y;
    }
}


// ==========================================
// ADICIONAR JOGADOR
// ==========================================

formJogador.addEventListener(
    "submit",
    function (evento) {

        evento.preventDefault();


        const nome =
            document.getElementById(
                "nomeJogador"
            ).value.trim();


        const nacionalidade =
            document.getElementById(
                "nacionalidade"
            ).value;


        const posicao =
            document.getElementById(
                "posicao"
            ).value;


        const inputFoto =
            document.getElementById(
                "fotoJogador"
            );


        const arquivo =
            inputFoto.files[0];


        function criarJogador(
            foto
        ) {

            jogadores.push({

                id: Date.now(),

                nome: nome,

                nacionalidade:
                    nacionalidade,

                posicao: posicao,

                foto: foto,

                emCampo: false,

                x: 50,

                y: 50

            });


            salvarDados();

            renderizarJogadores();

            formJogador.reset();

            formulario.style.display =
                "none";
        }


        if (arquivo) {

            const reader =
                new FileReader();


            reader.onload =
                function (evento) {

                    criarJogador(
                        evento.target.result
                    );
                };


            reader.readAsDataURL(
                arquivo
            );

        } else {

            criarJogador("");
        }

    }
);


// ==========================================
// ABRIR FORMULÁRIO
// ==========================================

document
    .getElementById(
        "btnAdicionarJogador"
    )
    .addEventListener(
        "click",
        function () {

            formulario.style.display =
                "block";
        }
    );


// ==========================================
// FECHAR FORMULÁRIO
// ==========================================

document
    .getElementById(
        "btnCancelar"
    )
    .addEventListener(
        "click",
        function () {

            formulario.style.display =
                "none";

            formJogador.reset();
        }
    );


// ==========================================
// ESCUDO
// ==========================================

const inputEscudo =
    document.getElementById(
        "escudoTime"
    );


const imagemEscudo =
    document.getElementById(
        "imagemEscudo"
    );


const escudoIcone =
    document.getElementById(
        "escudoIcone"
    );


inputEscudo.addEventListener(
    "change",
    function () {

        const arquivo =
            inputEscudo.files[0];


        if (!arquivo) {
            return;
        }


        const reader =
            new FileReader();


        reader.onload =
            function (evento) {

                imagemEscudo.src =
                    evento.target.result;


                imagemEscudo.style.display =
                    "block";


                escudoIcone.style.display =
                    "none";


                localStorage.setItem(
                    "escudoTime",
                    evento.target.result
                );
            };


        reader.readAsDataURL(
            arquivo
        );
    }
);


// ==========================================
// TREINADOR
// ==========================================

const inputTreinador =
    document.getElementById(
        "fotoTreinador"
    );


const imagemTreinador =
    document.getElementById(
        "imagemTreinador"
    );


const treinadorIcone =
    document.getElementById(
        "treinadorIcone"
    );


inputTreinador.addEventListener(
    "change",
    function () {

        const arquivo =
            inputTreinador.files[0];


        if (!arquivo) {
            return;
        }


        const reader =
            new FileReader();


        reader.onload =
            function (evento) {

                imagemTreinador.src =
                    evento.target.result;


                imagemTreinador.style.display =
                    "block";


                treinadorIcone.style.display =
                    "none";


                localStorage.setItem(
                    "fotoTreinador",
                    evento.target.result
                );
            };


        reader.readAsDataURL(
            arquivo
        );
    }
);


// ==========================================
// CARREGAR ESCUDO/TREINADOR
// ==========================================

function carregarImagens() {

    const escudo =
        localStorage.getItem(
            "escudoTime"
        );


    const treinador =
        localStorage.getItem(
            "fotoTreinador"
        );


    if (escudo) {

        imagemEscudo.src =
            escudo;


        imagemEscudo.style.display =
            "block";


        escudoIcone.style.display =
            "none";
    }


    if (treinador) {

        imagemTreinador.src =
            treinador;


        imagemTreinador.style.display =
            "block";


        treinadorIcone.style.display =
            "none";
    }
}


// ==========================================
// UNIFORMES — GOLEIRO + UNIFORMES DINÂMICOS (ATÉ 4)
// ==========================================

const MAX_UNIFORMES = 4;

function aplicarImagemUniforme(imageId, src) {
    const img = document.getElementById(imageId);
    if (!img) return;

    if (src) {
        img.src = src;
        img.style.display = "block";
    } else {
        img.removeAttribute("src");
        img.style.display = "none";
    }
}

function salvarUniforme(chave, dataUrl) {
    const salvo = JSON.parse(
        localStorage.getItem(tacticalStorageKey()) || "{}"
    );

    salvo.uniformes = salvo.uniformes || {};

    if (dataUrl) {
        salvo.uniformes[chave] = dataUrl;
    } else {
        delete salvo.uniformes[chave];
    }

    localStorage.setItem(
        tacticalStorageKey(),
        JSON.stringify(salvo)
    );
}

function criarCardUniforme(numero, imagemSalva = "") {
    const container = document.getElementById("uniformesAdicionados");
    if (!container) return;

    const item = document.createElement("div");
    item.className = "uniforme-item";
    item.dataset.uniforme = numero;

    const imageId = `imagemUniforme${numero}`;
    const inputId = `uniforme${numero}`;

    item.innerHTML = `
        <img id="${imageId}" alt="Uniforme ${numero}">
        <span>Uniforme ${numero}</span>
        <label for="${inputId}" class="upload-button">Foto</label>
        <input type="file" id="${inputId}" accept="image/*" hidden>
        <button type="button" class="upload-button" data-remover-uniforme>Excluir</button>
    `;

    container.appendChild(item);

    aplicarImagemUniforme(imageId, imagemSalva);

    const input = document.getElementById(inputId);
    input.addEventListener("change", function () {
        const arquivo = input.files?.[0];
        if (!arquivo) return;

        const reader = new FileReader();
        reader.onload = function (evento) {
            const dataUrl = evento.target.result;
            aplicarImagemUniforme(imageId, dataUrl);
            salvarUniforme(`uniforme${numero}`, dataUrl);
        };
        reader.readAsDataURL(arquivo);
    });

    item.querySelector("[data-remover-uniforme]")
        .addEventListener("click", function () {
            removerUniforme(numero);
        });
}

function quantidadeUniformesSalvos(uniformes = {}) {
    let maior = 0;
    for (let i = 1; i <= MAX_UNIFORMES; i++) {
        if (uniformes[`uniforme${i}`]) maior = i;
    }
    return maior;
}

function adicionarUniforme(imagemSalva = "") {
    const salvo = JSON.parse(
        localStorage.getItem(tacticalStorageKey()) || "{}"
    );
    const uniformes = salvo.uniformes || {};

    let proximo = 0;
    for (let i = 1; i <= MAX_UNIFORMES; i++) {
        if (!document.querySelector(`[data-uniforme="${i}"]`)) {
            proximo = i;
            break;
        }
    }

    if (!proximo) return;

    criarCardUniforme(
        proximo,
        imagemSalva || uniformes[`uniforme${proximo}`] || ""
    );

    atualizarBotaoAdicionarUniforme();
}

function removerUniforme(numero) {
    const item = document.querySelector(`[data-uniforme="${numero}"]`);
    if (item) item.remove();

    salvarUniforme(`uniforme${numero}`, "");

    // Reorganiza os uniformes para nunca deixar buracos.
    const dados = JSON.parse(
        localStorage.getItem(tacticalStorageKey()) || "{}"
    );
    const uniformes = dados.uniformes || {};
    const imagens = [];

    for (let i = 1; i <= MAX_UNIFORMES; i++) {
        if (uniformes[`uniforme${i}`]) imagens.push(uniformes[`uniforme${i}`]);
    }

    for (let i = 1; i <= MAX_UNIFORMES; i++) {
        delete uniformes[`uniforme${i}`];
    }

    imagens.forEach((img, index) => {
        uniformes[`uniforme${index + 1}`] = img;
    });

    dados.uniformes = uniformes;
    localStorage.setItem(tacticalStorageKey(), JSON.stringify(dados));

    renderizarUniformes(uniformes);
}

function renderizarUniformes(uniformes = {}) {
    const container = document.getElementById("uniformesAdicionados");
    if (!container) return;

    container.innerHTML = "";

    for (let i = 1; i <= MAX_UNIFORMES; i++) {
        if (uniformes[`uniforme${i}`]) {
            criarCardUniforme(i, uniformes[`uniforme${i}`]);
        }
    }

    atualizarBotaoAdicionarUniforme();
}

function atualizarBotaoAdicionarUniforme() {
    const botao = document.getElementById("btnAdicionarUniforme");
    if (!botao) return;

    const quantidade = document.querySelectorAll(
        "#uniformesAdicionados [data-uniforme]"
    ).length;

    botao.style.display = quantidade >= MAX_UNIFORMES ? "none" : "inline-flex";
}

function configurarUniformes() {
    const inputGoleiro = document.getElementById("uniformeGoleiro");

    if (inputGoleiro) {
        inputGoleiro.addEventListener("change", function () {
            const arquivo = inputGoleiro.files?.[0];
            if (!arquivo) return;

            const reader = new FileReader();
            reader.onload = function (evento) {
                const dataUrl = evento.target.result;
                aplicarImagemUniforme(
                    "imagemUniformeGoleiro",
                    dataUrl
                );
                salvarUniforme("goleiro", dataUrl);
            };
            reader.readAsDataURL(arquivo);
        });
    }

    const botao = document.getElementById("btnAdicionarUniforme");
    if (botao) {
        botao.addEventListener("click", function () {
            adicionarUniforme();
        });
    }
}

function carregarUniformes(salvo = {}) {
    const uniformes = salvo.uniformes || {};

    aplicarImagemUniforme(
        "imagemUniformeGoleiro",
        uniformes.goleiro || ""
    );

    renderizarUniformes(uniformes);
}

// ==========================================
// CARREGAR DADOS
// ==========================================

function carregarDados() {

    const nomeSalvo =
        localStorage.getItem(
            "nomeTime"
        );


    const corSalva =
        localStorage.getItem(
            "corTime"
        );


    if (nomeSalvo) {

        nomeTime.value =
            nomeSalvo;
    }


    if (corSalva) {

        corTime.value =
            corSalva;


        document.documentElement
            .style
            .setProperty(
                "--cor-time",
                corSalva
            );
    }


    atualizarNomeTime();

    renderizarJogadores();

    carregarImagens();
}


// ==========================================
// INICIAR
// ==========================================


function carregarDadosTemporada() {

    const salvo = JSON.parse(
        localStorage.getItem(
            tacticalStorageKey()
        ) || "{}"
    );

    jogadores = salvo.jogadores || [];

    nomeTime.value =
        salvo.nomeTime || "";

    corTime.value =
        salvo.corTime || "#00a859";

    document.documentElement.style.setProperty(
        "--cor-time",
        corTime.value
    );

    atualizarNomeTime();
    renderizarJogadores();
    carregarImagens();
    carregarUniformes(salvo);
}

window.addEventListener("message", function(event) {

    const data = event.data || {};

    if (data.type !== "careerHubTacticalSeason") {
        return;
    }

    tacticalContext = {
        careerId: data.careerId || "standalone",
        seasonId: data.seasonId || "default"
    };

    carregarDadosTemporada();
});

configurarUniformes();
carregarDadosTemporada();
