const API_URL = "http://localhost:3000";

const listaCobrancas = document.getElementById("listaCobrancas");
const filtroClienteCobranca = document.getElementById("filtroClienteCobranca");
const filtroVendedorCobranca = document.getElementById("filtroVendedorCobranca");
const filtroSituacaoCobranca = document.getElementById("filtroSituacaoCobranca");

let listaBoletosGlobal = [];

document.addEventListener("DOMContentLoaded", () => {
    try {
        const usuarioAtual = JSON.parse(localStorage.getItem("usuario") || localStorage.getItem("usuarioLogado") || "{}");
        const userName = document.getElementById("userName");
        const userRole = document.getElementById("userRole");
        const userAvatar = document.getElementById("userAvatar");

        if (usuarioAtual.nome) {
            if (userName) userName.textContent = usuarioAtual.nome;
            if (userRole) userRole.textContent = usuarioAtual.permissao || "Usuário";
            if (userAvatar) userAvatar.textContent = usuarioAtual.nome.charAt(0).toUpperCase();
        }

        if (usuarioAtual.permissao && usuarioAtual.permissao.toLowerCase() === "vendedor") {
            const linkUsuarios = document.querySelector('a[href*="usuarios.html"]');
            if (linkUsuarios) linkUsuarios.style.display = "none";
        }
    } catch (e) {
        console.error("Erro ao atualizar o menu lateral:", e);
    }

    const btnLogout = document.getElementById("btnLogout");

if (btnLogout) {
    btnLogout.onclick = async () => {
        try {
            const resposta = await fetch(`${API_URL}/api/logout`, {
                method: "POST",
                credentials: "include"
            });

            if (!resposta.ok && resposta.status !== 401) {
                throw new Error("Não foi possível encerrar a sessão.");
            }
        } catch (erro) {
            console.error("Erro ao encerrar sessão:", erro);
        } finally {
            localStorage.removeItem("usuario");
            localStorage.removeItem("usuarioLogado");

            window.location.href = "login.html";
        }
    };
}

    carregarDadosCobranca();
});

// Calcula de forma dinâmica o status do boleto comparando a data de vencimento com a data atual
function calcularStatusAutomatico(vencimentoStr, statusAtual) {
    if (statusAtual === "Pago" || statusAtual === "Baixa") return statusAtual;
    if (!vencimentoStr) return "Pendente";
    
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const dataVencimento = new Date(vencimentoStr);
    dataVencimento.setMinutes(dataVencimento.getMinutes() + dataVencimento.getTimezoneOffset());
    dataVencimento.setHours(0, 0, 0, 0);

    if (dataVencimento < hoje) {
        return "Vencido";
    }
    return "Pendente";
}


 // Realiza a requisição dos boletos e aplica os filtros de exibição conforme o perfil do usuário
async function carregarDadosCobranca() {
    try {
        let usuarioAtual = {};

        try {
            usuarioAtual = JSON.parse(
                localStorage.getItem("usuario") ||
                localStorage.getItem("usuarioLogado") ||
                "{}"
            );
        } catch (e) {
            console.error("Erro ao ler localStorage:", e);
        }

        const resposta = await fetch(`${API_URL}/api/boletos`, {
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
            alert("Você não tem permissão para consultar estes boletos.");
            return;
        }

        if (!resposta.ok) {
            throw new Error("Erro ao consultar os boletos.");
        }

        const todosBoletos = await resposta.json();

        if (!Array.isArray(todosBoletos)) {
            throw new Error("A resposta da API não contém uma lista válida de boletos.");
        }

        const permissao = String(
            usuarioAtual.permissao || ""
        ).trim().toLowerCase();

        const nomeUsuario = String(
            usuarioAtual.nome || ""
        ).trim().toLowerCase();

        if (permissao === "vendedor") {
            listaBoletosGlobal = todosBoletos.filter(b => {
                if (!b.vendedor) return false;

                return String(b.vendedor)
                    .trim()
                    .toLowerCase() === nomeUsuario;
            });
        } else {
            listaBoletosGlobal = todosBoletos;
        }

        aplicarFiltrosCobranca();

    } catch (erro) {
        console.error("Erro ao carregar dados para cobrança:", erro);
        alert("Não foi possível carregar os boletos. Verifique sua conexão com o servidor.");
    }
}


// Renderiza na tabela de cobranças os títulos pendentes ou vencidos com seus respectivos botões de ação e modais
function renderizarTabelaCobrancas(boletos) {
    if (!listaCobrancas) return;

    const pendentesVencidos = boletos.filter(b => {
        const statusReal = calcularStatusAutomatico(b.vencimento, b.status);
        return statusReal === "Vencido" || statusReal === "Pendente";
    });

    if (pendentesVencidos.length === 0) {
        listaCobrancas.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #16a34a; font-weight: 500;">Nenhum boleto pendente ou vencido no momento. Tudo em ordem! 🎉</td></tr>`;
        return;
    }

    listaCobrancas.innerHTML = pendentesVencidos.map(b => {
        const statusReal = calcularStatusAutomatico(b.vencimento, b.status);
        let classeStatus = statusReal === 'Vencido' ? 'overdue' : 'pending';

        const dataVencFmt = b.vencimento ? new Date(b.vencimento).toLocaleDateString('pt-BR') : '-';
        const valorFmt = Number(b.valor || 0).toFixed(2).replace('.', ',');

        const linkComprovante = b.pdf_comprovante 
            ? `<a href="${API_URL}/uploads/${b.pdf_comprovante}" target="_blank" title="Ver Comprovante" style="background: #0ea5e9; color: white; padding: 2px 6px; border-radius: 4px; text-decoration: none; font-size: 11px; margin-right: 3px;">📄 Comp.</a>` 
            : '';
        const linkSegundaVia = b.pdf_segunda_via 
            ? `<a href="${API_URL}/uploads/${b.pdf_segunda_via}" target="_blank" title="Ver 2ª Via" style="background: #6366f1; color: white; padding: 2px 6px; border-radius: 4px; text-decoration: none; font-size: 11px;">📄 2ª Via</a>` 
            : '';

        const botaoDetalhes = `<button type="button" onclick="abrirModalDetalhes('${b.id}', '${b.razao_social}', '${b.num_boleto}', '${valorFmt}', '${dataVencFmt}')" title="Ver Detalhes / Histórico" style="background: #0ea5e9; color: white; border: none; width: 30px; height: 30px; border-radius: 6px; cursor: pointer; font-size: 13px; display: inline-flex; align-items: center; justify-content: center;">🔍</button>`;

        return `
            <tr>
                <td><strong>${b.razao_social || '-'}</strong></td>
                <td>${b.num_boleto || '-'}</td>
                <td>R$ ${valorFmt}</td>
                <td>${dataVencFmt}</td>
                <td>${b.vendedor || 'Não atribuído'}</td>
                <td><span class="status ${classeStatus}">${statusReal}</span></td>
                <td style="text-align: center;">
                    <div style="display: flex; gap: 6px; justify-content: center; align-items: center;">
                        ${linkComprovante}
                        ${linkSegundaVia}
                        ${botaoDetalhes}
                        <button type="button" onclick="abrirModalCobranca(${b.id}, '${b.razao_social}', '${b.num_boleto}', '${valorFmt}', '${dataVencFmt}')" style="background: #2563eb; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 500;">
                            📝 Registrar Status
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

// Filtra a lista de cobranças em tempo real com base nos critérios de cliente, vendedor e situação selecionados
function aplicarFiltrosCobranca() {
    let usuarioAtual = {};
    try {
        usuarioAtual = JSON.parse(localStorage.getItem("usuario") || "{}");
    } catch (e) {}

    const cliente = filtroClienteCobranca ? filtroClienteCobranca.value.trim().toLowerCase() : "";
    const situacao = filtroSituacaoCobranca ? filtroSituacaoCobranca.value : "Vencidos";
    
    const isVendedor = String(usuarioAtual.permissao || "").trim().toLowerCase() === "vendedor";
    const nomeVendedorLogado = String(usuarioAtual.nome || "").trim().toLowerCase();

    const filtrados = listaBoletosGlobal.filter(b => {
        const statusCalculado = calcularStatusAutomatico(b.vencimento, b.status);
        
        if (situacao === "Vencidos" && statusCalculado !== "Vencido") {
            return false;
        }

        const bateCliente = cliente === "" || (b.razao_social && b.razao_social.toLowerCase().includes(cliente));

        if (isVendedor) {
            if (!b.vendedor) return false;
            const bateVendedorLogado = b.vendedor.trim().toLowerCase() === nomeVendedorLogado;
            return bateCliente && bateVendedorLogado;
        }

        const vendedorInput = filtroVendedorCobranca ? filtroVendedorCobranca.value.trim().toLowerCase() : "";
        const bateVendedorInput = vendedorInput === "" || (b.vendedor && b.vendedor.toLowerCase().includes(vendedorInput));

        return bateCliente && bateVendedorInput;
    });

    renderizarTabelaCobrancas(filtrados);
}

// Função de impressão inteligente que injeta o histórico diretamente na tabela na hora de imprimir
window.imprimirRelatorioComHistorico = async function() {
    const linhasTabela = document.querySelectorAll("#listaCobrancas tr");

    for (const tr of linhasTabela) {
        const btnReg = tr.querySelector("button[onclick*='abrirModalCobranca']");
        if (btnReg) {
            const onclickAttr = btnReg.getAttribute("onclick");
            const matchId = onclickAttr.match(/abrirModalCobranca\((['"]?)([^'",]+)\1/);
            
            if (matchId && matchId[2]) {
                const boletoId = matchId[2];
                try {
                    const resp = await fetch(`${API_URL}/api/cobrancas/${boletoId}`);
                    const historico = await resp.json();
                    
                    if (historico && historico.length > 0) {
                        const tdCliente = tr.querySelector("td");
                        if (tdCliente) {
                            let htmlHistorico = `<div style="margin-top: 6px; font-size: 11px; color: #475569; border-top: 1px dashed #cbd5e1; padding-top: 4px;"><strong>Histórico:</strong>`;
                            historico.forEach(h => {
                                htmlHistorico += `<br>• <strong>${h.usuario_remetente || 'Usuário'}</strong>: ${h.mensagem}`;
                            });
                            htmlHistorico += `</div>`;
                            
                            if (!tdCliente.innerHTML.includes("Histórico:")) {
                                tdCliente.innerHTML += htmlHistorico;
                            }
                        }
                    }
                } catch (e) {
                    console.error("Erro ao injetar histórico na impressão", e);
                }
            }
        }
    }

    setTimeout(() => {
        window.print();
        carregarDadosCobranca(); // Restaura a tabela original após o fechamento da impressão
    }, 400);
};

// Funções do Modal de Registro de Cobrança
let boletoIdSelecionadoParaCobranca = null;

// Abre o modal para inserção de um novo registro de status de cobrança para o boleto selecionado
window.abrirModalCobranca = function(id, cliente, numBoleto, valor, vencimento) {
    boletoIdSelecionadoParaCobranca = id;
    const modal = document.getElementById("modalCobranca");
    const detalhes = document.getElementById("detalhesBoletoModal");
    const textarea = document.getElementById("textoMensagemCobranca");

    if (detalhes) {
        detalhes.innerHTML = `Cliente: <strong>${cliente}</strong> | Boleto: <strong>${numBoleto}</strong> | Vencimento: <strong>${vencimento}</strong> (R$ ${valor})`;
    }
    if (textarea) textarea.value = ""; 

    if (modal) modal.style.display = "flex";
};

// Fecha o modal de registro de cobrança e limpa a referência do boleto selecionado
window.fecharModalCobranca = function() {
    const modal = document.getElementById("modalCobranca");
    if (modal) modal.style.display = "none";
    boletoIdSelecionadoParaCobranca = null;
};

// Envia os dados do novo registro de tratativa de cobrança para a API do backend
window.enviarCobrancaInterna = async function() {
    const mensagem = document.getElementById("textoMensagemCobranca").value.trim();
    if (!mensagem) {
        alert("Por favor, escreva a situação ou tratativa da cobrança.");
        return;
    }

    let usuarioAtual = {};
    try {
        usuarioAtual = JSON.parse(localStorage.getItem("usuario") || localStorage.getItem("usuarioLogado") || "{}");
    } catch (e) {}

    try {
        const resposta = await fetch(`${API_URL}/api/cobrancas`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                boleto_id: boletoIdSelecionadoParaCobranca,
                usuario_remetente: usuarioAtual.nome || "Usuário",
                mensagem: mensagem
            })
        });

        if (resposta.ok) {
            alert("Status de cobrança registrado com sucesso no sistema!");
            fecharModalCobranca();
            carregarDadosCobranca();
        } else {
            alert("Erro ao registrar a cobrança.");
        }
    } catch (erro) {
        console.error("Erro de conexão:", erro);
        alert("Erro de conexão com o servidor.");
    }
};

// Funções do Modal de Detalhes / Histórico (Lupa)
// Abre o modal de detalhes buscando e listando todo o histórico de tratativas associadas ao boleto
window.abrirModalDetalhes = async function(id, cliente, numBoleto, valor, vencimento) {
    const modal = document.getElementById("modalDetalhesCobranca");
    const infoTitulo = document.getElementById("infoTituloDetalhes");
    const listaHistorico = document.getElementById("listaHistoricoModal");

    if (infoTitulo) {
        infoTitulo.innerHTML = `Cliente: <strong>${cliente}</strong> | Boleto: <strong>${numBoleto}</strong><br>Vencimento: <strong>${vencimento}</strong> | Valor: <strong>R$ ${valor}</strong>`;
    }

    if (listaHistorico) {
        listaHistorico.innerHTML = `<p style="color: #64748b; font-size: 13px;">Carregando histórico...</p>`;
    }

    if (modal) modal.style.display = "flex";

    try {
        const urlBusca = `${API_URL}/api/cobrancas/${id}`;
        const resposta = await fetch(urlBusca);
        
        if (!resposta.ok) {
            throw new Error("Erro ao buscar no servidor");
        }

        const historico = await resposta.json();

        if (!historico || historico.length === 0) {
            listaHistorico.innerHTML = `<p style="color: #64748b; font-size: 13px;">Nenhuma tratativa registrada para este boleto.</p>`;
            return;
        }

        listaHistorico.innerHTML = historico.map(h => `
            <div style="background: #f8fafc; padding: 10px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 13px;">
                <div style="color: #64748b; font-size: 11px; margin-bottom: 4px;">
                    Por: <strong>${h.usuario_remetente || 'Usuário'}</strong> em ${new Date(h.data_registro || h.created_at).toLocaleString('pt-BR')}
                </div>
                <div style="color: #1e293b;">${h.mensagem}</div>
            </div>
        `).join("");
    } catch (erro) {
        console.error("Erro ao carregar histórico:", erro);
        listaHistorico.innerHTML = `<p style="color: #dc2626; font-size: 13px;">Erro ao carregar o histórico de tratativas do banco de dados.</p>`;
    }
};

// Fecha o modal de detalhes e histórico de cobranças
window.fecharModalDetalhes = function() {
    const modal = document.getElementById("modalDetalhesCobranca");
    if (modal) modal.style.display = "none";
};

if (filtroClienteCobranca) filtroClienteCobranca.oninput = aplicarFiltrosCobranca;
if (filtroVendedorCobranca) filtroVendedorCobranca.oninput = aplicarFiltrosCobranca;
if (filtroSituacaoCobranca) filtroSituacaoCobranca.onchange = aplicarFiltrosCobranca;