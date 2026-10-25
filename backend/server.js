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
        secret: "controle-boleto-chave-sessao-2026",

        resave: false,

        saveUninitialized: false,

        // Renova o tempo da sessão enquanto
        // o usuário continua utilizando o sistema.
        rolling: true,

        cookie: {

            // Impede acesso ao cookie pelo JavaScript
            // do navegador.
            httpOnly: true,

            // Proteção contra envio do cookie
            // em determinadas requisições externas.
            sameSite: "lax",

            // Em localhost permanece false.
            // Em produção com HTTPS deverá ser true.
            secure: false,

            // 30 minutos
            maxAge: 30 * 60 * 1000
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

function registrarAuditoria(
    usuario,
    acao
) {

    if (!usuario || !acao) {
        return;
    }


    const sql = `
        INSERT INTO auditoria
        (
            usuario,
            acao
        )
        VALUES (?, ?)
    `;


    db.query(
        sql,
        [
            usuario,
            acao
        ],
        (erro) => {

            if (erro) {

                console.error(
                    "Erro ao registrar auditoria:",
                    erro
                );
            }
        }
    );
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

    console.log(
        "ID da sessão:",
        req.sessionID || "Não identificado"
    );

    console.log(
        "Sessão existe:",
        Boolean(req.session)
    );

    console.log(
        "Usuário na sessão:",
        Boolean(req.session && req.session.usuario)
    );

    if (!req.session || !req.session.usuario) {
        console.log("Resultado: sessão não autenticada.");
        console.log("------------------------------");

        return res.status(401).json({
            erro: "Sessão expirada. Faça login novamente."
        });
    }

    console.log("Resultado: usuário autenticado.");
    console.log("------------------------------");

    next();
}



// =========================================================
// MIDDLEWARE - SOMENTE ADMINISTRADOR
// =========================================================

function somenteAdministrador(
    req,
    res,
    next
) {

    // Primeiro verifica se existe sessão.
    if (
        !req.session ||
        !req.session.usuario
    ) {

        return res
            .status(401)
            .json({
                erro:
                    "Sessão expirada. Faça login novamente."
            });
    }


    const usuarioSessao =
        req.session.usuario;


    // Consulta novamente o banco para não confiar
    // apenas nos dados armazenados na sessão.
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


    db.query(
        sql,
        [usuarioSessao.id],
        (erro, resultados) => {

            if (erro) {

                console.error(
                    "Erro ao verificar permissão:",
                    erro
                );

                return res
                    .status(500)
                    .json({
                        erro:
                            "Erro ao verificar permissão."
                    });
            }


            if (
                resultados.length === 0
            ) {

                req.session.destroy(
                    () => {}
                );


                return res
                    .status(401)
                    .json({
                        erro:
                            "Usuário não encontrado."
                    });
            }


            const usuario =
                resultados[0];


            // =============================================
            // VERIFICA SE CONTINUA ATIVO
            // =============================================

            if (
                !usuario.status ||
                String(usuario.status)
                    .trim()
                    .toLowerCase() !==
                    "ativo"
            ) {

                req.session.destroy(
                    () => {}
                );


                return res
                    .status(403)
                    .json({
                        erro:
                            "Usuário inativo."
                    });
            }


            // =============================================
            // VERIFICA O PERFIL
            // =============================================

            if (
                !usuario.permissao ||
                String(usuario.permissao)
                    .trim()
                    .toLowerCase() !==
                    "administrador"
            ) {

                return res
                    .status(403)
                    .json({
                        erro:
                            "Acesso negado. Somente o Administrador possui permissão."
                    });
            }


            // Dados confiáveis obtidos novamente
            // diretamente do banco.
            req.usuarioAutenticado =
                usuario;


            next();
        }
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


        // A senha NÃO é pesquisada diretamente
        // no SQL.
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


                if (!senhaCorreta) {

                    return res
                        .status(401)
                        .json({
                            erro:
                                "Usuário ou senha inválidos."
                        });
                }


                // =========================================
                // CRIA A SESSÃO REAL NO SERVIDOR
                // =========================================

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
                        // RESPOSTA
                        // =================================

                        req.session.save((erroSalvar) => {
                            if (erroSalvar) {
                                console.error(
                                    "Erro ao salvar a sessão:",
                                    erroSalvar
                                );

                                return res.status(500).json({
                                    erro: "Não foi possível salvar a sessão."
                                });
                            }

                            console.log(
                                "Sessão salva com sucesso. ID:",
                                req.sessionID
                            );

                            return res.json({
                                mensagem: "Login realizado com sucesso.",
                                usuario: {
                                    id: usuarioEncontrado.id,
                                    nome: usuarioEncontrado.nome,
                                    usuario: usuarioEncontrado.usuario,
                                    setor: usuarioEncontrado.setor,
                                    permissao: usuarioEncontrado.permissao,
                                    status: usuarioEncontrado.status
                                }
                            });
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
                endereco,
                numero,
                bairro,
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


                    return res
                        .status(500)
                        .json({
                            erro:
                                "Erro ao buscar usuários."
                        });
                }


                res.json(
                    resultados
                );
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
            endereco,
            numero,
            bairro,
            setor,
            permissao,
            status
        } = req.body;


        if (
            !nome ||
            !cpf ||
            !usuario ||
            !email ||
            !senha ||
            !telefone ||
            !endereco ||
            !numero ||
            !bairro ||
            !setor ||
            !permissao ||
            !status
        ) {

            return res
                .status(400)
                .json({
                    erro:
                        "Preencha todos os campos obrigatórios."
                });
        }


        // =================================================
        // GERA O HASH DA SENHA
        // =================================================

        let senhaHash;


        try {

            senhaHash =
                await bcrypt.hash(
                    senha,
                    10
                );

        } catch (erroHash) {

            console.error(
                "Erro ao proteger senha:",
                erroHash
            );


            return res
                .status(500)
                .json({
                    erro:
                        "Erro ao proteger a senha."
                });
        }


        // =================================================
        // FUNÇÃO PARA INSERIR USUÁRIO
        // =================================================

        function inserirUsuario() {

            const sql = `
                INSERT INTO usuarios
                (
                    nome,
                    telefone,
                    usuario,
                    endereco,
                    numero,
                    bairro,
                    senha,
                    setor,
                    permissao,
                    status,
                    email,
                    cpf
                )
                VALUES
                (
                    ?, ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?
                )
            `;


            const valores = [

                nome,
                telefone,
                usuario,
                endereco,
                numero,
                bairro,

                // Senha protegida
                senhaHash,

                setor,
                permissao,
                status || "Ativo",
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


                        if (
                            erro.code ===
                            "ER_DUP_ENTRY"
                        ) {

                            return res
                                .status(409)
                                .json({
                                    erro:
                                        "Usuário, CPF ou outro dado único já cadastrado."
                                });
                        }


                        return res
                            .status(500)
                            .json({
                                erro:
                                    "Erro ao cadastrar usuário."
                            });
                    }


                    // =====================================
                    // AUDITORIA
                    // =====================================
                    // O usuário vem da sessão autenticada.

                    registrarAuditoria(
                        req.usuarioAutenticado.nome,
                        `Cadastrou o usuário ${nome}`
                    );


                    res
                        .status(201)
                        .json({

                            mensagem:
                                "Usuário cadastrado com sucesso.",

                            id:
                                resultado.insertId
                        });
                }
            );
        }


        // =================================================
        // GARANTE APENAS UM ADMINISTRADOR
        // =================================================

        if (
            String(permissao)
                .trim()
                .toLowerCase() ===
            "administrador"
        ) {

            const sqlAdmin = `
                SELECT id
                FROM usuarios
                WHERE LOWER(permissao) =
                'administrador'
                LIMIT 1
            `;


            db.query(
                sqlAdmin,
                (
                    erroAdmin,
                    administradores
                ) => {

                    if (erroAdmin) {

                        console.error(
                            "Erro ao verificar Administrador:",
                            erroAdmin
                        );


                        return res
                            .status(500)
                            .json({
                                erro:
                                    "Erro ao verificar Administrador."
                            });
                    }


                    if (
                        administradores.length > 0
                    ) {

                        return res
                            .status(409)
                            .json({
                                erro:
                                    "Já existe um Administrador cadastrado. O sistema permite apenas um Administrador."
                            });
                    }


                    inserirUsuario();
                }
            );


            return;
        }


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
            endereco,
            numero,
            bairro,
            setor,
            permissao,
            status
        } = req.body;


        if (!id) {

            return res
                .status(400)
                .json({
                    erro:
                        "Usuário inválido."
                });
        }


        // A senha não é obrigatória na edição.
        if (
            !nome ||
            !cpf ||
            !usuario ||
            !email ||
            !telefone ||
            !endereco ||
            !numero ||
            !bairro ||
            !setor ||
            !permissao ||
            !status
        ) {

            return res
                .status(400)
                .json({
                    erro:
                        "Preencha todos os campos obrigatórios."
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

            if (
                senha &&
                String(senha).trim() !== ""
            ) {

                let senhaHash;


                try {

                    senhaHash =
                        await bcrypt.hash(
                            senha,
                            10
                        );

                } catch (erroHash) {

                    console.error(
                        "Erro ao proteger senha:",
                        erroHash
                    );


                    return res
                        .status(500)
                        .json({
                            erro:
                                "Erro ao proteger a senha."
                        });
                }


                sql = `
                    UPDATE usuarios
                    SET
                        nome = ?,
                        telefone = ?,
                        usuario = ?,
                        endereco = ?,
                        numero = ?,
                        bairro = ?,
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
                    endereco,
                    numero,
                    bairro,

                    // Nova senha protegida
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
                // Mantém o hash que já está no banco.

                sql = `
                    UPDATE usuarios
                    SET
                        nome = ?,
                        telefone = ?,
                        usuario = ?,
                        endereco = ?,
                        numero = ?,
                        bairro = ?,
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
                    endereco,
                    numero,
                    bairro,
                    setor,
                    permissao,
                    status,
                    email,
                    cpf,
                    id
                ];
            }


            db.query(
                sql,
                valores,
                (erro, resultado) => {

                    if (erro) {

                        console.error(
                            "Erro ao atualizar usuário:",
                            erro
                        );


                        if (
                            erro.code ===
                            "ER_DUP_ENTRY"
                        ) {

                            return res
                                .status(409)
                                .json({
                                    erro:
                                        "Usuário, CPF ou outro dado único já cadastrado."
                                });
                        }


                        return res
                            .status(500)
                            .json({
                                erro:
                                    "Erro ao atualizar usuário."
                            });
                    }


                    if (
                        resultado.affectedRows === 0
                    ) {

                        return res
                            .status(404)
                            .json({
                                erro:
                                    "Usuário não encontrado."
                            });
                    }


                    // =====================================
                    // AUDITORIA
                    // =====================================

                    registrarAuditoria(
                        req.usuarioAutenticado.nome,
                        `Atualizou o usuário ${nome}`
                    );


                    res.json({
                        mensagem:
                            "Usuário atualizado com sucesso."
                    });
                }
            );
        }


        // =================================================
        // IMPEDE MAIS DE UM ADMINISTRADOR
        // =================================================

        if (
            String(permissao)
                .trim()
                .toLowerCase() ===
            "administrador"
        ) {

            const sqlAdmin = `
                SELECT id
                FROM usuarios
                WHERE LOWER(permissao) =
                'administrador'
                AND id <> ?
                LIMIT 1
            `;


            db.query(
                sqlAdmin,
                [id],
                (
                    erroAdmin,
                    administradores
                ) => {

                    if (erroAdmin) {

                        console.error(
                            "Erro ao verificar Administrador:",
                            erroAdmin
                        );


                        return res
                            .status(500)
                            .json({
                                erro:
                                    "Erro ao verificar Administrador."
                            });
                    }


                    if (
                        administradores.length > 0
                    ) {

                        return res
                            .status(409)
                            .json({
                                erro:
                                    "Já existe outro Administrador cadastrado."
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
// USUÁRIO PRECISA ESTAR AUTENTICADO
// =========================================================

app.get(
    "/api/clientes",
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
        // Só consulta clientes atribuídos a ele.

        if (
            permissao === "vendedor"
        ) {

            const sql = `
                SELECT *
                FROM clientes
                WHERE TRIM(LOWER(vendedor)) =
                      TRIM(LOWER(?))
                ORDER BY razao_social
            `;


            db.query(
                sql,
                [usuarioSessao.nome],
                (erro, resultados) => {

                    if (erro) {

                        console.error(
                            "Erro ao buscar clientes:",
                            erro
                        );


                        return res
                            .status(500)
                            .json({
                                erro:
                                    "Erro ao buscar clientes."
                            });
                    }


                    return res.json(
                        resultados
                    );
                }
            );


            return;
        }


        // =============================================
        // ADMINISTRADOR / OPERADOR
        // =============================================

        const sql = `
            SELECT *
            FROM clientes
            ORDER BY razao_social
        `;


        db.query(
            sql,
            (erro, resultados) => {

                if (erro) {

                    console.error(
                        "Erro ao buscar clientes:",
                        erro
                    );


                    return res
                        .status(500)
                        .json({
                            erro:
                                "Erro ao buscar clientes."
                        });
                }


                res.json(
                    resultados
                );
            }
        );
    }
);


// =========================================================
// CADASTRAR CLIENTE
// USUÁRIO PRECISA ESTAR AUTENTICADO
// =========================================================

app.post(
    "/api/clientes",
    autenticarUsuario,
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

            return res
                .status(400)
                .json({
                    erro:
                        "Informe a razão social."
                });
        }


        if (!cnpj) {

            return res
                .status(400)
                .json({
                    erro:
                        "Informe o CNPJ."
                });
        }


        if (!vendedor) {

            return res
                .status(400)
                .json({
                    erro:
                        "Informe o vendedor."
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
            (
                erroVerificacao,
                encontrados
            ) => {

                if (erroVerificacao) {

                    console.error(
                        "Erro ao verificar cliente:",
                        erroVerificacao
                    );


                    return res
                        .status(500)
                        .json({
                            erro:
                                "Erro ao verificar cliente."
                        });
                }


                if (
                    encontrados.length > 0
                ) {

                    return res
                        .status(409)
                        .json({
                            erro:
                                "Este CNPJ já está cadastrado."
                        });
                }


                const sql = `
                    INSERT INTO clientes
                    (
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
                    VALUES
                    (
                        ?, ?, ?, ?, ?, ?, ?,
                        ?, ?, ?, ?, ?, ?
                    )
                `;


                const valores = [

                    razao_social,

                    nome_fantasia ||
                    null,

                    cnpj,

                    inscricao_estadual ||
                    null,

                    contato ||
                    null,

                    telefone ||
                    null,

                    email ||
                    null,

                    endereco ||
                    null,

                    numero ||
                    null,

                    cep ||
                    null,

                    bairro ||
                    null,

                    vendedor,

                    status ||
                    "Ativo"
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
                                "Erro ao cadastrar cliente:",
                                erro
                            );


                            return res
                                .status(500)
                                .json({
                                    erro:
                                        "Erro ao cadastrar cliente."
                                });
                        }


                        // Usuário vem da sessão.
                        registrarAuditoria(
                            req.session.usuario.nome,
                            `Cadastrou o cliente ${razao_social}`
                        );


                        res
                            .status(201)
                            .json({

                                mensagem:
                                    "Cliente cadastrado com sucesso.",

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
// ATUALIZAR CLIENTE
// USUÁRIO PRECISA ESTAR AUTENTICADO
// =========================================================

app.put(
    "/api/clientes/:id",
    autenticarUsuario,
    (req, res) => {

        const id =
            req.params.id;


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

            return res
                .status(400)
                .json({
                    erro:
                        "Informe a razão social."
                });
        }


        if (!cnpj) {

            return res
                .status(400)
                .json({
                    erro:
                        "Informe o CNPJ."
                });
        }


        if (!vendedor) {

            return res
                .status(400)
                .json({
                    erro:
                        "Informe o vendedor."
                });
        }


        const sqlVerificar = `
            SELECT id
            FROM clientes
            WHERE cnpj = ?
            AND id <> ?
            LIMIT 1
        `;


        db.query(
            sqlVerificar,
            [
                cnpj,
                id
            ],
            (
                erroVerificacao,
                encontrados
            ) => {

                if (erroVerificacao) {

                    console.error(
                        "Erro ao verificar cliente:",
                        erroVerificacao
                    );


                    return res
                        .status(500)
                        .json({
                            erro:
                                "Erro ao verificar cliente."
                        });
                }


                if (
                    encontrados.length > 0
                ) {

                    return res
                        .status(409)
                        .json({
                            erro:
                                "Este CNPJ já pertence a outro cliente."
                        });
                }


                const sql = `
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

                    razao_social,

                    nome_fantasia ||
                    null,

                    cnpj,

                    inscricao_estadual ||
                    null,

                    contato ||
                    null,

                    telefone ||
                    null,

                    email ||
                    null,

                    endereco ||
                    null,

                    numero ||
                    null,

                    cep ||
                    null,

                    bairro ||
                    null,

                    vendedor,

                    status ||
                    "Ativo",

                    id
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
                                "Erro ao atualizar cliente:",
                                erro
                            );


                            return res
                                .status(500)
                                .json({
                                    erro:
                                        "Erro ao atualizar cliente."
                                });
                        }


                        if (
                            resultado.affectedRows === 0
                        ) {

                            return res
                                .status(404)
                                .json({
                                    erro:
                                        "Cliente não encontrado."
                                });
                        }


                        registrarAuditoria(
                            req.session.usuario.nome,
                            `Atualizou o cliente ${razao_social}`
                        );


                        res.json({
                            mensagem:
                                "Cliente atualizado com sucesso."
                        });
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
        // Só consulta boletos dos clientes
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


            db.query(
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
                                    "Erro ao buscar boletos do vendedor."
                            });
                    }


                    return res.json(
                        resultados
                    );
                }
            );


            return;
        }


        // =============================================
        // ADMINISTRADOR / OPERADOR
        // =============================================

        if (
            permissao === "administrador" ||
            permissao === "operador"
        ) {

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


            return;
        }


        return res
            .status(403)
            .json({
                erro:
                    "Usuário sem permissão para consultar boletos."
            });
    }
);


// =========================================================
// CADASTRAR BOLETO
// USUÁRIO PRECISA ESTAR AUTENTICADO
// =========================================================

app.post(
    "/api/boletos",
    autenticarUsuario,
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

            pagador_cpf_cnpj,
            pagador_endereco,
            pagador_numero,
            pagador_cep,

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

                        pagador_cpf_cnpj,
                        pagador_endereco,
                        pagador_numero,
                        pagador_cep,

                        instrucoes
                    )
                    VALUES
                    (
                        ?, ?, ?, ?, ?, ?, ?, ?, ?,
                        ?, ?, ?, ?, ?
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

                    pagador_cpf_cnpj ||
                    null,

                    pagador_endereco ||
                    null,

                    pagador_numero ||
                    null,

                    pagador_cep ||
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
                            `Cadastrou o boleto ${num_boleto} do cliente ${razao_social}`
                        );


                        res
                            .status(201)
                            .json({

                                mensagem:
                                    "Boleto cadastrado com sucesso.",

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
// CADASTRAR BOLETOS PARCELADOS
// USUÁRIO PRECISA ESTAR AUTENTICADO
// =========================================================

app.post(
    "/api/boletos/lote",
    autenticarUsuario,
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

                            boleto.pagador_cpf_cnpj ||
                            null,

                            boleto.pagador_endereco ||
                            null,

                            boleto.pagador_numero ||
                            null,

                            boleto.pagador_cep ||
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

                        pagador_cpf_cnpj,
                        pagador_endereco,
                        pagador_numero,
                        pagador_cep,

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

app.put(
    "/api/boletos/:id",
    autenticarUsuario,
    (req, res) => {

        const id =
            req.params.id;


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

            pagador_cpf_cnpj,
            pagador_endereco,
            pagador_numero,
            pagador_cep,

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


        // Se for vendedor, não aceita o nome
        // de outro vendedor enviado pelo navegador.
        const vendedorBoleto =
            permissao === "vendedor"
                ? usuarioSessao.nome
                : vendedor || null;


        const sqlVerificar = `
            SELECT id
            FROM boletos
            WHERE num_boleto = ?
            AND id <> ?
            LIMIT 1
        `;


        db.query(
            sqlVerificar,
            [
                num_boleto,
                id
            ],
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
                                "Já existe outro boleto cadastrado com esse número."
                        });
                }


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

                        pagador_cpf_cnpj = ?,
                        pagador_endereco = ?,
                        pagador_numero = ?,
                        pagador_cep = ?,

                        instrucoes = ?

                    WHERE id = ?
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

                    pagador_cpf_cnpj ||
                    null,

                    pagador_endereco ||
                    null,

                    pagador_numero ||
                    null,

                    pagador_cep ||
                    null,

                    instrucoes ||
                    null,

                    id
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
                                "Erro ao atualizar boleto:",
                                erro
                            );


                            return res
                                .status(500)
                                .json({
                                    erro:
                                        "Erro ao atualizar boleto."
                                });
                        }


                        if (
                            resultado.affectedRows === 0
                        ) {

                            return res
                                .status(404)
                                .json({
                                    erro:
                                        "Boleto não encontrado."
                                });
                        }


                        registrarAuditoria(
                            usuarioSessao.nome,
                            `Atualizou o boleto ${num_boleto} - Status: ${status || "Pendente"}`
                        );


                        res.json({
                            mensagem:
                                "Boleto atualizado com sucesso."
                        });
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
                id,
                num_boleto,
                razao_social,
                vencimento,
                status
            FROM boletos
            WHERE id = ?
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

        const boletoId =
            req.params.boletoId;


        if (!boletoId) {

            return res
                .status(400)
                .json({
                    erro:
                        "Boleto não informado."
                });
        }


        const sql = `
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
            sql,
            [boletoId],
            (
                erro,
                resultados
            ) => {

                if (erro) {

                    console.error(
                        "Erro ao buscar histórico de cobranças:",
                        erro
                    );


                    return res
                        .status(500)
                        .json({
                            erro:
                                "Erro ao buscar histórico de cobranças."
                        });
                }


                res.json(
                    resultados
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

        const sql = `
            SELECT
                id,
                usuario,
                acao,
                data_hora
            FROM auditoria
            ORDER BY
                data_hora DESC,
                id DESC
        `;


        db.query(
            sql,
            (
                erro,
                resultados
            ) => {

                if (erro) {

                    console.error(
                        "Erro ao buscar auditoria:",
                        erro
                    );


                    return res
                        .status(500)
                        .json({
                            erro:
                                "Erro ao buscar auditoria."
                        });
                }


                res.json(
                    resultados
                );
            }
        );
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