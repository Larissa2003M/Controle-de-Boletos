// =========================================================
// DASHBOARD.JS
// PARTE 1/3 - CORRIGIDO
// =========================================================

const API_URL = "http://localhost:3000";


// =========================================================
// USUÁRIO LOGADO
// =========================================================

let usuarioLogado = {};

function carregarUsuarioLocal() {

    try {

        const dados =
            localStorage.getItem("usuario") ||
            localStorage.getItem("usuarioLogado");

        if (!dados) {

            usuarioLogado = {};

            return false;
        }


        usuarioLogado =
            JSON.parse(dados);


        if (
            !usuarioLogado ||
            !usuarioLogado.id
        ) {

            usuarioLogado = {};

            return false;
        }


        return true;


    } catch (erro) {

        console.error(
            "Erro ao carregar usuário:",
            erro
        );


        usuarioLogado = {};

        return false;
    }
}


// Carrega o usuário imediatamente
carregarUsuarioLocal();


// =========================================================
// NORMALIZAR TEXTO
// =========================================================

function normalizarTexto(texto) {

    return String(
        texto || ""
    )
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        );
}


// =========================================================
// VERIFICAR PERFIL
// =========================================================

function ehVendedor() {

    return (
        normalizarTexto(
            usuarioLogado.permissao
        ) === "vendedor"
    );
}


function ehAdministrador() {

    return (
        normalizarTexto(
            usuarioLogado.permissao
        ) === "administrador"
    );
}


function ehOperador() {

    return (
        normalizarTexto(
            usuarioLogado.permissao
        ) === "operador"
    );
}


// =========================================================
// HEADERS PARA AS REQUISIÇÕES
// =========================================================

function obterHeadersAPI() {

    /*
        Recarrega o usuário antes de cada requisição.

        Isso é importante quando você sai de um usuário
        e entra com outro, por exemplo:

        Carlos Mendes -> Vendedor

        depois:

        Administrador -> Administrador
    */

    carregarUsuarioLocal();


    return {

        "Content-Type":
            "application/json",

        "x-usuario-id":
            String(
                usuarioLogado.id || ""
            )

    };
}


// =========================================================
// VERIFICAR LOGIN
// =========================================================

function verificarLogin() {

    carregarUsuarioLocal();


    if (
        !usuarioLogado ||
        !usuarioLogado.id
    ) {

        console.error(
            "Usuário não encontrado no localStorage."
        );


        alert(
            "Usuário não identificado. Faça login novamente."
        );


        window.location.href =
            "html/login.html";


        return false;
    }


    return true;
}


// =========================================================
// CARREGAR USUÁRIO NA SIDEBAR
// =========================================================

function carregarUsuarioTela() {

    const nome =
        usuarioLogado.nome ||
        usuarioLogado.usuario ||
        "Usuário";


    const permissao =
        usuarioLogado.permissao ||
        "Usuário";


    // -----------------------------------------------------
    // Procura pelos IDs primeiro
    // -----------------------------------------------------

    const campoNome =
        document.getElementById(
            "userName"
        );


    const campoPermissao =
        document.getElementById(
            "userRole"
        );


    const campoAvatar =
        document.getElementById(
            "userAvatar"
        );


    if (campoNome) {

        campoNome.textContent =
            nome;
    }


    if (campoPermissao) {

        campoPermissao.textContent =
            permissao;
    }


    if (campoAvatar) {

        campoAvatar.textContent =
            nome
                .charAt(0)
                .toUpperCase();
    }


    // -----------------------------------------------------
    // Compatibilidade com HTML antigo
    // -----------------------------------------------------

    const strongAntigo =
        document.querySelector(
            ".user-info strong"
        );


    const spanAntigo =
        document.querySelector(
            ".user-info span"
        );


    const avatarAntigo =
        document.querySelector(
            ".user-avatar"
        );


    if (
        strongAntigo &&
        !campoNome
    ) {

        strongAntigo.textContent =
            nome;
    }


    if (
        spanAntigo &&
        !campoPermissao
    ) {

        spanAntigo.textContent =
            permissao;
    }


    if (
        avatarAntigo &&
        !campoAvatar
    ) {

        avatarAntigo.textContent =
            nome
                .charAt(0)
                .toUpperCase();
    }
}


// =========================================================
// CONFIGURAR MENU DE ACORDO COM PERMISSÃO
// =========================================================

function configurarPermissoesMenu() {

    // -----------------------------------------------------
    // USUÁRIOS
    // Somente Administrador
    // -----------------------------------------------------

    const menuUsuarios =
        document.getElementById(
            "menuUsuarios"
        );


    if (
        menuUsuarios &&
        !ehAdministrador()
    ) {

        menuUsuarios.style.display =
            "none";
    }


    // -----------------------------------------------------
    // AUDITORIA
    // Vendedor não acessa
    // -----------------------------------------------------

    if (ehVendedor()) {

        const linkAuditoria =
            document.querySelector(
                'a[href*="auditoria.html"]'
            );


        if (linkAuditoria) {

            const grupo =
                linkAuditoria.closest(
                    ".menu-group"
                );


            if (grupo) {

                grupo.style.display =
                    "none";

            } else {

                linkAuditoria.style.display =
                    "none";
            }
        }
    }
}


// =========================================================
// LOGOUT
// =========================================================

function configurarLogout() {

    const botaoLogout =
        document.getElementById(
            "btnLogout"
        )
        ||
        document.querySelector(
            ".logout"
        );


    if (!botaoLogout) {

        return;
    }


    botaoLogout.onclick =
        function () {

            localStorage.removeItem(
                "usuario"
            );


            localStorage.removeItem(
                "usuarioLogado"
            );


            window.location.href =
                "html/login.html";
        };
}


// =========================================================
// TOGGLE DO MENU
// CORRIGE: toggleMenu is not defined
// =========================================================

function toggleMenu(id) {

    const elemento =
        document.getElementById(id);


    if (!elemento) {

        console.warn(
            "Menu não encontrado:",
            id
        );

        return;
    }


    elemento.classList.toggle(
        "open"
    );
}


// Deixa disponível para onclick do HTML
window.toggleMenu =
    toggleMenu;


// =========================================================
// FORMATAR MOEDA
// =========================================================

function formatarMoeda(valor) {

    let numero =
        Number(valor || 0);


    if (
        Number.isNaN(numero)
    ) {

        numero = 0;
    }


    return numero.toLocaleString(
        "pt-BR",
        {
            style: "currency",
            currency: "BRL"
        }
    );
}


// =========================================================
// CONVERTER DATA SEM ERRO DE FUSO HORÁRIO
// =========================================================

function converterDataLocal(data) {

    if (!data) {

        return null;
    }


    const texto =
        String(data)
            .split("T")[0];


    const partes =
        texto.split("-");


    if (
        partes.length !== 3
    ) {

        return null;
    }


    const ano =
        Number(partes[0]);


    const mes =
        Number(partes[1]) - 1;


    const dia =
        Number(partes[2]);


    return new Date(
        ano,
        mes,
        dia
    );
}


// =========================================================
// FORMATAR DATA
// =========================================================

function formatarData(data) {

    const objeto =
        converterDataLocal(data);


    if (!objeto) {

        return "-";
    }


    return objeto.toLocaleDateString(
        "pt-BR"
    );
}


// =========================================================
// CALCULAR STATUS AUTOMATICAMENTE
// =========================================================

function calcularStatusAutomatico(
    vencimento,
    statusAtual
) {

    const status =
        normalizarTexto(
            statusAtual
        );


    // Pago continua Pago

    if (
        status === "pago"
    ) {

        return "Pago";
    }


    // Baixa continua Baixa

    if (
        status === "baixa"
    ) {

        return "Baixa";
    }


    // Sem vencimento

    if (!vencimento) {

        return "Pendente";
    }


    const dataVencimento =
        converterDataLocal(
            vencimento
        );


    if (!dataVencimento) {

        return "Pendente";
    }


    const hoje =
        new Date();


    hoje.setHours(
        0,
        0,
        0,
        0
    );


    dataVencimento.setHours(
        0,
        0,
        0,
        0
    );


    if (
        dataVencimento < hoje
    ) {

        return "Vencido";
    }


    return "Pendente";
}


// =========================================================
// BUSCAR BOLETOS COM AUTENTICAÇÃO
// =========================================================

async function buscarBoletosAPI() {

    carregarUsuarioLocal();


    if (
        !usuarioLogado ||
        !usuarioLogado.id
    ) {

        throw new Error(
            "Usuário não autenticado."
        );
    }


    console.log(
        "Buscando /api/boletos com usuário:",
        usuarioLogado.id,
        usuarioLogado.nome,
        usuarioLogado.permissao
    );


    const resposta =
        await fetch(
            `${API_URL}/api/boletos`,
            {
                method: "GET",

                headers:
                    obterHeadersAPI()
            }
        );


    const retorno =
        await resposta
            .json()
            .catch(
                () => ({})
            );


    // -----------------------------------------------------
    // TRATAR 401
    // -----------------------------------------------------

    if (
        resposta.status === 401
    ) {

        console.error(
            "401 /api/boletos:",
            retorno
        );


        throw new Error(
            retorno.erro ||
            "Usuário não autenticado."
        );
    }


    // -----------------------------------------------------
    // OUTROS ERROS
    // -----------------------------------------------------

    if (!resposta.ok) {

        console.error(
            "Erro /api/boletos:",
            retorno
        );


        throw new Error(
            retorno.erro ||
            `Erro ao buscar boletos (${resposta.status}).`
        );
    }


    // -----------------------------------------------------
    // PRECISA SER ARRAY
    // -----------------------------------------------------

    if (
        !Array.isArray(retorno)
    ) {

        console.error(
            "Resposta inválida de /api/boletos:",
            retorno
        );


        throw new Error(
            "A API não retornou uma lista de boletos."
        );
    }


    /*
        IMPORTANTE:

        O server.js deve fazer a restrição principal
        do Vendedor.

        Mesmo assim, mantemos uma segunda proteção
        no Dashboard.
    */

    if (ehVendedor()) {

        const nomeVendedor =
            normalizarTexto(
                usuarioLogado.nome
            );


        return retorno.filter(
            boleto => {

                return (
                    normalizarTexto(
                        boleto.vendedor
                    )
                    ===
                    nomeVendedor
                );
            }
        );
    }


    // Administrador e Operador
    return retorno;
}


// =========================================================
// TESTE NO CONSOLE
// =========================================================

function mostrarDebugDashboard() {

    console.log(
        "================================"
    );


    console.log(
        "DASHBOARD - USUÁRIO LOGADO"
    );


    console.log(
        "ID:",
        usuarioLogado.id
    );


    console.log(
        "Nome:",
        usuarioLogado.nome
    );


    console.log(
        "Permissão:",
        usuarioLogado.permissao
    );


    console.log(
        "Header:",
        obterHeadersAPI()
    );


    console.log(
        "================================"
    );
}


// =========================================================
// VARIÁVEL GLOBAL DOS BOLETOS
// =========================================================

let boletosDashboard = [];


// =========================================================
// FUNÇÃO AUXILIAR PARA ALTERAR TEXTO
// =========================================================

function definirTexto(id, valor) {

    const elemento =
        document.getElementById(id);

    if (elemento) {

        elemento.textContent =
            valor;
    }
}


// =========================================================
// CARREGAR DADOS DO DASHBOARD
// =========================================================

async function carregarDadosDashboard() {

    try {

        console.log(
            "Carregando dados do Dashboard..."
        );


        // =============================================
        // BUSCA CENTRALIZADA
        // JÁ ENVIA x-usuario-id
        // =============================================

        const boletos =
            await buscarBoletosAPI();


        boletosDashboard =
            boletos.map(
                boleto => {

                    const statusCalculado =
                        calcularStatusAutomatico(
                            boleto.vencimento,
                            boleto.status
                        );


                    return {

                        ...boleto,

                        statusCalculado:
                            statusCalculado
                    };
                }
            );


        console.log(
            "Boletos disponíveis no Dashboard:",
            boletosDashboard
        );


        // =============================================
        // CONTADORES
        // =============================================

        let qtdTotal = 0;

        let qtdPendentes = 0;

        let qtdPagos = 0;

        let qtdVencidos = 0;


        // =============================================
        // VALORES
        // =============================================

        let valorTotal = 0;

        let valorPendentes = 0;

        let valorPagos = 0;

        let valorVencidos = 0;


        // =============================================
        // CALCULAR
        // =============================================

        boletosDashboard.forEach(
            boleto => {

                const valor =
                    Number(
                        boleto.valor || 0
                    );


                const status =
                    boleto.statusCalculado;


                qtdTotal++;

                valorTotal += valor;


                // -------------------------------------
                // PAGO / BAIXA
                // -------------------------------------

                if (
                    status === "Pago" ||
                    status === "Baixa"
                ) {

                    qtdPagos++;

                    valorPagos +=
                        valor;

                    return;
                }


                // -------------------------------------
                // VENCIDO
                // -------------------------------------

                if (
                    status === "Vencido"
                ) {

                    qtdVencidos++;

                    valorVencidos +=
                        valor;

                    return;
                }


                // -------------------------------------
                // PENDENTE
                // -------------------------------------

                qtdPendentes++;

                valorPendentes +=
                    valor;
            }
        );


        // =============================================
        // ATUALIZAR CARDS
        // =============================================

        definirTexto(
            "cardTotalQtd",
            qtdTotal
        );


        definirTexto(
            "cardPendentesQtd",
            qtdPendentes
        );


        definirTexto(
            "cardPagosQtd",
            qtdPagos
        );


        definirTexto(
            "cardVencidosQtd",
            qtdVencidos
        );


        // =============================================
        // RESUMO FINANCEIRO
        // =============================================

        definirTexto(
            "summaryTotalValor",
            formatarMoeda(
                valorTotal
            )
        );


        definirTexto(
            "summaryPagosValor",
            formatarMoeda(
                valorPagos
            )
        );


        definirTexto(
            "summaryPendentesValor",
            formatarMoeda(
                valorPendentes
            )
        );


        definirTexto(
            "summaryVencidosValor",
            formatarMoeda(
                valorVencidos
            )
        );


        // =============================================
        // CONTADOR DA NOTIFICAÇÃO
        // =============================================

        atualizarContadorNotificacoes(
            qtdVencidos
        );


        // =============================================
        // PRÓXIMOS VENCIMENTOS
        // =============================================

        renderizarProximosVencimentos(
            boletosDashboard
        );


        // =============================================
        // COBRANÇAS
        // =============================================

        renderizarCobrancasDashboard(
            boletosDashboard
        );


        console.log(
            "Dashboard carregado com sucesso."
        );


    } catch (erro) {

        console.error(
            "Erro ao carregar Dashboard:",
            erro
        );


        mostrarErroDashboard(
            erro.message
        );
    }
}


// =========================================================
// ERRO NO DASHBOARD
// =========================================================

function mostrarErroDashboard(mensagem) {

    // Evita deixar os cards eternamente em "..."

    definirTexto(
        "cardTotalQtd",
        "0"
    );


    definirTexto(
        "cardPendentesQtd",
        "0"
    );


    definirTexto(
        "cardPagosQtd",
        "0"
    );


    definirTexto(
        "cardVencidosQtd",
        "0"
    );


    definirTexto(
        "summaryTotalValor",
        formatarMoeda(0)
    );


    definirTexto(
        "summaryPagosValor",
        formatarMoeda(0)
    );


    definirTexto(
        "summaryPendentesValor",
        formatarMoeda(0)
    );


    definirTexto(
        "summaryVencidosValor",
        formatarMoeda(0)
    );


    // ---------------------------------------------
    // TABELA DE PRÓXIMOS VENCIMENTOS
    // ---------------------------------------------

    const tabela =
        document.getElementById(
            "tabelaProximosVencimentos"
        );


    if (tabela) {

        tabela.innerHTML = `

            <tr>

                <td
                    colspan="5"
                    style="
                        text-align:center;
                        color:#dc2626;
                        padding:20px;
                    "
                >

                    ${mensagem}

                </td>

            </tr>

        `;
    }


    // ---------------------------------------------
    // COBRANÇAS
    // ---------------------------------------------

    const lista =
        document.getElementById(
            "listaCobrancasDashboard"
        );


    if (lista) {

        lista.innerHTML = `

            <div class="collection">

                <div class="collection-info">

                    <span
                        style="
                            color:#dc2626;
                        "
                    >

                        ${mensagem}

                    </span>

                </div>

            </div>

        `;
    }
}


// =========================================================
// ATUALIZAR CONTADOR DE NOTIFICAÇÕES
// =========================================================

function atualizarContadorNotificacoes(
    quantidade
) {

    /*
        Compatibilidade com diferentes IDs/classes
        que podem existir no index.html.
    */

    const contador =
        document.getElementById(
            "notificationCount"
        )
        ||
        document.getElementById(
            "contadorNotificacoes"
        )
        ||
        document.querySelector(
            ".notification-count"
        );


    if (!contador) {

        return;
    }


    contador.textContent =
        quantidade;


    if (
        quantidade > 0
    ) {

        contador.style.display =
            "";

    } else {

        contador.style.display =
            "none";
    }
}


// =========================================================
// PRÓXIMOS VENCIMENTOS
// =========================================================

function renderizarProximosVencimentos(
    boletos
) {

    const tabela =
        document.getElementById(
            "tabelaProximosVencimentos"
        );


    if (!tabela) {

        return;
    }


    // =============================================
    // SOMENTE PENDENTES
    // =============================================

    const pendentes =
        boletos
            .filter(
                boleto => {

                    return (
                        boleto.statusCalculado ===
                        "Pendente"
                    );
                }
            )
            .sort(
                (a, b) => {

                    const dataA =
                        converterDataLocal(
                            a.vencimento
                        );


                    const dataB =
                        converterDataLocal(
                            b.vencimento
                        );


                    if (
                        !dataA &&
                        !dataB
                    ) {

                        return 0;
                    }


                    if (!dataA) {

                        return 1;
                    }


                    if (!dataB) {

                        return -1;
                    }


                    return (
                        dataA.getTime() -
                        dataB.getTime()
                    );
                }
            )
            .slice(
                0,
                5
            );


    // =============================================
    // NENHUM
    // =============================================

    if (
        pendentes.length === 0
    ) {

        tabela.innerHTML = `

            <tr>

                <td
                    colspan="5"
                    style="
                        text-align:center;
                        color:#64748b;
                        padding:20px;
                    "
                >

                    Nenhum boleto pendente
                    com vencimento próximo.

                </td>

            </tr>

        `;


        return;
    }


    // =============================================
    // MONTAR TABELA
    // =============================================

    tabela.innerHTML =
        pendentes
            .map(
                boleto => `

                    <tr>

                        <td>

                            ${
                                boleto.razao_social ||
                                "-"
                            }

                        </td>


                        <td>

                            ${
                                boleto.num_boleto ||
                                "-"
                            }

                        </td>


                        <td>

                            ${
                                formatarMoeda(
                                    boleto.valor
                                )
                            }

                        </td>


                        <td>

                            ${
                                formatarData(
                                    boleto.vencimento
                                )
                            }

                        </td>


                        <td>

                            <span
                                style="
                                    color:#d97706;
                                    font-weight:600;
                                "
                            >

                                Pendente

                            </span>

                        </td>

                    </tr>

                `
            )
            .join("");
}


// =========================================================
// COBRANÇAS DO DASHBOARD
// =========================================================

function renderizarCobrancasDashboard(
    boletos
) {

    const lista =
        document.getElementById(
            "listaCobrancasDashboard"
        );


    if (!lista) {

        return;
    }


    // =============================================
    // SOMENTE VENCIDOS
    // =============================================

    const vencidos =
        boletos
            .filter(
                boleto => {

                    return (
                        boleto.statusCalculado ===
                        "Vencido"
                    );
                }
            )
            .sort(
                (a, b) => {

                    const dataA =
                        converterDataLocal(
                            a.vencimento
                        );


                    const dataB =
                        converterDataLocal(
                            b.vencimento
                        );


                    if (
                        !dataA ||
                        !dataB
                    ) {

                        return 0;
                    }


                    // Mais antigo primeiro
                    return (
                        dataA.getTime() -
                        dataB.getTime()
                    );
                }
            )
            .slice(
                0,
                5
            );


    // =============================================
    // NENHUM VENCIDO
    // =============================================

    if (
        vencidos.length === 0
    ) {

        lista.innerHTML = `

            <div class="collection">

                <div class="collection-info">

                    <span>

                        Nenhum boleto vencido
                        para cobrança.

                    </span>

                </div>

            </div>

        `;


        return;
    }


    // =============================================
    // MOSTRAR VENCIDOS
    // =============================================

    lista.innerHTML =
        vencidos
            .map(
                boleto => `

                    <div class="collection">

                        <div class="collection-info">

                            <strong>

                                ${
                                    boleto.razao_social ||
                                    "-"
                                }

                            </strong>


                            <span>

                                Boleto:
                                ${
                                    boleto.num_boleto ||
                                    "-"
                                }

                                <br>

                                Vencimento:
                                ${
                                    formatarData(
                                        boleto.vencimento
                                    )
                                }

                                <br>

                                Valor:
                                ${
                                    formatarMoeda(
                                        boleto.valor
                                    )
                                }

                            </span>

                        </div>

                    </div>

                `
            )
            .join("");
}


// =========================================================
// NOTIFICAÇÕES
// =========================================================

function mostrarNotificacoes() {

    const vencidos =
        boletosDashboard.filter(
            boleto => {

                return (
                    boleto.statusCalculado ===
                    "Vencido"
                );
            }
        );


    if (
        vencidos.length === 0
    ) {

        alert(
            "Nenhum boleto vencido."
        );

        return;
    }


    let mensagem =
        "Boletos vencidos:\n\n";


    vencidos.forEach(
        boleto => {

            mensagem +=
                "Cliente: " +
                (
                    boleto.razao_social ||
                    "-"
                ) +
                "\n";


            mensagem +=
                "Boleto: " +
                (
                    boleto.num_boleto ||
                    "-"
                ) +
                "\n";


            mensagem +=
                "Vencimento: " +
                formatarData(
                    boleto.vencimento
                ) +
                "\n";


            mensagem +=
                "Valor: " +
                formatarMoeda(
                    boleto.valor
                ) +
                "\n";


            mensagem +=
                "--------------------\n";
        }
    );


    alert(
        mensagem
    );
}


// =========================================================
// CONFIGURAR BOTÃO DE NOTIFICAÇÃO
// =========================================================

function configurarNotificacoes() {

    const botao =
        document.querySelector(
            ".notification"
        )
        ||
        document.getElementById(
            "btnNotificacoes"
        );


    if (!botao) {

        return;
    }


    botao.onclick =
        mostrarNotificacoes;
}


// =========================================================
// ABRIR PÁGINA DE COBRANÇAS
// =========================================================

function abrirPaginaCobrancas() {

    window.location.href =
        "html/cobrancas.html";
}


// Deixa disponível caso exista onclick no HTML
window.abrirPaginaCobrancas =
    abrirPaginaCobrancas;


// =========================================================
// ABRIR PÁGINA DE BOLETOS
// =========================================================

function abrirPaginaBoletos() {

    window.location.href =
        "html/boletos.html";
}


window.abrirPaginaBoletos =
    abrirPaginaBoletos;


// =========================================================
// ATUALIZAR DASHBOARD MANUALMENTE
// =========================================================

async function atualizarDashboard() {

    console.log(
        "Atualizando Dashboard..."
    );


    await carregarDadosDashboard();
}


window.atualizarDashboard =
    atualizarDashboard;


// =========================================================
// EVITAR INICIALIZAÇÃO DUPLICADA
// =========================================================

let dashboardInicializado =
    false;


// =========================================================
// INICIAR DASHBOARD
// =========================================================

async function iniciarDashboard() {

    // Evita executar duas vezes

    if (
        dashboardInicializado
    ) {

        return;
    }


    dashboardInicializado =
        true;


    console.log(
        "================================"
    );


    console.log(
        "INICIANDO DASHBOARD"
    );


    console.log(
        "================================"
    );


    // =====================================================
    // VERIFICAR LOGIN
    // =====================================================

    if (
        !verificarLogin()
    ) {

        return;
    }


    // =====================================================
    // MOSTRAR USUÁRIO
    // =====================================================

    carregarUsuarioTela();


    // =====================================================
    // PERMISSÕES DO MENU
    // =====================================================

    configurarPermissoesMenu();


    // =====================================================
    // LOGOUT
    // =====================================================

    configurarLogout();


    // =====================================================
    // NOTIFICAÇÕES
    // =====================================================

    configurarNotificacoes();


    // =====================================================
    // DEBUG
    // =====================================================

    mostrarDebugDashboard();


    // =====================================================
    // CARREGAR DADOS
    // =====================================================

    await carregarDadosDashboard();


    console.log(
        "Dashboard iniciado com sucesso."
    );
}


// =========================================================
// INICIAR QUANDO O HTML ESTIVER PRONTO
// =========================================================

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        iniciarDashboard,
        {
            once: true
        }
    );

} else {

    iniciarDashboard();
}


// =========================================================
// ATUALIZAÇÃO AUTOMÁTICA
// =========================================================

/*
    Atualiza os dados do Dashboard
    automaticamente a cada 60 segundos.

    Não recarrega a página.
    Apenas consulta novamente a API.
*/

const intervaloDashboard =
    setInterval(
        async function () {

            // -----------------------------------------
            // Verificar se ainda existe usuário
            // -----------------------------------------

            carregarUsuarioLocal();


            if (
                !usuarioLogado ||
                !usuarioLogado.id
            ) {

                return;
            }


            try {

                await carregarDadosDashboard();


                console.log(
                    "Dashboard atualizado automaticamente."
                );


            } catch (erro) {

                console.error(
                    "Erro na atualização automática:",
                    erro
                );
            }

        },

        60000
    );


// =========================================================
// PARAR INTERVALO AO SAIR DA PÁGINA
// =========================================================

window.addEventListener(
    "beforeunload",
    function () {

        clearInterval(
            intervaloDashboard
        );
    }
);


// =========================================================
// ATUALIZAR AO VOLTAR PARA A ABA
// =========================================================

document.addEventListener(
    "visibilitychange",
    async function () {

        if (
            document.visibilityState !==
            "visible"
        ) {

            return;
        }


        carregarUsuarioLocal();


        if (
            !usuarioLogado ||
            !usuarioLogado.id
        ) {

            return;
        }


        try {

            await carregarDadosDashboard();


        } catch (erro) {

            console.error(
                "Erro ao atualizar Dashboard:",
                erro
            );
        }
    }
);


// =========================================================
// GARANTIR FUNÇÕES GLOBAIS
// =========================================================

/*
    Essas funções ficam no window porque
    podem ser chamadas diretamente pelo HTML,
    por exemplo:

    onclick="toggleMenu('menuCadastro')"
*/

window.toggleMenu =
    toggleMenu;


window.mostrarNotificacoes =
    mostrarNotificacoes;


window.carregarDadosDashboard =
    carregarDadosDashboard;


// =========================================================
// DEBUG FINAL
// =========================================================

console.log(
    "dashboard.js carregado."
);


console.log(
    "Usuário atual:",
    usuarioLogado
);


console.log(
    "x-usuario-id:",
    usuarioLogado.id || "não encontrado"
);


