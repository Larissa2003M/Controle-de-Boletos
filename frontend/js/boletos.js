
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

        usuarioLogado = JSON.parse(dados);

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

// Carrega o usuário ao abrir a página.
carregarUsuarioLocal();

// =========================================================
// VERIFICAR LOGIN
// =========================================================

function verificarLogin() {
    carregarUsuarioLocal();

    if (
        !usuarioLogado ||
        !usuarioLogado.id
    ) {
        alert(
            "Usuário não identificado. Faça login novamente."
        );

        window.location.href = "login.html";

        return false;
    }

    return true;
}

// =========================================================
// CABEÇALHOS DA API
// =========================================================

function obterHeadersAPI() {
    // Atualiza o usuário antes de cada requisição.
    carregarUsuarioLocal();

    return {
        "Content-Type": "application/json",
        "x-usuario-id": String(
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


        if (ehVendedor()) {

            listaClientesGlobal =
                todosClientes.filter(
                    cliente =>
                        clientePertenceAoVendedor(
                            cliente
                        )
                );

        } else {

            listaClientesGlobal =
                todosClientes;
        }


        console.log(
            "Clientes permitidos:",
            listaClientesGlobal
        );


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

    if (!ehVendedor()) {

        return true;
    }


    if (!boleto) {

        return false;
    }


    const vendedorLogado =
        obterNomeVendedorLogado();


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
// MOSTRAR FORMULÁRIO
// =========================================================

function mostrarFormulario() {

    

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
// CRIAR CAMPOS DOS BOLETOS
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
                : `Boleto ${i + 1}`;


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
                        color:#334155;
                    "
                >
                    ${titulo}
                </strong>


                <!-- LINHA DIGITÁVEL -->
                <div
                    style="
                        margin-bottom:15px;
                    "
                >

                    <label
                        style="
                            font-size:12px;
                            color:#64748b;
                            display:block;
                            margin-bottom:3px;
                        "
                    >
                        Linha Digitável
                    </label>

                    <input
                        type="text"
                        class="linhaDigitavelParcela"
                        placeholder="Digite ou cole a linha digitável"
                        maxlength="100"
                        autocomplete="off"
                        data-indice="${i}"
                        style="
                            padding:10px;
                            border:1px solid #cbd5e1;
                            border-radius:8px;
                            width:100%;
                        "
                    >

                    <small
                        class="mensagemLinhaDigitavel"
                        style="
                            display:block;
                            margin-top:4px;
                            color:#64748b;
                            font-size:11px;
                        "
                    >
                        Informe a linha digitável para preencher
                        automaticamente o valor e o vencimento.
                    </small>

                </div>


                <!-- DADOS DO BOLETO -->
                <div
                    style="
                        display:grid;
                        grid-template-columns:
                            1fr 1fr 1fr;
                        gap:15px;
                    "
                >

                    <!-- NÚMERO DO BOLETO -->
                    <div>

                        <label
                            style="
                                font-size:12px;
                                color:#64748b;
                                display:block;
                                margin-bottom:3px;
                            "
                        >
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


                    <!-- VALOR -->
                    <div>

                        <label
                            style="
                                font-size:12px;
                                color:#64748b;
                                display:block;
                                margin-bottom:3px;
                            "
                        >
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


                    <!-- VENCIMENTO -->
                    <div>

                        <label
                            style="
                                font-size:12px;
                                color:#64748b;
                                display:block;
                                margin-bottom:3px;
                            "
                        >
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
// ALTERAÇÃO DA QUANTIDADE DE BOLETOS
// =========================================================

if (qtdParcelas) {

    qtdParcelas.addEventListener(
        "input",
        criarCamposParcelas
    );
}


// =========================================================
// LINHA DIGITÁVEL
// =========================================================
// O sistema trabalha com boleto bancário de 47 dígitos.
// Pontos, espaços e outros caracteres são removidos.
// =========================================================

function somenteNumerosLinhaDigitavel(
    valor
) {

    return String(
        valor || ""
    )
        .replace(
            /\D/g,
            ""
        );
}


// =========================================================
// MÓDULO 10
// =========================================================
// Valida os DVs dos três primeiros campos.
// =========================================================

function calcularModulo10(numero) {

    let soma = 0;

    let multiplicador = 2;


    for (
        let i = numero.length - 1;
        i >= 0;
        i--
    ) {

        let resultado =
            Number(numero[i]) *
            multiplicador;


        if (resultado > 9) {

            resultado =
                Math.floor(
                    resultado / 10
                ) +
                (
                    resultado % 10
                );
        }


        soma +=
            resultado;


        multiplicador =
            multiplicador === 2
                ? 1
                : 2;
    }


    const resto =
        soma % 10;


    return resto === 0
        ? 0
        : 10 - resto;
}


// =========================================================
// MÓDULO 11
// =========================================================
// Utilizado para validar o DV geral do boleto.
// =========================================================

function calcularModulo11Boleto(
    codigoSemDV
) {

    let soma = 0;

    let peso = 2;


    /*
     * Percorre da direita para a esquerda.
     *
     * Pesos:
     * 2, 3, 4, 5, 6, 7, 8 e 9.
     */

    for (
        let i = codigoSemDV.length - 1;
        i >= 0;
        i--
    ) {

        soma +=
            Number(
                codigoSemDV[i]
            ) *
            peso;


        peso++;


        if (peso > 9) {

            peso = 2;
        }
    }


    const resto =
        soma % 11;


    const resultado =
        11 - resto;


    /*
     * Para resultado 0, 10 ou 11,
     * o DV utilizado é 1.
     */

    if (
        resultado === 0 ||
        resultado === 10 ||
        resultado === 11
    ) {

        return 1;
    }


    return resultado;
}


// =========================================================
// CONVERTER LINHA DIGITÁVEL PARA CÓDIGO DE BARRAS
// =========================================================

function converterLinhaParaCodigoBarras(
    linha
) {

    const numeros =
        somenteNumerosLinhaDigitavel(
            linha
        );


    if (
        numeros.length !== 47
    ) {

        return "";
    }


    const bancoMoeda =
        numeros.substring(
            0,
            4
        );


    const dvGeral =
        numeros.substring(
            32,
            33
        );


    const fatorValor =
        numeros.substring(
            33,
            47
        );


    const campoLivre1 =
        numeros.substring(
            4,
            9
        );


    const campoLivre2 =
        numeros.substring(
            10,
            20
        );


    const campoLivre3 =
        numeros.substring(
            21,
            31
        );


    /*
     * Código de barras:
     *
     * banco/moeda
     * + DV geral
     * + fator/valor
     * + campo livre
     */

    return (
        bancoMoeda +
        dvGeral +
        fatorValor +
        campoLivre1 +
        campoLivre2 +
        campoLivre3
    );
}


// =========================================================
// VALIDAR LINHA DIGITÁVEL DE 47 DÍGITOS
// =========================================================

function validarLinhaDigitavel47(
    linha
) {

    const numeros =
        somenteNumerosLinhaDigitavel(
            linha
        );


    if (
        numeros.length !== 47
    ) {

        return false;
    }


    // =====================================================
    // DV DO CAMPO 1
    // =====================================================

    const campo1 =
        numeros.substring(
            0,
            9
        );


    const dv1 =
        Number(
            numeros.substring(
                9,
                10
            )
        );


    if (
        calcularModulo10(
            campo1
        ) !== dv1
    ) {

        return false;
    }


    // =====================================================
    // DV DO CAMPO 2
    // =====================================================

    const campo2 =
        numeros.substring(
            10,
            20
        );


    const dv2 =
        Number(
            numeros.substring(
                20,
                21
            )
        );


    if (
        calcularModulo10(
            campo2
        ) !== dv2
    ) {

        return false;
    }


    // =====================================================
    // DV DO CAMPO 3
    // =====================================================

    const campo3 =
        numeros.substring(
            21,
            31
        );


    const dv3 =
        Number(
            numeros.substring(
                31,
                32
            )
        );


    if (
        calcularModulo10(
            campo3
        ) !== dv3
    ) {

        return false;
    }


    // =====================================================
    // DV GERAL
    // =====================================================

    const codigoBarras =
        converterLinhaParaCodigoBarras(
            numeros
        );


    if (
        codigoBarras.length !== 44
    ) {

        return false;
    }


    /*
     * No código de barras o DV geral
     * ocupa a quinta posição.
     *
     * Como o JavaScript começa em zero,
     * corresponde ao índice 4.
     */

    const dvGeralInformado =
        Number(
            codigoBarras.substring(
                4,
                5
            )
        );


    /*
     * Retira o DV geral antes de
     * realizar o cálculo do Módulo 11.
     */

    const codigoSemDV =
        codigoBarras.substring(
            0,
            4
        ) +
        codigoBarras.substring(
            5
        );


    const dvGeralCalculado =
        calcularModulo11Boleto(
            codigoSemDV
        );


    if (
        dvGeralCalculado !==
        dvGeralInformado
    ) {

        return false;
    }


    return true;
}


// =========================================================
// CALCULAR DATA PELO FATOR DE VENCIMENTO
// =========================================================

function calcularDataFatorVencimento(
    fator
) {

    const numeroFator =
        Number(fator);


    if (
        !numeroFator ||
        numeroFator < 1000
    ) {

        return "";
    }


    /*
     * Novo ciclo do fator de vencimento.
     *
     * Fator 1000 corresponde a 22/02/2025.
     */

    const dataBase =
        new Date(
            2025,
            1,
            22
        );


    dataBase.setDate(
        dataBase.getDate() +
        (
            numeroFator -
            1000
        )
    );


    const ano =
        dataBase.getFullYear();


    const mes =
        String(
            dataBase.getMonth() + 1
        )
            .padStart(
                2,
                "0"
            );


    const dia =
        String(
            dataBase.getDate()
        )
            .padStart(
                2,
                "0"
            );


    return (
        `${ano}-${mes}-${dia}`
    );
}


// =========================================================
// EXTRAIR DADOS DA LINHA DIGITÁVEL
// =========================================================

function extrairDadosLinhaDigitavel(
    linha
) {

    const numeros =
        somenteNumerosLinhaDigitavel(
            linha
        );


    if (
        numeros.length !== 47
    ) {

        return {

            valida: false,

            mensagem:
                "A linha digitável deve possuir 47 números."
        };
    }


    // -----------------------------------------------------
    // VALIDAR OS DVs
    // -----------------------------------------------------

    if (
        !validarLinhaDigitavel47(
            numeros
        )
    ) {

        return {

            valida: false,

            mensagem:
                "A linha digitável informada é inválida. Verifique os dígitos verificadores (DVs)."
        };
    }


    /*
     * Campo 5:
     *
     * posições 34 a 37 = fator
     * posições 38 a 47 = valor
     */

    const fator =
        numeros.substring(
            33,
            37
        );


    const valorTexto =
        numeros.substring(
            37,
            47
        );


    const valor =
        Number(
            valorTexto
        ) / 100;


    const vencimento =
        calcularDataFatorVencimento(
            fator
        );


    return {

        valida: true,

        linha:
            numeros,

        fator:
            fator,

        valor:
            valor,

        vencimento:
            vencimento
    };
}


// =========================================================
// MOSTRAR MENSAGEM DA LINHA DIGITÁVEL
// =========================================================

function mostrarMensagemLinhaDigitavel(
    campoLinha,
    mensagem,
    cor
) {

    const parcela =
        campoLinha.closest(
            ".parcela-item"
        );


    if (!parcela) {

        return;
    }


    const campoMensagem =
        parcela.querySelector(
            ".mensagemLinhaDigitavel"
        );


    if (!campoMensagem) {

        return;
    }


    campoMensagem.textContent =
        mensagem;


    campoMensagem.style.color =
        cor || "#64748b";
}


// =========================================================
// PREENCHER VALOR E VENCIMENTO
// =========================================================

function preencherPelaLinhaDigitavel(
    campoLinha
) {

    if (!campoLinha) {

        return;
    }


    const linha =
        somenteNumerosLinhaDigitavel(
            campoLinha.value
        );


    // -----------------------------------------------------
    // CAMPO VAZIO
    // -----------------------------------------------------

    if (!linha) {

        mostrarMensagemLinhaDigitavel(
            campoLinha,
            "Informe a linha digitável para preencher automaticamente o valor e o vencimento.",
            "#64748b"
        );

        return;
    }


    // -----------------------------------------------------
    // AINDA ESTÁ DIGITANDO
    // -----------------------------------------------------

    if (
        linha.length < 47
    ) {

        mostrarMensagemLinhaDigitavel(
            campoLinha,
            `Linha digitável: ${linha.length}/47 números.`,
            "#64748b"
        );

        return;
    }


    // -----------------------------------------------------
    // MAIS DE 47 DÍGITOS
    // -----------------------------------------------------

    if (
        linha.length > 47
    ) {

        mostrarMensagemLinhaDigitavel(
            campoLinha,
            "A linha digitável deve possuir 47 números.",
            "#dc2626"
        );

        return;
    }


    // -----------------------------------------------------
    // EXTRAIR E VALIDAR
    // -----------------------------------------------------

    const resultado =
        extrairDadosLinhaDigitavel(
            linha
        );


    if (!resultado.valida) {

        mostrarMensagemLinhaDigitavel(
            campoLinha,
            resultado.mensagem,
            "#dc2626"
        );

        return;
    }


    campoLinha.value =
        resultado.linha;


    const parcela =
        campoLinha.closest(
            ".parcela-item"
        );


    if (!parcela) {

        return;
    }


    const campoValor =
        parcela.querySelector(
            ".valorBoletoParcela"
        );


    const campoVencimento =
        parcela.querySelector(
            ".dataParcelaCustomizada"
        );


    // -----------------------------------------------------
    // VALOR
    // -----------------------------------------------------

    if (
        campoValor &&
        resultado.valor > 0
    ) {

        campoValor.value =
            resultado.valor
                .toFixed(2)
                .replace(
                    ".",
                    ","
                );
    }


    // -----------------------------------------------------
    // VENCIMENTO
    // -----------------------------------------------------

    if (
        campoVencimento &&
        resultado.vencimento
    ) {

        campoVencimento.value =
            resultado.vencimento;
    }


    // -----------------------------------------------------
    // MENSAGEM
    // -----------------------------------------------------

    if (
        resultado.valor > 0 &&
        resultado.vencimento
    ) {

        mostrarMensagemLinhaDigitavel(
            campoLinha,
            "Linha digitável válida. DVs conferidos. Valor e vencimento preenchidos automaticamente.",
            "#16a34a"
        );

    } else if (
        resultado.vencimento
    ) {

        mostrarMensagemLinhaDigitavel(
            campoLinha,
            "Linha digitável válida. DVs conferidos. Vencimento preenchido automaticamente.",
            "#16a34a"
        );

    } else {

        mostrarMensagemLinhaDigitavel(
            campoLinha,
            "Linha digitável válida. DVs conferidos.",
            "#16a34a"
        );
    }
}


// =========================================================
// EVENTO DA LINHA DIGITÁVEL
// =========================================================

document.addEventListener(
    "input",
    evento => {

        if (
            evento.target &&
            evento.target.classList.contains(
                "linhaDigitavelParcela"
            )
        ) {

            preencherPelaLinhaDigitavel(
                evento.target
            );
        }
    }
);


// =========================================================
// VALIDAR LINHA AO SAIR DO CAMPO
// =========================================================

document.addEventListener(
    "focusout",
    evento => {

        if (
            !evento.target ||
            !evento.target.classList.contains(
                "linhaDigitavelParcela"
            )
        ) {

            return;
        }


        const linha =
            somenteNumerosLinhaDigitavel(
                evento.target.value
            );


        /*
         * A linha digitável continua opcional.
         */

        if (!linha) {

            return;
        }


        if (
            linha.length !== 47
        ) {

            mostrarMensagemLinhaDigitavel(
                evento.target,
                "A linha digitável deve possuir 47 números.",
                "#dc2626"
            );

            return;
        }


        preencherPelaLinhaDigitavel(
            evento.target
        );
    }
);


// =========================================================
// FORMATAR STATUS
// =========================================================


function obterClasseStatus(status) {
    const statusNormalizado = normalizarTexto(status);

    if (statusNormalizado === "pago") {
        return "paid";
    }

    if (statusNormalizado === "vencido") {
        return "overdue";
    }

    if (statusNormalizado === "baixa") {
        return "collection-status";
    }

    return "pending";
}

// =========================================================
// RENDERIZAR TABELA DE BOLETOS
// =========================================================

function renderizarTabelaBoletos(
    boletos = listaBoletosGlobal
) {

    if (!listaBoletos) {

        return;
    }


    listaBoletos.innerHTML = "";


    if (
        !boletos ||
        boletos.length === 0
    ) {

        listaBoletos.innerHTML = `
            <tr>
                <td
                    colspan="9"
                    style="
                        text-align:center;
                        padding:20px;
                        color:#64748b;
                    "
                >
                    Nenhum boleto encontrado.
                </td>
            </tr>
        `;

        return;
    }


    boletos.forEach(
        boleto => {

            const tr =
                document.createElement(
                    "tr"
                );


            const status =
                calcularStatusAutomatico(
                    boleto.vencimento,
                    boleto.status
                );


            const classeStatus =
                obterClasseStatus(
                    status
                );


            // =================================================
            // BOTÕES
            // =================================================

            let botoes = "";


            /*
             * VENDEDOR:
             * somente consulta.
             */

            if (!ehVendedor()) {

                botoes += `
                    <button
                        type="button"
                        class="btn-editar-boleto"
                        onclick="prepararEdicaoBoleto(${boleto.id})"
                        title="Editar boleto"
                    >
                        ✏️
                    </button>
                `;
            }


            // =================================================
            // CHECKBOX
            // =================================================

            let checkbox = "";


            if (!ehVendedor()) {

                checkbox = `
                    <input
                        type="checkbox"
                        class="checkbox-boleto"
                        value="${boleto.id}"
                    >
                `;

            } else {

                checkbox = "";
            }


            tr.innerHTML = `

                <td>
                    ${checkbox}
                </td>

                <td>
                    ${boleto.id || ""}
                </td>

                <td>
                    ${boleto.razao_social || ""}
                </td>

                <td>
                    ${boleto.num_boleto || ""}
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
                        class="${classeStatus}"
                    >
                        ${status}
                    </span>
                </td>

                <td>
                    ${botoes}
                </td>
            `;


            listaBoletos.appendChild(
                tr
            );
        }
    );
}


// =========================================================
// CARREGAR BOLETOS
// =========================================================

async function carregarBoletos() {

    try {

        const resposta =
            await fetch(
                `${API_URL}/api/boletos`,
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
                "Erro ao carregar boletos."
            );
        }


        let boletos =
            await resposta.json();


        if (
            !Array.isArray(
                boletos
            )
        ) {

            boletos = [];
        }


        /*
         * O backend já faz o filtro do vendedor.
         *
         * Esta segunda verificação mantém
         * a proteção também no front-end.
         */

        if (ehVendedor()) {

            boletos =
                boletos.filter(
                    boleto =>
                        boletoPertenceAoVendedor(
                            boleto
                        )
                );
        }


        /*
         * Atualizar status visual.
         *
         * Pago e Baixa são preservados.
         */

        listaBoletosGlobal =
            boletos.map(
                boleto => {

                    return {

                        ...boleto,

                        status:
                            calcularStatusAutomatico(
                                boleto.vencimento,
                                boleto.status
                            )
                    };
                }
            );


        renderizarTabelaBoletos(
            listaBoletosGlobal
        );


    } catch (erro) {

        console.error(
            "Erro ao carregar boletos:",
            erro
        );


        if (listaBoletos) {

            listaBoletos.innerHTML = `
                <tr>
                    <td
                        colspan="9"
                        style="
                            text-align:center;
                            padding:20px;
                            color:#dc2626;
                        "
                    >
                        Não foi possível carregar os boletos.
                    </td>
                </tr>
            `;
        }
    }
}


// =========================================================
// VALIDAR CLIENTE DO BOLETO
// =========================================================

function validarClienteBoleto() {

    const nomeCliente =
        obterValor(
            "razaoSocialBoleto"
        );


    if (!nomeCliente) {

        alert(
            "Selecione um cliente."
        );

        return null;
    }


    const cliente =
        encontrarCliente(
            nomeCliente
        );


    if (!cliente) {

        alert(
            "Selecione um cliente válido da lista."
        );

        return null;
    }


    if (
        ehVendedor() &&
        !clientePertenceAoVendedor(
            cliente
        )
    ) {

        alert(
            "Você não possui acesso a este cliente."
        );

        return null;
    }


    return cliente;
}


// =========================================================
// SALVAR BOLETO
// =========================================================

if (formBoleto) {

    formBoleto.addEventListener(
        "submit",
        async evento => {

            evento.preventDefault();


            // =================================================
            // BLOQUEIO DO VENDEDOR
            // =================================================

            if (ehVendedor()) {

                alert(
                    "O vendedor não possui permissão para cadastrar ou editar boletos."
                );

                return;
            }


            // =================================================
            // CLIENTE
            // =================================================

            const cliente =
                validarClienteBoleto();


            if (!cliente) {

                return;
            }


            // =================================================
            // DATA DE EMISSÃO
            // =================================================

            const dataEmissao =
                obterValor(
                    "dataEmissao"
                ) ||
                obterValor(
                    "dataEmissaoBoleto"
                );


            if (!dataEmissao) {

                alert(
                    "Informe a data de emissão."
                );

                return;
            }


            // =================================================
            // INSTRUÇÕES / OBSERVAÇÕES
            // =================================================

            const instrucoes =
                obterValor(
                    "instrucoes"
                ) ||
                obterValor(
                    "observacoesBoleto"
                ) ||
                obterValor(
                    "observacaoBoleto"
                );


            // =================================================
            // CAMPOS DOS BOLETOS
            // =================================================

            const linhasDigitaveis =
                document.querySelectorAll(
                    ".linhaDigitavelParcela"
                );


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
                numeros.length === 0 ||
                valores.length === 0 ||
                vencimentos.length === 0
            ) {

                alert(
                    "Nenhum boleto foi informado."
                );

                return;
            }


            const boletos = [];


            // =================================================
            // MONTAR CADA BOLETO
            // =================================================

            for (
                let i = 0;
                i < numeros.length;
                i++
            ) {

                const numero =
                    String(
                        numeros[i]
                            ? numeros[i].value
                            : ""
                    ).trim();


                const valorTexto =
                    String(
                        valores[i]
                            ? valores[i].value
                            : ""
                    ).trim();


                const valor =
                    converterMoedaParaNumero(
                        valorTexto
                    );


                const vencimento =
                    vencimentos[i]
                        ? vencimentos[i].value
                        : "";


                const linhaDigitavel =
                    linhasDigitaveis[i]
                        ? somenteNumerosLinhaDigitavel(
                            linhasDigitaveis[i].value
                        )
                        : "";


                // ---------------------------------------------
                // NÚMERO
                // ---------------------------------------------

                if (!numero) {

                    alert(
                        `Informe o número do boleto ${i + 1}.`
                    );

                    return;
                }


                // ---------------------------------------------
                // VALOR
                // ---------------------------------------------

                if (
                    !valor ||
                    valor <= 0
                ) {

                    alert(
                        `Informe um valor válido para o boleto ${i + 1}.`
                    );

                    return;
                }


                // ---------------------------------------------
                // VENCIMENTO
                // ---------------------------------------------

                if (!vencimento) {

                    alert(
                        `Informe o vencimento do boleto ${i + 1}.`
                    );

                    return;
                }


                // ---------------------------------------------
                // LINHA DIGITÁVEL
                // ---------------------------------------------
                // Não é obrigatória.
                //
                // Se for informada:
                // - deve possuir 47 números;
                // - DV do campo 1 deve ser válido;
                // - DV do campo 2 deve ser válido;
                // - DV do campo 3 deve ser válido;
                // - DV geral também deve ser válido.
                // ---------------------------------------------

                if (linhaDigitavel) {

                    if (
                        linhaDigitavel.length !== 47
                    ) {

                        alert(
                            `A linha digitável do boleto ${i + 1} deve possuir 47 números.`
                        );

                        return;
                    }


                    if (
                        !validarLinhaDigitavel47(
                            linhaDigitavel
                        )
                    ) {

                        alert(
                            `A linha digitável do boleto ${i + 1} é inválida. Verifique os dígitos verificadores (DVs).`
                        );

                        return;
                    }
                }


                // ---------------------------------------------
                // STATUS
                // ---------------------------------------------

                let status =
                    boletoEmEdicao
                        ? boletoEmEdicao.status
                        : "Pendente";


                status =
                    calcularStatusAutomatico(
                        vencimento,
                        status
                    );


                // ---------------------------------------------
                // OBJETO DO BOLETO
                // ---------------------------------------------

                boletos.push({

                    razao_social:
                        cliente.razao_social ||
                        cliente.nome_fantasia ||
                        "",

                    num_boleto:
                        numero,

                    linha_digitavel:
                        linhaDigitavel || null,

                    valor:
                        valor,

                    data_emissao:
                        dataEmissao,

                    vencimento:
                        vencimento,

                    vendedor:
                        cliente.vendedor || "",

                    status:
                        status,

                    motivo_baixa:
                        boletoEmEdicao
                            ? boletoEmEdicao.motivo_baixa
                            : null,

                    instrucoes:
                        instrucoes,

                    usuario_logado:
                        usuarioLogado.nome ||
                        usuarioLogado.usuario ||
                        "Sistema"
                });
            }


            // =================================================
            // DESABILITAR BOTÃO DURANTE SALVAMENTO
            // =================================================

            if (btnSalvarBoleto) {

                btnSalvarBoleto.disabled =
                    true;


                btnSalvarBoleto.textContent =
                    boletoEmEdicaoId
                        ? "Salvando..."
                        : "Cadastrando...";
            }


            try {

                // =================================================
                // EDIÇÃO
                // =================================================

                if (boletoEmEdicaoId) {

                    /*
                     * Durante a edição existe apenas
                     * um boleto no formulário.
                     */

                    const dados =
                        boletos[0];


                    const resposta =
                        await fetch(
                            `${API_URL}/api/boletos/${boletoEmEdicaoId}`,
                            {
                                method:
                                    "PUT",

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
                            "Erro ao atualizar boleto."
                        );
                    }


                    alert(
                        retorno.mensagem ||
                        "Boleto atualizado com sucesso."
                    );


                // =================================================
                // CADASTRO DE UM BOLETO
                // =================================================

                } else if (
                    boletos.length === 1
                ) {

                    const resposta =
                        await fetch(
                            `${API_URL}/api/boletos`,
                            {
                                method:
                                    "POST",

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
                        retorno.mensagem ||
                        "Boleto cadastrado com sucesso."
                    );


                // =================================================
                // CADASTRO DE VÁRIOS BOLETOS
                // =================================================

                } else {

                    const resposta =
                        await fetch(
                            `${API_URL}/api/boletos/lote`,
                            {
                                method:
                                    "POST",

                                headers:
                                    obterHeadersAPI(),

                                body:
                                    JSON.stringify({
                                        boletos:
                                            boletos
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
                            "Erro ao cadastrar os boletos."
                        );
                    }


                    alert(
                        retorno.mensagem ||
                        `${boletos.length} boletos cadastrados com sucesso.`
                    );
                }


                // =================================================
                // FINALIZAR
                // =================================================

                fecharFormulario();


                await carregarBoletos();


            } catch (erro) {

                console.error(
                    "Erro ao salvar boleto:",
                    erro
                );


                alert(
                    erro.message ||
                    "Não foi possível salvar o boleto."
                );


            } finally {

                if (btnSalvarBoleto) {

                    btnSalvarBoleto.disabled =
                        false;


                    btnSalvarBoleto.textContent =
                        boletoEmEdicaoId
                            ? "Salvar Alterações"
                            : "Salvar Boleto";
                }
            }
        }
    );
}


// =========================================================
// PREPARAR EDIÇÃO DO BOLETO
// =========================================================

window.prepararEdicaoBoleto =
    function (id) {

        // =================================================
        // VENDEDOR NÃO PODE EDITAR
        // =================================================

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


        // =================================================
        // DATA DE EMISSÃO
        // =================================================

        preencherCampo(
            "dataEmissao",
            dataParaInput(
                boleto.data_emissao
            )
        );


        preencherCampo(
            "dataEmissaoBoleto",
            dataParaInput(
                boleto.data_emissao
            )
        );


        // =================================================
        // OBSERVAÇÃO / INSTRUÇÕES
        // =================================================

        preencherCampo(
            "instrucoes",
            boleto.instrucoes || ""
        );


        preencherCampo(
            "observacoesBoleto",
            boleto.instrucoes || ""
        );


        preencherCampo(
            "observacaoBoleto",
            boleto.instrucoes || ""
        );


        // =================================================
        // NA EDIÇÃO EXISTE APENAS UM BOLETO
        // =================================================

        if (qtdParcelas) {

            qtdParcelas.value =
                1;


            qtdParcelas.disabled =
                true;
        }


        /*
         * Cria novamente os campos:
         *
         * Linha Digitável
         * Número
         * Valor
         * Vencimento
         */

        criarCamposParcelas();


        // =================================================
        // LINHA DIGITÁVEL
        // =================================================

        const campoLinhaDigitavel =
            document.querySelector(
                ".linhaDigitavelParcela"
            );


        if (campoLinhaDigitavel) {

            campoLinhaDigitavel.value =
                boleto.linha_digitavel ||
                "";
        }


        // =================================================
        // NÚMERO DO BOLETO
        // =================================================

        const campoNumero =
            document.querySelector(
                ".numeroBoletoParcela"
            );


        if (campoNumero) {

            campoNumero.value =
                boleto.num_boleto ||
                "";
        }


        // =================================================
        // VALOR
        // =================================================

        const campoValor =
            document.querySelector(
                ".valorBoletoParcela"
            );


        if (campoValor) {

            campoValor.value =
                Number(
                    boleto.valor || 0
                )
                    .toFixed(2)
                    .replace(
                        ".",
                        ","
                    );
        }


        // =================================================
        // VENCIMENTO
        // =================================================

        const campoVencimento =
            document.querySelector(
                ".dataParcelaCustomizada"
            );


        if (campoVencimento) {

            campoVencimento.value =
                dataParaInput(
                    boleto.vencimento
                );
        }


        // =================================================
        // MENSAGEM DA LINHA DIGITÁVEL
        // =================================================

        if (
            campoLinhaDigitavel &&
            boleto.linha_digitavel
        ) {

            mostrarMensagemLinhaDigitavel(
                campoLinhaDigitavel,
                "Linha digitável cadastrada.",
                "#16a34a"
            );
        }


        // =================================================
        // TÍTULO
        // =================================================

        if (tituloPainelBoleto) {

            tituloPainelBoleto.textContent =
                "Editar Boleto";
        }


        if (btnSalvarBoleto) {

            btnSalvarBoleto.textContent =
                "Salvar Alterações";
        }


        // =================================================
        // ABRIR FORMULÁRIO
        // =================================================

        mostrarFormulario();
    };


// =========================================================
// SELECIONAR TODOS
// =========================================================

if (selecionarTodos) {

    selecionarTodos.addEventListener(
        "change",
        () => {

            if (ehVendedor()) {

                selecionarTodos.checked =
                    false;

                return;
            }


            const checkboxes =
                document.querySelectorAll(
                    ".checkbox-boleto"
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
// OBTER BOLETOS SELECIONADOS
// =========================================================

function obterIdsBoletosSelecionados() {

    return Array.from(
        document.querySelectorAll(
            ".checkbox-boleto:checked"
        )
    )
        .map(
            checkbox =>
                Number(
                    checkbox.value
                )
        )
        .filter(
            id =>
                !Number.isNaN(id)
        );
}
// =========================================================
// FILTRAR BOLETOS
// =========================================================

function filtrarBoletos() {

    const cliente =
        normalizarTexto(
            filtroCliente
                ? filtroCliente.value
                : ""
        );


    const numero =
        normalizarTexto(
            filtroNumero
                ? filtroNumero.value
                : ""
        );


    const status =
        normalizarTexto(
            filtroStatus
                ? filtroStatus.value
                : ""
        );


    const boletosFiltrados =
        listaBoletosGlobal.filter(
            boleto => {

                const clienteBoleto =
                    normalizarTexto(
                        boleto.razao_social
                    );


                const numeroBoleto =
                    normalizarTexto(
                        boleto.num_boleto
                    );


                const statusBoleto =
                    normalizarTexto(
                        calcularStatusAutomatico(
                            boleto.vencimento,
                            boleto.status
                        )
                    );


                const correspondeCliente =
                    !cliente ||
                    clienteBoleto.includes(
                        cliente
                    );


                const correspondeNumero =
                    !numero ||
                    numeroBoleto.includes(
                        numero
                    );


                const correspondeStatus =
                    !status ||
                    statusBoleto ===
                    status;


                return (
                    correspondeCliente &&
                    correspondeNumero &&
                    correspondeStatus
                );
            }
        );


    renderizarTabelaBoletos(
        boletosFiltrados
    );
}


// =========================================================
// EVENTOS DOS FILTROS
// =========================================================

if (filtroCliente) {

    filtroCliente.addEventListener(
        "input",
        filtrarBoletos
    );
}


if (filtroNumero) {

    filtroNumero.addEventListener(
        "input",
        filtrarBoletos
    );
}


if (filtroStatus) {

    filtroStatus.addEventListener(
        "change",
        filtrarBoletos
    );
}


// =========================================================
// LIMPAR FILTROS
// =========================================================

const btnLimparFiltros =
    document.getElementById(
        "btnLimparFiltros"
    );


if (btnLimparFiltros) {

    btnLimparFiltros.addEventListener(
        "click",
        () => {

            if (filtroCliente) {

                filtroCliente.value =
                    "";
            }


            if (filtroNumero) {

                filtroNumero.value =
                    "";
            }


            if (filtroStatus) {

                filtroStatus.value =
                    "";
            }


            renderizarTabelaBoletos(
                listaBoletosGlobal
            );
        }
    );
}


// =========================================================
// LOCALIZAR BOLETO PELO ID
// =========================================================

function encontrarBoletoPorId(id) {

    return (
        listaBoletosGlobal.find(
            boleto =>
                Number(boleto.id) ===
                Number(id)
        ) || null
    );
}


// =========================================================
// ALTERAR STATUS EM LOTE
// =========================================================

async function alterarStatusEmLote(
    novoStatus
) {

    // =====================================================
    // BLOQUEIO DO VENDEDOR
    // =====================================================

    if (ehVendedor()) {

        alert(
            "O vendedor não possui permissão para alterar o status dos boletos."
        );

        return;
    }


    // =====================================================
    // BOLETOS SELECIONADOS
    // =====================================================

    const ids =
        obterIdsBoletosSelecionados();


    if (ids.length === 0) {

        alert(
            "Selecione pelo menos um boleto."
        );

        return;
    }


    // =====================================================
    // MOTIVO DA BAIXA
    // =====================================================

    let motivoBaixa = null;


    if (
        novoStatus === "Baixa"
    ) {

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


    // =====================================================
    // CONFIRMAÇÃO
    // =====================================================

    let mensagemConfirmacao = "";


    if (
        novoStatus === "Pago"
    ) {

        mensagemConfirmacao =
            ids.length === 1

                ? "Deseja marcar o boleto selecionado como Pago?"

                : `Deseja marcar os ${ids.length} boletos selecionados como Pagos?`;

    } else {

        mensagemConfirmacao =
            ids.length === 1

                ? "Deseja dar baixa no boleto selecionado?"

                : `Deseja dar baixa nos ${ids.length} boletos selecionados?`;
    }


    const confirmar =
        confirm(
            mensagemConfirmacao
        );


    if (!confirmar) {

        return;
    }


    // =====================================================
    // DESABILITAR BOTÕES
    // =====================================================

    if (btnMarcarPagosMassa) {

        btnMarcarPagosMassa.disabled =
            true;
    }


    if (btnDarBaixaMassa) {

        btnDarBaixaMassa.disabled =
            true;
    }


    let quantidadeSucesso = 0;

    let quantidadeErro = 0;


    // =====================================================
    // ATUALIZAR CADA BOLETO
    // =====================================================

    for (const id of ids) {

        const boleto =
            encontrarBoletoPorId(
                id
            );


        if (!boleto) {

            quantidadeErro++;

            continue;
        }


        /*
         * IMPORTANTE:
         *
         * Como a rota PUT do backend atualiza
         * os dados completos do boleto,
         * reenviamos todos os campos.
         *
         * A linha_digitavel também é reenviada
         * para não ser apagada quando o status
         * for alterado.
         */

        const dados = {

            razao_social:
                boleto.razao_social ||
                "",

            num_boleto:
                boleto.num_boleto ||
                "",

            // ---------------------------------------------
            // PRESERVAR LINHA DIGITÁVEL
            // ---------------------------------------------

            linha_digitavel:
                boleto.linha_digitavel ||
                null,

            valor:
                Number(
                    boleto.valor || 0
                ),

            data_emissao:
                dataParaInput(
                    boleto.data_emissao
                ),

            vencimento:
                dataParaInput(
                    boleto.vencimento
                ),

            vendedor:
                boleto.vendedor ||
                "",

            status:
                novoStatus,

            motivo_baixa:
                novoStatus === "Baixa"
                    ? motivoBaixa
                    : null,

            
            instrucoes:
                boleto.instrucoes ||
                "",

            usuario_logado:
                usuarioLogado.nome ||
                usuarioLogado.usuario ||
                "Sistema"
        };


        try {

            const resposta =
                await fetch(
                    `${API_URL}/api/boletos/${id}`,
                    {
                        method:
                            "PUT",

                        headers:
                            obterHeadersAPI(),

                        body:
                            JSON.stringify(
                                dados
                            )
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
                    `Erro ao atualizar boleto ${id}.`
                );
            }


            quantidadeSucesso++;


        } catch (erro) {

            quantidadeErro++;


            console.error(
                `Erro ao atualizar boleto ${id}:`,
                erro
            );
        }
    }


    // =====================================================
    // REATIVAR BOTÕES
    // =====================================================

    if (btnMarcarPagosMassa) {

        btnMarcarPagosMassa.disabled =
            false;
    }


    if (btnDarBaixaMassa) {

        btnDarBaixaMassa.disabled =
            false;
    }


    // =====================================================
    // RESULTADO
    // =====================================================

    if (
        quantidadeSucesso > 0 &&
        quantidadeErro === 0
    ) {

        if (
            novoStatus === "Pago"
        ) {

            alert(
                quantidadeSucesso === 1

                    ? "Boleto marcado como Pago com sucesso."

                    : `${quantidadeSucesso} boletos marcados como Pagos com sucesso.`
            );

        } else {

            alert(
                quantidadeSucesso === 1

                    ? "Baixa realizada com sucesso."

                    : `${quantidadeSucesso} boletos receberam baixa com sucesso.`
            );
        }

    } else if (
        quantidadeSucesso > 0 &&
        quantidadeErro > 0
    ) {

        alert(
            `${quantidadeSucesso} boleto(s) atualizado(s) com sucesso e ${quantidadeErro} com erro.`
        );

    } else {

        alert(
            "Não foi possível atualizar os boletos selecionados."
        );
    }


    // =====================================================
    // DESMARCAR SELEÇÃO
    // =====================================================

    if (selecionarTodos) {

        selecionarTodos.checked =
            false;
    }


    // =====================================================
    // RECARREGAR
    // =====================================================

    await carregarBoletos();
}


// =========================================================
// MARCAR COMO PAGO
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
// DAR BAIXA
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
// IMPEDIR AÇÕES DO VENDEDOR
// =========================================================

function aplicarRestricoesVendedor() {

    if (!ehVendedor()) {

        return;
    }


    // =====================================================
    // NOVO BOLETO
    // =====================================================

    if (btnNovoBoleto) {

        btnNovoBoleto.style.display =
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


    // =====================================================
    // AÇÕES EM MASSA
    // =====================================================

    if (btnMarcarPagosMassa) {

        btnMarcarPagosMassa.style.display =
            "none";
    }


    if (btnDarBaixaMassa) {

        btnDarBaixaMassa.style.display =
            "none";
    }


    // =====================================================
    // SELECIONAR TODOS
    // =====================================================

    if (selecionarTodos) {

        selecionarTodos.style.display =
            "none";
    }


    /*
     * Caso o cabeçalho da tabela tenha
     * uma célula específica para seleção,
     * mantemos apenas a estrutura da tabela.
     */
}


// =========================================================
// DESMARCAR TODOS OS BOLETOS
// =========================================================

function desmarcarTodosBoletos() {

    const checkboxes =
        document.querySelectorAll(
            ".checkbox-boleto"
        );


    checkboxes.forEach(
        checkbox => {

            checkbox.checked =
                false;
        }
    );


    if (selecionarTodos) {

        selecionarTodos.checked =
            false;
    }
}


// =========================================================
// ATUALIZAR SELECIONAR TODOS
// =========================================================

document.addEventListener(
    "change",
    evento => {

        if (
            !evento.target ||
            !evento.target.classList.contains(
                "checkbox-boleto"
            )
        ) {

            return;
        }


        if (!selecionarTodos) {

            return;
        }


        const checkboxes =
            Array.from(
                document.querySelectorAll(
                    ".checkbox-boleto"
                )
            );


        if (
            checkboxes.length === 0
        ) {

            selecionarTodos.checked =
                false;

            return;
        }


        selecionarTodos.checked =
            checkboxes.every(
                checkbox =>
                    checkbox.checked
            );
    }
);


// =========================================================
// STATUS PARA RELATÓRIO/FILTRO
// =========================================================

function obterStatusBoleto(
    boleto
) {

    if (!boleto) {

        return "Pendente";
    }


    return calcularStatusAutomatico(
        boleto.vencimento,
        boleto.status
    );
}


// =========================================================
// BOLETOS VISÍVEIS PARA O USUÁRIO
// =========================================================

function obterBoletosPermitidos() {

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
// APLICAR FILTRO DE STATUS EM UMA LISTA
// =========================================================

function filtrarListaPorStatus(
    lista,
    statusDesejado
) {

    if (!statusDesejado) {

        return lista;
    }


    const statusNormalizado =
        normalizarTexto(
            statusDesejado
        );


    return lista.filter(
        boleto => {

            return (
                normalizarTexto(
                    obterStatusBoleto(
                        boleto
                    )
                ) ===
                statusNormalizado
            );
        }
    );
}


// =========================================================
// ORDENAR BOLETOS POR VENCIMENTO
// =========================================================

function ordenarBoletosPorVencimento(
    lista
) {

    return [
        ...lista
    ].sort(
        (a, b) => {

            const dataA =
                new Date(
                    dataParaInput(
                        a.vencimento
                    ) +
                    "T00:00:00"
                );


            const dataB =
                new Date(
                    dataParaInput(
                        b.vencimento
                    ) +
                    "T00:00:00"
                );


            return (
                dataA -
                dataB
            );
        }
    );
}


// =========================================================
// TOTALIZAR BOLETOS
// =========================================================

function calcularTotalBoletos(
    lista
) {

    return lista.reduce(
        (
            total,
            boleto
        ) => {

            return (
                total +
                Number(
                    boleto.valor || 0
                )
            );
        },
        0
    );
}


// =========================================================
// RELATÓRIOS
// =========================================================

const modalRelatorio =
    document.getElementById(
        "modalRelatorio"
    );


const btnRelatorio =
    document.getElementById(
        "btnRelatorio"
    );


const btnFecharRelatorio =
    document.getElementById(
        "btnFecharRelatorio"
    );


const btnImprimirRelatorio =
    document.getElementById(
        "btnImprimirRelatorio"
    );


// =========================================================
// ABRIR RELATÓRIO
// =========================================================

function abrirRelatorio() {

    if (!modalRelatorio) {

        /*
         * Caso o HTML não possua modal,
         * imprime diretamente.
         */

        imprimirRelatorioBoletos();

        return;
    }


    modalRelatorio.style.display =
        "flex";
}


// =========================================================
// FECHAR RELATÓRIO
// =========================================================

function fecharRelatorio() {

    if (modalRelatorio) {

        modalRelatorio.style.display =
            "none";
    }
}


// =========================================================
// EVENTOS DO RELATÓRIO
// =========================================================

if (btnRelatorio) {

    btnRelatorio.addEventListener(
        "click",
        abrirRelatorio
    );
}


if (btnFecharRelatorio) {

    btnFecharRelatorio.addEventListener(
        "click",
        fecharRelatorio
    );
}


// =========================================================
// FECHAR MODAL CLICANDO FORA
// =========================================================

if (modalRelatorio) {

    modalRelatorio.addEventListener(
        "click",
        evento => {

            if (
                evento.target ===
                modalRelatorio
            ) {

                fecharRelatorio();
            }
        }
    );
}


// =========================================================
// OBTER VALOR DE CAMPO DE RELATÓRIO
// =========================================================

function obterValorCampoRelatorio(
    ids
) {

    for (const id of ids) {

        const campo =
            document.getElementById(
                id
            );


        if (
            campo &&
            campo.value
        ) {

            return campo.value;
        }
    }


    return "";
}


// =========================================================
// FILTRAR BOLETOS PARA RELATÓRIO
// =========================================================

function obterBoletosRelatorio() {

    let boletos =
        obterBoletosPermitidos();


    // =====================================================
    // DATA INICIAL
    // =====================================================

    const dataInicial =
        obterValorCampoRelatorio([
            "relatorioDataInicial",
            "dataInicialRelatorio",
            "dataInicioRelatorio"
        ]);


    // =====================================================
    // DATA FINAL
    // =====================================================

    const dataFinal =
        obterValorCampoRelatorio([
            "relatorioDataFinal",
            "dataFinalRelatorio",
            "dataFimRelatorio"
        ]);


    // =====================================================
    // STATUS
    // =====================================================

    const statusRelatorio =
        obterValorCampoRelatorio([
            "relatorioStatus",
            "statusRelatorio"
        ]);


    // =====================================================
    // CLIENTE
    // =====================================================

    const clienteRelatorio =
        obterValorCampoRelatorio([
            "relatorioCliente",
            "clienteRelatorio"
        ]);


    // =====================================================
    // FILTRO DE CLIENTE
    // =====================================================

    if (clienteRelatorio) {

        const clienteNormalizado =
            normalizarTexto(
                clienteRelatorio
            );


        boletos =
            boletos.filter(
                boleto => {

                    return normalizarTexto(
                        boleto.razao_social
                    ).includes(
                        clienteNormalizado
                    );
                }
            );
    }


    // =====================================================
    // FILTRO DE STATUS
    // =====================================================

    if (statusRelatorio) {

        boletos =
            filtrarListaPorStatus(
                boletos,
                statusRelatorio
            );
    }


    // =====================================================
    // FILTRO DE DATA
    // =====================================================

    if (dataInicial) {

        boletos =
            boletos.filter(
                boleto => {

                    const vencimento =
                        dataParaInput(
                            boleto.vencimento
                        );


                    return (
                        vencimento >=
                        dataInicial
                    );
                }
            );
    }


    if (dataFinal) {

        boletos =
            boletos.filter(
                boleto => {

                    const vencimento =
                        dataParaInput(
                            boleto.vencimento
                        );


                    return (
                        vencimento <=
                        dataFinal
                    );
                }
            );
    }


    return ordenarBoletosPorVencimento(
        boletos
    );
}


// =========================================================
// ESCAPAR HTML PARA RELATÓRIO
// =========================================================

function escaparHTML(valor) {

    return String(
        valor ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}


// =========================================================
// GERAR LINHAS DO RELATÓRIO
// =========================================================

function gerarLinhasRelatorio(
    boletos
) {

    if (
        !boletos ||
        boletos.length === 0
    ) {

        return `
            <tr>
                <td
                    colspan="6"
                    style="
                        text-align:center;
                        padding:15px;
                    "
                >
                    Nenhum boleto encontrado.
                </td>
            </tr>
        `;
    }


    return boletos
        .map(
            boleto => {

                const status =
                    obterStatusBoleto(
                        boleto
                    );


                return `
                    <tr>

                        <td>
                            ${escaparHTML(
                                boleto.razao_social
                            )}
                        </td>

                        <td>
                            ${escaparHTML(
                                boleto.num_boleto
                            )}
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
                            ${escaparHTML(
                                status
                            )}
                        </td>
                    </tr>
                `;
            }
        )
        .join("");
}
// =========================================================
// IMPRIMIR RELATÓRIO DE BOLETOS
// =========================================================

function imprimirRelatorioBoletos() {

    const boletos =
        obterBoletosRelatorio();


    if (
        boletos.length === 0
    ) {

        alert(
            "Nenhum boleto encontrado para o relatório."
        );

        return;
    }


    const total =
        calcularTotalBoletos(
            boletos
        );


    const quantidade =
        boletos.length;


    const nomeUsuario =
        usuarioLogado.nome ||
        usuarioLogado.usuario ||
        "Usuário";


    const perfilUsuario =
        usuarioLogado.permissao ||
        "";


    const agora =
        new Date();


    const dataGeracao =
        agora.toLocaleDateString(
            "pt-BR"
        );


    const horaGeracao =
        agora.toLocaleTimeString(
            "pt-BR",
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );


    const janela =
        window.open(
            "",
            "_blank"
        );


    if (!janela) {

        alert(
            "Não foi possível abrir a janela de impressão. Verifique se o navegador bloqueou pop-ups."
        );

        return;
    }


    const linhas =
        gerarLinhasRelatorio(
            boletos
        );


    janela.document.write(`
        <!DOCTYPE html>

        <html lang="pt-BR">

        <head>

            <meta charset="UTF-8">

            <title>
                Relatório de Boletos
            </title>

            <style>

                * {
                    box-sizing: border-box;
                }

                body {
                    font-family:
                        Arial,
                        Helvetica,
                        sans-serif;
                    margin: 30px;
                    color: #1e293b;
                }

                h1 {
                    margin: 0 0 5px 0;
                    font-size: 22px;
                }

                .subtitulo {
                    color: #64748b;
                    margin-bottom: 20px;
                }

                .informacoes {
                    display: flex;
                    justify-content: space-between;
                    gap: 20px;
                    margin-bottom: 20px;
                    font-size: 12px;
                }

                .resumo {
                    display: flex;
                    gap: 15px;
                    margin-bottom: 20px;
                }

                .card {
                    border: 1px solid #cbd5e1;
                    border-radius: 6px;
                    padding: 10px 15px;
                    min-width: 160px;
                }

                .card span {
                    display: block;
                    color: #64748b;
                    font-size: 11px;
                    margin-bottom: 4px;
                }

                .card strong {
                    font-size: 16px;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 11px;
                }

                th,
                td {
                    border: 1px solid #cbd5e1;
                    padding: 8px;
                    text-align: left;
                }

                th {
                    background: #f1f5f9;
                }

                .rodape {
                    margin-top: 20px;
                    color: #64748b;
                    font-size: 10px;
                }

                @media print {

                    body {
                        margin: 10px;
                    }

                    .nao-imprimir {
                        display: none;
                    }
                }

            </style>

        </head>

        <body>

            <h1>
                ControleBoleto
            </h1>

            <div class="subtitulo">
                Relatório de Boletos
            </div>


            <div class="informacoes">

                <div>
                    <strong>Usuário:</strong>
                    ${escaparHTML(
                        nomeUsuario
                    )}

                    <br>

                    <strong>Perfil:</strong>
                    ${escaparHTML(
                        perfilUsuario
                    )}
                </div>


                <div>
                    <strong>Gerado em:</strong>
                    ${dataGeracao}
                    às
                    ${horaGeracao}
                </div>

            </div>


            <div class="resumo">

                <div class="card">

                    <span>
                        Quantidade de boletos
                    </span>

                    <strong>
                        ${quantidade}
                    </strong>

                </div>


                <div class="card">

                    <span>
                        Valor total
                    </span>

                    <strong>
                        ${formatarMoeda(
                            total
                        )}
                    </strong>

                </div>

            </div>


            <table>

                <thead>

                    <tr>

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


            <div class="rodape">

                ControleBoleto —
                Sistema Web para Controle de Boletos e Cobranças.

            </div>

        </body>

        </html>
    `);


    janela.document.close();


    janela.focus();


    setTimeout(
        () => {

            janela.print();
        },
        300
    );
}


// =========================================================
// BOTÃO IMPRIMIR RELATÓRIO
// =========================================================

if (btnImprimirRelatorio) {

    btnImprimirRelatorio.addEventListener(
        "click",
        imprimirRelatorioBoletos
    );
}


// =========================================================
// COMPATIBILIDADE COM BOTÕES DE RELATÓRIO
// =========================================================

const btnRelatorioAgendados =
    document.getElementById(
        "btnRelatorioAgendados"
    );


const btnRelatorioClientes =
    document.getElementById(
        "btnRelatorioClientes"
    );


if (btnRelatorioAgendados) {

    btnRelatorioAgendados.addEventListener(
        "click",
        () => {

            imprimirRelatorioBoletos();
        }
    );
}


if (btnRelatorioClientes) {

    btnRelatorioClientes.addEventListener(
        "click",
        () => {

            imprimirRelatorioBoletos();
        }
    );
}


// =========================================================
// APLICAR PERMISSÕES DA PÁGINA
// =========================================================

function aplicarPermissoesPagina() {

    const permissao =
        obterPermissaoUsuario();


    // =====================================================
    // ADMINISTRADOR
    // =====================================================

    if (
        permissao ===
        "administrador"
    ) {

        return;
    }


    // =====================================================
    // OPERADOR
    // =====================================================

    if (
        permissao ===
        "operador"
    ) {

        return;
    }


    // =====================================================
    // VENDEDOR
    // =====================================================

    if (
        permissao ===
        "vendedor"
    ) {

        aplicarRestricoesVendedor();

        return;
    }


    console.warn(
        "Permissão não reconhecida:",
        usuarioLogado.permissao
    );
}


// =========================================================
// AJUSTAR TELA INICIAL
// =========================================================

function prepararTelaInicial() {

    // =====================================================
    // FORMULÁRIO COMEÇA FECHADO
    // =====================================================

    if (painelCadastroBoleto) {

        painelCadastroBoleto.style.display =
            "none";
    }


    // =====================================================
    // TABELA VISÍVEL
    // =====================================================

    if (secaoTabela) {

        secaoTabela.style.display =
            "block";
    }


    if (secaoFiltros) {

        secaoFiltros.style.display =
            "block";
    }


    // =====================================================
    // CAMPOS INICIAIS DO BOLETO
    // =====================================================

    if (qtdParcelas) {

        if (
            !qtdParcelas.value ||
            Number(
                qtdParcelas.value
            ) < 1
        ) {

            qtdParcelas.value =
                1;
        }
    }


    criarCamposParcelas();
}


// =========================================================
// INICIALIZAÇÃO
// =========================================================

async function inicializarPaginaBoletos() {

    try {

        // =================================================
        // USUÁRIO
        // =================================================

        atualizarUsuarioNaTela();


        // =================================================
        // TELA
        // =================================================

        prepararTelaInicial();


        // =================================================
        // PERMISSÕES
        // =================================================

        aplicarPermissoesPagina();


        // =================================================
        // CLIENTES
        // =================================================

        await carregarClientes();


        // =================================================
        // BOLETOS
        // =================================================

        await carregarBoletos();


        // =================================================
        // GARANTIR RESTRIÇÕES DO VENDEDOR
        // =================================================

        if (ehVendedor()) {

            aplicarRestricoesVendedor();
        }


    } catch (erro) {

        console.error(
            "Erro ao inicializar página de boletos:",
            erro
        );
    }
}


// =========================================================
// EXECUTAR
// =========================================================

inicializarPaginaBoletos();