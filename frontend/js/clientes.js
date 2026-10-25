
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

try {
    usuarioLogado = JSON.parse(
        localStorage.getItem("usuario") ||
        localStorage.getItem("usuarioLogado") ||
        "null"
    );
} catch (erro) {
    console.error("Erro ao ler usuário local:", erro);
    usuarioLogado = null;
}


// =========================================================
// LIMPAR DADOS DE LOGIN
// =========================================================

function limparDadosLogin() {
    localStorage.removeItem("usuario");
    localStorage.removeItem("usuarioLogado");
    usuarioLogado = null;
}


// =========================================================
// REDIRECIONAR PARA LOGIN
// =========================================================

function redirecionarParaLogin(mostrarMensagem = false) {
    limparDadosLogin();

    if (mostrarMensagem) {
        alert("Sua sessão expirou. Faça login novamente.");
    }

    window.location.href = "login.html";
}


// =========================================================
// VERIFICAR SESSÃO NO SERVIDOR
// =========================================================

async function verificarSessaoCliente() {
    try {
        const resposta = await fetch(
            `${API_URL}/api/sessao`,
            {
                method: "GET",
                credentials: "include"
            }
        );

        const resultado = await resposta.json().catch(() => ({}));

        if (resposta.status === 401) {
            redirecionarParaLogin(true);
            return false;
        }

        if (!resposta.ok) {
            console.error(
                "Não foi possível verificar a sessão:",
                resultado
            );

            alert("Não foi possível verificar sua sessão.");
            return false;
        }

        if (!resultado.usuario || !resultado.usuario.id) {
            redirecionarParaLogin(true);
            return false;
        }

        // A identidade vem do servidor, não do localStorage.
        usuarioLogado = resultado.usuario;

        localStorage.setItem(
            "usuario",
            JSON.stringify(usuarioLogado)
        );

        return true;

    } catch (erro) {
        console.error("Erro ao verificar sessão:", erro);

        alert(
            "Não foi possível conectar ao servidor. " +
            "Verifique se o backend está funcionando."
        );

        return false;
    }
}


// =========================================================
// TRATAR RESPOSTAS DA API
// =========================================================

function tratarRespostaAutenticacaoCliente(
    resposta,
    resultado = {}
) {
    if (resposta.status === 401) {
        redirecionarParaLogin(true);
        return true;
    }

    if (resposta.status === 403) {
        alert(
            resultado.erro ||
            "Você não tem permissão para realizar esta operação."
        );

        return true;
    }

    return false;
}


// =========================================================
// ELEMENTOS DA PÁGINA
// =========================================================

const painelCadastroCliente =
    document.getElementById("painelCadastroCliente");

const formCliente =
    document.getElementById("formCliente");

const listaClientes =
    document.getElementById("listaClientes");

const btnNovoCliente =
    document.getElementById("btnNovoCliente");

const cancelarCliente =
    document.getElementById("cancelarCliente");

const btnVoltarCliente =
    document.getElementById("btnVoltarCliente");

const btnExcluirSelecionados =
    document.getElementById("btnExcluirSelecionados");

const btnEditarSelecionado =
    document.getElementById("btnEditarSelecionado");

const selecionarTodos =
    document.getElementById("selecionarTodos");

const secaoFiltros =
    document.getElementById("secaoFiltros");

const secaoTabela =
    document.getElementById("secaoTabela");

const botoesAcaoTopo =
    document.getElementById("botoesAcaoTopo");


// =========================================================
// FILTROS
// =========================================================

const filtroCodigo =
    document.getElementById("filtroCodigo");

const filtroRazaoSocial =
    document.getElementById("filtroRazaoSocial");

const filtroCnpj =
    document.getElementById("filtroCnpj");

const filtroVendedor =
    document.getElementById("filtroVendedor");


// =========================================================
// VARIÁVEIS
// =========================================================

let listaClientesGlobal = [];

let clienteEmEdicaoId = null;


// =========================================================
// INICIALIZAR PÁGINA
// =========================================================

document.addEventListener("DOMContentLoaded", async () => {
    // Confirma a sessão antes de carregar os dados.
    const sessaoValida = await verificarSessaoCliente();

    if (!sessaoValida) {
        return;
    }

    atualizarMenuUsuario();

    configurarLogout();

    configurarMascaras();

    // As funções de carregamento serão preservadas
    // nas próximas partes do arquivo.
    await carregarClientes();
    await carregarVendedoresSelect();
});


// =========================================================
// MENU DO USUÁRIO
// =========================================================

function atualizarMenuUsuario() {
    try {
        const userName =
            document.getElementById("userName");

        const userRole =
            document.getElementById("userRole");

        const userAvatar =
            document.getElementById("userAvatar");

        if (usuarioLogado && usuarioLogado.nome) {
            if (userName) {
                userName.textContent = usuarioLogado.nome;
            }

            if (userRole) {
                userRole.textContent =
                    usuarioLogado.permissao || "Usuário";
            }

            if (userAvatar) {
                userAvatar.textContent =
                    usuarioLogado.nome.charAt(0).toUpperCase();
            }
        }

        // Mantém o menu de usuários oculto para vendedores.
        if (
            String(usuarioLogado?.permissao || "")
                .trim()
                .toLowerCase() === "vendedor"
        ) {
            const linkUsuarios =
                document.querySelector('a[href*="usuarios.html"]');

            if (linkUsuarios) {
                linkUsuarios.style.display = "none";
            }
        }

    } catch (erro) {
        console.error("Erro ao atualizar menu:", erro);
    }
}


// =========================================================
// LOGOUT COM ENCERRAMENTO DA SESSÃO NO SERVIDOR
// =========================================================

function configurarLogout() {
    const btnLogout =
        document.getElementById("btnLogout") ||
        document.querySelector(".logout");

    if (!btnLogout) {
        return;
    }

    btnLogout.onclick = async () => {
        btnLogout.disabled = true;

        try {
            const resposta = await fetch(
                `${API_URL}/api/logout`,
                {
                    method: "POST",
                    credentials: "include"
                }
            );

            if (!resposta.ok && resposta.status !== 401) {
                console.error(
                    "O servidor não confirmou o encerramento da sessão."
                );
            }

        } catch (erro) {
            console.error("Erro ao encerrar sessão:", erro);

        } finally {
            limparDadosLogin();
            window.location.href = "login.html";
        }
    };
}
// =========================================================
// MÁSCARAS
// =========================================================

function configurarMascaras() {

    // CNPJ
    const campoCnpj = document.getElementById("cnpj");

    if (campoCnpj) {
        campoCnpj.addEventListener("input", () => {
            let valor = campoCnpj.value.replace(/\D/g, "");
            valor = valor.substring(0, 14);

            valor = valor.replace(
                /^(\d{2})(\d)/,
                "$1.$2"
            );

            valor = valor.replace(
                /^(\d{2})\.(\d{3})(\d)/,
                "$1.$2.$3"
            );

            valor = valor.replace(
                /\.(\d{3})(\d)/,
                ".$1/$2"
            );

            valor = valor.replace(
                /(\d{4})(\d)/,
                "$1-$2"
            );

            campoCnpj.value = valor;
        });
    }


    // TELEFONE
    const campoTelefone =
        document.getElementById("telefone");

    if (campoTelefone) {
        campoTelefone.addEventListener("input", () => {
            let valor =
                campoTelefone.value.replace(/\D/g, "");

            valor = valor.substring(0, 11);

            if (valor.length > 10) {
                valor = valor.replace(
                    /^(\d{2})(\d{5})(\d{4})$/,
                    "($1) $2-$3"
                );
            } else if (valor.length > 6) {
                valor = valor.replace(
                    /^(\d{2})(\d{4})(\d{0,4})$/,
                    "($1) $2-$3"
                );
            } else if (valor.length > 2) {
                valor = valor.replace(
                    /^(\d{2})(\d+)$/,
                    "($1) $2"
                );
            }

            campoTelefone.value = valor;
        });
    }


    // CEP
    const campoCep = document.getElementById("cep");

    if (campoCep) {
        campoCep.addEventListener("input", () => {
            let valor = campoCep.value.replace(/\D/g, "");
            valor = valor.substring(0, 8);

            if (valor.length > 5) {
                valor = valor.replace(
                    /^(\d{5})(\d{1,3})$/,
                    "$1-$2"
                );
            }

            campoCep.value = valor;
        });
    }
}


// =========================================================
// CARREGAR VENDEDORES NO SELECT
// =========================================================

async function carregarVendedoresSelect() {

    const select =
        document.getElementById("vendedor");

    if (!select) {
        return;
    }

    try {
        const resposta = await fetch(
            `${API_URL}/api/usuarios`,
            {
                method: "GET",
                credentials: "include"
            }
        );

        const resultado =
            await resposta.json().catch(() => ({}));

        if (
            tratarRespostaAutenticacaoCliente(
                resposta,
                resultado
            )
        ) {
            return;
        }

        if (!resposta.ok) {
            throw new Error(
                resultado.erro ||
                "Erro ao carregar vendedores."
            );
        }

        if (!Array.isArray(resultado)) {
            throw new Error(
                "A API de usuários não retornou uma lista."
            );
        }

        const vendedores = resultado.filter(usuario =>
            String(usuario.permissao || "")
                .trim()
                .toLowerCase() === "vendedor"
        );

        select.innerHTML =
            '<option value="">Selecione um vendedor</option>';

        vendedores.forEach(vendedor => {
            const opcao = document.createElement("option");

            opcao.value = vendedor.id;
            opcao.textContent =
                vendedor.nome || vendedor.usuario;

            select.appendChild(opcao);
        });

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
// ABRIR FORMULÁRIO DE CADASTRO
// =========================================================

function abrirFormularioNovo() {

    clienteEmEdicaoId = null;

    if (formCliente) {
        formCliente.reset();
    }

    const titulo =
        document.getElementById("tituloPainelCliente");

    if (titulo) {
        titulo.textContent = "Cadastrar Cliente";
    }

    abrirPainelCadastro();
}


// =========================================================
// MOSTRAR PAINEL DE CADASTRO
// =========================================================

function abrirPainelCadastro() {

    if (painelCadastroCliente) {
        painelCadastroCliente.style.display = "block";
    }

    if (secaoFiltros) {
        secaoFiltros.style.display = "none";
    }

    if (secaoTabela) {
        secaoTabela.style.display = "none";
    }

    if (botoesAcaoTopo) {
        botoesAcaoTopo.style.display = "none";
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

    if (painelCadastroCliente) {
        painelCadastroCliente.style.display = "none";
    }

    if (secaoFiltros) {
        secaoFiltros.style.display = "block";
    }

    if (secaoTabela) {
        secaoTabela.style.display = "block";
    }

    if (botoesAcaoTopo) {
        botoesAcaoTopo.style.display = "flex";
    }

    if (formCliente) {
        formCliente.reset();
    }

    clienteEmEdicaoId = null;
}


// =========================================================
// REGISTRAR EVENTOS DO FORMULÁRIO
// =========================================================

function configurarEventosCliente() {

    if (btnNovoCliente) {
        btnNovoCliente.addEventListener(
            "click",
            abrirFormularioNovo
        );
    }

    if (cancelarCliente) {
        cancelarCliente.addEventListener(
            "click",
            fecharFormulario
        );
    }

    if (btnVoltarCliente) {
        btnVoltarCliente.addEventListener(
            "click",
            fecharFormulario
        );
    }

    if (formCliente) {
        formCliente.addEventListener(
            "submit",
            salvarCliente
        );
    }

    if (filtroCodigo) {
        filtroCodigo.addEventListener(
            "input",
            renderizarClientes
        );
    }

    if (filtroRazaoSocial) {
        filtroRazaoSocial.addEventListener(
            "input",
            renderizarClientes
        );
    }

    if (filtroCnpj) {
        filtroCnpj.addEventListener(
            "input",
            renderizarClientes
        );
    }

    if (filtroVendedor) {
        filtroVendedor.addEventListener(
            "change",
            renderizarClientes
        );
    }

    if (selecionarTodos) {
        selecionarTodos.addEventListener(
            "change",
            () => {
                document
                    .querySelectorAll(".checkbox-cliente")
                    .forEach(checkbox => {
                        checkbox.checked =
                            selecionarTodos.checked;
                    });
            }
        );
    }

    if (btnExcluirSelecionados) {
        btnExcluirSelecionados.addEventListener(
            "click",
            excluirClientesSelecionados
        );
    }

    if (btnEditarSelecionado) {
        btnEditarSelecionado.addEventListener(
            "click",
            editarClienteSelecionado
        );
    }
}


// =========================================================
// OBTER DADOS DO FORMULÁRIO
// =========================================================

function obterValorCliente(id) {

    const campo = document.getElementById(id);

    return campo
        ? String(campo.value || "").trim()
        : "";
}


// =========================================================
// SALVAR CLIENTE
// =========================================================

async function salvarCliente(evento) {

    evento.preventDefault();

    const dados = {
        razao_social: obterValorCliente("razaoSocial"),
        cnpj: obterValorCliente("cnpj"),
        telefone: obterValorCliente("telefone"),
        email: obterValorCliente("email"),
        cep: obterValorCliente("cep"),
        endereco: obterValorCliente("endereco"),
        numero: obterValorCliente("numero"),
        bairro: obterValorCliente("bairro"),
        cidade: obterValorCliente("cidade"),
        estado: obterValorCliente("estado"),
        vendedor_id: obterValorCliente("vendedor")
    };

    if (!dados.razao_social || !dados.cnpj) {
        alert(
            "Preencha a razão social e o CNPJ."
        );
        return;
    }

    const url = clienteEmEdicaoId
        ? `${API_URL}/api/clientes/${clienteEmEdicaoId}`
        : `${API_URL}/api/clientes`;

    const metodo = clienteEmEdicaoId
        ? "PUT"
        : "POST";

    try {
        const resposta = await fetch(
            url,
            {
                method: metodo,
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify(dados)
            }
        );

        const resultado =
            await resposta.json().catch(() => ({}));

        if (
            tratarRespostaAutenticacaoCliente(
                resposta,
                resultado
            )
        ) {
            return;
        }

        if (!resposta.ok) {
            throw new Error(
                resultado.erro ||
                "Não foi possível salvar o cliente."
            );
        }

        alert(
            resultado.mensagem ||
            (
                clienteEmEdicaoId
                    ? "Cliente atualizado com sucesso."
                    : "Cliente cadastrado com sucesso."
            )
        );

        fecharFormulario();

        await carregarClientes();

    } catch (erro) {
        console.error("Erro ao salvar cliente:", erro);

        alert(
            erro.message ||
            "Erro de conexão com o servidor."
        );
    }
}
// =========================================================
// CARREGAR CLIENTES
// =========================================================

async function carregarClientes() {

    try {

        const resposta = await fetch(
            `${API_URL}/api/clientes`,
            {
                method: "GET",
                credentials: "include"
            }
        );

        const resultado =
            await resposta.json().catch(() => ({}));

        if (
            tratarRespostaAutenticacaoCliente(
                resposta,
                resultado
            )
        ) {
            return;
        }

        if (!resposta.ok) {
            throw new Error(
                resultado.erro ||
                "Erro ao carregar clientes."
            );
        }

        if (!Array.isArray(resultado)) {
            throw new Error(
                "A API não retornou uma lista de clientes."
            );
        }

        listaClientesGlobal = resultado;

        renderizarClientes();

    } catch (erro) {

        console.error(
            "Erro ao carregar clientes:",
            erro
        );

        alert(
            erro.message ||
            "Não foi possível carregar os clientes."
        );
    }
}


// =========================================================
// FILTRAR CLIENTES
// =========================================================

function obterClientesFiltrados() {

    let lista = [...listaClientesGlobal];

    const codigo = filtroCodigo
        ? filtroCodigo.value.trim().toLowerCase()
        : "";

    const razaoSocial = filtroRazaoSocial
        ? filtroRazaoSocial.value.trim().toLowerCase()
        : "";

    const cnpj = filtroCnpj
        ? filtroCnpj.value.replace(/\D/g, "")
        : "";

    const vendedor = filtroVendedor
        ? filtroVendedor.value.trim()
        : "";

    if (codigo) {
        lista = lista.filter(cliente =>
            String(cliente.id || "")
                .toLowerCase()
                .includes(codigo)
        );
    }

    if (razaoSocial) {
        lista = lista.filter(cliente =>
            String(cliente.razao_social || "")
                .toLowerCase()
                .includes(razaoSocial)
        );
    }

    if (cnpj) {
        lista = lista.filter(cliente =>
            String(cliente.cnpj || "")
                .replace(/\D/g, "")
                .includes(cnpj)
        );
    }

    if (vendedor) {
        lista = lista.filter(cliente =>
            String(
                cliente.vendedor_id ??
                cliente.usuario_id ??
                ""
            ) === vendedor
        );
    }

    return lista;
}


// =========================================================
// RENDERIZAR CLIENTES
// =========================================================


function renderizarClientes() {
    if (!listaClientes) {
        console.warn("Tabela de clientes não encontrada.");
        return;
    }

    const clientes = obterClientesFiltrados();

    listaClientes.innerHTML = "";

    if (clientes.length === 0) {
        listaClientes.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; color: #64748b;">
                    Nenhum cliente encontrado.
                </td>
            </tr>
        `;
        return;
    }

    clientes.forEach(cliente => {
        const linha = document.createElement("tr");

        // Checkbox de seleção
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "checkbox-cliente";
        checkbox.dataset.id = cliente.id;

        const colunaCheckbox = document.createElement("td");
        colunaCheckbox.style.textAlign = "center";
        colunaCheckbox.appendChild(checkbox);
        linha.appendChild(colunaCheckbox);

        // Dados na mesma ordem dos cabeçalhos da tabela
        const valores = [
            cliente.id ?? "",
            cliente.razao_social ?? "",
            cliente.cnpj ?? "",
            cliente.email ?? cliente.contato ?? "",
            cliente.telefone ?? "",
            cliente.vendedor_nome ?? cliente.vendedor ?? ""
        ];

        valores.forEach(valor => {
            const coluna = document.createElement("td");
            coluna.textContent = String(valor);
            linha.appendChild(coluna);
        });

        // Coluna STATUS
        const colunaStatus = document.createElement("td");
        const status = String(cliente.status ?? "").trim();
        const statusNormalizado = status.toLowerCase();

        const etiquetaStatus = document.createElement("span");
        etiquetaStatus.className = "status-cliente";

        if (statusNormalizado === "ativo") {
            etiquetaStatus.classList.add("cliente-ativo");
        } else if (statusNormalizado === "inativo") {
            etiquetaStatus.classList.add("cliente-inativo");
        }

        etiquetaStatus.textContent = status || "Não informado";
        colunaStatus.appendChild(etiquetaStatus);
        linha.appendChild(colunaStatus);

        // Coluna AÇÃO
        const colunaAcoes = document.createElement("td");
        colunaAcoes.style.textAlign = "center";

        const botaoEditar = document.createElement("button");
        botaoEditar.type = "button";
        botaoEditar.className = "btn-editar-cliente";
        botaoEditar.textContent = "Editar";
        botaoEditar.addEventListener("click", () => {
            editarCliente(cliente.id);
        });

        colunaAcoes.appendChild(botaoEditar);
        linha.appendChild(colunaAcoes);

        listaClientes.appendChild(linha);
    });
}



// =========================================================
// EDITAR CLIENTE
// =========================================================

function editarCliente(id) {

    const cliente = listaClientesGlobal.find(
        item => String(item.id) === String(id)
    );

    if (!cliente) {
        alert("Cliente não encontrado.");
        return;
    }

    clienteEmEdicaoId = cliente.id;

    const campos = {
        razaoSocial: cliente.razao_social,
        cnpj: cliente.cnpj,
        telefone: cliente.telefone,
        email: cliente.email,
        cep: cliente.cep,
        endereco: cliente.endereco,
        numero: cliente.numero,
        bairro: cliente.bairro,
        cidade: cliente.cidade,
        estado: cliente.estado,
        vendedor: cliente.vendedor_id ??
            cliente.usuario_id ??
            ""
    };

    Object.entries(campos).forEach(([idCampo, valor]) => {
        const campo = document.getElementById(idCampo);

        if (campo) {
            campo.value = valor ?? "";
        }
    });

    const titulo = document.getElementById(
        "tituloPainelCliente"
    );

    if (titulo) {
        titulo.textContent = "Editar Cliente";
    }

    abrirPainelCadastro();
}


// =========================================================
// EXCLUIR CLIENTES SELECIONADOS
// =========================================================

async function excluirClientesSelecionados() {

    const selecionados = Array.from(
        document.querySelectorAll(
            ".checkbox-cliente:checked"
        )
    );

    if (selecionados.length === 0) {
        alert("Selecione pelo menos um cliente.");
        return;
    }

    const confirmar = confirm(
        `Deseja excluir ${selecionados.length} cliente(s) selecionado(s)?`
    );

    if (!confirmar) {
        return;
    }

    try {

        for (const checkbox of selecionados) {

            const id = checkbox.dataset.id;

            const resposta = await fetch(
                `${API_URL}/api/clientes/${encodeURIComponent(id)}`,
                {
                    method: "DELETE",
                    credentials: "include"
                }
            );

            const resultado =
                await resposta.json().catch(() => ({}));

            if (
                tratarRespostaAutenticacaoCliente(
                    resposta,
                    resultado
                )
            ) {
                return;
            }

            if (!resposta.ok) {
                throw new Error(
                    resultado.erro ||
                    `Não foi possível excluir o cliente ${id}.`
                );
            }
        }

        alert("Operação de exclusão concluída.");

        if (selecionarTodos) {
            selecionarTodos.checked = false;
        }

        await carregarClientes();

    } catch (erro) {

        console.error("Erro ao excluir clientes:", erro);

        alert(
            erro.message ||
            "Erro ao excluir clientes."
        );
    }
}


// =========================================================
// EDITAR CLIENTE SELECIONADO
// =========================================================

function editarClienteSelecionado() {

    const selecionados = document.querySelectorAll(
        ".checkbox-cliente:checked"
    );

    if (selecionados.length !== 1) {
        alert("Selecione exatamente um cliente para editar.");
        return;
    }

    editarCliente(
        selecionados[0].dataset.id
    );
}


// =========================================================
// FINALIZAR INICIALIZAÇÃO
// =========================================================

document.addEventListener("DOMContentLoaded", () => {
    configurarEventosCliente();
});


// =========================================================
// FUNÇÕES GLOBAIS
// =========================================================

window.abrirFormularioNovo = abrirFormularioNovo;
window.fecharFormulario = fecharFormulario;
window.editarCliente = editarCliente;
window.carregarClientes = carregarClientes;
window.renderizarClientes = renderizarClientes;