const formTrocarSenha =
    document.getElementById("formTrocarSenha");

const API_URL =
    "http://localhost:3000";


if (formTrocarSenha) {

    formTrocarSenha.addEventListener(
        "submit",
        async (e) => {

            e.preventDefault();


            const novaSenha =
                document
                    .getElementById("novaSenha")
                    .value;


            const confirmarSenha =
                document
                    .getElementById("confirmarSenha")
                    .value;


            // =====================================================
            // VERIFICA SE AS SENHAS SÃO IGUAIS
            // =====================================================

            if (
                novaSenha !==
                confirmarSenha
            ) {

                alert(
                    "As senhas informadas não são iguais."
                );

                return;
            }


            // =====================================================
            // POLÍTICA MÍNIMA DE SENHA
            // =====================================================

            const minimo8Caracteres =
                novaSenha.length >= 8;

            const possuiMaiuscula =
                /[A-Z]/.test(novaSenha);

            const possuiMinuscula =
                /[a-z]/.test(novaSenha);

            const possuiNumero =
                /[0-9]/.test(novaSenha);

            const possuiEspecial =
                /[^A-Za-z0-9]/.test(
                    novaSenha
                );


            if (
                !minimo8Caracteres ||
                !possuiMaiuscula ||
                !possuiMinuscula ||
                !possuiNumero ||
                !possuiEspecial
            ) {

                alert(
                    "A senha deve possuir no mínimo 8 caracteres, " +
                    "incluindo letra maiúscula, letra minúscula, " +
                    "número e caractere especial."
                );

                return;
            }


            try {

                // =================================================
                // ENVIA A NOVA SENHA PARA O SERVIDOR
                // =================================================

                const resposta =
                    await fetch(
                        `${API_URL}/api/trocar-senha-primeiro-acesso`,
                        {
                            method: "POST",

                            credentials: "include",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    novaSenha
                                })
                        }
                    );


                const resultado =
                    await resposta.json();


                // =================================================
                // VERIFICA ERRO DO SERVIDOR
                // =================================================

                if (!resposta.ok) {

                    alert(
                        resultado.erro ||
                        "Não foi possível alterar a senha."
                    );

                    return;
                }


                // =================================================
                // SENHA ALTERADA
                // =================================================

                alert(
                    "Senha alterada com sucesso."
                );


                // =================================================
                // REDIRECIONA PARA O SISTEMA
                // =================================================

                window.location.href =
                    "../index.html";


            } catch (erro) {

                console.error(
                    "Erro ao alterar senha:",
                    erro
                );


                alert(
                    "Não foi possível alterar a senha. " +
                    "Verifique se o servidor está funcionando."
                );
            }
        }
    );
}