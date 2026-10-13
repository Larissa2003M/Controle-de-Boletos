// =========================================================
// BOLETOS.JS
// PARTE 1 DE 3
// =========================================================

const API_URL = "http://localhost:3000";


// =========================================================
// USUÁRIO LOGADO
// =========================================================

let usuarioLogado = {};

try {

    const usuarioSalvo =
        localStorage.getItem("usuario") ||
        localStorage.getItem("usuarioLogado");

    if (usuarioSalvo) {

        usuarioLogado =
            JSON.parse(usuarioSalvo);
    }

} catch (erro) {

    console.error(
        "Erro ao carregar usuário logado:",
        erro
    );

    usuarioLogado = {};
}


// =========================================================
// VERIFICAR LOGIN
// =========================================================

if (
    !usuarioLogado ||
    !usuarioLogado.id
) {

    alert(
        "Usuário não identificado. Faça login novamente."
    );

    window.location.href =
        "login.html";
}


// =========================================================
// CABEÇALHO DA API
// =========================================================
// IMPORTANTE:
// O server.js utiliza x-usuario-id para descobrir
// qual usuário está fazendo a requisição.
// =========================================================

function obterHeadersAPI() {

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
// PERMISSÃO DO USUÁRIO
// =========================================================

function obterPermissaoUsuario() {

    return normalizarTexto(
        usuarioLogado.permissao
    );
}


function ehVendedor() {

    return (
        obterPermissaoUsuario() ===
        "vendedor"
    );
}


function ehAdministrador() {

    return (
        obterPermissaoUsuario() ===
        "administrador"
    );
}


function ehOperador() {

    return (
        obterPermissaoUsuario() ===
        "operador"
    );
}


// =========================================================
// NOME DO VENDEDOR LOGADO
// =========================================================

function obterNomeVendedorLogado() {

    return normalizarTexto(
        usuarioLogado.nome ||
        usuarioLogado.usuario ||
        ""
    );
}


// =========================================================
// ELEMENTOS DA PÁGINA
// =========================================================

const formBoleto =
    document.getElementById(
        "formBoleto"
    );


const listaBoletos =
    document.getElementById(
        "listaBoletos"
    );


const painelCadastroBoleto =
    document.getElementById(
        "painelCadastroBoleto"
    );


const secaoTabela =
    document.getElementById(
        "secaoTabela"
    );


const secaoFiltros =
    document.getElementById(
        "secaoFiltros"
    );


const botoesAcaoTopo =
    document.getElementById(
        "botoesAcaoTopo"
    );


const btnNovoBoleto =
    document.getElementById(
        "btnNovoBoleto"
    );


const btnVoltarBoleto =
    document.getElementById(
        "btnVoltarBoleto"
    );


const cancelarBoleto =
    document.getElementById(
        "cancelarBoleto"
    );


const btnSalvarBoleto =
    document.getElementById(
        "btnSalvarBoleto"
    );


const tituloPainelBoleto =
    document.getElementById(
        "tituloPainelBoleto"
    );


const qtdParcelas =
    document.getElementById(
        "qtdParcelas"
    );


const containerDatasParcelas =
    document.getElementById(
        "containerDatasParcelas"
    );


const filtroCliente =
    document.getElementById(
        "filtroCliente"
    );


const filtroNumero =
    document.getElementById(
        "filtroNumero"
    );


const filtroStatus =
    document.getElementById(
        "filtroStatus"
    );


const selecionarTodos =
    document.getElementById(
        "selecionarTodos"
    );


const btnMarcarPagosMassa =
    document.getElementById(
        "btnMarcarPagosMassa"
    );


const btnDarBaixaMassa =
    document.getElementById(
        "btnDarBaixaMassa"
    );


const btnLogout =
    document.getElementById(
        "btnLogout"
    );


// =========================================================
// VARIÁVEIS GLOBAIS
// =========================================================

let listaBoletosGlobal = [];

let listaClientesGlobal = [];

let boletoEmEdicaoId = null;

let boletoEmEdicao = null;


// =========================================================
// MOSTRAR USUÁRIO LOGADO
// =========================================================

function atualizarUsuarioNaTela() {

    const nome =
        usuarioLogado.nome ||
        usuarioLogado.usuario ||
        "Usuário";


    const permissao =
        usuarioLogado.permissao ||
        "Usuário";


    // -----------------------------------------
    // IDs
    // -----------------------------------------

    const userName =
        document.getElementById(
            "userName"
        );


    const userRole =
        document.getElementById(
            "userRole"
        );


    const userAvatar =
        document.getElementById(
            "userAvatar"
        );


    if (userName) {

        userName.textContent =
            nome;
    }


    if (userRole) {

        userRole.textContent =
            permissao;
    }


    if (userAvatar) {

        userAvatar.textContent =
            nome
                .charAt(0)
                .toUpperCase();
    }


    // -----------------------------------------
    // Compatibilidade com .user-info
    // -----------------------------------------

    const nomeAlternativo =
        document.querySelector(
            ".user-info strong"
        );


    const perfilAlternativo =
        document.querySelector(
            ".user-info span"
        );


    const avatarAlternativo =
        document.querySelector(
            ".user-avatar"
        );


    if (nomeAlternativo) {

        nomeAlternativo.textContent =
            nome;
    }


    if (perfilAlternativo) {

        perfilAlternativo.textContent =
            permissao;
    }


    if (avatarAlternativo) {

        avatarAlternativo.textContent =
            nome
                .charAt(0)
                .toUpperCase();
    }
}


// =========================================================
// LOGOUT
// =========================================================

function sairSistema() {

    localStorage.removeItem(
        "usuario"
    );

    localStorage.removeItem(
        "usuarioLogado"
    );


    window.location.href =
        "login.html";
}


if (btnLogout) {

    btnLogout.addEventListener(
        "click",
        sairSistema
    );
}


// Compatibilidade caso o HTML use class="logout"

document
    .querySelectorAll(".logout")
    .forEach(botao => {

        botao.addEventListener(
            "click",
            evento => {

                evento.preventDefault();

                sairSistema();
            }
        );
    });


// =========================================================
// FUNÇÕES AUXILIARES
// =========================================================

function preencherCampo(
    id,
    valor
) {

    const campo =
        document.getElementById(id);


    if (campo) {

        campo.value =
            valor ?? "";
    }
}


function obterValor(id) {

    const campo =
        document.getElementById(id);


    return campo
        ? campo.value.trim()
        : "";
}


// =========================================================
// DATA PARA INPUT
// =========================================================

function dataParaInput(data) {

    if (!data) {

        return "";
    }


    return String(data)
        .split("T")[0];
}


// =========================================================
// FORMATAR DATA
// =========================================================

function formatarData(data) {

    if (!data) {

        return "-";
    }


    const dataLimpa =
        dataParaInput(data);


    const partes =
        dataLimpa.split("-");


    if (
        partes.length !== 3
    ) {

        return dataLimpa;
    }


    return (
        partes[2] +
        "/" +
        partes[1] +
        "/" +
        partes[0]
    );
}


// =========================================================
// FORMATAR MOEDA
// =========================================================

function formatarMoeda(valor) {

    return Number(
        valor || 0
    )
        .toLocaleString(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL"
            }
        );
}


// =========================================================
// CONVERTER MOEDA PARA NÚMERO
// =========================================================

function converterMoedaParaNumero(
    valor
) {

    if (!valor) {

        return 0;
    }


    let texto =
        String(valor)
            .replace("R$", "")
            .trim();


    if (
        texto.includes(".") &&
        texto.includes(",")
    ) {

        texto =
            texto
                .replace(/\./g, "")
                .replace(",", ".");

    } else {

        texto =
            texto.replace(
                ",",
                "."
            );
    }


    return (
        Number(texto) ||
        0
    );
}


// =========================================================
// STATUS AUTOMÁTICO
// =========================================================

function calcularStatusAutomatico(
    vencimento,
    statusAtual
) {

    if (
        statusAtual === "Pago" ||
        statusAtual === "Baixa"
    ) {

        return statusAtual;
    }


    if (!vencimento) {

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


    const dataVencimento =
        new Date(
            dataParaInput(
                vencimento
            ) +
            "T00:00:00"
        );


    if (
        dataVencimento < hoje
    ) {

        return "Vencido";
    }


    return "Pendente";
}


// =========================================================
// CLIENTE PERTENCE AO VENDEDOR?
// =========================================================

function clientePertenceAoVendedor(
    cliente
) {

    // Administrador e Operador
    // não possuem restrição.

    if (!ehVendedor()) {

        return true;
    }


    if (!cliente) {

        return false;
    }


    const vendedorLogado =
        obterNomeVendedorLogado();


    const vendedorCliente =
        normalizarTexto(
            cliente.vendedor
        );


    return (
        vendedorCliente ===
        vendedorLogado
    );
}


// =========================================================
// CARREGAR CLIENTES
// =========================================================

async function carregarClientes() {

    try {

        /*
         * A rota de clientes atualmente não depende
         * necessariamente do x-usuario-id.
         *
         * Mesmo assim enviamos o ID do usuário para
         * manter o padrão das requisições autenticadas.
         */

        const resposta =
            await fetch(
                `${API_URL}/api/clientes`,
                {
                    method: "GET",

                    headers:
                        obterHeadersAPI()
                }
            );


        if (!resposta.ok) {

            const retorno =
                await resposta
                    .json()
                    .catch(
                        () => ({})
                    );


            throw new Error(
                retorno.erro ||
                "Erro ao carregar clientes."
            );
        }


        const todosClientes =
            await resposta.json();


        // =================================================
        // VENDEDOR
        // =================================================
        //
        // Somente os clientes atribuídos ao vendedor.
        //
        // =================================================

        if (ehVendedor()) {

            listaClientesGlobal =
                todosClientes.filter(
                    cliente =>
                        clientePertenceAoVendedor(
                            cliente
                        )
                );

        } else {

            // Administrador / Operador

            listaClientesGlobal =
                todosClientes;
        }


        console.log(
            "Clientes permitidos:",
            listaClientesGlobal
        );


        // =================================================
        // DATALIST DO CADASTRO
        // =================================================

        const datalist =
            document.getElementById(
                "listaClientesSugestoes"
            );


        if (!datalist) {

            return;
        }


        datalist.innerHTML =
            listaClientesGlobal

                .filter(cliente => {

                    const status =
                        normalizarTexto(
                            cliente.status
                        );


                    return (
                        status === "" ||
                        status === "ativo"
                    );
                })

                .map(cliente => {

                    const nome =
                        cliente.razao_social ||
                        cliente.nome_fantasia ||
                        "";


                    return `
                        <option value="${nome}">
                    `;
                })

                .join("");


    } catch (erro) {

        console.error(
            "Erro ao carregar clientes:",
            erro
        );


        listaClientesGlobal = [];
    }
}


// =========================================================
// LOCALIZAR CLIENTE
// =========================================================

function encontrarCliente(nome) {

    if (!nome) {

        return null;
    }


    const nomeProcurado =
        normalizarTexto(nome);


    return (
        listaClientesGlobal.find(
            cliente => {

                const razaoSocial =
                    normalizarTexto(
                        cliente.razao_social
                    );


                const nomeFantasia =
                    normalizarTexto(
                        cliente.nome_fantasia
                    );


                return (
                    razaoSocial ===
                    nomeProcurado ||

                    nomeFantasia ===
                    nomeProcurado
                );
            }
        ) || null
    );
}


// =========================================================
// BOLETO PERTENCE AO VENDEDOR?
// =========================================================

function boletoPertenceAoVendedor(
    boleto
) {

    /*
     * Administrador e Operador
     * visualizam todos.
     */

    if (!ehVendedor()) {

        return true;
    }


    if (!boleto) {

        return false;
    }


    const vendedorLogado =
        obterNomeVendedorLogado();


    // =====================================================
    // PRIMEIRA VERIFICAÇÃO
    // Campo vendedor retornado no próprio boleto
    // =====================================================

    const vendedorBoleto =
        normalizarTexto(
            boleto.vendedor
        );


    if (
        vendedorBoleto &&
        vendedorBoleto ===
        vendedorLogado
    ) {

        return true;
    }


    // =====================================================
    // SEGUNDA VERIFICAÇÃO
    // Relação através do cliente
    // =====================================================

    const clienteDoBoleto =
        listaClientesGlobal.find(
            cliente => {

                return (

                    normalizarTexto(
                        cliente.razao_social
                    )

                    ===

                    normalizarTexto(
                        boleto.razao_social
                    )
                );
            }
        );


    if (!clienteDoBoleto) {

        return false;
    }


    return (

        normalizarTexto(
            clienteDoBoleto.vendedor
        )

        ===

        vendedorLogado
    );
}


// =========================================================
// PREENCHER DADOS DO CLIENTE
// =========================================================

function preencherDadosClienteSelecionado() {

    const campoCliente =
        document.getElementById(
            "razaoSocialBoleto"
        );


    if (!campoCliente) {

        return;
    }


    const cliente =
        encontrarCliente(
            campoCliente.value
        );


    if (!cliente) {

        preencherCampo(
            "cpfCnpjPagador",
            ""
        );

        preencherCampo(
            "enderecoPagador",
            ""
        );

        preencherCampo(
            "numeroPagador",
            ""
        );

        preencherCampo(
            "cepPagador",
            ""
        );

        return;
    }


    preencherCampo(
        "cpfCnpjPagador",
        cliente.cnpj || ""
    );


    preencherCampo(
        "enderecoPagador",
        cliente.endereco || ""
    );


    preencherCampo(
        "numeroPagador",
        cliente.numero || ""
    );


    preencherCampo(
        "cepPagador",
        cliente.cep || ""
    );
}


// =========================================================
// EVENTO DO CLIENTE
// =========================================================

const campoCliente =
    document.getElementById(
        "razaoSocialBoleto"
    );


if (campoCliente) {

    campoCliente.addEventListener(
        "change",
        preencherDadosClienteSelecionado
    );


    campoCliente.addEventListener(
        "input",
        preencherDadosClienteSelecionado
    );
}


// =========================================================
// MOSTRAR FORMULÁRIO
// =========================================================

function mostrarFormulario() {

    /*
     * VENDEDOR NÃO PODE CADASTRAR
     * NEM EDITAR BOLETO.
     */

    if (ehVendedor()) {

        alert(
            "O vendedor possui acesso somente à consulta e ao relatório dos boletos de seus clientes."
        );

        return;
    }


    if (painelCadastroBoleto) {

        painelCadastroBoleto.style.display =
            "block";
    }


    if (secaoTabela) {

        secaoTabela.style.display =
            "none";
    }


    if (secaoFiltros) {

        secaoFiltros.style.display =
            "none";
    }


    if (botoesAcaoTopo) {

        botoesAcaoTopo.style.display =
            "none";
    }


    const containerBtnNovo =
        document.getElementById(
            "containerBtnNovo"
        );


    if (containerBtnNovo) {

        containerBtnNovo.style.display =
            "none";
    }
}


// =========================================================
// FECHAR FORMULÁRIO
// =========================================================

function fecharFormulario() {

    boletoEmEdicaoId =
        null;


    boletoEmEdicao =
        null;


    if (formBoleto) {

        formBoleto.reset();
    }


    if (qtdParcelas) {

        qtdParcelas.value =
            1;

        qtdParcelas.disabled =
            false;
    }


    criarCamposParcelas();


    if (painelCadastroBoleto) {

        painelCadastroBoleto.style.display =
            "none";
    }


    if (secaoTabela) {

        secaoTabela.style.display =
            "block";
    }


    if (secaoFiltros) {

        secaoFiltros.style.display =
            "block";
    }


    /*
     * Somente Administrador e Operador
     * recuperam os botões de ação.
     */

    if (
        botoesAcaoTopo &&
        !ehVendedor()
    ) {

        botoesAcaoTopo.style.display =
            "flex";
    }


    const containerBtnNovo =
        document.getElementById(
            "containerBtnNovo"
        );


    if (
        containerBtnNovo &&
        !ehVendedor()
    ) {

        containerBtnNovo.style.display =
            "block";
    }


    if (tituloPainelBoleto) {

        tituloPainelBoleto.textContent =
            "Cadastro de Boleto";
    }


    if (btnSalvarBoleto) {

        btnSalvarBoleto.textContent =
            "Salvar Boleto";
    }
}


// =========================================================
// NOVO BOLETO
// =========================================================

if (btnNovoBoleto) {

    btnNovoBoleto.addEventListener(
        "click",
        () => {

            // ---------------------------------------------
            // BLOQUEIO DO VENDEDOR
            // ---------------------------------------------

            if (ehVendedor()) {

                alert(
                    "O vendedor não possui permissão para cadastrar boletos."
                );

                return;
            }


            boletoEmEdicaoId =
                null;


            boletoEmEdicao =
                null;


            if (formBoleto) {

                formBoleto.reset();
            }


            if (qtdParcelas) {

                qtdParcelas.value =
                    1;

                qtdParcelas.disabled =
                    false;
            }


            criarCamposParcelas();


            if (tituloPainelBoleto) {

                tituloPainelBoleto.textContent =
                    "Cadastrar Novo Boleto";
            }


            if (btnSalvarBoleto) {

                btnSalvarBoleto.textContent =
                    "Salvar Boleto";
            }


            mostrarFormulario();
        }
    );
}


// =========================================================
// VOLTAR
// =========================================================

if (btnVoltarBoleto) {

    btnVoltarBoleto.addEventListener(
        "click",
        fecharFormulario
    );
}


// =========================================================
// CANCELAR
// =========================================================

if (cancelarBoleto) {

    cancelarBoleto.addEventListener(
        "click",
        fecharFormulario
    );
}


// =========================================================
// CRIAR CAMPOS DAS PARCELAS
// =========================================================

function criarCamposParcelas() {

    if (!containerDatasParcelas) {

        return;
    }


    let quantidade =
        parseInt(
            qtdParcelas
                ? qtdParcelas.value
                : 1
        ) || 1;


    if (quantidade < 1) {

        quantidade = 1;
    }


    if (quantidade > 12) {

        quantidade = 12;
    }


    if (qtdParcelas) {

        qtdParcelas.value =
            quantidade;
    }


    let html = "";


    for (
        let i = 0;
        i < quantidade;
        i++
    ) {

        const titulo =
            quantidade === 1
                ? "Boleto"
                : `Boleto / Parcela ${i + 1}`;


        html += `

            <div
                class="parcela-item"
                style="
                    margin-top:15px;
                    margin-bottom:15px;
                    padding:15px;
                    border:1px solid #e2e8f0;
                    border-radius:8px;
                "
            >

                <strong
                    style="
                        display:block;
                        margin-bottom:12px;
                    "
                >
                    ${titulo}
                </strong>


                <div
                    style="
                        display:grid;
                        grid-template-columns:
                            1fr 1fr 1fr;
                        gap:15px;
                    "
                >

                    <div>

                        <label>
                            Número do Boleto
                        </label>

                        <input
                            type="text"
                            class="numeroBoletoParcela"
                            placeholder="Número do boleto"
                            required
                            style="
                                padding:10px;
                                border:1px solid #cbd5e1;
                                border-radius:8px;
                                width:100%;
                            "
                        >

                    </div>


                    <div>

                        <label>
                            Valor
                        </label>

                        <input
                            type="text"
                            class="valorBoletoParcela"
                            placeholder="R$ 0,00"
                            required
                            style="
                                padding:10px;
                                border:1px solid #cbd5e1;
                                border-radius:8px;
                                width:100%;
                            "
                        >

                    </div>


                    <div>

                        <label>
                            Data de Vencimento
                        </label>

                        <input
                            type="date"
                            class="dataParcelaCustomizada"
                            required
                            style="
                                padding:10px;
                                border:1px solid #cbd5e1;
                                border-radius:8px;
                                width:100%;
                            "
                        >

                    </div>

                </div>

            </div>
        `;
    }


    containerDatasParcelas.innerHTML =
        html;
}


// =========================================================
// ALTERAÇÃO DA QUANTIDADE DE PARCELAS
// =========================================================

if (qtdParcelas) {

    qtdParcelas.addEventListener(
        "input",
        criarCamposParcelas
    );
}

// =========================================================
// RENDERIZAR TABELA DE BOLETOS
// =========================================================

function renderizarTabela(boletos) {

    if (!listaBoletos) {
        return;
    }


    if (
        !Array.isArray(boletos) ||
        boletos.length === 0
    ) {

        listaBoletos.innerHTML = `
            <tr>
                <td
                    colspan="9"
                    style="
                        text-align:center;
                        color:#64748b;
                        padding:25px;
                    "
                >
                    Nenhum boleto encontrado.
                </td>
            </tr>
        `;

        return;
    }


    listaBoletos.innerHTML =
        boletos
            .map(boleto => {

                const status =
                    calcularStatusAutomatico(
                        boleto.vencimento,
                        boleto.status
                    );


                let classeStatus =
                    "pending";


                if (status === "Pago") {

                    classeStatus =
                        "paid";

                } else if (
                    status === "Vencido"
                ) {

                    classeStatus =
                        "overdue";

                } else if (
                    status === "Baixa"
                ) {

                    classeStatus =
                        "baixa";
                }


                // =========================================
                // COLUNA DE SELEÇÃO
                // =========================================
                // Vendedor não pode selecionar boletos
                // para Pago ou Baixa.
                // =========================================

                const colunaSelecao =
                    ehVendedor()

                        ? `
                            <td
                                style="
                                    text-align:center;
                                    color:#94a3b8;
                                "
                            >
                                -
                            </td>
                        `

                        : `
                            <td
                                style="
                                    text-align:center;
                                "
                            >
                                <input
                                    type="checkbox"
                                    class="checkBoleto"
                                    value="${boleto.id}"
                                >
                            </td>
                        `;


                // =========================================
                // COLUNA DE AÇÕES
                // =========================================
                // Vendedor somente consulta.
                // =========================================

                const colunaAcao =
                    ehVendedor()

                        ? `
                            <td
                                style="
                                    text-align:center;
                                    color:#64748b;
                                    font-size:12px;
                                "
                            >
                                Consulta
                            </td>
                        `

                        : `
                            <td
                                style="
                                    text-align:center;
                                "
                            >
                                <button
                                    type="button"
                                    onclick="prepararEdicaoBoleto(${boleto.id})"
                                    title="Editar boleto"
                                    style="
                                        background:#f59e0b;
                                        color:#ffffff;
                                        border:none;
                                        width:34px;
                                        height:34px;
                                        border-radius:6px;
                                        cursor:pointer;
                                    "
                                >
                                    ✏️
                                </button>
                            </td>
                        `;


                return `
                    <tr>

                        ${colunaSelecao}

                        <td>
                            <strong>
                                ${boleto.id}
                            </strong>
                        </td>

                        <td>
                            ${boleto.razao_social || "-"}
                        </td>

                        <td>
                            ${boleto.num_boleto || "-"}
                        </td>

                        <td>
                            ${formatarMoeda(
                                boleto.valor
                            )}
                        </td>

                        <td>
                            ${formatarData(
                                boleto.data_emissao
                            )}
                        </td>

                        <td>
                            ${formatarData(
                                boleto.vencimento
                            )}
                        </td>

                        <td>
                            <span
                                class="status ${classeStatus}"
                            >
                                ${status}
                            </span>
                        </td>

                        ${colunaAcao}

                    </tr>
                `;
            })
            .join("");
}


// =========================================================
// CARREGAR BOLETOS
// =========================================================

async function carregarBoletos() {

    try {

        // =============================================
        // VERIFICAR USUÁRIO
        // =============================================

        if (
            !usuarioLogado ||
            !usuarioLogado.id
        ) {

            throw new Error(
                "Usuário não identificado. Faça login novamente."
            );
        }


        console.log(
            "Buscando boletos com usuário ID:",
            usuarioLogado.id
        );


        // =============================================
        // REQUISIÇÃO CORRIGIDA
        // =============================================
        //
        // ESSA É A CORREÇÃO DO ERRO 401.
        //
        // O server.js precisa receber:
        //
        // x-usuario-id
        //
        // para descobrir quem está logado.
        // =============================================

        const resposta =
            await fetch(
                `${API_URL}/api/boletos`,
                {
                    method: "GET",

                    headers:
                        obterHeadersAPI()
                }
            );


        // =============================================
        // ERRO 401
        // =============================================

        if (
            resposta.status === 401
        ) {

            const retorno =
                await resposta
                    .json()
                    .catch(
                        () => ({})
                    );


            console.error(
                "API recusou o usuário:",
                retorno
            );


            throw new Error(
                retorno.erro ||
                "Usuário não autorizado."
            );
        }


        // =============================================
        // OUTROS ERROS
        // =============================================

        if (!resposta.ok) {

            const retorno =
                await resposta
                    .json()
                    .catch(
                        () => ({})
                    );


            throw new Error(
                retorno.erro ||
                `Erro ao carregar boletos. Código ${resposta.status}.`
            );
        }


        // =============================================
        // BOLETOS RECEBIDOS
        // =============================================

        const todosBoletos =
            await resposta.json();


        if (
            !Array.isArray(
                todosBoletos
            )
        ) {

            throw new Error(
                "A API retornou uma resposta inválida."
            );
        }


        // =============================================
        // CONTROLE DO VENDEDOR
        // =============================================
        //
        // O server.js já deve retornar somente
        // os boletos permitidos.
        //
        // Mesmo assim fazemos uma segunda
        // verificação no frontend.
        // =============================================

        if (ehVendedor()) {

            listaBoletosGlobal =
                todosBoletos.filter(
                    boleto =>
                        boletoPertenceAoVendedor(
                            boleto
                        )
                );

        } else {

            // Administrador e Operador

            listaBoletosGlobal =
                todosBoletos;
        }


        // =============================================
        // LOGS PARA TESTE
        // =============================================

        console.log(
            "=============================="
        );

        console.log(
            "CARREGAMENTO DE BOLETOS"
        );

        console.log(
            "Usuário:",
            usuarioLogado.nome
        );

        console.log(
            "ID enviado:",
            usuarioLogado.id
        );

        console.log(
            "Perfil:",
            usuarioLogado.permissao
        );

        console.log(
            "Boletos recebidos da API:",
            todosBoletos
        );

        console.log(
            "Boletos permitidos:",
            listaBoletosGlobal
        );

        console.log(
            "=============================="
        );


        // =============================================
        // APLICAR FILTROS
        // =============================================

        aplicarFiltros();


    } catch (erro) {

        console.error(
            "Erro ao carregar boletos:",
            erro
        );


        listaBoletosGlobal = [];


        if (listaBoletos) {

            listaBoletos.innerHTML = `
                <tr>
                    <td
                        colspan="9"
                        style="
                            text-align:center;
                            color:#dc2626;
                            padding:25px;
                        "
                    >
                        ${erro.message}
                    </td>
                </tr>
            `;
        }
    }
}


// =========================================================
// SALVAR BOLETO
// =========================================================

if (formBoleto) {

    formBoleto.addEventListener(
        "submit",
        async evento => {

            evento.preventDefault();


            // =============================================
            // VENDEDOR NÃO PODE SALVAR
            // =============================================

            if (ehVendedor()) {

                alert(
                    "O vendedor possui acesso somente à consulta e ao relatório dos boletos de seus clientes."
                );

                return;
            }


            // =============================================
            // CLIENTE
            // =============================================

            const razaoSocial =
                obterValor(
                    "razaoSocialBoleto"
                );


            if (!razaoSocial) {

                alert(
                    "Selecione o cliente."
                );

                return;
            }


            const cliente =
                encontrarCliente(
                    razaoSocial
                );


            if (!cliente) {

                alert(
                    "Selecione um cliente cadastrado."
                );

                return;
            }


            // =============================================
            // DATA DE EMISSÃO
            // =============================================

            const dataEmissao =
                obterValor(
                    "dataEmissao"
                );


            if (!dataEmissao) {

                alert(
                    "Informe a data de emissão."
                );

                return;
            }


            // =============================================
            // OBSERVAÇÃO / INSTRUÇÕES
            // =============================================

            const instrucoes =
                obterValor(
                    "instrucoesBoleto"
                );


            // =============================================
            // PARCELAS
            // =============================================

            const numeros =
                document.querySelectorAll(
                    ".numeroBoletoParcela"
                );


            const valores =
                document.querySelectorAll(
                    ".valorBoletoParcela"
                );


            const vencimentos =
                document.querySelectorAll(
                    ".dataParcelaCustomizada"
                );


            if (
                numeros.length === 0
            ) {

                alert(
                    "Nenhum boleto informado."
                );

                return;
            }


            const boletos = [];


            for (
                let i = 0;
                i < numeros.length;
                i++
            ) {

                const numero =
                    numeros[i]
                        .value
                        .trim();


                const valor =
                    converterMoedaParaNumero(
                        valores[i].value
                    );


                const vencimento =
                    vencimentos[i].value;


                if (!numero) {

                    alert(
                        `Informe o número do boleto ${i + 1}.`
                    );

                    return;
                }


                if (
                    !valor ||
                    valor <= 0
                ) {

                    alert(
                        `Informe um valor válido para o boleto ${i + 1}.`
                    );

                    return;
                }


                if (!vencimento) {

                    alert(
                        `Informe o vencimento do boleto ${i + 1}.`
                    );

                    return;
                }


                boletos.push({

                    razao_social:
                        cliente.razao_social,

                    num_boleto:
                        numero,

                    valor:
                        valor,

                    data_emissao:
                        dataEmissao,

                    vencimento:
                        vencimento,

                    vendedor:
                        cliente.vendedor || "",

                    status:
                        boletoEmEdicao
                            ? boletoEmEdicao.status
                            : "Pendente",

                    motivo_baixa:
                        boletoEmEdicao
                            ? boletoEmEdicao.motivo_baixa
                            : null,

                    pagador_cpf_cnpj:
                        cliente.cnpj || "",

                    pagador_endereco:
                        cliente.endereco || "",

                    pagador_numero:
                        cliente.numero || "",

                    pagador_cep:
                        cliente.cep || "",

                    instrucoes:
                        instrucoes,

                    usuario_logado:
                        usuarioLogado.nome ||
                        usuarioLogado.usuario ||
                        "Sistema"
                });
            }


            try {

                // =========================================
                // EDITAR BOLETO
                // =========================================

                if (boletoEmEdicaoId) {

                    const resposta =
                        await fetch(
                            `${API_URL}/api/boletos/${boletoEmEdicaoId}`,
                            {
                                method: "PUT",

                                headers:
                                    obterHeadersAPI(),

                                body:
                                    JSON.stringify(
                                        boletos[0]
                                    )
                            }
                        );


                    const retorno =
                        await resposta
                            .json()
                            .catch(
                                () => ({})
                            );


                    if (!resposta.ok) {

                        throw new Error(
                            retorno.erro ||
                            "Erro ao atualizar boleto."
                        );
                    }


                    alert(
                        "Boleto atualizado com sucesso!"
                    );
                }


                // =========================================
                // CADASTRAR UM BOLETO
                // =========================================

                else if (
                    boletos.length === 1
                ) {

                    const resposta =
                        await fetch(
                            `${API_URL}/api/boletos`,
                            {
                                method: "POST",

                                headers:
                                    obterHeadersAPI(),

                                body:
                                    JSON.stringify(
                                        boletos[0]
                                    )
                            }
                        );


                    const retorno =
                        await resposta
                            .json()
                            .catch(
                                () => ({})
                            );


                    if (!resposta.ok) {

                        throw new Error(
                            retorno.erro ||
                            "Erro ao cadastrar boleto."
                        );
                    }


                    alert(
                        "Boleto cadastrado com sucesso!"
                    );
                }


                // =========================================
                // CADASTRAR VÁRIOS BOLETOS
                // =========================================

                else {

                    const resposta =
                        await fetch(
                            `${API_URL}/api/boletos/lote`,
                            {
                                method: "POST",

                                headers:
                                    obterHeadersAPI(),

                                body:
                                    JSON.stringify({

                                        boletos:
                                            boletos,

                                        usuario_logado:
                                            usuarioLogado.nome ||
                                            usuarioLogado.usuario ||
                                            "Sistema"
                                    })
                            }
                        );


                    const retorno =
                        await resposta
                            .json()
                            .catch(
                                () => ({})
                            );


                    if (!resposta.ok) {

                        throw new Error(
                            retorno.erro ||
                            "Erro ao cadastrar boletos."
                        );
                    }


                    alert(
                        `${boletos.length} boletos cadastrados com sucesso!`
                    );
                }


                fecharFormulario();


                await carregarBoletos();


            } catch (erro) {

                console.error(
                    "Erro ao salvar boleto:",
                    erro
                );


                alert(
                    erro.message ||
                    "Erro ao salvar boleto."
                );
            }
        }
    );
}


// =========================================================
// PREPARAR EDIÇÃO
// =========================================================

window.prepararEdicaoBoleto =
    function(id) {

        // =============================================
        // VENDEDOR NÃO EDITA
        // =============================================

        if (ehVendedor()) {

            alert(
                "O vendedor não possui permissão para editar boletos."
            );

            return;
        }


        const boleto =
            listaBoletosGlobal.find(
                item =>
                    Number(item.id) ===
                    Number(id)
            );


        if (!boleto) {

            alert(
                "Boleto não encontrado."
            );

            return;
        }


        boletoEmEdicaoId =
            boleto.id;


        boletoEmEdicao =
            boleto;


        // =============================================
        // TÍTULO
        // =============================================

        if (tituloPainelBoleto) {

            tituloPainelBoleto.textContent =
                "Editar Boleto";
        }


        if (btnSalvarBoleto) {

            btnSalvarBoleto.textContent =
                "Salvar Alterações";
        }


        // =============================================
        // CLIENTE
        // =============================================

        preencherCampo(
            "razaoSocialBoleto",
            boleto.razao_social
        );


        preencherCampo(
            "cpfCnpjPagador",
            boleto.pagador_cpf_cnpj
        );


        preencherCampo(
            "enderecoPagador",
            boleto.pagador_endereco
        );


        preencherCampo(
            "numeroPagador",
            boleto.pagador_numero
        );


        preencherCampo(
            "cepPagador",
            boleto.pagador_cep
        );


        // =============================================
        // DATA
        // =============================================

        preencherCampo(
            "dataEmissao",
            dataParaInput(
                boleto.data_emissao
            )
        );


        // =============================================
        // INSTRUÇÕES
        // =============================================

        preencherCampo(
            "instrucoesBoleto",
            boleto.instrucoes
        );


        // =============================================
        // EDIÇÃO SEM PARCELAMENTO
        // =============================================

        if (qtdParcelas) {

            qtdParcelas.value =
                1;

            qtdParcelas.disabled =
                true;
        }


        criarCamposParcelas();


        // =============================================
        // PREENCHER BOLETO
        // =============================================

        const numero =
            document.querySelector(
                ".numeroBoletoParcela"
            );


        const valor =
            document.querySelector(
                ".valorBoletoParcela"
            );


        const vencimento =
            document.querySelector(
                ".dataParcelaCustomizada"
            );


        if (numero) {

            numero.value =
                boleto.num_boleto ||
                "";
        }


        if (valor) {

            valor.value =
                Number(
                    boleto.valor || 0
                )
                    .toFixed(2)
                    .replace(
                        ".",
                        ","
                    );
        }


        if (vencimento) {

            vencimento.value =
                dataParaInput(
                    boleto.vencimento
                );
        }


        mostrarFormulario();
    };


// =========================================================
// FILTRAR BOLETOS
// =========================================================

function aplicarFiltros() {

    const cliente =
        filtroCliente
            ? normalizarTexto(
                filtroCliente.value
            )
            : "";


    const numero =
        filtroNumero
            ? normalizarTexto(
                filtroNumero.value
            )
            : "";


    const statusSelecionado =
        filtroStatus
            ? filtroStatus.value
            : "";


    /*
     * IMPORTANTE:
     *
     * O filtro trabalha em listaBoletosGlobal.
     *
     * Para Vendedor, essa lista já contém
     * SOMENTE os boletos permitidos.
     */

    const filtrados =
        listaBoletosGlobal.filter(
            boleto => {

                const status =
                    calcularStatusAutomatico(
                        boleto.vencimento,
                        boleto.status
                    );


                const clienteOk =
                    cliente === "" ||

                    normalizarTexto(
                        boleto.razao_social
                    )
                        .includes(
                            cliente
                        );


                const numeroOk =
                    numero === "" ||

                    normalizarTexto(
                        boleto.num_boleto
                    )
                        .includes(
                            numero
                        );


                const statusOk =
                    statusSelecionado === "" ||

                    normalizarTexto(status) ===
                    normalizarTexto(
                        statusSelecionado
                    );


                return (
                    clienteOk &&
                    numeroOk &&
                    statusOk
                );
            }
        );


    renderizarTabela(
        filtrados
    );
}


// =========================================================
// EVENTOS DOS FILTROS
// =========================================================

if (filtroCliente) {

    filtroCliente.addEventListener(
        "input",
        aplicarFiltros
    );
}


if (filtroNumero) {

    filtroNumero.addEventListener(
        "input",
        aplicarFiltros
    );
}


if (filtroStatus) {

    filtroStatus.addEventListener(
        "change",
        aplicarFiltros
    );
}


// =========================================================
// SELECIONAR TODOS
// =========================================================

if (selecionarTodos) {

    selecionarTodos.addEventListener(
        "change",
        () => {

            // Vendedor não pode selecionar.

            if (ehVendedor()) {

                selecionarTodos.checked =
                    false;

                return;
            }


            const checkboxes =
                document.querySelectorAll(
                    ".checkBoleto"
                );


            checkboxes.forEach(
                checkbox => {

                    checkbox.checked =
                        selecionarTodos.checked;
                }
            );
        }
    );
}


// =========================================================
// OBTER IDS SELECIONADOS
// =========================================================

function obterIdsSelecionados() {

    // Vendedor não executa ações em massa.

    if (ehVendedor()) {

        return [];
    }


    return Array.from(
        document.querySelectorAll(
            ".checkBoleto:checked"
        )
    )
        .map(
            checkbox =>
                Number(
                    checkbox.value
                )
        );
}



// =========================================================
// ALTERAR STATUS DOS BOLETOS
// =========================================================

async function alterarStatusEmLote(novoStatus) {

    // =====================================================
    // VENDEDOR NÃO PODE ALTERAR STATUS
    // =====================================================

    if (ehVendedor()) {

        alert(
            "O vendedor possui acesso somente à consulta e ao relatório."
        );

        return;
    }


    const ids =
        obterIdsSelecionados();


    if (ids.length === 0) {

        alert(
            "Selecione pelo menos um boleto."
        );

        return;
    }


    let motivoBaixa = null;


    // =====================================================
    // PAGAMENTO
    // =====================================================

    if (novoStatus === "Pago") {

        const confirmar =
            confirm(
                `Deseja marcar ${ids.length} boleto(s) como Pago?`
            );


        if (!confirmar) {

            return;
        }
    }


    // =====================================================
    // BAIXA
    // =====================================================

    if (novoStatus === "Baixa") {

        motivoBaixa =
            prompt(
                "Informe o motivo da baixa:"
            );


        if (motivoBaixa === null) {

            return;
        }


        motivoBaixa =
            motivoBaixa.trim();


        if (!motivoBaixa) {

            alert(
                "Informe o motivo da baixa."
            );

            return;
        }
    }


    try {

        for (const id of ids) {

            const boleto =
                listaBoletosGlobal.find(
                    item =>
                        Number(item.id) ===
                        Number(id)
                );


            if (!boleto) {

                continue;
            }


            const dados = {

                razao_social:
                    boleto.razao_social,

                num_boleto:
                    boleto.num_boleto,

                valor:
                    boleto.valor,

                data_emissao:
                    dataParaInput(
                        boleto.data_emissao
                    ),

                vencimento:
                    dataParaInput(
                        boleto.vencimento
                    ),

                vendedor:
                    boleto.vendedor || "",

                status:
                    novoStatus,

                motivo_baixa:
                    novoStatus === "Baixa"
                        ? motivoBaixa
                        : null,

                pagador_cpf_cnpj:
                    boleto.pagador_cpf_cnpj || "",

                pagador_endereco:
                    boleto.pagador_endereco || "",

                pagador_numero:
                    boleto.pagador_numero || "",

                pagador_cep:
                    boleto.pagador_cep || "",

                instrucoes:
                    boleto.instrucoes || "",

                usuario_logado:
                    usuarioLogado.nome ||
                    usuarioLogado.usuario ||
                    "Sistema"
            };


            const resposta =
                await fetch(
                    `${API_URL}/api/boletos/${id}`,
                    {
                        method: "PUT",

                        headers:
                            obterHeadersAPI(),

                        body:
                            JSON.stringify(
                                dados
                            )
                    }
                );


            const retorno =
                await resposta
                    .json()
                    .catch(
                        () => ({})
                    );


            if (!resposta.ok) {

                throw new Error(
                    retorno.erro ||
                    `Erro ao atualizar o boleto ${id}.`
                );
            }
        }


        if (novoStatus === "Pago") {

            alert(
                "Boleto(s) marcado(s) como Pago com sucesso!"
            );

        } else {

            alert(
                "Baixa realizada com sucesso!"
            );
        }


        if (selecionarTodos) {

            selecionarTodos.checked =
                false;
        }


        await carregarBoletos();


    } catch (erro) {

        console.error(
            "Erro ao alterar status:",
            erro
        );


        alert(
            erro.message ||
            "Erro ao atualizar boleto."
        );
    }
}


// =========================================================
// BOTÃO MARCAR COMO PAGO
// =========================================================

if (btnMarcarPagosMassa) {

    btnMarcarPagosMassa.addEventListener(
        "click",
        () => {

            alterarStatusEmLote(
                "Pago"
            );
        }
    );
}


// =========================================================
// BOTÃO DAR BAIXA
// =========================================================

if (btnDarBaixaMassa) {

    btnDarBaixaMassa.addEventListener(
        "click",
        () => {

            alterarStatusEmLote(
                "Baixa"
            );
        }
    );
}


// =========================================================
// BOLETOS PERMITIDOS PARA O RELATÓRIO
// =========================================================

function obterBoletosParaRelatorio() {

    /*
     * IMPORTANTE:
     *
     * listaBoletosGlobal já foi preenchida
     * na Parte 2.
     *
     * Para Vendedor ela já contém somente
     * os boletos permitidos.
     */

    if (!ehVendedor()) {

        return [
            ...listaBoletosGlobal
        ];
    }


    return listaBoletosGlobal.filter(
        boleto =>
            boletoPertenceAoVendedor(
                boleto
            )
    );
}


// =========================================================
// IMPRIMIR RELATÓRIO
// =========================================================

function imprimirRelatorioBoletos() {

    const boletos =
        obterBoletosParaRelatorio();


    if (
        !boletos ||
        boletos.length === 0
    ) {

        alert(
            "Nenhum boleto disponível para impressão."
        );

        return;
    }


    let total = 0;


    let totalPendentes = 0;

    let totalVencidos = 0;

    let totalPagos = 0;

    let totalBaixa = 0;


    const linhas =
        boletos
            .map(boleto => {

                const valor =
                    Number(
                        boleto.valor || 0
                    );


                total += valor;


                const status =
                    calcularStatusAutomatico(
                        boleto.vencimento,
                        boleto.status
                    );


                if (status === "Pago") {

                    totalPagos++;

                } else if (
                    status === "Vencido"
                ) {

                    totalVencidos++;

                } else if (
                    status === "Baixa"
                ) {

                    totalBaixa++;

                } else {

                    totalPendentes++;
                }


                return `
                    <tr>

                        <td>
                            ${boleto.id || "-"}
                        </td>

                        <td>
                            ${boleto.razao_social || "-"}
                        </td>

                        <td>
                            ${boleto.num_boleto || "-"}
                        </td>

                        <td>
                            ${formatarMoeda(valor)}
                        </td>

                        <td>
                            ${formatarData(
                                boleto.data_emissao
                            )}
                        </td>

                        <td>
                            ${formatarData(
                                boleto.vencimento
                            )}
                        </td>

                        <td>
                            ${status}
                        </td>

                    </tr>
                `;
            })
            .join("");


    const janela =
        window.open(
            "",
            "_blank"
        );


    if (!janela) {

        alert(
            "Não foi possível abrir a janela de impressão."
        );

        return;
    }


    const titulo =
        ehVendedor()

            ? "Relatório de Boletos dos Meus Clientes"

            : "Relatório de Boletos";


    janela.document.write(`
        <!DOCTYPE html>

        <html lang="pt-BR">

        <head>

            <meta charset="UTF-8">

            <title>
                ${titulo}
            </title>

            <style>

                * {
                    box-sizing: border-box;
                }

                body {
                    font-family: Arial, sans-serif;
                    color: #1e293b;
                    padding: 25px;
                }

                h1 {
                    margin: 0 0 5px 0;
                    font-size: 22px;
                }

                .subtitulo {
                    margin: 0 0 20px 0;
                    color: #64748b;
                }

                .usuario {
                    margin-bottom: 20px;
                    line-height: 1.7;
                }

                .resumo {
                    display: flex;
                    gap: 15px;
                    flex-wrap: wrap;
                    margin-bottom: 20px;
                }

                .resumo div {
                    border: 1px solid #cbd5e1;
                    border-radius: 6px;
                    padding: 8px 12px;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                }

                th,
                td {
                    border: 1px solid #cbd5e1;
                    padding: 7px;
                    font-size: 11px;
                    text-align: left;
                }

                th {
                    background: #f1f5f9;
                }

                .total {
                    margin-top: 18px;
                    text-align: right;
                    font-size: 16px;
                    font-weight: bold;
                }

                .data-impressao {
                    margin-top: 10px;
                    color: #64748b;
                    font-size: 11px;
                }

                @media print {

                    body {
                        padding: 0;
                    }
                }

            </style>

        </head>

        <body>

            <h1>
                ${titulo}
            </h1>

            <p class="subtitulo">
                ControleBoleto
            </p>


            <div class="usuario">

                <strong>
                    Usuário:
                </strong>

                ${
                    usuarioLogado.nome ||
                    usuarioLogado.usuario ||
                    "Usuário"
                }

                <br>

                <strong>
                    Perfil:
                </strong>

                ${
                    usuarioLogado.permissao ||
                    "-"
                }

            </div>


            <div class="resumo">

                <div>
                    <strong>Total de boletos:</strong>
                    ${boletos.length}
                </div>

                <div>
                    <strong>Pendentes:</strong>
                    ${totalPendentes}
                </div>

                <div>
                    <strong>Vencidos:</strong>
                    ${totalVencidos}
                </div>

                <div>
                    <strong>Pagos:</strong>
                    ${totalPagos}
                </div>

                <div>
                    <strong>Baixa:</strong>
                    ${totalBaixa}
                </div>

            </div>


            <table>

                <thead>

                    <tr>

                        <th>
                            Código
                        </th>

                        <th>
                            Cliente
                        </th>

                        <th>
                            Nº Boleto
                        </th>

                        <th>
                            Valor
                        </th>

                        <th>
                            Emissão
                        </th>

                        <th>
                            Vencimento
                        </th>

                        <th>
                            Status
                        </th>

                    </tr>

                </thead>


                <tbody>

                    ${linhas}

                </tbody>

            </table>


            <div class="total">

                Total:

                ${formatarMoeda(total)}

            </div>


            <div class="data-impressao">

                Impresso em:

                ${new Date().toLocaleString(
                    "pt-BR"
                )}

            </div>

        </body>

        </html>
    `);


    janela.document.close();


    setTimeout(
        () => {

            janela.focus();

            janela.print();

        },
        300
    );
}


// =========================================================
// LOCALIZAR BOTÃO DE RELATÓRIO
// =========================================================

const btnRelatorio =
    document.getElementById(
        "btnRelatorio"
    ) ||

    document.getElementById(
        "btnImprimirRelatorio"
    ) ||

    document.getElementById(
        "btnImprimir"
    );


// =========================================================
// EVENTO DO RELATÓRIO
// =========================================================

if (btnRelatorio) {

    btnRelatorio.addEventListener(
        "click",
        imprimirRelatorioBoletos
    );
}


// Deixa disponível caso o HTML utilize onclick.

window.imprimirRelatorioBoletos =
    imprimirRelatorioBoletos;


window.gerarRelatorioBoletos =
    imprimirRelatorioBoletos;


// =========================================================
// CONFIGURAR PERMISSÕES VISUAIS
// =========================================================

function configurarPermissoesTela() {

    if (!ehVendedor()) {

        return;
    }


    console.log(
        "Aplicando modo de consulta do Vendedor."
    );


    // =====================================================
    // NOVO BOLETO
    // =====================================================

    if (btnNovoBoleto) {

        btnNovoBoleto.style.display =
            "none";

        btnNovoBoleto.disabled =
            true;
    }


    // =====================================================
    // PAGAMENTO
    // =====================================================

    if (btnMarcarPagosMassa) {

        btnMarcarPagosMassa.style.display =
            "none";

        btnMarcarPagosMassa.disabled =
            true;
    }


    // =====================================================
    // BAIXA
    // =====================================================

    if (btnDarBaixaMassa) {

        btnDarBaixaMassa.style.display =
            "none";

        btnDarBaixaMassa.disabled =
            true;
    }


    // =====================================================
    // SELECIONAR TODOS
    // =====================================================

    if (selecionarTodos) {

        selecionarTodos.style.display =
            "none";

        selecionarTodos.checked =
            false;

        selecionarTodos.disabled =
            true;
    }


    // =====================================================
    // PAINEL DE CADASTRO
    // =====================================================

    if (painelCadastroBoleto) {

        painelCadastroBoleto.style.display =
            "none";
    }


    // =====================================================
    // TABELA
    // =====================================================

    if (secaoTabela) {

        secaoTabela.style.display =
            "block";
    }


    // =====================================================
    // FILTROS
    // =====================================================

    if (secaoFiltros) {

        secaoFiltros.style.display =
            "block";
    }


    // =====================================================
    // MENU USUÁRIOS
    // =====================================================

    const linkUsuarios =
        document.querySelector(
            'a[href*="usuarios.html"]'
        );


    if (linkUsuarios) {

        const itemMenu =
            linkUsuarios.closest("li");


        if (itemMenu) {

            itemMenu.style.display =
                "none";

        } else {

            linkUsuarios.style.display =
                "none";
        }
    }
}


// =========================================================
// PROTEÇÃO EXTRA DO VENDEDOR
// =========================================================

function protegerAcoesVendedor() {

    if (!ehVendedor()) {

        return;
    }


    if (btnNovoBoleto) {

        btnNovoBoleto.style.display =
            "none";
    }


    if (btnMarcarPagosMassa) {

        btnMarcarPagosMassa.style.display =
            "none";
    }


    if (btnDarBaixaMassa) {

        btnDarBaixaMassa.style.display =
            "none";
    }


    /*
     * IMPORTANTE:
     *
     * Não escondemos o botão de relatório.
     *
     * O vendedor PODE imprimir relatório,
     * mas somente dos boletos dos clientes dele.
     */
}


// =========================================================
// TECLA ESC
// =========================================================

document.addEventListener(
    "keydown",
    evento => {

        if (
            evento.key === "Escape" &&
            !ehVendedor()
        ) {

            fecharFormulario();
        }
    }
);


// =========================================================
// INICIALIZAÇÃO DA PÁGINA
// =========================================================

async function iniciarPagina() {

    console.log(
        "======================================"
    );

    console.log(
        "INICIANDO BOLETOS"
    );

    console.log(
        "Usuário:",
        usuarioLogado.nome
    );

    console.log(
        "ID:",
        usuarioLogado.id
    );

    console.log(
        "Permissão:",
        usuarioLogado.permissao
    );

    console.log(
        "======================================"
    );


    // =====================================================
    // USUÁRIO NA SIDEBAR
    // =====================================================

    atualizarUsuarioNaTela();


    // =====================================================
    // PERMISSÕES
    // =====================================================

    configurarPermissoesTela();


    protegerAcoesVendedor();


    // =====================================================
    // CAMPOS DE PARCELA
    // =====================================================

    if (!ehVendedor()) {

        criarCamposParcelas();
    }


    try {

        // =================================================
        // 1º CARREGAR CLIENTES
        // =================================================
        //
        // É importante carregar os clientes primeiro,
        // porque boletoPertenceAoVendedor() pode usar
        // a relação Cliente -> Vendedor.
        // =================================================

        await carregarClientes();


        console.log(
            "Clientes permitidos:",
            listaClientesGlobal
        );


        // =================================================
        // 2º CARREGAR BOLETOS
        // =================================================
        //
        // A função carregarBoletos() da Parte 2 envia:
        //
        // x-usuario-id
        //
        // para o server.js.
        // =================================================

        await carregarBoletos();


        // =================================================
        // REAPLICAR PERMISSÕES
        // =================================================

        configurarPermissoesTela();


        protegerAcoesVendedor();


        // =================================================
        // LOG DE TESTE
        // =================================================

        if (ehVendedor()) {

            console.log(
                "======================================"
            );

            console.log(
                "MODO VENDEDOR"
            );

            console.log(
                "Nome:",
                usuarioLogado.nome
            );

            console.log(
                "ID:",
                usuarioLogado.id
            );

            console.log(
                "Clientes do vendedor:",
                listaClientesGlobal.map(
                    cliente =>
                        cliente.razao_social
                )
            );

            console.log(
                "Boletos visíveis:",
                listaBoletosGlobal.map(
                    boleto => ({
                        id:
                            boleto.id,

                        cliente:
                            boleto.razao_social,

                        numero:
                            boleto.num_boleto,

                        vendedor:
                            boleto.vendedor
                    })
                )
            );

            console.log(
                "======================================"
            );
        }


    } catch (erro) {

        console.error(
            "Erro ao iniciar página de boletos:",
            erro
        );
    }
}


// =========================================================
// INICIAR SOMENTE UMA VEZ
// =========================================================

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        iniciarPagina,
        {
            once: true
        }
    );

} else {

    iniciarPagina();
}
