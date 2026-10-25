// =========================================================
// CONFIGURAÇÃO DA API
// =========================================================

const API_URL = "http://localhost:3000";


// =========================================================
// USUÁRIO LOGADO
// =========================================================

let usuarioLogado = null;


// =========================================================
// CARREGAR USUÁRIO LOCAL
// =========================================================

function carregarUsuarioLocal() {

    try {

        usuarioLogado =
            JSON.parse(
                localStorage.getItem("usuario") ||
                localStorage.getItem("usuarioLogado") ||
                "null"
            );


    } catch (erro) {

        console.error(
            "Erro ao carregar usuário logado:",
            erro
        );


        usuarioLogado =
            null;
    }
}


carregarUsuarioLocal();


// =========================================================
// LIMPAR DADOS LOCAIS
// =========================================================

function limparDadosLogin() {

    localStorage.removeItem(
        "usuario"
    );


    localStorage.removeItem(
        "usuarioLogado"
    );


    usuarioLogado =
        null;
}


// =========================================================
// VERIFICA SE É ADMINISTRADOR
// =========================================================

function ehAdministrador() {

    if (!usuarioLogado) {

        return false;
    }


    if (!usuarioLogado.permissao) {

        return false;
    }


    return String(
        usuarioLogado.permissao
    )
        .trim()
        .toLowerCase() ===
        "administrador";
}


// =========================================================
// REDIRECIONAR PARA LOGIN
// =========================================================

function redirecionarParaLogin(
    mostrarMensagem = false
) {

    limparDadosLogin();


    if (mostrarMensagem) {

        alert(
            "Sua sessão expirou. Faça login novamente."
        );
    }


    window.location.href =
        "login.html";
}


// =========================================================
// VERIFICAR SESSÃO REAL
// =========================================================

async function verificarSessao() {

    try {

        const resposta =
            await fetch(
                `${API_URL}/api/sessao`,
                {
                    method: "GET",

                    credentials:
                        "include"
                }
            );


        const resultado =
            await resposta
                .json()
                .catch(
                    () => ({})
                );


        if (!resposta.ok) {

            console.error(
                "Sessão inválida:",
                resultado
            );


            redirecionarParaLogin(
                false
            );


            return false;
        }


        if (
            !resultado.usuario ||
            !resultado.usuario.id
        ) {

            redirecionarParaLogin(
                false
            );


            return false;
        }


        usuarioLogado =
            resultado.usuario;


        localStorage.setItem(
            "usuario",
            JSON.stringify(
                usuarioLogado
            )
        );


        // =================================================
        // SOMENTE ADMINISTRADOR
        // =================================================

        if (!ehAdministrador()) {

            alert(
                "Acesso negado. Somente o Administrador pode gerenciar usuários."
            );


            window.location.href =
                "../index.html";


            return false;
        }


        return true;


    } catch (erro) {

        console.error(
            "Erro ao verificar sessão:",
            erro
        );


        limparDadosLogin();


        alert(
            "Não foi possível verificar sua sessão com o servidor."
        );


        window.location.href =
            "login.html";


        return false;
    }
}


// =========================================================
// TRATAR RESPOSTA DE AUTENTICAÇÃO
// =========================================================

function tratarErroAutenticacao(
    resposta,
    resultado
) {

    // Sessão inexistente ou expirada

    if (
        resposta.status === 401
    ) {

        console.warn(
            "Sessão expirada:",
            resultado
        );


        redirecionarParaLogin(
            true
        );


        return true;
    }


    // Usuário autenticado, mas sem permissão

    if (
        resposta.status === 403
    ) {

        console.warn(
            "Acesso negado:",
            resultado
        );


        alert(
            resultado.erro ||
            "Acesso negado. Somente o Administrador pode realizar esta operação."
        );


        window.location.href =
            "../index.html";


        return true;
    }


    return false;
}


// =========================================================
// VARIÁVEIS
// =========================================================

let usuarios = [];

let usuarioEditandoId = null;

let paginaAtual = 1;

const itensPorPagina = 10;


// =========================================================
// QUANDO A PÁGINA CARREGAR
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        // Primeiro verifica a sessão verdadeira
        // diretamente no servidor.

        const sessaoValida =
            await verificarSessao();


        if (!sessaoValida) {

            return;
        }


        atualizarDadosUsuarioLogado();


        configurarEventos();


        configurarMascaras();


        protegerGerenciamentoUsuarios();


        await carregarUsuarios();
    }
);


// =========================================================
// DADOS DO USUÁRIO LOGADO NO MENU
// =========================================================

function atualizarDadosUsuarioLogado() {

    if (!usuarioLogado) {

        return;
    }


    const userInfo =
        document.querySelector(
            ".user-info"
        );


    if (userInfo) {

        const nome =
            userInfo.querySelector(
                "strong"
            );


        const permissao =
            userInfo.querySelector(
                "span"
            );


        if (nome) {

            nome.textContent =
                usuarioLogado.nome ||
                usuarioLogado.usuario ||
                "Usuário";
        }


        if (permissao) {

            permissao.textContent =
                usuarioLogado.permissao ||
                "";
        }
    }


    const avatar =
        document.querySelector(
            ".user-avatar"
        );


    if (avatar) {

        const nomeUsuario =
            usuarioLogado.nome ||
            usuarioLogado.usuario ||
            "U";


        avatar.textContent =
            nomeUsuario
                .charAt(0)
                .toUpperCase();
    }
}


// =========================================================
// CONFIGURAR EVENTOS
// =========================================================

function configurarEventos() {

    // -----------------------------------------------------
    // BOTÃO CADASTRAR USUÁRIO
    // -----------------------------------------------------

    const btnNovo =
        document.getElementById(
            "btnNovoUsuario"
        );


    if (btnNovo) {

        btnNovo.addEventListener(
            "click",
            () => {

                if (!ehAdministrador()) {

                    alert(
                        "Somente o Administrador pode cadastrar usuários."
                    );


                    return;
                }


                abrirFormularioNovo();
            }
        );
    }


    // -----------------------------------------------------
    // FORMULÁRIO
    // -----------------------------------------------------

    const formulario =
        document.getElementById(
            "formUsuario"
        );


    if (formulario) {

        formulario.addEventListener(
            "submit",
            salvarUsuario
        );
    }


    // -----------------------------------------------------
    // BOTÃO CANCELAR
    // -----------------------------------------------------

    const btnCancelar =
        document.getElementById(
            "cancelarUsuario"
        );


    if (btnCancelar) {

        btnCancelar.addEventListener(
            "click",
            fecharFormulario
        );
    }


    // -----------------------------------------------------
    // BOTÃO VOLTAR
    // -----------------------------------------------------

    const btnVoltar =
        document.getElementById(
            "btnVoltarUsuario"
        );


    if (btnVoltar) {

        btnVoltar.addEventListener(
            "click",
            fecharFormulario
        );
    }


    // -----------------------------------------------------
    // FILTRO CÓDIGO
    // -----------------------------------------------------

    const filtroCodigo =
        document.getElementById(
            "filtroCodigo"
        );


    if (filtroCodigo) {

        filtroCodigo.addEventListener(
            "input",
            () => {

                paginaAtual = 1;


                renderizarUsuarios();
            }
        );
    }


    // -----------------------------------------------------
    // FILTRO NOME
    // -----------------------------------------------------

    const filtroNome =
        document.getElementById(
            "filtroNome"
        );


    if (filtroNome) {

        filtroNome.addEventListener(
            "input",
            () => {

                paginaAtual = 1;


                renderizarUsuarios();
            }
        );
    }


    // -----------------------------------------------------
    // FILTRO USUÁRIO
    // -----------------------------------------------------

    const filtroUsuario =
        document.getElementById(
            "filtroUsuario"
        );


    if (filtroUsuario) {

        filtroUsuario.addEventListener(
            "input",
            () => {

                paginaAtual = 1;


                renderizarUsuarios();
            }
        );
    }


    // -----------------------------------------------------
    // FILTRO SETOR
    // -----------------------------------------------------

    const filtroSetor =
        document.getElementById(
            "filtroSetor"
        );


    if (filtroSetor) {

        filtroSetor.addEventListener(
            "change",
            () => {

                paginaAtual = 1;


                renderizarUsuarios();
            }
        );
    }


    // -----------------------------------------------------
    // SELECIONAR TODOS
    // -----------------------------------------------------

    const selecionarTodos =
        document.getElementById(
            "selecionarTodos"
        );


    if (selecionarTodos) {

        selecionarTodos.addEventListener(
            "change",
            () => {

                document
                    .querySelectorAll(
                        ".checkbox-usuario"
                    )
                    .forEach(
                        checkbox => {

                            checkbox.checked =
                                selecionarTodos.checked;
                        }
                    );
            }
        );
    }


    // -----------------------------------------------------
    // LOGOUT
    // -----------------------------------------------------

    const btnLogout =
        document.querySelector(
            ".logout"
        );


    if (btnLogout) {

        btnLogout.addEventListener(
            "click",
            async () => {

                try {

                    await fetch(
                        `${API_URL}/api/logout`,
                        {
                            method:
                                "POST",

                            credentials:
                                "include"
                        }
                    );


                } catch (erro) {

                    console.error(
                        "Erro ao encerrar sessão:",
                        erro
                    );
                }


                limparDadosLogin();


                window.location.href =
                    "login.html";
            }
        );
    }
}


// =========================================================
// MÁSCARAS
// =========================================================

function configurarMascaras() {

    // -----------------------------------------------------
    // CPF
    // -----------------------------------------------------

    const cpf =
        document.getElementById(
            "cpf"
        );


    if (cpf) {

        cpf.addEventListener(
            "input",
            () => {

                let valor =
                    cpf.value.replace(
                        /\D/g,
                        ""
                    );


                valor =
                    valor.substring(
                        0,
                        11
                    );


                valor =
                    valor.replace(
                        /(\d{3})(\d)/,
                        "$1.$2"
                    );


                valor =
                    valor.replace(
                        /(\d{3})(\d)/,
                        "$1.$2"
                    );


                valor =
                    valor.replace(
                        /(\d{3})(\d{1,2})$/,
                        "$1-$2"
                    );


                cpf.value =
                    valor;
            }
        );
    }


    // -----------------------------------------------------
    // TELEFONE
    // -----------------------------------------------------

    const telefone =
        document.getElementById(
            "telefone"
        );


    if (telefone) {

        telefone.addEventListener(
            "input",
            () => {

                let valor =
                    telefone.value.replace(
                        /\D/g,
                        ""
                    );


                valor =
                    valor.substring(
                        0,
                        11
                    );


                if (
                    valor.length > 10
                ) {

                    valor =
                        valor.replace(
                            /^(\d{2})(\d{5})(\d{4})$/,
                            "($1) $2-$3"
                        );


                } else {

                    valor =
                        valor.replace(
                            /^(\d{2})(\d{4})(\d{4})$/,
                            "($1) $2-$3"
                        );
                }


                telefone.value =
                    valor;
            }
        );
    }
}


// =========================================================
// CARREGAR USUÁRIOS
// =========================================================

async function carregarUsuarios() {

    if (!ehAdministrador()) {

        return;
    }


    try {

        const resposta =
            await fetch(
                `${API_URL}/api/usuarios`,
                {
                    method:
                        "GET",

                    credentials:
                        "include"
                }
            );


        const resultado =
            await resposta
                .json()
                .catch(
                    () => ({})
                );


        if (
            tratarErroAutenticacao(
                resposta,
                resultado
            )
        ) {

            return;
        }


        if (!resposta.ok) {

            throw new Error(
                resultado.erro ||
                "Erro ao carregar usuários."
            );
        }


        usuarios =
            Array.isArray(
                resultado
            )
                ? resultado
                : [];


        renderizarUsuarios();


    } catch (erro) {

        console.error(
            "Erro ao carregar usuários:",
            erro
        );


        alert(
            erro.message ||
            "Não foi possível carregar os usuários."
        );
    }
}
// =========================================================
// FILTRAR USUÁRIOS
// =========================================================

function obterUsuariosFiltrados() {

    let lista =
        [...usuarios];


    // -----------------------------------------------------
    // CÓDIGO
    // -----------------------------------------------------

    const filtroCodigo =
        obterValor("filtroCodigo")
            .toLowerCase();


    if (filtroCodigo) {

        lista =
            lista.filter(
                usuario =>

                    String(
                        usuario.id || ""
                    )
                        .toLowerCase()
                        .includes(
                            filtroCodigo
                        )
            );
    }


    // -----------------------------------------------------
    // NOME
    // -----------------------------------------------------

    const filtroNome =
        obterValor("filtroNome")
            .toLowerCase();


    if (filtroNome) {

        lista =
            lista.filter(
                usuario =>

                    String(
                        usuario.nome || ""
                    )
                        .toLowerCase()
                        .includes(
                            filtroNome
                        )
            );
    }


    // -----------------------------------------------------
    // USUÁRIO
    // -----------------------------------------------------

    const filtroUsuario =
        obterValor("filtroUsuario")
            .toLowerCase();


    if (filtroUsuario) {

        lista =
            lista.filter(
                usuario =>

                    String(
                        usuario.usuario || ""
                    )
                        .toLowerCase()
                        .includes(
                            filtroUsuario
                        )
            );
    }


    // -----------------------------------------------------
    // SETOR
    // -----------------------------------------------------

    const filtroSetor =
        obterValor("filtroSetor")
            .toLowerCase();


    if (filtroSetor) {

        lista =
            lista.filter(
                usuario =>

                    String(
                        usuario.setor || ""
                    )
                        .toLowerCase() ===
                    filtroSetor
            );
    }


    return lista;
}


// =========================================================
// RENDERIZAR TABELA
// =========================================================

function renderizarUsuarios() {

    const tbody =
        document.getElementById(
            "listaUsuarios"
        );


    if (!tbody) {

        console.warn(
            "Tabela de usuários não encontrada."
        );


        return;
    }


    const lista =
        obterUsuariosFiltrados();


    const totalPaginas =
        Math.max(
            1,

            Math.ceil(
                lista.length /
                itensPorPagina
            )
        );


    if (
        paginaAtual >
        totalPaginas
    ) {

        paginaAtual =
            totalPaginas;
    }


    const inicio =
        (
            paginaAtual - 1
        ) *
        itensPorPagina;


    const fim =
        inicio +
        itensPorPagina;


    const usuariosPagina =
        lista.slice(
            inicio,
            fim
        );


    tbody.innerHTML = "";


    if (
        usuariosPagina.length === 0
    ) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="9"
                    style="
                        text-align:center;
                        color:#64748b;
                    "
                >

                    Nenhum usuário encontrado.

                </td>

            </tr>

        `;


        return;
    }


    usuariosPagina.forEach(
        usuario => {

            const tr =
                document.createElement(
                    "tr"
                );


            const status =
                String(
                    usuario.status || ""
                );


            tr.innerHTML = `

                <td style="text-align:center;">

                    <input
                        type="checkbox"
                        class="checkbox-usuario"
                        data-id="${usuario.id}"
                    >

                </td>


                <td>

                    ${usuario.id || ""}

                </td>


                <td>

                    ${usuario.nome || ""}

                </td>


                <td>

                    ${usuario.cpf || ""}

                </td>


                <td>

                    ${usuario.usuario || ""}

                </td>


                <td>

                    ${usuario.setor || ""}

                </td>


                <td>

                    ${usuario.permissao || ""}

                </td>


                
                <td>
                    <span class="status-usuario ${
                        String(status).trim().toLowerCase() === "ativo"
                            ? "usuario-ativo"
                            : "usuario-inativo"
                    }">
                        ${status}
                    </span>
                </td>



                <td style="text-align:center;">

                    <button
                        type="button"
                        class="btn-editar-usuario"
                        data-id="${usuario.id}"
                        style="
                            background:#2563eb;
                            color:white;
                            border:none;
                            padding:6px 12px;
                            border-radius:6px;
                            cursor:pointer;
                        "
                    >

                        Editar

                    </button>

                </td>

            `;


            tbody.appendChild(
                tr
            );
        }
    );


    // -----------------------------------------------------
    // BOTÕES EDITAR
    // -----------------------------------------------------

    document
        .querySelectorAll(
            ".btn-editar-usuario"
        )
        .forEach(
            botao => {

                botao.addEventListener(
                    "click",
                    () => {

                        const id =
                            Number(
                                botao.dataset.id
                            );


                        editarUsuario(
                            id
                        );
                    }
                );
            }
        );
}


// =========================================================
// ABRIR FORMULÁRIO NOVO USUÁRIO
// =========================================================

function abrirFormularioNovo() {

    if (!ehAdministrador()) {

        alert(
            "Somente o Administrador pode cadastrar usuários."
        );


        return;
    }


    usuarioEditandoId =
        null;


    const formulario =
        document.getElementById(
            "formUsuario"
        );


    if (formulario) {

        formulario.reset();
    }


    const status =
        document.getElementById(
            "status"
        );


    if (status) {

        status.value =
            "Ativo";
    }


    const titulo =
        document.getElementById(
            "tituloPainelUsuario"
        );


    if (titulo) {

        titulo.textContent =
            "Cadastrar Novo Usuário";
    }


    const senha =
        document.getElementById(
            "senha"
        );


    if (senha) {

        senha.required =
            true;


        senha.placeholder =
            "Senha";
    }


    abrirPainelCadastro();
}


// =========================================================
// EDITAR USUÁRIO
// =========================================================

function editarUsuario(id) {

    if (!ehAdministrador()) {

        alert(
            "Somente o Administrador pode editar usuários."
        );


        return;
    }


    const usuario =
        usuarios.find(
            item =>

                Number(
                    item.id
                ) ===
                Number(
                    id
                )
        );


    if (!usuario) {

        alert(
            "Usuário não encontrado."
        );


        return;
    }


    usuarioEditandoId =
        usuario.id;


    preencherCampo(
        "nome",
        usuario.nome
    );


    preencherCampo(
        "cpf",
        usuario.cpf
    );


    preencherCampo(
        "usuario",
        usuario.usuario
    );


    preencherCampo(
        "email",
        usuario.email
    );


    preencherCampo(
        "telefone",
        usuario.telefone
    );


    preencherCampo(
        "endereco",
        usuario.endereco
    );


    preencherCampo(
        "numero",
        usuario.numero
    );


    preencherCampo(
        "bairro",
        usuario.bairro
    );


    preencherCampo(
        "setor",
        usuario.setor
    );


    preencherCampo(
        "permissao",
        usuario.permissao
    );


    preencherCampo(
        "status",
        usuario.status
    );


    // Nunca exibe a senha atual

    preencherCampo(
        "senha",
        ""
    );


    const senha =
        document.getElementById(
            "senha"
        );


    if (senha) {

        senha.required =
            false;


        senha.placeholder =
            "Nova senha (deixe em branco para manter)";
    }


    const titulo =
        document.getElementById(
            "tituloPainelUsuario"
        );


    if (titulo) {

        titulo.textContent =
            "Editar Usuário";
    }


    abrirPainelCadastro();
}


// =========================================================
// PREENCHER CAMPO
// =========================================================

function preencherCampo(
    id,
    valor
) {

    const campo =
        document.getElementById(
            id
        );


    if (campo) {

        campo.value =
            valor ?? "";
    }
}


// =========================================================
// SALVAR USUÁRIO
// =========================================================

async function salvarUsuario(
    evento
) {

    evento.preventDefault();


    if (!ehAdministrador()) {

        alert(
            "Acesso negado. Somente o Administrador pode salvar usuários."
        );


        return;
    }


    // =====================================================
    // CAMPOS
    // =====================================================

    const nome =
        obterValor("nome");


    const cpf =
        obterValor("cpf");


    const usuario =
        obterValor("usuario");


    const email =
        obterValor("email");


    const senha =
        obterValor("senha");


    const telefone =
        obterValor("telefone");


    const endereco =
        obterValor("endereco");


    const numero =
        obterValor("numero");


    const bairro =
        obterValor("bairro");


    const setor =
        obterValor("setor");


    const permissao =
        obterValor("permissao");


    const status =
        obterValor("status");


    // =====================================================
    // VALIDAÇÃO
    // =====================================================

    if (
        !nome ||
        !cpf ||
        !usuario ||
        !email ||
        !setor ||
        !permissao ||
        !status
    ) {

        alert(
            "Preencha todos os campos obrigatórios."
        );


        return;
    }


    // Senha obrigatória somente no cadastro

    if (
        !usuarioEditandoId &&
        !senha
    ) {

        alert(
            "Informe a senha do usuário."
        );


        return;
    }


    // =====================================================
    // SOMENTE OPERADOR OU VENDEDOR
    // =====================================================

    if (
        permissao !== "Operador" &&
        permissao !== "Vendedor"
    ) {

        alert(
            "A permissão deve ser Operador ou Vendedor."
        );


        return;
    }


    // =====================================================
    // VERIFICA CPF DUPLICADO
    // =====================================================

    const cpfDuplicado =
        usuarios.some(
            item =>

                String(
                    item.cpf || ""
                )
                    .replace(
                        /\D/g,
                        ""
                    )

                ===

                String(
                    cpf
                )
                    .replace(
                        /\D/g,
                        ""
                    )

                &&

                Number(
                    item.id
                ) !==
                Number(
                    usuarioEditandoId
                )
        );


    if (cpfDuplicado) {

        alert(
            "Já existe um usuário cadastrado com este CPF."
        );


        return;
    }


    // =====================================================
    // OBJETO
    // =====================================================

    const dados = {

        nome,

        cpf,

        usuario,

        email,

        senha,

        telefone,

        endereco,

        numero,

        bairro,

        setor,

        permissao,

        status
    };


    // =====================================================
    // POST OU PUT
    // =====================================================

    let url =
        `${API_URL}/api/usuarios`;


    let metodo =
        "POST";


    if (usuarioEditandoId) {

        url =
            `${API_URL}/api/usuarios/${usuarioEditandoId}`;


        metodo =
            "PUT";
    }


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


                    // Envia o cookie da sessão
                    credentials:
                        "include",


                    body:
                        JSON.stringify(
                            dados
                        )
                }
            );


        const resultado =
            await resposta
                .json()
                .catch(
                    () => ({})
                );


        // =================================================
        // SESSÃO EXPIRADA OU SEM PERMISSÃO
        // =================================================

        if (
            tratarErroAutenticacao(
                resposta,
                resultado
            )
        ) {

            return;
        }


        if (!resposta.ok) {

            throw new Error(
                resultado.erro ||
                "Erro ao salvar usuário."
            );
        }


        alert(
            resultado.mensagem ||
            (
                usuarioEditandoId
                    ? "Usuário atualizado com sucesso."
                    : "Usuário cadastrado com sucesso."
            )
        );


        fecharFormulario();


        await carregarUsuarios();


    } catch (erro) {

        console.error(
            "Erro ao salvar usuário:",
            erro
        );


        alert(
            erro.message ||
            "Não foi possível salvar o usuário."
        );
    }
}


// =========================================================
// OBTER VALOR
// =========================================================

function obterValor(id) {

    const campo =
        document.getElementById(
            id
        );


    if (!campo) {

        return "";
    }


    return String(
        campo.value || ""
    ).trim();
}
// =========================================================
// ABRIR PAINEL DE CADASTRO
// =========================================================

function abrirPainelCadastro() {

    const painel =
        document.getElementById(
            "painelCadastroUsuario"
        );


    const tabela =
        document.getElementById(
            "secaoTabela"
        );


    const filtros =
        document.getElementById(
            "secaoFiltros"
        );


    const botoesTopo =
        document.getElementById(
            "botoesAcaoTopo"
        );


    if (!painel) {

        console.warn(
            "Painel de cadastro de usuário não encontrado."
        );


        return;
    }


    painel.style.display =
        "block";


    if (tabela) {

        tabela.style.display =
            "none";
    }


    if (filtros) {

        filtros.style.display =
            "none";
    }


    if (botoesTopo) {

        botoesTopo.style.display =
            "none";
    }


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


// =========================================================
// FECHAR FORMULÁRIO
// =========================================================

function fecharFormulario() {

    const painel =
        document.getElementById(
            "painelCadastroUsuario"
        );


    const tabela =
        document.getElementById(
            "secaoTabela"
        );


    const filtros =
        document.getElementById(
            "secaoFiltros"
        );


    const botoesTopo =
        document.getElementById(
            "botoesAcaoTopo"
        );


    if (painel) {

        painel.style.display =
            "none";
    }


    if (tabela) {

        tabela.style.display =
            "block";
    }


    if (filtros) {

        filtros.style.display =
            "block";
    }


    if (botoesTopo) {

        botoesTopo.style.display =
            "flex";
    }


    const formulario =
        document.getElementById(
            "formUsuario"
        );


    if (formulario) {

        formulario.reset();
    }


    const senha =
        document.getElementById(
            "senha"
        );


    if (senha) {

        senha.required =
            false;


        senha.placeholder =
            "Senha";
    }


    usuarioEditandoId =
        null;
}


// =========================================================
// ESC FECHA O FORMULÁRIO
// =========================================================

document.addEventListener(
    "keydown",
    evento => {

        if (
            evento.key ===
            "Escape"
        ) {

            const painel =
                document.getElementById(
                    "painelCadastroUsuario"
                );


            if (
                painel &&
                painel.style.display !==
                "none"
            ) {

                fecharFormulario();
            }
        }
    }
);


// =========================================================
// PROTEÇÃO DO GERENCIAMENTO DE USUÁRIOS
// =========================================================

function protegerGerenciamentoUsuarios() {

    if (!usuarioLogado) {

        return;
    }


    if (!ehAdministrador()) {

        const btnNovo =
            document.getElementById(
                "btnNovoUsuario"
            );


        if (btnNovo) {

            btnNovo.style.display =
                "none";
        }


        const linkUsuarios =
            document.querySelector(
                'a[href*="usuarios.html"]'
            );


        if (linkUsuarios) {

            linkUsuarios.style.display =
                "none";
        }
    }
}


// =========================================================
// FUNÇÃO DE LOGOUT GLOBAL
// =========================================================

async function realizarLogout() {

    try {

        await fetch(
            `${API_URL}/api/logout`,
            {
                method:
                    "POST",

                credentials:
                    "include"
            }
        );


    } catch (erro) {

        console.error(
            "Erro ao realizar logout:",
            erro
        );
    }


    limparDadosLogin();


    window.location.href =
        "login.html";
}


// =========================================================
// VERIFICAR SESSÃO NOVAMENTE
// =========================================================

async function verificarSessaoAtual() {

    try {

        const resposta =
            await fetch(
                `${API_URL}/api/sessao`,
                {
                    method:
                        "GET",

                    credentials:
                        "include"
                }
            );


        const resultado =
            await resposta
                .json()
                .catch(
                    () => ({})
                );


        if (
            resposta.status === 401
        ) {

            redirecionarParaLogin(
                true
            );


            return false;
        }


        if (!resposta.ok) {

            console.error(
                "Erro ao verificar sessão:",
                resultado
            );


            return false;
        }


        if (
            !resultado.usuario ||
            !resultado.usuario.id
        ) {

            redirecionarParaLogin(
                true
            );


            return false;
        }


        usuarioLogado =
            resultado.usuario;


        localStorage.setItem(
            "usuario",
            JSON.stringify(
                usuarioLogado
            )
        );


        if (!ehAdministrador()) {

            alert(
                "Acesso negado. Somente o Administrador pode gerenciar usuários."
            );


            window.location.href =
                "../index.html";


            return false;
        }


        return true;


    } catch (erro) {

        console.error(
            "Erro ao verificar sessão atual:",
            erro
        );


        return false;
    }
}


// =========================================================
// VERIFICAR QUANDO VOLTAR PARA A ABA
// =========================================================

document.addEventListener(
    "visibilitychange",
    async () => {

        if (
            document.visibilityState !==
            "visible"
        ) {

            return;
        }


        const sessaoValida =
            await verificarSessaoAtual();


        if (!sessaoValida) {

            return;
        }


        atualizarDadosUsuarioLogado();
    }
);


// =========================================================
// FUNÇÕES GLOBAIS
// =========================================================

window.editarUsuario =
    editarUsuario;


window.abrirFormularioNovo =
    abrirFormularioNovo;


window.fecharFormulario =
    fecharFormulario;


window.realizarLogout =
    realizarLogout;


// =========================================================
// DEBUG
// =========================================================

console.log(
    "usuarios.js carregado."
);


console.log(
    "Autenticação da página de usuários: sessão do servidor."
);// =========================================================
// ABRIR PAINEL DE CADASTRO
// =========================================================

function abrirPainelCadastro() {

    const painel =
        document.getElementById(
            "painelCadastroUsuario"
        );


    const tabela =
        document.getElementById(
            "secaoTabela"
        );


    const filtros =
        document.getElementById(
            "secaoFiltros"
        );


    const botoesTopo =
        document.getElementById(
            "botoesAcaoTopo"
        );


    if (!painel) {

        console.warn(
            "Painel de cadastro de usuário não encontrado."
        );


        return;
    }


    painel.style.display =
        "block";


    if (tabela) {

        tabela.style.display =
            "none";
    }


    if (filtros) {

        filtros.style.display =
            "none";
    }


    if (botoesTopo) {

        botoesTopo.style.display =
            "none";
    }


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


// =========================================================
// FECHAR FORMULÁRIO
// =========================================================

function fecharFormulario() {

    const painel =
        document.getElementById(
            "painelCadastroUsuario"
        );


    const tabela =
        document.getElementById(
            "secaoTabela"
        );


    const filtros =
        document.getElementById(
            "secaoFiltros"
        );


    const botoesTopo =
        document.getElementById(
            "botoesAcaoTopo"
        );


    if (painel) {

        painel.style.display =
            "none";
    }


    if (tabela) {

        tabela.style.display =
            "block";
    }


    if (filtros) {

        filtros.style.display =
            "block";
    }


    if (botoesTopo) {

        botoesTopo.style.display =
            "flex";
    }


    const formulario =
        document.getElementById(
            "formUsuario"
        );


    if (formulario) {

        formulario.reset();
    }


    const senha =
        document.getElementById(
            "senha"
        );


    if (senha) {

        senha.required =
            false;


        senha.placeholder =
            "Senha";
    }


    usuarioEditandoId =
        null;
}


// =========================================================
// ESC FECHA O FORMULÁRIO
// =========================================================

document.addEventListener(
    "keydown",
    evento => {

        if (
            evento.key ===
            "Escape"
        ) {

            const painel =
                document.getElementById(
                    "painelCadastroUsuario"
                );


            if (
                painel &&
                painel.style.display !==
                "none"
            ) {

                fecharFormulario();
            }
        }
    }
);


// =========================================================
// PROTEÇÃO DO GERENCIAMENTO DE USUÁRIOS
// =========================================================

function protegerGerenciamentoUsuarios() {

    if (!usuarioLogado) {

        return;
    }


    if (!ehAdministrador()) {

        const btnNovo =
            document.getElementById(
                "btnNovoUsuario"
            );


        if (btnNovo) {

            btnNovo.style.display =
                "none";
        }


        const linkUsuarios =
            document.querySelector(
                'a[href*="usuarios.html"]'
            );


        if (linkUsuarios) {

            linkUsuarios.style.display =
                "none";
        }
    }
}


// =========================================================
// FUNÇÃO DE LOGOUT GLOBAL
// =========================================================

async function realizarLogout() {

    try {

        await fetch(
            `${API_URL}/api/logout`,
            {
                method:
                    "POST",

                credentials:
                    "include"
            }
        );


    } catch (erro) {

        console.error(
            "Erro ao realizar logout:",
            erro
        );
    }


    limparDadosLogin();


    window.location.href =
        "login.html";
}


// =========================================================
// VERIFICAR SESSÃO NOVAMENTE
// =========================================================

async function verificarSessaoAtual() {

    try {

        const resposta =
            await fetch(
                `${API_URL}/api/sessao`,
                {
                    method:
                        "GET",

                    credentials:
                        "include"
                }
            );


        const resultado =
            await resposta
                .json()
                .catch(
                    () => ({})
                );


        if (
            resposta.status === 401
        ) {

            redirecionarParaLogin(
                true
            );


            return false;
        }


        if (!resposta.ok) {

            console.error(
                "Erro ao verificar sessão:",
                resultado
            );


            return false;
        }


        if (
            !resultado.usuario ||
            !resultado.usuario.id
        ) {

            redirecionarParaLogin(
                true
            );


            return false;
        }


        usuarioLogado =
            resultado.usuario;


        localStorage.setItem(
            "usuario",
            JSON.stringify(
                usuarioLogado
            )
        );


        if (!ehAdministrador()) {

            alert(
                "Acesso negado. Somente o Administrador pode gerenciar usuários."
            );


            window.location.href =
                "../index.html";


            return false;
        }


        return true;


    } catch (erro) {

        console.error(
            "Erro ao verificar sessão atual:",
            erro
        );


        return false;
    }
}


// =========================================================
// VERIFICAR QUANDO VOLTAR PARA A ABA
// =========================================================

document.addEventListener(
    "visibilitychange",
    async () => {

        if (
            document.visibilityState !==
            "visible"
        ) {

            return;
        }


        const sessaoValida =
            await verificarSessaoAtual();


        if (!sessaoValida) {

            return;
        }


        atualizarDadosUsuarioLogado();
    }
);


// =========================================================
// FUNÇÕES GLOBAIS
// =========================================================

window.editarUsuario =
    editarUsuario;


window.abrirFormularioNovo =
    abrirFormularioNovo;


window.fecharFormulario =
    fecharFormulario;


window.realizarLogout =
    realizarLogout;


// =========================================================
// DEBUG
// =========================================================

console.log(
    "usuarios.js carregado."
);


console.log(
    "Autenticação da página de usuários: sessão do servidor."
);