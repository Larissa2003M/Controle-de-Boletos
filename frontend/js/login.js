
const formLogin = document.getElementById("formLogin");
const API_URL = "http://localhost:3000";

if (formLogin) {
    formLogin.addEventListener("submit", async (e) => {
        e.preventDefault();

        const usuario = document
            .getElementById("loginUsuario")
            .value.trim();

        const senha = document
            .getElementById("loginSenha")
            .value;

        try {
            const resposta = await fetch(`${API_URL}/api/login`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    usuario,
                    senha
                })
            });

            const resultado = await resposta.json();

            console.log("Resposta do login:", resultado);
            console.log("Status HTTP:", resposta.status);

            if (!resposta.ok) {
                alert(
                    resultado.erro ||
                    "Usuário ou senha inválidos."
                );
                return;
            }

            if (!resultado.usuario || !resultado.usuario.id) {
                console.error(
                    "Resposta do login sem dados válidos do usuário.",
                    resultado
                );

                alert("O servidor não retornou os dados esperados do usuário.");
                return;
            }

            localStorage.setItem(
                "usuario",
                JSON.stringify(resultado.usuario)
            );

            // Confirma se o servidor reconhece a sessão criada.
            const respostaSessao = await fetch(
                `${API_URL}/api/sessao`,
                {
                    method: "GET",
                    credentials: "include"
                }
            );

            const sessao = await respostaSessao.json();

            console.log("Status da sessão:", respostaSessao.status);
            console.log("Dados da sessão:", sessao);

            if (
                !respostaSessao.ok ||
                !sessao.usuario ||
                !sessao.usuario.id
            ) {
                console.error(
                    "Login aceito, mas a sessão não foi validada.",
                    sessao
                );

                alert(
                    "O login foi aceito, mas a sessão não foi reconhecida. " +
                    "Verifique o cookie da sessão no navegador."
                );
                return;
            }

            // Atualiza os dados locais com os dados confirmados pelo servidor.
            localStorage.setItem(
                "usuario",
                JSON.stringify(sessao.usuario)
            );

            formLogin.reset();

            window.location.href = "../index.html";

        } catch (erro) {
            console.error("Erro durante o login:", erro);

            alert(
                "Não foi possível concluir o login. " +
                "Verifique se o servidor Node.js está funcionando."
            );
        }
    });
}
