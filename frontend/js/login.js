const formLogin = document.getElementById("formLogin");
const API_URL = "http://localhost:3000";

if (formLogin) {

    formLogin.onsubmit = async (e) => {

        e.preventDefault();

        const usuario =
            document
                .getElementById("loginUsuario")
                .value
                .trim();

        const senha =
            document
                .getElementById("loginSenha")
                .value
                .trim();

        try {

            const resposta = await fetch(
                `${API_URL}/api/login`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        usuario,
                        senha
                    })
                }
            );

            const resultado =
                await resposta.json();


            if (resposta.ok) {

                // Salva todos os dados do usuário logado:
                // id, nome, usuario, setor, permissao e status
                localStorage.setItem(
                    "usuario",
                    JSON.stringify(resultado)
                );

                formLogin.reset();

                window.location.href =
                    "../index.html";

            } else {

                alert(
                    resultado.erro ||
                    "Usuário ou senha inválidos."
                );
            }

        } catch (erro) {

            console.error(
                "Erro de conexão:",
                erro
            );

            alert(
                "Erro de conexão com o servidor Node.js."
            );
        }
    };
}