const API_URL = "http://localhost:3000";

let usuarioLogado = {};
try {
    usuarioLogado = JSON.parse(localStorage.getItem("usuario") || localStorage.getItem("usuarioLogado") || "{}");
} catch (e) {
    console.error("Erro ao ler usuário do localStorage:", e);
}

document.addEventListener("DOMContentLoaded", () => {
    // Bloqueia o acesso de vendedores à auditoria
    if (usuarioLogado.permissao && usuarioLogado.permissao.toLowerCase() === "vendedor") {
        alert("Acesso restrito: Vendedores não possuem permissão para visualizar a auditoria do sistema.");
        window.location.href = "boletos.html";
        return;
    }

    carregarAuditoria();
    
    // Configuração do menu do usuário / Logout
    try {
        const userName = document.getElementById("userName");
        const userRole = document.getElementById("userRole");
        const userAvatar = document.getElementById("userAvatar");

        if (usuarioLogado.nome) {
            if (userName) userName.textContent = usuarioLogado.nome;
            if (userRole) userRole.textContent = usuarioLogado.permissao || "Usuário";
            if (userAvatar) userAvatar.textContent = usuarioLogado.nome.charAt(0).toUpperCase();
        }
    } catch (e) {
        console.error("Erro ao atualizar o menu lateral:", e);
    }

    const btnLogout = document.getElementById("btnLogout");
    if (btnLogout) {
        btnLogout.onclick = () => {
            localStorage.removeItem("usuario");
            localStorage.removeItem("usuarioLogado");
            window.location.href = "login.html";
        };
    }
});

async function carregarAuditoria() {
    try {
        const resposta = await fetch(`${API_URL}/api/auditoria`);
        const logs = await resposta.json();
        const tbody = document.getElementById("listaAuditoria");

        if (!tbody) return;

        if (!logs || logs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #64748b;">Nenhum registro de auditoria encontrado.</td></tr>`;
            return;
        }

        tbody.innerHTML = logs.map(l => {
            const dataFormatada = l.data_hora || l.created_at 
                ? new Date(l.data_hora || l.created_at).toLocaleString('pt-BR') 
                : '-';

            return `
                <tr>
                    <td><strong>#${l.id}</strong></td>
                    <td>${l.usuario || 'Sistema'}</td>
                    <td>${l.acao || l.mensagem || 'Ação registrada'}</td>
                    <td>${dataFormatada}</td>
                </tr>
            `;
        }).join("");
    } catch (e) {
        console.error("Erro ao carregar auditoria:", e);
        const tbody = document.getElementById("listaAuditoria");
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #dc2626;">Erro ao conectar com o servidor de auditoria.</td></tr>`;
        }
    }
}