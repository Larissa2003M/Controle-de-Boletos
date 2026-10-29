
const API_URL = "http://localhost:3000";

let usuarioLogado = {};

try {
    usuarioLogado = JSON.parse(
        localStorage.getItem("usuario") ||
        localStorage.getItem("usuarioLogado") ||
        "{}"
    );
} catch (erro) {
    console.error("Erro ao ler usuário:", erro);
}

// =========================================================
// INICIALIZAR PÁGINA
// =========================================================

document.addEventListener("DOMContentLoaded", async () => {
    const permissao = String(
        usuarioLogado.permissao || ""
    ).trim().toLowerCase();

    // Bloqueio visual para vendedores.
    // A autorização definitiva deve existir no backend.
    if (permissao === "vendedor") {
        alert(
            "Acesso restrito: vendedores não podem visualizar a auditoria."
        );

        window.location.href = "../index.html";
        return;
    }

    configurarMenuUsuario();
    configurarLogout();
    configurarFiltrosAuditoria();

    await carregarAuditoria();
});

// =========================================================
// MENU DO USUÁRIO
// =========================================================

function configurarMenuUsuario() {
    const userName = document.getElementById("userName");
    const userRole = document.getElementById("userRole");
    const userAvatar = document.getElementById("userAvatar");

    if (userName) {
        userName.textContent = usuarioLogado.nome || "Usuário";
    }

    if (userRole) {
        userRole.textContent =
            usuarioLogado.permissao || "Usuário";
    }

    if (userAvatar) {
        userAvatar.textContent = String(
            usuarioLogado.nome || "U"
        ).charAt(0).toUpperCase();
    }
}

// =========================================================
// LOGOUT
// =========================================================

function configurarLogout() {
    const btnLogout = document.getElementById("btnLogout");

    if (!btnLogout) return;

    btnLogout.addEventListener("click", async () => {
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
                const dados = await resposta
                    .json()
                    .catch(() => ({}));

                throw new Error(
                    dados.erro ||
                    "Não foi possível encerrar a sessão."
                );
            }
        } catch (erro) {
            console.error("Erro no logout:", erro);
        } finally {
            localStorage.removeItem("usuario");
            localStorage.removeItem("usuarioLogado");

            window.location.href = "login.html";
        }
    });
}

// =========================================================
// CONFIGURAR FILTROS
// =========================================================

function configurarFiltrosAuditoria() {
    const formulario = document.getElementById(
        "formFiltrosAuditoria"
    );

    const btnLimpar = document.getElementById(
        "btnLimparAuditoria"
    );

    if (formulario) {
        formulario.addEventListener("submit", async (evento) => {
            evento.preventDefault();
            await carregarAuditoria();
        });
    }

    if (btnLimpar && formulario) {
        btnLimpar.addEventListener("click", async () => {
            formulario.reset();
            await carregarAuditoria();
        });
    }
}

// =========================================================
// CARREGAR AUDITORIA COM FILTROS
// =========================================================

async function carregarAuditoria() {
    const tbody = document.getElementById("listaAuditoria");

    if (!tbody) return;

    mostrarMensagem(
        tbody,
        "Carregando registros de auditoria..."
    );

    try {
        const parametros = new URLSearchParams();

        const usuario = document
            .getElementById("filtroUsuario")
            ?.value.trim();

        const acao = document
            .getElementById("filtroAcao")
            ?.value.trim();

        const dataInicio = document
            .getElementById("dataInicio")
            ?.value;

        const dataFim = document
            .getElementById("dataFim")
            ?.value;

        if (usuario) {
            parametros.set("usuario", usuario);
        }

        if (acao) {
            parametros.set("acao", acao);
        }

        if (dataInicio) {
            parametros.set("dataInicio", dataInicio);
        }

        if (dataFim) {
            parametros.set("dataFim", dataFim);
        }

        if (dataInicio && dataFim && dataInicio > dataFim) {
            mostrarMensagem(
                tbody,
                "A data inicial não pode ser posterior à data final.",
                true
            );
            return;
        }

        const query = parametros.toString();

        const url = `${API_URL}/api/auditoria${
            query ? `?${query}` : ""
        }`;

        const resposta = await fetch(url, {
            method: "GET",
            credentials: "include",
            headers: {
                "Accept": "application/json"
            }
        });

        if (resposta.status === 401) {
            localStorage.removeItem("usuario");
            localStorage.removeItem("usuarioLogado");

            alert("Sua sessão expirou. Faça login novamente.");
            window.location.href = "login.html";
            return;
        }

        if (resposta.status === 403) {
            alert(
                "Você não tem permissão para consultar a auditoria."
            );

            window.location.href = "../index.html";
            return;
        }

        const resultado = await resposta
            .json()
            .catch(() => ({}));

        if (!resposta.ok) {
            throw new Error(
                resultado.erro ||
                "Erro ao consultar os registros de auditoria."
            );
        }

        if (!Array.isArray(resultado)) {
            throw new Error(
                "O servidor não retornou uma lista de registros."
            );
        }

        renderizarAuditoria(resultado);

    } catch (erro) {
        console.error(
            "Erro ao carregar auditoria:",
            erro
        );

        mostrarMensagem(
            tbody,
            erro.message ||
            "Não foi possível carregar a auditoria.",
            true
        );
    }
}

// =========================================================
// RENDERIZAR TABELA DE AUDITORIA
// =========================================================

function renderizarAuditoria(logs) {
    const tbody = document.getElementById("listaAuditoria");

    if (!tbody) return;

    tbody.replaceChildren();

    if (!logs.length) {
        mostrarMensagem(
            tbody,
            "Nenhum registro de auditoria encontrado."
        );
        return;
    }

    logs.forEach((log) => {
        const linha = document.createElement("tr");

        const valores = [
            log.id ?? "-",
            log.usuario || "Não identificado",
            log.acao || log.mensagem || "Ação registrada",
            log.entidade || "-",
            formatarValor(log.valor_anterior),
            formatarValor(log.valor_novo),
            log.ip || "-",
            log.resultado || "-",
            formatarData(log.data_hora || log.created_at)
        ];

        valores.forEach((valor, indice) => {
            const celula = document.createElement("td");

            if (indice === 0) {
                const strong = document.createElement("strong");
                strong.textContent = String(valor);
                celula.appendChild(strong);
            } else if (indice === 4 || indice === 5) {
                celula.className = "auditoria-detalhes";
                celula.textContent = String(valor);
            } else if (indice === 7) {
                const etiqueta = document.createElement("span");
                etiqueta.className = "resultado-auditoria";

                const resultado = String(valor).toLowerCase();

                if (
                    resultado.includes("sucesso") ||
                    resultado.includes("sucesso")
                ) {
                    etiqueta.classList.add("resultado-sucesso");
                } else if (
                    resultado.includes("falha") ||
                    resultado.includes("erro") ||
                    resultado.includes("bloqueio")
                ) {
                    etiqueta.classList.add("resultado-falha");
                }

                etiqueta.textContent = String(valor);
                celula.appendChild(etiqueta);
            } else {
                celula.textContent = String(valor);
            }

            linha.appendChild(celula);
        });

        tbody.appendChild(linha);
    });
}

// =========================================================
// FORMATAR VALORES ANTERIORES E NOVOS
// =========================================================

function formatarValor(valor) {
    if (
        valor === null ||
        valor === undefined ||
        valor === ""
    ) {
        return "-";
    }

    let dados = valor;

    // Se veio como JSON em formato de texto,
    // converte para objeto.
    if (typeof valor === "string") {
        try {
            dados = JSON.parse(valor);
        } catch {
            return String(valor);
        }
    }

    // Se não for objeto, mostra normalmente.
    if (
        typeof dados !== "object" ||
        dados === null
    ) {
        return String(dados);
    }

    const nomesCampos = {
        id: "Código",
        razao_social: "Razão social",
        num_boleto: "Número do boleto",
        linha_digitavel: "Linha digitável",
        valor: "Valor",
        data_emissao: "Data de emissão",
        vencimento: "Vencimento",
        vendedor: "Vendedor",
        status: "Status",
        motivo_baixa: "Motivo da baixa",
        pagador_cpf_cnpj: "CPF/CNPJ do pagador",
        pagador_endereco: "Endereço do pagador",
        pagador_numero: "Número",
        pagador_cep: "CEP",
        instrucoes: "Instruções"
    };

    const linhas = [];

    Object.entries(dados).forEach(
        ([campo, conteudo]) => {

            const nome =
                nomesCampos[campo] ||
                campo;

            let valorFormatado = conteudo;

            if (
                conteudo === null ||
                conteudo === undefined ||
                conteudo === ""
            ) {
                valorFormatado = "Não informado";
            }

            if (campo === "valor") {
                const numero = Number(conteudo);

                if (!Number.isNaN(numero)) {
                    valorFormatado =
                        numero.toLocaleString(
                            "pt-BR",
                            {
                                style: "currency",
                                currency: "BRL"
                            }
                        );
                }
            }

            if (
                campo === "data_emissao" ||
                campo === "vencimento"
            ) {
                valorFormatado =
                    formatarDataSomenteData(conteudo);
            }

            linhas.push(
                `${nome}: ${valorFormatado}`
            );
        }
    );

    return linhas.join("\n");
}


// =========================================================
// FORMATAR SOMENTE DATA
// =========================================================

function formatarDataSomenteData(valor) {
    if (!valor) {
        return "Não informado";
    }

    const texto = String(valor);

    const correspondencia =
        texto.match(
            /^(\d{4})-(\d{2})-(\d{2})/
        );

    if (correspondencia) {
        return (
            `${correspondencia[3]}/` +
            `${correspondencia[2]}/` +
            `${correspondencia[1]}`
        );
    }

    return texto;
}

// =========================================================
// FORMATAR DATA E HORA
// =========================================================

function formatarData(valor) {
    if (!valor) return "-";

    let data;

    // MySQL pode devolver "AAAA-MM-DD HH:mm:ss".
    // Interpretamos esse formato como horário local.
    if (
        typeof valor === "string" &&
        /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(valor)
    ) {
        data = new Date(valor.replace(" ", "T"));
    } else {
        data = new Date(valor);
    }

    if (Number.isNaN(data.getTime())) {
        return String(valor);
    }

    return data.toLocaleString("pt-BR");
}

// =========================================================
// MENSAGENS DA TABELA
// =========================================================

function mostrarMensagem(tbody, mensagem, erro = false) {
    tbody.replaceChildren();

    const linha = document.createElement("tr");
    const celula = document.createElement("td");

    celula.colSpan = 9;
    celula.style.textAlign = "center";
    celula.style.padding = "20px";
    celula.style.color = erro ? "#dc2626" : "#64748b";
    celula.textContent = mensagem;

    linha.appendChild(celula);
    tbody.appendChild(linha);
}
