const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcrypt");
const session = require("express-session");

const app = express();


// =========================================================
// CONFIGURAÇÕES
// =========================================================

app.use(
    cors({
        origin: true,
        credentials: true
    })
);

app.use(express.json());


// =========================================================
// CONFIGURAÇÃO DA SESSÃO
// =========================================================

app.use(
    session({
        secret:
            process.env.SESSION_SECRET ||
            "controle-boleto-chave-sessao-2026-local",

        resave: false,

        saveUninitialized: false,

        rolling: true,

        cookie: {
            httpOnly: true,

            // No localhost utiliza HTTP.
            // Em produção deverá utilizar HTTPS.
            secure:
                process.env.NODE_ENV === "production",

            sameSite: "lax",

            maxAge: 15 * 60 * 1000
        }
    })
);

app.use(
    express.static(
        path.join(__dirname, "../frontend")
    )
);


// =========================================================
// CONEXÃO COM O BANCO DE DADOS
// =========================================================

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "controle_boleto"
});


db.connect((erro) => {

    if (erro) {

        console.error(
            "Erro ao conectar ao MySQL:",
            erro
        );

        return;
    }


    console.log(
        "Conectado ao MySQL com sucesso!"
    );
});


// =========================================================
// AUDITORIA
// =========================================================


function registrarAuditoria(usuario, acao, detalhes = {}) {
    const sql = `
        INSERT INTO auditoria (
            usuario,
            acao,
            entidade,
            valor_anterior,
            valor_novo,
            ip,
            resultado
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const valores = [
        usuario || "Sistema",
        acao || "Ação não identificada",
        detalhes.entidade || null,
        detalhes.valor_anterior ?? null,
        detalhes.valor_novo ?? null,
        detalhes.ip || null,
        detalhes.resultado || "Sucesso"
    ];

    db.query(sql, valores, (erro) => {
        if (erro) {
            console.error(
                "Erro ao registrar auditoria:",
                erro
            );
        }
    });
}




 // =========================================================
 // MIDDLEWARE - USUÁRIO AUTENTICADO
 // =========================================================


function autenticarUsuario(req, res, next) {

    console.log("\n--- DIAGNÓSTICO DA SESSÃO ---");

    console.log(
        "Cookie connect.sid recebido:",
        Boolean(
            req.headers.cookie &&
            req.headers.cookie.includes("connect.sid=")
        )
    );

    console.log("ID da sessão:", req.sessionID || "Não identificado");
    console.log("Sessão existe:", Boolean(req.session));
    console.log(
        "Usuário na sessão:",
        Boolean(req.session && req.session.usuario)
    );

    if (!req.session || !req.session.usuario) {
        return res.status(401).json({
            erro: "Sessão expirada. Faça login novamente."
        });
    }

    const idUsuario = req.session.usuario.id;

    const sql = `
        SELECT id, nome, usuario, setor, permissao, status
        FROM usuarios
        WHERE id = ?
        LIMIT 1
    `;

    db.query(sql, [idUsuario], (erro, resultados) => {

        if (erro) {
            console.error("Erro ao verificar usuário:", erro);

            return res.status(500).json({
                erro: "Erro ao verificar autenticação."
            });
        }

        if (resultados.length === 0) {
            return req.session.destroy(() => {
                res.clearCookie("connect.sid");

                return res.status(401).json({
                    erro: "Usuário não encontrado. Faça login novamente."
                });
            });
        }

        const usuarioAtual = resultados[0];

        if (
            !usuarioAtual.status ||
            String(usuarioAtual.status).trim().toLowerCase() !== "ativo"
        ) {
            return req.session.destroy(() => {
                res.clearCookie("connect.sid");

                return res.status(403).json({
                    erro: "Usuário inativo."
                });
            });
        }

        // Atualiza os dados da sessão com os valores atuais do banco.
        req.session.usuario = usuarioAtual;
        req.usuarioAutenticado = usuarioAtual;

        console.log("Resultado: usuário autenticado e ativo.");
        console.log("------------------------------");

        next();
    });
}




 // =========================================================
// MIDDLEWARE - SOMENTE ADMINISTRADOR
// =========================================================

function somenteAdministrador(req, res, next) {

    if (!req.session || !req.session.usuario) {
        return res.status(401).json({
            erro: "Sessão expirada. Faça login novamente."
        });
    }

    const usuarioSessao = req.session.usuario;

    const sql = `
        SELECT
            id,
            nome,
            usuario,
            setor,
            permissao,
            status
        FROM usuarios
        WHERE id = ?
        LIMIT 1
    `;

    db.query(sql, [usuarioSessao.id], (erro, resultados) => {

        if (erro) {
            console.error("Erro ao verificar permissão:", erro);

            return res.status(500).json({
                erro: "Erro ao verificar permissão."
            });
        }

        if (resultados.length === 0) {
            return req.session.destroy(() => {
                res.clearCookie("connect.sid");

                return res.status(401).json({
                    erro: "Usuário não encontrado."
                });
            });
        }

        const usuario = resultados[0];

        if (
            !usuario.status ||
            String(usuario.status).trim().toLowerCase() !== "ativo"
        ) {
            return req.session.destroy(() => {
                res.clearCookie("connect.sid");

                return res.status(403).json({
                    erro: "Usuário inativo."
                });
            });
        }

        if (
            !usuario.permissao ||
            String(usuario.permissao).trim().toLowerCase() !== "administrador"
        ) {
            return res.status(403).json({
                erro: "Acesso negado. Somente o Administrador possui permissão."
            });
        }

        req.usuarioAutenticado = usuario;

        next();
    });
}


// =========================================================
// MIDDLEWARE - SOMENTE ADMINISTRADOR E FINANCEIRO
// =========================================================

function somenteAdministradorFinanceiro(req, res, next) {

    const usuario =
        req.usuarioAutenticado ||
        (req.session && req.session.usuario);

    if (!usuario) {
        return res.status(401).json({
            erro: "Sessão expirada. Faça login novamente."
        });
    }

    const permissao = String(
        usuario.permissao || ""
    ).trim().toLowerCase();

    const perfisPermitidos = [
        "administrador",
        "financeiro",
        "operador"
    ];

    if (!perfisPermitidos.includes(permissao)) {
        return res.status(403).json({
            erro: "Acesso negado. Somente Administrador e Financeiro podem realizar esta operação."
        });
    }

    next();
}

// =========================================================
// POLÍTICA DE SENHA
// =========================================================

function validarPoliticaSenha(senha) {

    if (!senha) {
        return false;
    }

    const senhaString = String(senha);

    const minimo8Caracteres =
        senhaString.length >= 8;

    const possuiMaiuscula =
        /[A-Z]/.test(senhaString);

    const possuiMinuscula =
        /[a-z]/.test(senhaString);

    const possuiNumero =
        /[0-9]/.test(senhaString);

    const possuiEspecial =
        /[^A-Za-z0-9]/.test(senhaString);

    return (
        minimo8Caracteres &&
        possuiMaiuscula &&
        possuiMinuscula &&
        possuiNumero &&
        possuiEspecial
    );
}

// =========================================================
// LOGIN
// =========================================================

app.post(
    "/api/login",
    (req, res) => {

        const {
            usuario,
            senha
        } = req.body;


        if (
            !usuario ||
            !senha
        ) {

            return res
                .status(400)
                .json({
                    erro:
                        "Informe usuário e senha."
                });
        }


        // =========================================
        // BUSCA O USUÁRIO
        // =========================================

        const sql = `
            SELECT *
            FROM usuarios
            WHERE usuario = ?
            LIMIT 1
        `;


        db.query(
            sql,
            [usuario],
            async (
                erro,
                resultados
            ) => {

                if (erro) {

                    console.error(
                        "Erro no login:",
                        erro
                    );


                    return res
                        .status(500)
                        .json({
                            erro:
                                "Erro interno do servidor."
                        });
                }


                if (
                    resultados.length === 0
                ) {

                    return res
                        .status(401)
                        .json({
                            erro:
                                "Usuário ou senha inválidos."
                        });
                }


                const usuarioEncontrado =
                    resultados[0];


                // =========================================
                // VERIFICA SE O USUÁRIO ESTÁ ATIVO
                // =========================================

                if (
                    !usuarioEncontrado.status ||
                    String(
                        usuarioEncontrado.status
                    )
                        .trim()
                        .toLowerCase() !==
                        "ativo"
                ) {

                    return res
                        .status(403)
                        .json({
                            erro:
                                "Usuário inativo."
                        });
                }


                // =========================================
                // VERIFICA BLOQUEIO TEMPORÁRIO
                // =========================================

                if (
                    usuarioEncontrado.bloqueado_ate
                ) {

                    const bloqueadoAte =
                        new Date(
                            usuarioEncontrado.bloqueado_ate
                        );

                    const agora =
                        new Date();


                    if (
                        bloqueadoAte > agora
                    ) {

                        return res
                            .status(423)
                            .json({
                                erro:
                                    "Usuário temporariamente bloqueado devido a várias tentativas de login incorretas. Tente novamente mais tarde."
                            });
                    }
                }


                // =========================================
                // VERIFICA A SENHA COM BCRYPT
                // =========================================

                let senhaCorreta = false;


                try {

                    senhaCorreta =
                        await bcrypt.compare(
                            senha,
                            usuarioEncontrado.senha
                        );

                } catch (erroSenha) {

                    console.error(
                        "Erro ao verificar senha:",
                        erroSenha
                    );


                    return res
                        .status(500)
                        .json({
                            erro:
                                "Erro ao verificar senha."
                        });
                }


                // =========================================
                // SENHA INCORRETA
                // =========================================

                if (!senhaCorreta) {

                    const tentativas =
                        Number(
                            usuarioEncontrado.tentativas_login || 0
                        ) + 1;


                    // =====================================
                    // 5ª TENTATIVA - BLOQUEIA POR 15 MIN
                    // =====================================

                    
                    if (tentativas >= 5) {

                        const sqlBloquear = `
                            UPDATE usuarios
                            SET
                                tentativas_login = 0,
                                bloqueado_ate = DATE_ADD(
                                    NOW(),
                                    INTERVAL 15 MINUTE
                                )
                            WHERE id = ?
                        `;

                        db.query(
                            sqlBloquear,
                            [usuarioEncontrado.id],
                            (erroBloqueio) => {

                                if (erroBloqueio) {
                                    console.error(
                                        "Erro ao bloquear usuário:",
                                        erroBloqueio
                                    );

                                    return res.status(500).json({
                                        erro: "Erro ao processar tentativa de login."
                                    });
                                }

                                registrarAuditoria(
                                    usuarioEncontrado.nome,
                                    "Usuário temporariamente bloqueado após 5 tentativas de login incorretas"
                                );

                                return res.status(423).json({
                                    erro: "Usuário bloqueado por 15 minutos após 5 tentativas de login incorretas."
                                });
                            }
                        );

                        // Impede que a consulta de tentativas abaixo seja executada.
                        return;
                    }


                    // =====================================
                    // AINDA NÃO ATINGIU 5 TENTATIVAS
                    // =====================================

                    const sqlTentativa = `
                        UPDATE usuarios
                        SET tentativas_login = ?
                        WHERE id = ?
                    `;

                    db.query(
                        sqlTentativa,
                        [
                            tentativas,
                            usuarioEncontrado.id
                        ],
                        (erroTentativa) => {

                            if (erroTentativa) {

                                console.error(
                                    "Erro ao registrar tentativa:",
                                    erroTentativa
                                );

                                return res
                                    .status(500)
                                    .json({
                                        erro:
                                            "Erro ao processar tentativa de login."
                                    });
                            }

                            const restantes =
                                5 - tentativas;

                            return res
                                .status(401)
                                .json({
                                    erro:
                                        `Usuário ou senha inválidos. Restam ${restantes} tentativa(s) antes do bloqueio temporário.`
                                });
                        }
                    );

                    return;
                    }

                // =========================================
                // SENHA CORRETA
                // ZERA TENTATIVAS E BLOQUEIO
                // =========================================

                const sqlLiberar = `
                    UPDATE usuarios
                    SET
                        tentativas_login = 0,
                        bloqueado_ate = NULL
                    WHERE id = ?
                `;


                db.query(
                    sqlLiberar,
                    [usuarioEncontrado.id],
                    (erroLiberar) => {

                        if (erroLiberar) {

                            console.error(
                                "Erro ao zerar tentativas:",
                                erroLiberar
                            );


                            return res
                                .status(500)
                                .json({
                                    erro:
                                        "Erro ao concluir login."
                                });
                        }


                        // =================================
                        // CRIA A SESSÃO REAL NO SERVIDOR
                        // =================================

                        req.session.regenerate(
                            (erroSessao) => {

                                if (erroSessao) {

                                    console.error(
                                        "Erro ao criar sessão:",
                                        erroSessao
                                    );


                                    return res
                                        .status(500)
                                        .json({
                                            erro:
                                                "Erro ao iniciar sessão."
                                        });
                                }


                                req.session.usuario = {

                                    id:
                                        usuarioEncontrado.id,

                                    nome:
                                        usuarioEncontrado.nome,

                                    usuario:
                                        usuarioEncontrado.usuario,

                                    setor:
                                        usuarioEncontrado.setor,

                                    permissao:
                                        usuarioEncontrado.permissao,

                                    status:
                                        usuarioEncontrado.status
                                };


                                // =================================
                                // AUDITORIA
                                // =================================

                                registrarAuditoria(
                                    usuarioEncontrado.nome,
                                    "Realizou login no sistema"
                                );


                                // =================================
                                // SALVA A SESSÃO
                                // =================================

                                req.session.save(
                                    (erroSalvar) => {

                                        if (erroSalvar) {

                                            console.error(
                                                "Erro ao salvar a sessão:",
                                                erroSalvar
                                            );


                                            return res
                                                .status(500)
                                                .json({
                                                    erro:
                                                        "Não foi possível salvar a sessão."
                                                });
                                        }


                                        console.log(
                                            "Sessão salva com sucesso. ID:",
                                            req.sessionID
                                        );


                                        return res.json({

                                            mensagem:
                                                "Login realizado com sucesso.",

                                            trocar_senha:
                                                Boolean(
                                                    usuarioEncontrado.trocar_senha
                                                ),

                                            usuario: {

                                                id:
                                                    usuarioEncontrado.id,

                                                nome:
                                                    usuarioEncontrado.nome,

                                                usuario:
                                                    usuarioEncontrado.usuario,

                                                setor:
                                                    usuarioEncontrado.setor,

                                                permissao:
                                                    usuarioEncontrado.permissao,

                                                status:
                                                    usuarioEncontrado.status
                                            }
                                        });
                                    }
                                );
                            }
                        );
                    }
                );
            }
        );
    }
);

// =========================================================
// TROCAR SENHA NO PRIMEIRO ACESSO
// =========================================================

app.post(
    "/api/trocar-senha-primeiro-acesso",
    autenticarUsuario,
    async (req, res) => {

        const {
            novaSenha
        } = req.body;

        const usuarioSessao =
            req.session.usuario;


        // =========================================
        // VERIFICA SE A NOVA SENHA FOI INFORMADA
        // =========================================

        if (!novaSenha) {

            return res
                .status(400)
                .json({
                    erro:
                        "Informe a nova senha."
                });
        }


        // =========================================
        // VALIDA A POLÍTICA DE SENHA
        // =========================================

        if (!validarPoliticaSenha(novaSenha)) {

            return res
                .status(400)
                .json({
                    erro:
                        "A senha deve possuir no mínimo 8 caracteres, incluindo letra maiúscula, letra minúscula, número e caractere especial."
                });
        }


        // =========================================
        // BUSCA O USUÁRIO
        // =========================================

        const sqlBuscar = `
            SELECT id, senha, trocar_senha
            FROM usuarios
            WHERE id = ?
            LIMIT 1
        `;


        db.query(
            sqlBuscar,
            [usuarioSessao.id],
            async (erro, resultados) => {

                if (erro) {

                    console.error(
                        "Erro ao buscar usuário:",
                        erro
                    );

                    return res
                        .status(500)
                        .json({
                            erro:
                                "Erro ao verificar usuário."
                        });
                }


                if (resultados.length === 0) {

                    return res
                        .status(404)
                        .json({
                            erro:
                                "Usuário não encontrado."
                        });
                }


                const usuarioEncontrado =
                    resultados[0];


                // =========================================
                // VERIFICA SE A TROCA É OBRIGATÓRIA
                // =========================================

                if (
                    Number(
                        usuarioEncontrado.trocar_senha
                    ) !== 1
                ) {

                    return res
                        .status(400)
                        .json({
                            erro:
                                "A troca de senha no primeiro acesso não está pendente."
                        });
                }


                // =========================================
                // IMPEDE UTILIZAR A MESMA SENHA
                // =========================================

                let mesmaSenha = false;

                try {

                    mesmaSenha =
                        await bcrypt.compare(
                            novaSenha,
                            usuarioEncontrado.senha
                        );

                } catch (erroSenha) {

                    console.error(
                        "Erro ao verificar senha:",
                        erroSenha
                    );

                    return res
                        .status(500)
                        .json({
                            erro:
                                "Erro ao verificar a senha."
                        });
                }


                if (mesmaSenha) {

                    return res
                        .status(400)
                        .json({
                            erro:
                                "A nova senha deve ser diferente da senha atual."
                        });
                }


                // =========================================
                // GERA O NOVO HASH
                // =========================================

                let novaSenhaHash;

                try {

                    novaSenhaHash =
                        await bcrypt.hash(
                            novaSenha,
                            10
                        );

                } catch (erroHash) {

                    console.error(
                        "Erro ao proteger nova senha:",
                        erroHash
                    );

                    return res
                        .status(500)
                        .json({
                            erro:
                                "Erro ao proteger a nova senha."
                        });
                }


                // =========================================
                // ATUALIZA A SENHA
                // =========================================

                const sqlAtualizar = `
                    UPDATE usuarios
                    SET
                        senha = ?,
                        trocar_senha = 0
                    WHERE id = ?
                `;


                db.query(
                    sqlAtualizar,
                    [
                        novaSenhaHash,
                        usuarioSessao.id
                    ],
                    (erroAtualizar) => {

                        if (erroAtualizar) {

                            console.error(
                                "Erro ao atualizar senha:",
                                erroAtualizar
                            );

                            return res
                                .status(500)
                                .json({
                                    erro:
                                        "Erro ao atualizar a senha."
                                });
                        }


                        registrarAuditoria(
                            usuarioSessao.nome,
                            "Alterou a senha obrigatória do primeiro acesso"
                        );


                        return res.json({
                            mensagem:
                                "Senha alterada com sucesso."
                        });
                    }
                );
            }
        );
    }
);

// =========================================================
// VERIFICAR SESSÃO
// =========================================================

app.get(
    "/api/sessao",
    autenticarUsuario,
    (req, res) => {

        res.json({

            autenticado: true,

            usuario:
                req.session.usuario
        });
    }
);


// =========================================================
// LOGOUT
// =========================================================

app.post(
    "/api/logout",
    autenticarUsuario,
    (req, res) => {

        const nomeUsuario =
            req.session.usuario.nome;


        registrarAuditoria(
            nomeUsuario,
            "Realizou logout do sistema"
        );


        req.session.destroy(
            (erro) => {

                if (erro) {

                    console.error(
                        "Erro ao encerrar sessão:",
                        erro
                    );


                    return res
                        .status(500)
                        .json({
                            erro:
                                "Erro ao encerrar sessão."
                        });
                }


                res.clearCookie(
                    "connect.sid"
                );


                res.json({
                    mensagem:
                        "Logout realizado com sucesso."
                });
            }
        );
    }
);




// =========================================================
// LISTAR USUÁRIOS
// SOMENTE ADMINISTRADOR
// =========================================================

app.get(
    "/api/usuarios",
    somenteAdministrador,
    (req, res) => {

        const sql = `
            SELECT
                id,
                nome,
                telefone,
                usuario,
                setor,
                permissao,
                status,
                email,
                cpf
            FROM usuarios
            ORDER BY nome
        `;

        db.query(
            sql,
            (erro, resultados) => {

                if (erro) {
                    console.error(
                        "Erro ao buscar usuários:",
                        erro
                    );

                    return res.status(500).json({
                        erro: "Erro ao buscar usuários."
                    });
                }

                return res.json(resultados);
            }
        );
    }
);


// =========================================================
// CADASTRAR USUÁRIO
// SOMENTE ADMINISTRADOR
// =========================================================

app.post(
    "/api/usuarios",
    somenteAdministrador,
    async (req, res) => {

        const {
            nome,
            cpf,
            usuario,
            email,
            senha,
            telefone,
            setor,
            permissao,
            status
        } = req.body;

        // =============================================
        // VALIDAR CAMPOS OBRIGATÓRIOS
        // =============================================

        if (
            !nome ||
            !cpf ||
            !usuario ||
            !email ||
            !senha ||
            !telefone ||
            !setor ||
            !permissao ||
            !status
        ) {
            return res.status(400).json({
                erro: "Preencha todos os campos obrigatórios."
            });
        }

        // =============================================
        // VALIDAR POLÍTICA DE SENHA
        // =============================================

        if (!validarPoliticaSenha(senha)) {
            return res.status(400).json({
                erro:
                    "A senha deve possuir no mínimo 8 caracteres, incluindo letra maiúscula, letra minúscula, número e caractere especial."
            });
        }

        // =============================================
        // GERAR HASH DA SENHA
        // =============================================

        let senhaHash;

        try {
            senhaHash = await bcrypt.hash(senha, 10);

        } catch (erroHash) {
            console.error(
                "Erro ao proteger senha:",
                erroHash
            );

            return res.status(500).json({
                erro: "Erro ao proteger a senha."
            });
        }

        // =============================================
        // FUNÇÃO PARA INSERIR USUÁRIO
        // =============================================

        function inserirUsuario() {

            const sql = `
                INSERT INTO usuarios
                (
                    nome,
                    telefone,
                    usuario,
                    senha,
                    setor,
                    permissao,
                    status,
                    email,
                    cpf
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const valores = [
                nome,
                telefone,
                usuario,
                senhaHash,
                setor,
                permissao,
                status,
                email,
                cpf
            ];

            db.query(
                sql,
                valores,
                (erro, resultado) => {

                    if (erro) {
                        console.error(
                            "Erro ao cadastrar usuário:",
                            erro
                        );

                        if (erro.code === "ER_DUP_ENTRY") {
                            return res.status(409).json({
                                erro:
                                    "Usuário, CPF ou outro dado único já cadastrado."
                            });
                        }

                        return res.status(500).json({
                            erro: "Erro ao cadastrar usuário."
                        });
                    }

                    // =====================================
                    // AUDITORIA DO CADASTRO
                    // =====================================

                    registrarAuditoria(
                        req.usuarioAutenticado.nome,
                        `Cadastrou o usuário ${nome}`,
                        {
                            entidade: "Usuário",

                            valor_anterior: null,

                            valor_novo: JSON.stringify({
                                id: resultado.insertId,
                                nome: nome,
                                telefone: telefone,
                                usuario: usuario,
                                setor: setor,
                                permissao: permissao,
                                status: status,
                                email: email,
                                cpf: cpf
                            }),

                            ip: req.ip,

                            resultado: "Sucesso"
                        }
                    );

                    return res.status(201).json({
                        mensagem:
                            "Usuário cadastrado com sucesso.",
                        id: resultado.insertId
                    });
                }
            );
        }

        // =============================================
        // GARANTIR APENAS UM ADMINISTRADOR
        // =============================================

        if (
            String(permissao).trim().toLowerCase() ===
            "administrador"
        ) {

            const sqlAdmin = `
                SELECT id
                FROM usuarios
                WHERE LOWER(permissao) = 'administrador'
                LIMIT 1
            `;

            db.query(
                sqlAdmin,
                (erroAdmin, administradores) => {

                    if (erroAdmin) {
                        console.error(
                            "Erro ao verificar Administrador:",
                            erroAdmin
                        );

                        return res.status(500).json({
                            erro:
                                "Erro ao verificar Administrador."
                        });
                    }

                    if (administradores.length > 0) {
                        return res.status(409).json({
                            erro:
                                "Já existe um Administrador cadastrado. O sistema permite apenas um Administrador."
                        });
                    }

                    inserirUsuario();
                }
            );

            return;
        }

        // =============================================
        // CADASTRAR USUÁRIO NÃO ADMINISTRADOR
        // =============================================

        inserirUsuario();
    }
);


// =========================================================
// ATUALIZAR USUÁRIO
// SOMENTE ADMINISTRADOR
// =========================================================

app.put(
    "/api/usuarios/:id",
    somenteAdministrador,
    async (req, res) => {

        const id =
            Number(req.params.id);


        
            const {
                nome,
                cpf,
                usuario,
                email,
                senha,
                telefone,
                setor,
                permissao,
                status
            } = req.body;

            if (!id) {
                return res.status(400).json({
                    erro: "Usuário inválido."
                });
            }

            if (
                !nome ||
                !cpf ||
                !usuario ||
                !email ||
                !telefone ||
                !setor ||
                !permissao ||
                !status
            ) {
                return res.status(400).json({
                    erro: "Preencha todos os campos obrigatórios."
                });
            }



       
        // =================================================
        // FUNÇÃO PARA ATUALIZAR USUÁRIO
        // =================================================

        async function atualizarUsuario() {

            let sql;
            let valores;

            // =============================================
            // SE FOI INFORMADA UMA NOVA SENHA
            // =============================================

            if (senha && String(senha).trim() !== "") {

                let senhaHash;

                try {
                    senhaHash = await bcrypt.hash(senha, 10);

                } catch (erroHash) {
                    console.error(
                        "Erro ao proteger senha:",
                        erroHash
                    );

                    return res.status(500).json({
                        erro: "Erro ao proteger a senha."
                    });
                }

                sql = `
                    UPDATE usuarios
                    SET
                        nome = ?,
                        telefone = ?,
                        usuario = ?,
                        senha = ?,
                        setor = ?,
                        permissao = ?,
                        status = ?,
                        email = ?,
                        cpf = ?
                    WHERE id = ?
                `;

                valores = [
                    nome,
                    telefone,
                    usuario,
                    senhaHash,
                    setor,
                    permissao,
                    status,
                    email,
                    cpf,
                    id
                ];

            } else {

                // =========================================
                // SEM NOVA SENHA
                // =========================================

                sql = `
                    UPDATE usuarios
                    SET
                        nome = ?,
                        telefone = ?,
                        usuario = ?,
                        setor = ?,
                        permissao = ?,
                        status = ?,
                        email = ?,
                        cpf = ?
                    WHERE id = ?
                `;

                valores = [
                    nome,
                    telefone,
                    usuario,
                    setor,
                    permissao,
                    status,
                    email,
                    cpf,
                    id
                ];
            }

            // =============================================
            // CONSULTA OS DADOS ANTERIORES
            // =============================================

            const sqlAnterior = `
                SELECT
                    nome,
                    telefone,
                    usuario,
                    setor,
                    permissao,
                    status,
                    email,
                    cpf
                FROM usuarios
                WHERE id = ?
                LIMIT 1
            `;

            db.query(
                sqlAnterior,
                [id],
                (erroAnterior, usuariosAnteriores) => {

                    if (erroAnterior) {
                        console.error(
                            "Erro ao consultar usuário anterior:",
                            erroAnterior
                        );

                        return res.status(500).json({
                            erro: "Erro ao consultar os dados anteriores do usuário."
                        });
                    }

                    if (usuariosAnteriores.length === 0) {
                        return res.status(404).json({
                            erro: "Usuário não encontrado."
                        });
                    }

                    const usuarioAnterior = usuariosAnteriores[0];

                    // =============================================
                    // ATUALIZA O USUÁRIO
                    // =============================================

                    db.query(
                        sql,
                        valores,
                        (erro, resultado) => {

                            if (erro) {
                                console.error(
                                    "Erro ao atualizar usuário:",
                                    erro
                                );

                                if (erro.code === "ER_DUP_ENTRY") {
                                    return res.status(409).json({
                                        erro: "Usuário, CPF ou outro dado único já cadastrado."
                                    });
                                }

                                return res.status(500).json({
                                    erro: "Erro ao atualizar usuário."
                                });
                            }

                            if (resultado.affectedRows === 0) {
                                return res.status(404).json({
                                    erro: "Usuário não encontrado."
                                });
                            }

                            // =====================================
                            // IDENTIFICA OS CAMPOS ALTERADOS
                            // =====================================

                            const campos = [
                                ["nome", "nome"],
                                ["telefone", "telefone"],
                                ["usuario", "usuário"],
                                ["setor", "setor"],
                                ["permissao", "permissão"],
                                ["email", "e-mail"],
                                ["cpf", "CPF"]
                            ];

                            const camposAlterados = [];

                            for (const [campo, descricao] of campos) {
                                const anterior = String(
                                    usuarioAnterior[campo] ?? ""
                                ).trim();

                                const novo = String(
                                    req.body[campo] ?? ""
                                ).trim();

                                if (anterior !== novo) {
                                    camposAlterados.push(descricao);
                                }
                            }

                            const statusAnterior = String(
                                usuarioAnterior.status ?? ""
                            ).trim();

                            const statusNovo = String(status ?? "").trim();

                            const statusMudou =
                                statusAnterior.toLowerCase() !==
                                statusNovo.toLowerCase();

                            if (statusMudou) {
                                camposAlterados.push("status");
                            }

                            if (senha && String(senha).trim() !== "") {
                                camposAlterados.push("senha");
                            }

                            // =====================================
                            // REGISTRA A AUDITORIA
                            // =====================================

                            let acaoAuditoria;

                            if (statusMudou) {
                                acaoAuditoria =
                                    `Alterou o status do usuário ${nome} de ${statusAnterior} para ${statusNovo}.`;

                            } else if (camposAlterados.length > 0) {
                                acaoAuditoria =
                                    `Atualizou o usuário ${nome}. Campos alterados: ${camposAlterados.join(", ")}.`;

                            } else {
                                acaoAuditoria =
                                    `Salvou os dados do usuário ${nome}, sem alterações nos campos.`;
                            }

                            
                            
                            // =====================================
                            // AUDITORIA: SOMENTE CAMPOS ALTERADOS
                            // =====================================

                            const comparacoes = [
                                ["nome", usuarioAnterior.nome, nome],
                                ["telefone", usuarioAnterior.telefone, telefone],
                                ["usuario", usuarioAnterior.usuario, usuario],
                                ["setor", usuarioAnterior.setor, setor],
                                ["permissao", usuarioAnterior.permissao, permissao],
                                ["status", usuarioAnterior.status, status],
                                ["email", usuarioAnterior.email, email],
                                ["cpf", usuarioAnterior.cpf, cpf]
                            ];

                            const dadosAnteriores = {};
                            const dadosNovos = {};

                            for (const [campo, anterior, novo] of comparacoes) {

                                const valorAnterior = String(anterior ?? "").trim();
                                const valorNovo = String(novo ?? "").trim();

                                if (valorAnterior !== valorNovo) {
                                    dadosAnteriores[campo] = anterior;
                                    dadosNovos[campo] = novo;
                                }
                            }

                            // Não registra a senha, apenas informa que foi alterada.
                            if (senha && String(senha).trim() !== "") {
                                dadosAnteriores.senha = "Não exibida";
                                dadosNovos.senha = "Alterada";
                            }

                            registrarAuditoria(
                                req.usuarioAutenticado.nome,
                                acaoAuditoria,
                                {
                                    entidade: "Usuário",

                                    valor_anterior:
                                        JSON.stringify(dadosAnteriores),

                                    valor_novo:
                                        JSON.stringify(dadosNovos),

                                    ip: req.ip,

                                    resultado: "Sucesso"
                                }
                            );



                            return res.json({
                                mensagem: "Usuário atualizado com sucesso."
                            });
                        }
                    );
                }
            );
        }


        // =================================================
        // IMPEDE MAIS DE UM ADMINISTRADOR
        // =================================================

        if (
            String(permissao).trim().toLowerCase() ===
            "administrador"
        ) {

            const sqlAdmin = `
                SELECT id
                FROM usuarios
                WHERE LOWER(permissao) = 'administrador'
                AND id <> ?
                LIMIT 1
            `;

            db.query(
                sqlAdmin,
                [id],
                (erroAdmin, administradores) => {

                    if (erroAdmin) {
                        console.error(
                            "Erro ao verificar Administrador:",
                            erroAdmin
                        );

                        return res.status(500).json({
                            erro: "Erro ao verificar Administrador."
                        });
                    }

                    if (administradores.length > 0) {
                        return res.status(409).json({
                            erro: "Já existe outro Administrador cadastrado."
                        });
                    }

                    atualizarUsuario();
                }
            );

            return;
        }

        atualizarUsuario();
    }
);



// =========================================================
// LISTAR CLIENTES
// SOMENTE ADMINISTRADOR E FINANCEIRO/OPERADOR
// =========================================================


// =========================================================
// LISTAR CLIENTES
// SOMENTE ADMINISTRADOR E FINANCEIRO/OPERADOR
// =========================================================


 
// =========================================================
// LISTAR CLIENTES
// ADMINISTRADOR E FINANCEIRO/OPERADOR
// =========================================================

app.get(
    "/api/clientes",
    autenticarUsuario,
    (req, res) => {

        const usuarioSessao = req.session.usuario;

        if (!usuarioSessao) {
            return res.status(401).json({
                erro: "Sessão não autenticada."
            });
        }

        const permissao = String(
            usuarioSessao.permissao || ""
        ).trim().toLowerCase();

        const permitidos = [
            "administrador",
            "financeiro",
            "operador"
        ];

        if (!permitidos.includes(permissao)) {
            return res.status(403).json({
                erro: "Você não tem permissão para consultar clientes."
            });
        }

        const sql = `
            SELECT *
            FROM clientes
            ORDER BY razao_social ASC
        `;

        db.query(sql, (erro, resultados) => {

            if (erro) {
                console.error(
                    "Erro ao consultar clientes:",
                    erro
                );

                return res.status(500).json({
                    erro: "Erro ao consultar clientes no banco de dados."
                });
            }

            return res.status(200).json(resultados);
        });
    }
);


// =========================================================
// CADASTRAR CLIENTE
// USUÁRIO PRECISA ESTAR AUTENTICADO
// =========================================================

app.post(
    "/api/clientes",
    autenticarUsuario,
    somenteAdministradorFinanceiro,
    (req, res) => {

        const {
            razao_social,
            nome_fantasia,
            cnpj,
            inscricao_estadual,
            contato,
            telefone,
            email,
            endereco,
            numero,
            cep,
            bairro,
            vendedor,
            status
        } = req.body;

        if (!razao_social) {
            return res.status(400).json({
                erro: "Informe a razão social."
            });
        }

        if (!cnpj) {
            return res.status(400).json({
                erro: "Informe o CNPJ."
            });
        }

        if (!vendedor) {
            return res.status(400).json({
                erro: "Informe o vendedor."
            });
        }

        const statusCliente = status || "Ativo";

        if (
            !["ativo", "inativo"].includes(
                String(statusCliente).trim().toLowerCase()
            )
        ) {
            return res.status(400).json({
                erro: "Status inválido. Informe Ativo ou Inativo."
            });
        }

        const sqlVerificar = `
            SELECT id
            FROM clientes
            WHERE cnpj = ?
            LIMIT 1
        `;

        db.query(
            sqlVerificar,
            [cnpj],
            (erroVerificacao, encontrados) => {

                if (erroVerificacao) {
                    console.error(
                        "Erro ao verificar cliente:",
                        erroVerificacao
                    );

                    return res.status(500).json({
                        erro: "Erro ao verificar cliente."
                    });
                }

                if (encontrados.length > 0) {
                    return res.status(409).json({
                        erro: "Este CNPJ já está cadastrado."
                    });
                }

                const sql = `
                    INSERT INTO clientes (
                        razao_social,
                        nome_fantasia,
                        cnpj,
                        inscricao_estadual,
                        contato,
                        telefone,
                        email,
                        endereco,
                        numero,
                        cep,
                        bairro,
                        vendedor,
                        status
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;

                const valores = [
                    razao_social,
                    nome_fantasia || null,
                    cnpj,
                    inscricao_estadual || null,
                    contato || null,
                    telefone || null,
                    email || null,
                    endereco || null,
                    numero || null,
                    cep || null,
                    bairro || null,
                    vendedor,
                    statusCliente
                ];

                db.query(
                    sql,
                    valores,
                    (erro, resultado) => {

                        if (erro) {
                            console.error(
                                "Erro ao cadastrar cliente:",
                                erro
                            );

                            if (erro.code === "ER_DUP_ENTRY") {
                                return res.status(409).json({
                                    erro: "Este CNPJ já está cadastrado."
                                });
                            }

                            return res.status(500).json({
                                erro: "Erro ao cadastrar cliente."
                            });
                        }

                        // =====================================
                        // AUDITORIA DO CADASTRO
                        // =====================================

                        registrarAuditoria(
                            req.session.usuario.nome,
                            `Cadastrou o cliente ${razao_social}`,
                            {
                                entidade: "Cliente",
                                valor_anterior: null,

                                valor_novo: JSON.stringify({
                                    id: resultado.insertId,
                                    razao_social,
                                    nome_fantasia: nome_fantasia || null,
                                    cnpj,
                                    inscricao_estadual: inscricao_estadual || null,
                                    contato: contato || null,
                                    telefone: telefone || null,
                                    email: email || null,
                                    endereco: endereco || null,
                                    numero: numero || null,
                                    cep: cep || null,
                                    bairro: bairro || null,
                                    vendedor,
                                    status: statusCliente
                                }),

                                ip: req.ip,
                                resultado: "Sucesso"
                            }
                        );

                        return res.status(201).json({
                            mensagem: "Cliente cadastrado com sucesso.",
                            id: resultado.insertId
                        });
                    }
                );
            }
        );
    }
);


// =========================================================
// ATUALIZAR CLIENTE
// SOMENTE ADMINISTRADOR
// =========================================================

app.put(
    "/api/clientes/:id",
    autenticarUsuario,
    somenteAdministrador,
    (req, res) => {

        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({
                erro: "Cliente inválido."
            });
        }

        const {
            razao_social,
            nome_fantasia,
            cnpj,
            inscricao_estadual,
            contato,
            telefone,
            email,
            endereco,
            numero,
            cep,
            bairro,
            vendedor,
            status
        } = req.body;

        if (!razao_social) {
            return res.status(400).json({
                erro: "Informe a razão social."
            });
        }

        if (!cnpj) {
            return res.status(400).json({
                erro: "Informe o CNPJ."
            });
        }

        if (!vendedor) {
            return res.status(400).json({
                erro: "Informe o vendedor."
            });
        }

        // =============================================
        // CONSULTAR OS DADOS ANTERIORES
        // =============================================

        const sqlAnterior = `
            SELECT
                id,
                razao_social,
                nome_fantasia,
                cnpj,
                inscricao_estadual,
                contato,
                telefone,
                email,
                endereco,
                numero,
                cep,
                bairro,
                vendedor,
                status
            FROM clientes
            WHERE id = ?
            LIMIT 1
        `;

        db.query(
            sqlAnterior,
            [id],
            (erroAnterior, clientesAnteriores) => {

                if (erroAnterior) {
                    console.error(
                        "Erro ao consultar cliente anterior:",
                        erroAnterior
                    );

                    return res.status(500).json({
                        erro: "Erro ao consultar os dados anteriores do cliente."
                    });
                }

                if (clientesAnteriores.length === 0) {
                    return res.status(404).json({
                        erro: "Cliente não encontrado."
                    });
                }

                const clienteAnterior = clientesAnteriores[0];

                // Se o status não foi enviado, manter o atual.
                const statusNovo =
                    status === undefined ||
                    status === null ||
                    String(status).trim() === ""
                        ? clienteAnterior.status
                        : status;

                if (
                    !["ativo", "inativo"].includes(
                        String(statusNovo).trim().toLowerCase()
                    )
                ) {
                    return res.status(400).json({
                        erro: "Status inválido. Informe Ativo ou Inativo."
                    });
                }

                // =============================================
                // VERIFICAR CNPJ DUPLICADO
                // =============================================

                const sqlVerificar = `
                    SELECT id
                    FROM clientes
                    WHERE cnpj = ?
                      AND id <> ?
                    LIMIT 1
                `;

                db.query(
                    sqlVerificar,
                    [cnpj, id],
                    (erroVerificacao, encontrados) => {

                        if (erroVerificacao) {
                            console.error(
                                "Erro ao verificar CNPJ:",
                                erroVerificacao
                            );

                            return res.status(500).json({
                                erro: "Erro ao verificar cliente."
                            });
                        }

                        if (encontrados.length > 0) {
                            return res.status(409).json({
                                erro: "Este CNPJ já pertence a outro cliente."
                            });
                        }

                        // =============================================
                        // PREPARAR OS DADOS NOVOS
                        // =============================================

                        const dadosNovos = {
                            razao_social,
                            nome_fantasia: nome_fantasia || null,
                            cnpj,
                            inscricao_estadual: inscricao_estadual || null,
                            contato: contato || null,
                            telefone: telefone || null,
                            email: email || null,
                            endereco: endereco || null,
                            numero: numero || null,
                            cep: cep || null,
                            bairro: bairro || null,
                            vendedor,
                            status: statusNovo
                        };

                        const camposAnteriores = {};
                        const camposNovos = {};

                        for (const campo of Object.keys(dadosNovos)) {
                            const anterior = clienteAnterior[campo] ?? null;
                            const novo = dadosNovos[campo] ?? null;

                            if (
                                String(anterior ?? "").trim() !==
                                String(novo ?? "").trim()
                            ) {
                                camposAnteriores[campo] = anterior;
                                camposNovos[campo] = novo;
                            }
                        }

                        // =============================================
                        // ATUALIZAR CLIENTE
                        // =============================================

                        const sqlAtualizar = `
                            UPDATE clientes
                            SET
                                razao_social = ?,
                                nome_fantasia = ?,
                                cnpj = ?,
                                inscricao_estadual = ?,
                                contato = ?,
                                telefone = ?,
                                email = ?,
                                endereco = ?,
                                numero = ?,
                                cep = ?,
                                bairro = ?,
                                vendedor = ?,
                                status = ?
                            WHERE id = ?
                        `;

                        const valores = [
                            dadosNovos.razao_social,
                            dadosNovos.nome_fantasia,
                            dadosNovos.cnpj,
                            dadosNovos.inscricao_estadual,
                            dadosNovos.contato,
                            dadosNovos.telefone,
                            dadosNovos.email,
                            dadosNovos.endereco,
                            dadosNovos.numero,
                            dadosNovos.cep,
                            dadosNovos.bairro,
                            dadosNovos.vendedor,
                            dadosNovos.status,
                            id
                        ];

                        db.query(
                            sqlAtualizar,
                            valores,
                            (erro, resultado) => {

                                if (erro) {
                                    console.error(
                                        "Erro ao atualizar cliente:",
                                        erro
                                    );

                                    if (erro.code === "ER_DUP_ENTRY") {
                                        return res.status(409).json({
                                            erro: "Este CNPJ já pertence a outro cliente."
                                        });
                                    }

                                    return res.status(500).json({
                                        erro: "Erro ao atualizar cliente."
                                    });
                                }

                                // =====================================
                                // AUDITORIA: SOMENTE O QUE MUDOU
                                // =====================================

                                const camposAlterados =
                                    Object.keys(camposNovos);

                                if (camposAlterados.length > 0) {

                                    let acaoAuditoria;

                                    if (
                                        camposAlterados.length === 1 &&
                                        camposAlterados[0] === "status"
                                    ) {
                                        acaoAuditoria =
                                            `Alterou o status do cliente ${razao_social} de ${clienteAnterior.status} para ${statusNovo}.`;
                                    } else {
                                        acaoAuditoria =
                                            `Atualizou o cliente ${razao_social}. Campos alterados: ${camposAlterados.join(", ")}.`;
                                    }

                                    registrarAuditoria(
                                        req.session.usuario.nome,
                                        acaoAuditoria,
                                        {
                                            entidade: "Cliente",

                                            valor_anterior:
                                                JSON.stringify(camposAnteriores),

                                            valor_novo:
                                                JSON.stringify(camposNovos),

                                            ip: req.ip,

                                            resultado: "Sucesso"
                                        }
                                    );
                                }

                                return res.json({
                                    mensagem: "Cliente atualizado com sucesso."
                                });
                            }
                        );
                    }
                );
            }
        );
    }
);

// =========================================================
// LISTAR BOLETOS
// USUÁRIO PRECISA ESTAR AUTENTICADO
// =========================================================

app.get(
    "/api/boletos",
    autenticarUsuario,
    (req, res) => {

        const usuarioSessao =
            req.session.usuario;

        const permissao =
            String(
                usuarioSessao.permissao || ""
            )
                .trim()
                .toLowerCase();


        // =============================================
        // VENDEDOR
        // =============================================
        // Consulta somente os boletos dos clientes
        // atribuídos ao próprio vendedor.

        if (permissao === "vendedor") {

            const sql = `
                SELECT DISTINCT
                    b.*
                FROM boletos b

                INNER JOIN clientes c
                    ON TRIM(LOWER(c.razao_social)) =
                       TRIM(LOWER(b.razao_social))

                WHERE
                    TRIM(LOWER(c.vendedor)) =
                    TRIM(LOWER(?))

                ORDER BY
                    b.vencimento ASC,
                    b.id DESC
            `;


            return db.query(
                sql,
                [usuarioSessao.nome],
                (erro, resultados) => {

                    if (erro) {

                        console.error(
                            "Erro ao buscar boletos do vendedor:",
                            erro
                        );


                        return res
                            .status(500)
                            .json({
                                erro:
                                    "Erro ao buscar boletos."
                            });
                    }


                    return res.json(
                        resultados
                    );
                }
            );
        }


        // =============================================
        // ADMINISTRADOR / FINANCEIRO / OPERADOR
        // =============================================
        // Consulta todos os boletos.

        if (
            ![
                "administrador",
                "financeiro",
                "operador"
            ].includes(permissao)
        ) {

            return res
                .status(403)
                .json({
                    erro:
                        "Você não tem permissão para consultar boletos."
                });
        }


        const sql = `
            SELECT *
            FROM boletos
            ORDER BY
                vencimento ASC,
                id DESC
        `;


        db.query(
            sql,
            (erro, resultados) => {

                if (erro) {

                    console.error(
                        "Erro ao buscar boletos:",
                        erro
                    );


                    return res
                        .status(500)
                        .json({
                            erro:
                                "Erro ao buscar boletos."
                        });
                }


                return res.json(
                    resultados
                );
            }
        );
    }
);

// =========================================================
// CADASTRAR BOLETO
// USUÁRIO PRECISA ESTAR AUTENTICADO
// =========================================================


app.post(
    "/api/boletos",
    autenticarUsuario,
    somenteAdministradorFinanceiro,
    (req, res) => {


        const {
            razao_social,
            num_boleto,
            linha_digitavel,
            valor,
            data_emissao,
            vencimento,
            vendedor,
            status,
            motivo_baixa,

            instrucoes
        } = req.body;


        if (
            !razao_social ||
            !num_boleto ||
            valor === undefined ||
            valor === null ||
            !data_emissao ||
            !vencimento
        ) {

            return res
                .status(400)
                .json({
                    erro:
                        "Preencha os dados obrigatórios do boleto."
                });
        }


        if (Number(valor) <= 0) {

            return res
                .status(400)
                .json({
                    erro:
                        "O valor do boleto deve ser maior que zero."
                });
        }


        const usuarioSessao =
            req.session.usuario;


        const permissao =
            String(
                usuarioSessao.permissao || ""
            )
                .trim()
                .toLowerCase();


        // =============================================
        // VENDEDOR
        // =============================================
        // Caso um vendedor cadastre um boleto,
        // ele não pode indicar outro vendedor.

        const vendedorBoleto =
            permissao === "vendedor"
                ? usuarioSessao.nome
                : vendedor || null;


        // =============================================
        // VERIFICA SE O BOLETO JÁ EXISTE
        // =============================================

        const sqlVerificar = `
            SELECT id
            FROM boletos
            WHERE num_boleto = ?
            LIMIT 1
        `;


        db.query(
            sqlVerificar,
            [num_boleto],
            (
                erroVerificacao,
                encontrados
            ) => {

                if (erroVerificacao) {

                    console.error(
                        "Erro ao verificar boleto:",
                        erroVerificacao
                    );


                    return res
                        .status(500)
                        .json({
                            erro:
                                "Erro ao verificar boleto."
                        });
                }


                if (
                    encontrados.length > 0
                ) {

                    return res
                        .status(409)
                        .json({
                            erro:
                                "Já existe um boleto cadastrado com esse número."
                        });
                }

                
                const sqlVerificarCliente = `
                    SELECT status
                    FROM clientes
                    WHERE razao_social = ?
                    LIMIT 1
                `;

                db.query(
                    sqlVerificarCliente,
                    [razao_social],
                    (erroCliente, clientesEncontrados) => {

                        if (erroCliente) {
                            console.error(
                                "Erro ao verificar status do cliente:",
                                erroCliente
                            );

                            return res.status(500).json({
                                erro: "Erro ao verificar o cliente."
                            });
                        }

                        if (clientesEncontrados.length === 0) {
                            return res.status(404).json({
                                erro: "Cliente não encontrado."
                            });
                        }

                        const statusCliente = String(
                            clientesEncontrados[0].status || ""
                        ).trim().toLowerCase();

                        if (statusCliente !== "ativo") {
                            return res.status(409).json({
                                erro:
                                    "Não é possível cadastrar boleto para um cliente inativo."
                            });
                        }
                    }
                );



                const sql = `
                INSERT INTO boletos
                (
                    razao_social,
                    num_boleto,
                    linha_digitavel,
                    valor,
                    data_emissao,
                    vencimento,
                    vendedor,
                    status,
                    motivo_baixa,
                    instrucoes
                )
                VALUES
                (
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                )
            `;

                const valores = [

                    razao_social,

                    num_boleto,

                    linha_digitavel ||
                    null,

                    valor,

                    data_emissao,

                    vencimento,

                    vendedorBoleto,

                    status ||
                    "Pendente",

                    motivo_baixa ||
                    null,


                    instrucoes ||
                    null
                ];


                db.query(
                    sql,
                    valores,
                    (
                        erro,
                        resultado
                    ) => {

                        if (erro) {

                            console.error(
                                "Erro ao cadastrar boleto:",
                                erro
                            );


                            return res
                                .status(500)
                                .json({
                                    erro:
                                        "Erro ao cadastrar boleto."
                                });
                        }


                        // =================================
                        // AUDITORIA
                        // =================================
                        // Usuário obtido da sessão.

                        registrarAuditoria(
                            usuarioSessao.nome,
                            `Cadastrou o boleto ${num_boleto} do cliente ${razao_social}`,
                            {
                                entidade: "Boletos",
                                valor_anterior: null,
                                valor_novo: JSON.stringify({
                                    num_boleto: num_boleto,
                                    razao_social: razao_social,
                                    valor: valor,
                                    data_emissao: data_emissao,
                                    vencimento: vencimento,
                                    vendedor: vendedorBoleto,
                                    status: status || "Pendente"
                                }),
                                ip: req.ip,
                                resultado: "Sucesso"
                            }
                        );

                        return res.status(201).json({
                            mensagem: "Boleto cadastrado com sucesso.",
                            id: resultado.insertId
                        });
                    }
                );
            }
        );
    }
);


// =========================================================
// CADASTRAR BOLETOS PARCELADOS
// USUÁRIO PRECISA ESTAR AUTENTICADO
// =========================================================

app.post(
    "/api/boletos/lote",
    autenticarUsuario,
    somenteAdministradorFinanceiro,
    (req, res) => {

        const {
            boletos
        } = req.body;


        if (
            !Array.isArray(boletos) ||
            boletos.length === 0
        ) {

            return res
                .status(400)
                .json({
                    erro:
                        "Nenhum boleto informado."
                });
        }


        // =============================================
        // VALIDA OS BOLETOS
        // =============================================

        for (const boleto of boletos) {

            if (
                !boleto.razao_social ||
                !boleto.num_boleto ||
                boleto.valor === undefined ||
                boleto.valor === null ||
                Number(boleto.valor) <= 0 ||
                !boleto.data_emissao ||
                !boleto.vencimento
            ) {

                return res
                    .status(400)
                    .json({
                        erro:
                            "Existem boletos com dados obrigatórios inválidos."
                    });
            }
        }


        const usuarioSessao =
            req.session.usuario;


        const permissao =
            String(
                usuarioSessao.permissao || ""
            )
                .trim()
                .toLowerCase();


        // =============================================
        // VERIFICA NÚMEROS REPETIDOS NO LOTE
        // =============================================

        const numeros =
            boletos.map(
                boleto =>
                    String(
                        boleto.num_boleto
                    ).trim()
            );


        const numerosUnicos =
            new Set(numeros);


        if (
            numerosUnicos.size !==
            numeros.length
        ) {

            return res
                .status(400)
                .json({
                    erro:
                        "Existem números de boleto repetidos nas parcelas."
                });
        }


        const placeholders =
            numeros
                .map(() => "?")
                .join(",");


        const sqlVerificar = `
            SELECT num_boleto
            FROM boletos
            WHERE num_boleto
            IN (${placeholders})
        `;


        db.query(
            sqlVerificar,
            numeros,
            (
                erroVerificacao,
                encontrados
            ) => {

                if (erroVerificacao) {

                    console.error(
                        "Erro ao verificar boletos:",
                        erroVerificacao
                    );


                    return res
                        .status(500)
                        .json({
                            erro:
                                "Erro ao verificar boletos."
                        });
                }


                if (
                    encontrados.length > 0
                ) {

                    const repetidos =
                        encontrados
                            .map(
                                boleto =>
                                    boleto.num_boleto
                            )
                            .join(", ");


                    return res
                        .status(409)
                        .json({
                            erro:
                                `Os seguintes boletos já estão cadastrados: ${repetidos}`
                        });
                }


                // =============================================
                // PREPARA OS VALORES
                // =============================================

                const valores =
                    boletos.map(
                        boleto => [

                            boleto.razao_social,

                            boleto.num_boleto,

                            boleto.linha_digitavel ||
                            null,

                            boleto.valor,

                            boleto.data_emissao,

                            boleto.vencimento,

                            // Vendedor não consegue
                            // informar outro vendedor.
                            permissao === "vendedor"
                                ? usuarioSessao.nome
                                : boleto.vendedor || null,

                            boleto.status ||
                            "Pendente",

                            boleto.motivo_baixa ||
                            null,


                            boleto.instrucoes ||
                            null
                        ]
                    );


                const sql = `
                    INSERT INTO boletos
                    (
                        razao_social,
                        num_boleto,
                        linha_digitavel,
                        valor,
                        data_emissao,
                        vencimento,
                        vendedor,
                        status,
                        motivo_baixa,


                        instrucoes
                    )
                    VALUES ?
                `;


                db.query(
                    sql,
                    [valores],
                    (
                        erro,
                        resultado
                    ) => {

                        if (erro) {

                            console.error(
                                "Erro ao cadastrar boletos:",
                                erro
                            );


                            return res
                                .status(500)
                                .json({
                                    erro:
                                        "Erro ao cadastrar os boletos."
                                });
                        }


                        registrarAuditoria(
                            usuarioSessao.nome,
                            `Cadastrou ${boletos.length} boletos para o cliente ${boletos[0].razao_social}`
                        );


                        res
                            .status(201)
                            .json({

                                mensagem:
                                    "Boletos cadastrados com sucesso.",

                                quantidade:
                                    resultado.affectedRows
                            });
                    }
                );
            }
        );
    }
);


// =========================================================
// ATUALIZAR BOLETO
// USUÁRIO PRECISA ESTAR AUTENTICADO
// =========================================================


 // =========================================================
 // ATUALIZAR BOLETO
 // REGISTRA OS VALORES ANTERIOR E NOVO NA AUDITORIA
 // =========================================================

app.put(
    "/api/boletos/:id",
    autenticarUsuario,
    somenteAdministradorFinanceiro,
    (req, res) => {

        const id = req.params.id;

        const {
            razao_social,
            num_boleto,
            linha_digitavel,
            valor,
            data_emissao,
            vencimento,
            vendedor,
            status,
            motivo_baixa,
            instrucoes
        } = req.body;

        // =====================================================
        // VALIDAR CAMPOS OBRIGATÓRIOS
        // =====================================================

        if (
            !razao_social ||
            !num_boleto ||
            valor === undefined ||
            valor === null ||
            !data_emissao ||
            !vencimento
        ) {
            return res.status(400).json({
                erro: "Preencha os dados obrigatórios do boleto."
            });
        }

        if (!Number.isFinite(Number(valor)) || Number(valor) <= 0) {
            return res.status(400).json({
                erro: "O valor do boleto deve ser maior que zero."
            });
        }

        const usuarioSessao = req.session.usuario;

        const permissao = String(
            usuarioSessao.permissao || ""
        ).trim().toLowerCase();

        // O vendedor não pode escolher outro vendedor.
        const vendedorBoleto =
            permissao === "vendedor"
                ? usuarioSessao.nome
                : vendedor || null;

        const statusFinal = status || "Pendente";

        // =====================================================
        // VERIFICAR SE O NÚMERO JÁ ESTÁ CADASTRADO
        // =====================================================

        const sqlVerificar = `
            SELECT id
            FROM boletos
            WHERE num_boleto = ?
              AND id <> ?
            LIMIT 1
        `;

        db.query(
            sqlVerificar,
            [num_boleto, id],
            (erroVerificacao, encontrados) => {

                if (erroVerificacao) {
                    console.error(
                        "Erro ao verificar boleto:",
                        erroVerificacao
                    );

                    return res.status(500).json({
                        erro: "Erro ao verificar boleto."
                    });
                }

                if (encontrados.length > 0) {
                    return res.status(409).json({
                        erro:
                            "Já existe outro boleto cadastrado com esse número."
                    });
                }

                // =============================================
                // BUSCAR OS DADOS ANTES DA ALTERAÇÃO
                // =============================================

                const sqlAnterior = `
                    SELECT
                        id,
                        razao_social,
                        num_boleto,
                        linha_digitavel,
                        valor,
                        data_emissao,
                        vencimento,
                        vendedor,
                        status,
                        motivo_baixa,
                        instrucoes
                    FROM boletos
                    WHERE id = ?
                    LIMIT 1
                `;

                db.query(
                    sqlAnterior,
                    [id],
                    (erroAnterior, registros) => {

                        if (erroAnterior) {
                            console.error(
                                "Erro ao consultar boleto anterior:",
                                erroAnterior
                            );

                            return res.status(500).json({
                                erro:
                                    "Erro ao consultar os dados anteriores do boleto."
                            });
                        }

                        if (registros.length === 0) {
                            return res.status(404).json({
                                erro: "Boleto não encontrado."
                            });
                        }

                        const boletoAnterior = registros[0];

                        // =====================================
                        // ATUALIZAR BOLETO
                        // =====================================

                        const sql = `
                            UPDATE boletos
                            SET
                                razao_social = ?,
                                num_boleto = ?,
                                linha_digitavel = ?,
                                valor = ?,
                                data_emissao = ?,
                                vencimento = ?,
                                vendedor = ?,
                                status = ?,
                                motivo_baixa = ?,
                                instrucoes = ?
                            WHERE id = ?
                        `;

                        const valores = [
                            razao_social,
                            num_boleto,
                            linha_digitavel || null,
                            valor,
                            data_emissao,
                            vencimento,
                            vendedorBoleto,
                            statusFinal,
                            motivo_baixa || null,
                            instrucoes || null,
                            id
                        ];

                        db.query(
                            sql,
                            valores,
                            (erro, resultado) => {

                                if (erro) {
                                    console.error(
                                        "Erro ao atualizar boleto:",
                                        erro
                                    );

                                    return res.status(500).json({
                                        erro:
                                            "Erro ao atualizar boleto."
                                    });
                                }

                                // =================================
                                // REGISTRAR AUDITORIA
                                // SOMENTE CAMPOS ALTERADOS
                                // =================================

                                const boletoNovo = {
                                    id: id,
                                    razao_social,
                                    num_boleto,
                                    linha_digitavel: linha_digitavel || null,
                                    valor,
                                    data_emissao,
                                    vencimento,
                                    vendedor: vendedorBoleto,
                                    status: statusFinal,
                                    motivo_baixa: motivo_baixa || null,
                                    instrucoes: instrucoes || null
                                };

                                const valorAnteriorAlterado = {};
                                const valorNovoAlterado = {};

                                Object.keys(boletoNovo).forEach((campo) => {

                                    if (campo === "id") {
                                        return;
                                    }

                                    const anterior =
                                        boletoAnterior[campo] === null ||
                                        boletoAnterior[campo] === undefined
                                            ? ""
                                            : String(boletoAnterior[campo]);

                                    const novo =
                                        boletoNovo[campo] === null ||
                                        boletoNovo[campo] === undefined
                                            ? ""
                                            : String(boletoNovo[campo]);

                                    if (anterior !== novo) {
                                        valorAnteriorAlterado[campo] =
                                            boletoAnterior[campo];

                                        valorNovoAlterado[campo] =
                                            boletoNovo[campo];
                                    }
                                });

                                registrarAuditoria(
                                    usuarioSessao.nome,
                                    `Atualizou o boleto ${num_boleto}`,
                                    {
                                        entidade: "Boletos",

                                        valor_anterior:
                                            JSON.stringify(valorAnteriorAlterado),

                                        valor_novo:
                                            JSON.stringify(valorNovoAlterado),

                                        ip: req.ip,

                                        resultado: "Sucesso"
                                    }
                                );

                                // =================================
                                // RESPOSTA
                                // =================================

                                return res.json({
                                    mensagem:
                                        "Boleto atualizado com sucesso.",
                                    id: id
                                });
                            }
                        );
                    }
                );
            }
        );
    }
);

// =========================================================
// REGISTRAR COBRANÇA / TRATATIVA
// USUÁRIO PRECISA ESTAR AUTENTICADO
// =========================================================

app.post(
    "/api/cobrancas",
    autenticarUsuario,
    (req, res) => {

        const {
            boleto_id,
            mensagem
        } = req.body;


        if (
            !boleto_id ||
            !mensagem ||
            String(mensagem).trim() === ""
        ) {

            return res
                .status(400)
                .json({
                    erro:
                        "Informe o boleto e a mensagem da cobrança."
                });
        }


        const usuarioSessao =
            req.session.usuario;


        // =================================================
        // BUSCA O BOLETO
        // =================================================

        const sqlBoleto = `
           
            SELECT
                b.id,
                b.num_boleto,
                b.razao_social,
                b.vencimento,
                b.status,
                c.vendedor AS vendedor_cliente,
                (DATE(b.vencimento) < CURDATE()) AS vencido
            FROM boletos b
            LEFT JOIN clientes c
                ON LOWER(TRIM(c.razao_social)) =
                LOWER(TRIM(b.razao_social))
            WHERE b.id = ?
            LIMIT 1

        `;


        db.query(
            sqlBoleto,
            [boleto_id],
            (
                erroBoleto,
                boletos
            ) => {

                if (erroBoleto) {

                    console.error(
                        "Erro ao buscar boleto:",
                        erroBoleto
                    );


                    return res
                        .status(500)
                        .json({
                            erro:
                                "Erro ao buscar boleto."
                        });
                }


                if (
                    boletos.length === 0
                ) {

                    return res
                        .status(404)
                        .json({
                            erro:
                                "Boleto não encontrado."
                        });
                }


                const boleto =
                    boletos[0];

                    
                const permissao = String(
                    usuarioSessao.permissao || ""
                ).trim().toLowerCase();

                // O Vendedor só pode registrar cobrança
                // para clientes atribuídos a ele.
                if (permissao === "vendedor") {

                    const vendedorCliente = String(
                        boleto.vendedor_cliente || ""
                    ).trim().toLowerCase();

                    const vendedorLogado = String(
                        usuarioSessao.nome || ""
                    ).trim().toLowerCase();

                    if (
                        !vendedorCliente ||
                        vendedorCliente !== vendedorLogado
                    ) {
                        return res.status(403).json({
                            erro: "Você não tem permissão para cobrar este cliente."
                        });
                    }
                }

                // Só permite cobrança de boleto vencido e não pago.
                const statusBoleto = String(
                    boleto.status || ""
                ).trim().toLowerCase();

                if (
                    Number(boleto.vencido) !== 1 ||
                    statusBoleto === "pago" ||
                    statusBoleto === "baixa"
                ) {
                    return res.status(400).json({
                        erro: "Só é possível registrar cobrança para boletos vencidos e não pagos."
                    });
                }



                // =================================================
                // SALVA O HISTÓRICO DA COBRANÇA
                // =================================================

                const sqlCobranca = `
                    INSERT INTO historico_cobrancas
                    (
                        boleto_id,
                        usuario_remetente,
                        mensagem
                    )
                    VALUES (?, ?, ?)
                `;


                db.query(
                    sqlCobranca,
                    [
                        boleto_id,

                        // O usuário não vem mais
                        // do navegador.
                        usuarioSessao.nome,

                        String(mensagem).trim()
                    ],
                    (
                        erroCobranca,
                        resultado
                    ) => {

                        if (erroCobranca) {

                            console.error(
                                "Erro ao registrar cobrança:",
                                erroCobranca
                            );


                            return res
                                .status(500)
                                .json({
                                    erro:
                                        "Erro ao registrar cobrança."
                                });
                        }


                        // =========================================
                        // AUDITORIA
                        // =========================================

                        registrarAuditoria(
                            usuarioSessao.nome,
                            `Registrou uma tratativa de cobrança no boleto ${boleto.num_boleto} do cliente ${boleto.razao_social}`
                        );


                        res
                            .status(201)
                            .json({

                                mensagem:
                                    "Cobrança registrada com sucesso.",

                                id:
                                    resultado.insertId
                            });
                    }
                );
            }
        );
    }
);



 // =========================================================
// HISTÓRICO DE COBRANÇAS
// USUÁRIO PRECISA ESTAR AUTENTICADO
// =========================================================

app.get(
    "/api/cobrancas/:boletoId",
    autenticarUsuario,
    (req, res) => {

        const boletoId = req.params.boletoId;
        const usuarioSessao = req.session.usuario;

        const permissao = String(
            usuarioSessao.permissao || ""
        ).trim().toLowerCase();

        if (!boletoId) {
            return res.status(400).json({
                erro: "Boleto não informado."
            });
        }

        // Verifica o boleto e o vendedor responsável pelo cliente.
        const sqlVerificar = `
            SELECT
                b.id,
                c.vendedor AS vendedor_cliente
            FROM boletos b
            LEFT JOIN clientes c
                ON LOWER(TRIM(c.razao_social)) =
                   LOWER(TRIM(b.razao_social))
            WHERE b.id = ?
            LIMIT 1
        `;

        db.query(
            sqlVerificar,
            [boletoId],
            (erro, boletos) => {

                if (erro) {
                    console.error(
                        "Erro ao verificar boleto:",
                        erro
                    );

                    return res.status(500).json({
                        erro: "Erro ao verificar acesso ao boleto."
                    });
                }

                if (boletos.length === 0) {
                    return res.status(404).json({
                        erro: "Boleto não encontrado."
                    });
                }

                const boleto = boletos[0];

                // O Vendedor só consulta o histórico dos próprios clientes.
                if (permissao === "vendedor") {

                    const vendedorCliente = String(
                        boleto.vendedor_cliente || ""
                    ).trim().toLowerCase();

                    const vendedorLogado = String(
                        usuarioSessao.nome || ""
                    ).trim().toLowerCase();

                    if (
                        !vendedorCliente ||
                        vendedorCliente !== vendedorLogado
                    ) {
                        return res.status(403).json({
                            erro: "Você não tem permissão para consultar este histórico."
                        });
                    }
                }

                // Consulta o histórico somente após validar o acesso.
                const sqlHistorico = `
                    SELECT
                        id,
                        boleto_id,
                        usuario_remetente,
                        mensagem,
                        data_envio AS data_registro
                    FROM historico_cobrancas
                    WHERE boleto_id = ?
                    ORDER BY
                        data_envio DESC,
                        id DESC
                `;

                db.query(
                    sqlHistorico,
                    [boletoId],
                    (erroHistorico, resultados) => {

                        if (erroHistorico) {
                            console.error(
                                "Erro ao buscar histórico de cobranças:",
                                erroHistorico
                            );

                            return res.status(500).json({
                                erro: "Erro ao buscar histórico de cobranças."
                            });
                        }

                        return res.json(resultados);
                    }
                );
            }
        );
    }
);


// =========================================================
// AUDITORIA
// SOMENTE ADMINISTRADOR
// =========================================================


app.get(
    "/api/auditoria",
    somenteAdministrador,
    (req, res) => {
        const {
            usuario,
            acao,
            dataInicio,
            dataFim
        } = req.query;

        let sql = `
            SELECT
                id,
                usuario,
                acao,
                entidade,
                valor_anterior,
                valor_novo,
                ip,
                resultado,
                data_hora
            FROM auditoria
            WHERE 1 = 1
        `;

        const valores = [];

        if (usuario) {
            sql += " AND usuario LIKE ?";
            valores.push(`%${usuario}%`);
        }

        if (acao) {
            sql += " AND acao LIKE ?";
            valores.push(`%${acao}%`);
        }

        if (dataInicio) {
            sql += " AND data_hora >= ?";
            valores.push(`${dataInicio} 00:00:00`);
        }

        if (dataFim) {
            sql += " AND data_hora <= ?";
            valores.push(`${dataFim} 23:59:59`);
        }

        sql += " ORDER BY data_hora DESC, id DESC";

        db.query(sql, valores, (erro, resultados) => {
            if (erro) {
                console.error(
                    "Erro ao consultar auditoria:",
                    erro
                );

                return res.status(500).json({
                    erro: "Erro ao consultar os registros de auditoria."
                });
            }

            return res.json(resultados);
        });
    }
);





// =========================================================
// ROTA INICIAL
// =========================================================

app.get(
    "/",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "../frontend/index.html"
            )
        );
    }
);


// =========================================================
// INICIAR SERVIDOR
// =========================================================

const PORT = 3000;


app.listen(
    PORT,
    () => {

        console.log(
            `Servidor rodando em http://localhost:${PORT}`
        );
    }
);