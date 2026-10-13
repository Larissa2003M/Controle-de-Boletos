// =========================================================
// CONFIGURAÇÃO DA API
// =========================================================

const API_URL = "http://localhost:3000";


// =========================================================
// USUÁRIO LOGADO
// =========================================================

let usuarioLogado = {};

try {

    usuarioLogado = JSON.parse(
        localStorage.getItem("usuario") ||
        localStorage.getItem("usuarioLogado") ||
        "{}"
    );

} catch (erro) {

    console.error(
        "Erro ao ler usuário do localStorage:",
        erro
    );

    usuarioLogado = {};
}


// =========================================================
// ELEMENTOS
// =========================================================

const painelCadastroCliente =
    document.getElementById(
        "painelCadastroCliente"
    );

const formCliente =
    document.getElementById(
        "formCliente"
    );

const listaClientes =
    document.getElementById(
        "listaClientes"
    );

const btnNovoCliente =
    document.getElementById(
        "btnNovoCliente"
    );

const cancelarCliente =
    document.getElementById(
        "cancelarCliente"
    );

const btnVoltarCliente =
    document.getElementById(
        "btnVoltarCliente"
    );

const btnExcluirSelecionados =
    document.getElementById(
        "btnExcluirSelecionados"
    );

const btnEditarSelecionado =
    document.getElementById(
        "btnEditarSelecionado"
    );

const selecionarTodos =
    document.getElementById(
        "selecionarTodos"
    );

const secaoFiltros =
    document.getElementById(
        "secaoFiltros"
    );

const secaoTabela =
    document.getElementById(
        "secaoTabela"
    );

const botoesAcaoTopo =
    document.getElementById(
        "botoesAcaoTopo"
    );


// =========================================================
// FILTROS
// =========================================================

const filtroCodigo =
    document.getElementById(
        "filtroCodigo"
    );

const filtroRazaoSocial =
    document.getElementById(
        "filtroRazaoSocial"
    );

const filtroCnpj =
    document.getElementById(
        "filtroCnpj"
    );

const filtroVendedor =
    document.getElementById(
        "filtroVendedor"
    );


// =========================================================
// VARIÁVEIS
// =========================================================

let listaClientesGlobal = [];

let clienteEmEdicaoId = null;


// =========================================================
// INICIAR PÁGINA
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        atualizarMenuUsuario();

        configurarLogout();

        configurarMascaras();

        carregarClientes();

        carregarVendedoresSelect();
    }
);


// =========================================================
// MENU DO USUÁRIO
// =========================================================

function atualizarMenuUsuario() {

    try {

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


        if (usuarioLogado.nome) {

            if (userName) {

                userName.textContent =
                    usuarioLogado.nome;
            }


            if (userRole) {

                userRole.textContent =
                    usuarioLogado.permissao ||
                    "Usuário";
            }


            if (userAvatar) {

                userAvatar.textContent =
                    usuarioLogado.nome
                        .charAt(0)
                        .toUpperCase();
            }
        }


        // Vendedor não vê gerenciamento de usuários

        if (
            usuarioLogado.permissao &&
            usuarioLogado.permissao
                .toLowerCase() ===
                "vendedor"
        ) {

            const linkUsuarios =
                document.querySelector(
                    'a[href*="usuarios.html"]'
                );

            if (linkUsuarios) {

                linkUsuarios.style.display =
                    "none";
            }
        }


    } catch (erro) {

        console.error(
            "Erro ao atualizar menu:",
            erro
        );
    }
}


// =========================================================
// LOGOUT
// =========================================================

function configurarLogout() {

    const btnLogout =
        document.getElementById(
            "btnLogout"
        ) ||
        document.querySelector(
            ".logout"
        );


    if (!btnLogout) {
        return;
    }


    btnLogout.onclick = () => {

        localStorage.removeItem(
            "usuario"
        );

        localStorage.removeItem(
            "usuarioLogado"
        );

        window.location.href =
            "login.html";
    };
}


// =========================================================
// MÁSCARAS
// =========================================================

function configurarMascaras() {

    const inputCnpj =
        document.getElementById(
            "cnpj"
        );

    const inputTelefone =
        document.getElementById(
            "telefone"
        );

    const inputInscricao =
        document.getElementById(
            "inscricao_estadual"
        );

    const inputNumero =
        document.getElementById(
            "numero"
        );

    const inputCep =
        document.getElementById(
            "cep"
        );


    // CNPJ

    if (inputCnpj) {

        inputCnpj.addEventListener(
            "input",
            e => {

                let v =
                    e.target.value
                        .replace(
                            /\D/g,
                            ""
                        );


                if (v.length > 14) {

                    v =
                        v.substring(
                            0,
                            14
                        );
                }


                v = v.replace(
                    /^(\d{2})(\d)/,
                    "$1.$2"
                );

                v = v.replace(
                    /^(\d{2})\.(\d{3})(\d)/,
                    "$1.$2.$3"
                );

                v = v.replace(
                    /\.(\d{3})(\d)/,
                    ".$1/$2"
                );

                v = v.replace(
                    /(\d{4})(\d)/,
                    "$1-$2"
                );


                e.target.value = v;
            }
        );
    }


    // TELEFONE

    if (inputTelefone) {

        inputTelefone.addEventListener(
            "input",
            e => {

                let v =
                    e.target.value
                        .replace(
                            /\D/g,
                            ""
                        );


                if (v.length > 11) {

                    v =
                        v.substring(
                            0,
                            11
                        );
                }


                if (v.length > 10) {

                    v = v.replace(
                        /^(\d{2})(\d{5})(\d{4}).*/,
                        "($1) $2-$3"
                    );

                } else if (
                    v.length > 6
                ) {

                    v = v.replace(
                        /^(\d{2})(\d{4})(\d{0,4}).*/,
                        "($1) $2-$3"
                    );

                } else if (
                    v.length > 2
                ) {

                    v = v.replace(
                        /^(\d{2})(\d{0,5})/,
                        "($1) $2"
                    );

                } else if (
                    v.length > 0
                ) {

                    v = v.replace(
                        /^(\d*)/,
                        "($1"
                    );
                }


                e.target.value = v;
            }
        );
    }


    // INSCRIÇÃO ESTADUAL

    if (inputInscricao) {

        inputInscricao.addEventListener(
            "input",
            e => {

                e.target.value =
                    e.target.value
                        .replace(
                            /\D/g,
                            ""
                        );
            }
        );
    }


    // NÚMERO

    if (inputNumero) {

        inputNumero.addEventListener(
            "input",
            e => {

                e.target.value =
                    e.target.value
                        .replace(
                            /\D/g,
                            ""
                        );
            }
        );
    }


    // CEP

    if (inputCep) {

        inputCep.addEventListener(
            "input",
            e => {

                let v =
                    e.target.value
                        .replace(
                            /\D/g,
                            ""
                        );


                if (v.length > 8) {

                    v =
                        v.substring(
                            0,
                            8
                        );
                }


                if (v.length > 5) {

                    v = v.replace(
                        /^(\d{5})(\d)/,
                        "$1-$2"
                    );
                }


                e.target.value = v;
            }
        );
    }
}


// =========================================================
// MOSTRAR FORMULÁRIO
// =========================================================

function mostrarFormulario() {

    if (secaoFiltros) {

        secaoFiltros.style.display =
            "none";
    }


    if (secaoTabela) {

        secaoTabela.style.display =
            "none";
    }


    if (botoesAcaoTopo) {

        botoesAcaoTopo.style.display =
            "none";
    }


    if (painelCadastroCliente) {

        painelCadastroCliente.style.display =
            "block";
    }
}


// =========================================================
// OCULTAR FORMULÁRIO
// =========================================================

function ocultarFormulario() {

    if (painelCadastroCliente) {

        painelCadastroCliente.style.display =
            "none";
    }


    if (secaoFiltros) {

        secaoFiltros.style.display =
            "block";
    }


    if (secaoTabela) {

        secaoTabela.style.display =
            "block";
    }


    if (botoesAcaoTopo) {

        botoesAcaoTopo.style.display =
            "flex";
    }


    if (formCliente) {

        formCliente.reset();
    }


    clienteEmEdicaoId = null;
}


// =========================================================
// CARREGAR VENDEDORES
// =========================================================

async function carregarVendedoresSelect() {

    try {

        if (
            !usuarioLogado ||
            !usuarioLogado.id
        ) {

            console.error(
                "Usuário logado não encontrado."
            );

            return;
        }


        const resposta =
            await fetch(
                `${API_URL}/api/usuarios`,
                {
                    method: "GET",

                    headers: {

                        "x-usuario-id":
                            String(
                                usuarioLogado.id
                            )
                    }
                }
            );


        const resultado =
            await resposta.json();


        if (!resposta.ok) {

            throw new Error(
                resultado.erro ||
                "Erro ao carregar usuários."
            );
        }


        const usuarios =
            Array.isArray(resultado)
                ? resultado
                : [];


        const selectVendedorForm =
            document.getElementById(
                "vendedor"
            );


        const filtroVendedorSelect =
            document.getElementById(
                "filtroVendedor"
            );


        // Apenas usuários ativos
        // com permissão Vendedor

        const vendedores =
            usuarios.filter(
                usuario => {

                    return (

                        String(
                            usuario.status ||
                            ""
                        )
                            .trim()
                            .toLowerCase() ===
                        "ativo"

                        &&

                        String(
                            usuario.permissao ||
                            ""
                        )
                            .trim()
                            .toLowerCase() ===
                        "vendedor"
                    );
                }
            );


        // OPÇÕES DO CADASTRO

        const opcoesForm =
            `
                <option value="">
                    Selecione o Vendedor
                </option>
            ` +

            vendedores
                .map(
                    vendedor => `
                        <option value="${vendedor.nome}">
                            ${vendedor.nome}
                        </option>
                    `
                )
                .join("");


        // OPÇÕES DO FILTRO

        const opcoesFiltro =
            `
                <option value="">
                    Todos os Vendedores
                </option>
            ` +

            vendedores
                .map(
                    vendedor => `
                        <option value="${vendedor.nome}">
                            ${vendedor.nome}
                        </option>
                    `
                )
                .join("");


        if (selectVendedorForm) {

            selectVendedorForm.innerHTML =
                opcoesForm;
        }


        if (filtroVendedorSelect) {

            filtroVendedorSelect.innerHTML =
                opcoesFiltro;
        }


        console.log(
            "Vendedores carregados:",
            vendedores
        );


    } catch (erro) {

        console.error(
            "Erro ao carregar vendedores:",
            erro
        );

        alert(
            erro.message ||
            "Não foi possível carregar os vendedores."
        );
    }
}


// =========================================================
// NOVO CLIENTE
// =========================================================

if (btnNovoCliente) {

    btnNovoCliente.onclick =
        async () => {

            clienteEmEdicaoId =
                null;


            if (formCliente) {

                formCliente.reset();
            }


            const titulo =
                document.getElementById(
                    "tituloPainelCliente"
                );


            if (titulo) {

                titulo.textContent =
                    "Cadastrar Novo Cliente";
            }


            await carregarVendedoresSelect();


            const selectVendedorForm =
                document.getElementById(
                    "vendedor"
                );


            // Se quem estiver logado for vendedor,
            // seleciona automaticamente o próprio nome.

            if (
                String(
                    usuarioLogado.permissao ||
                    ""
                ).toLowerCase() ===
                    "vendedor" &&

                selectVendedorForm &&

                usuarioLogado.nome
            ) {

                selectVendedorForm.value =
                    usuarioLogado.nome;
            }


            mostrarFormulario();
        };
}


// =========================================================
// CANCELAR / VOLTAR
// =========================================================

if (cancelarCliente) {

    cancelarCliente.onclick =
        ocultarFormulario;
}


if (btnVoltarCliente) {

    btnVoltarCliente.onclick =
        ocultarFormulario;
}


// =========================================================
// SELECIONAR TODOS
// =========================================================

if (selecionarTodos) {

    selecionarTodos.onchange =
        e => {

            const checkboxes =
                document.querySelectorAll(
                    ".checkCliente"
                );


            checkboxes.forEach(
                checkbox => {

                    checkbox.checked =
                        e.target.checked;
                }
            );
        };
}


// =========================================================
// RENDERIZAR TABELA
// =========================================================

function renderizarTabela(clientes) {

    if (!listaClientes) {

        return;
    }


    if (clientes.length === 0) {

        listaClientes.innerHTML = `

            <tr>

                <td
                    colspan="9"
                    style="
                        text-align:center;
                        color:#64748b;
                    "
                >
                    Nenhum cliente encontrado.
                </td>

            </tr>

        `;

        return;
    }


    listaClientes.innerHTML =

        clientes
            .map(
                cliente => `

                    <tr>

                        <td
                            style="
                                text-align:center;
                            "
                        >

                            <input
                                type="checkbox"
                                class="checkCliente"
                                value="${cliente.id}"
                            >

                        </td>


                        <td>
                            ${cliente.id}
                        </td>


                        <td>

                            <strong>
                                ${cliente.razao_social}
                            </strong>

                        </td>


                        <td>
                            ${cliente.cnpj || "-"}
                        </td>


                        <td>
                            ${cliente.contato || "-"}
                        </td>


                        <td>
                            ${cliente.telefone || "-"}
                        </td>


                        <td>
                            ${cliente.vendedor || "-"}
                        </td>


                        <td>

                            <span
                                class="status ${
                                    cliente.status === "Ativo"
                                        ? "paid"
                                        : "overdue"
                                }"
                            >
                                ${cliente.status || "Ativo"}
                            </span>

                        </td>


                        <td
                            style="
                                text-align:center;
                                white-space:nowrap;
                            "
                        >

                            <button
                                type="button"
                                onclick="prepararEdicaoCliente(${cliente.id})"
                                title="Editar"
                                style="
                                    background:#f59e0b;
                                    color:white;
                                    border:none;
                                    padding:6px 10px;
                                    border-radius:6px;
                                    cursor:pointer;
                                "
                            >
                                ✏️
                            </button>

                        </td>

                    </tr>

                `
            )
            .join("");
}


// =========================================================
// FILTROS
// =========================================================

function aplicarFiltros() {

    const codigo =
        filtroCodigo
            ? filtroCodigo.value
                .trim()
                .toLowerCase()
            : "";


    const razao =
        filtroRazaoSocial
            ? filtroRazaoSocial.value
                .trim()
                .toLowerCase()
            : "";


    const cnpj =
        filtroCnpj
            ? filtroCnpj.value
                .trim()
                .toLowerCase()
            : "";


    const vendedor =
        filtroVendedor
            ? filtroVendedor.value
            : "";


    const filtrados =
        listaClientesGlobal.filter(
            cliente => {

                const bateCodigo =
                    codigo === "" ||

                    String(
                        cliente.id
                    )
                        .toLowerCase()
                        .includes(
                            codigo
                        );


                const bateRazao =
                    razao === "" ||

                    (
                        cliente.razao_social &&

                        cliente.razao_social
                            .toLowerCase()
                            .includes(
                                razao
                            )
                    );


                const bateCnpj =
                    cnpj === "" ||

                    (
                        cliente.cnpj &&

                        cliente.cnpj
                            .toLowerCase()
                            .includes(
                                cnpj
                            )
                    );


                const bateVendedor =
                    vendedor === "" ||

                    cliente.vendedor ===
                        vendedor;


                return (
                    bateCodigo &&
                    bateRazao &&
                    bateCnpj &&
                    bateVendedor
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

if (filtroCodigo) {

    filtroCodigo.oninput =
        aplicarFiltros;
}


if (filtroRazaoSocial) {

    filtroRazaoSocial.oninput =
        aplicarFiltros;
}


if (filtroCnpj) {

    filtroCnpj.oninput =
        aplicarFiltros;
}


if (filtroVendedor) {

    filtroVendedor.onchange =
        aplicarFiltros;
}


// =========================================================
// CARREGAR CLIENTES
// =========================================================

async function carregarClientes() {

    try {

        const resposta =
            await fetch(
                `${API_URL}/api/clientes`
            );


        if (!resposta.ok) {

            throw new Error(
                "Erro ao buscar clientes."
            );
        }


        const todosClientes =
            await resposta.json();


        // Vendedor vê apenas seus clientes

        if (
            String(
                usuarioLogado.permissao ||
                ""
            ).toLowerCase() ===
                "vendedor" &&

            usuarioLogado.nome
        ) {

            listaClientesGlobal =
                todosClientes.filter(
                    cliente => {

                        return (

                            cliente.vendedor &&

                            cliente.vendedor
                                .trim()
                                .toLowerCase() ===

                            usuarioLogado.nome
                                .trim()
                                .toLowerCase()
                        );
                    }
                );

        } else {

            listaClientesGlobal =
                todosClientes;
        }


        aplicarFiltros();


    } catch (erro) {

        console.error(
            "Erro ao carregar clientes:",
            erro
        );
    }
}


// =========================================================
// EDITAR CLIENTE
// =========================================================

window.prepararEdicaoCliente =
    async function(id) {

        const cliente =
            listaClientesGlobal.find(
                item =>
                    Number(item.id) ===
                    Number(id)
            );


        if (!cliente) {

            alert(
                "Cliente não encontrado."
            );

            return;
        }


        await carregarVendedoresSelect();


        clienteEmEdicaoId =
            cliente.id;


        const titulo =
            document.getElementById(
                "tituloPainelCliente"
            );


        if (titulo) {

            titulo.textContent =
                `Editar Cliente (ID: ${cliente.id})`;
        }


        preencherCampoCliente(
            "razao_social",
            cliente.razao_social
        );


        preencherCampoCliente(
            "nome_fantasia",
            cliente.nome_fantasia
        );


        preencherCampoCliente(
            "cnpj",
            cliente.cnpj
        );


        preencherCampoCliente(
            "inscricao_estadual",
            cliente.inscricao_estadual
        );


        preencherCampoCliente(
            "contato",
            cliente.contato
        );


        preencherCampoCliente(
            "telefone",
            cliente.telefone
        );


        preencherCampoCliente(
            "email",
            cliente.email
        );


        preencherCampoCliente(
            "endereco",
            cliente.endereco
        );


        preencherCampoCliente(
            "numero",
            cliente.numero
        );


        preencherCampoCliente(
            "cep",
            cliente.cep
        );


        preencherCampoCliente(
            "bairro",
            cliente.bairro
        );


        preencherCampoCliente(
            "vendedor",
            cliente.vendedor
        );


        preencherCampoCliente(
            "status",
            cliente.status ||
            "Ativo"
        );


        mostrarFormulario();
    };


// =========================================================
// PREENCHER CAMPOS
// =========================================================

function preencherCampoCliente(
    id,
    valor
) {

    const campo =
        document.getElementById(
            id
        );


    if (campo) {

        campo.value =
            valor || "";
    }
}


// =========================================================
// EDITAR CLIENTE SELECIONADO
// =========================================================

if (btnEditarSelecionado) {

    btnEditarSelecionado.onclick =
        async () => {

            const checkboxes =
                document.querySelectorAll(
                    ".checkCliente:checked"
                );


            if (
                checkboxes.length === 0
            ) {

                alert(
                    "Selecione um cliente para editar."
                );

                return;
            }


            if (
                checkboxes.length > 1
            ) {

                alert(
                    "Selecione apenas um cliente por vez."
                );

                return;
            }


            const idSelecionado =
                Number(
                    checkboxes[0].value
                );


            prepararEdicaoCliente(
                idSelecionado
            );
        };
}


// =========================================================
// EXCLUSÃO DESATIVADA
// =========================================================

if (btnExcluirSelecionados) {

    btnExcluirSelecionados.style.display =
        "none";
}


// =========================================================
// SALVAR CLIENTE
// =========================================================

if (formCliente) {

    formCliente.onsubmit =
        async e => {

            e.preventDefault();


            const razaoSocial =
                obterValorCliente(
                    "razao_social"
                );


            const cnpj =
                obterValorCliente(
                    "cnpj"
                );


            const vendedor =
                obterValorCliente(
                    "vendedor"
                );


            if (
                !razaoSocial ||
                !cnpj ||
                !vendedor
            ) {

                alert(
                    "Preencha Razão Social, CNPJ e Vendedor."
                );

                return;
            }


            // =================================================
            // VERIFICA CNPJ DUPLICADO
            // =================================================

            const cnpjJaExiste =
                listaClientesGlobal.some(
                    cliente => {

                        return (

                            cliente.cnpj ===
                                cnpj &&

                            Number(
                                cliente.id
                            ) !==
                            Number(
                                clienteEmEdicaoId
                            )
                        );
                    }
                );


            if (cnpjJaExiste) {

                alert(
                    "Este CNPJ já está cadastrado."
                );

                return;
            }


            // =================================================
            // DADOS
            // =================================================

            const dados = {

                razao_social:
                    razaoSocial,

                nome_fantasia:
                    obterValorCliente(
                        "nome_fantasia"
                    ),

                cnpj:
                    cnpj,

                inscricao_estadual:
                    obterValorCliente(
                        "inscricao_estadual"
                    ),

                contato:
                    obterValorCliente(
                        "contato"
                    ),

                telefone:
                    obterValorCliente(
                        "telefone"
                    ),

                email:
                    obterValorCliente(
                        "email"
                    ),

                endereco:
                    obterValorCliente(
                        "endereco"
                    ),

                numero:
                    obterValorCliente(
                        "numero"
                    ),

                cep:
                    obterValorCliente(
                        "cep"
                    ),

                bairro:
                    obterValorCliente(
                        "bairro"
                    ),

                vendedor:
                    vendedor,

                status:
                    obterValorCliente(
                        "status"
                    ) ||
                    "Ativo",

                usuario_logado:
                    usuarioLogado.nome ||
                    usuarioLogado.usuario ||
                    "Sistema"
            };


            // =================================================
            // POST = NOVO / PUT = EDIÇÃO
            // =================================================

            const url =
                clienteEmEdicaoId

                    ? `${API_URL}/api/clientes/${clienteEmEdicaoId}`

                    : `${API_URL}/api/clientes`;


            const metodo =
                clienteEmEdicaoId
                    ? "PUT"
                    : "POST";


            try {

                const resposta =
                    await fetch(
                        url,
                        {
                            method:
                                metodo,

                            headers: {

                                "Content-Type":
                                    "application/json"
                            },

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
                        "Erro ao processar cliente."
                    );
                }


                if (clienteEmEdicaoId) {

                    alert(
                        "Cliente atualizado com sucesso!"
                    );

                } else {

                    alert(
                        "Cliente cadastrado com sucesso!"
                    );
                }


                ocultarFormulario();

                await carregarClientes();


            } catch (erro) {

                console.error(
                    "Erro ao salvar cliente:",
                    erro
                );


                alert(
                    erro.message ||
                    "Erro de conexão com o servidor."
                );
            }
        };
}


// =========================================================
// OBTER VALOR DO CAMPO
// =========================================================

function obterValorCliente(id) {

    const campo =
        document.getElementById(
            id
        );


    return campo
        ? campo.value.trim()
        : "";
}