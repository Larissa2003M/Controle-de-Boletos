const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const path = require("path");

const app = express();


// =========================================================
// CONFIGURAÇÕES
// =========================================================

app.use(cors());
app.use(express.json());

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

function registrarAuditoria(usuario, acao) {

    if (!usuario || !acao) {
        return;
    }

    const sql = `
        INSERT INTO auditoria
        (usuario, acao)
        VALUES (?, ?)
    `;

    db.query(
        sql,
        [usuario, acao],
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
// LOGIN
// =========================================================

app.post(
    "/api/login",
    (req, res) => {

        const {
            usuario,
            senha
        } = req.body;


        if (!usuario || !senha) {

            return res
                .status(400)
                .json({
                    erro: "Informe usuário e senha."
                });
        }


        const sql = `
            SELECT *
            FROM usuarios
            WHERE usuario = ?
            AND senha = ?
            LIMIT 1
        `;


        db.query(
            sql,
            [usuario, senha],
            (erro, resultados) => {

                if (erro) {

                    console.error(
                        "Erro no login:",
                        erro
                    );

                    return res
                        .status(500)
                        .json({
                            erro: "Erro interno do servidor."
                        });
                }


                if (resultados.length === 0) {

                    return res
                        .status(401)
                        .json({
                            erro: "Usuário ou senha inválidos."
                        });
                }


                const usuarioEncontrado =
                    resultados[0];


                if (
                    usuarioEncontrado.status &&
                    String(
                        usuarioEncontrado.status
                    ).toLowerCase() !== "ativo"
                ) {

                    return res
                        .status(403)
                        .json({
                            erro: "Usuário inativo."
                        });
                }


                registrarAuditoria(
                    usuarioEncontrado.nome,
                    "Realizou login no sistema"
                );


                res.json({

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
                });
            }
        );
    }
);


// =========================================================
// CONTROLE DE ACESSO - ADMINISTRADOR
// =========================================================

function somenteAdministrador(req, res, next) {

    const usuarioId =
        req.headers["x-usuario-id"];


    if (!usuarioId) {

        return res
            .status(401)
            .json({
                erro: "Usuário não autenticado."
            });
    }


    const sql = `
        SELECT
            id,
            nome,
            permissao,
            status
        FROM usuarios
        WHERE id = ?
        LIMIT 1
    `;


    db.query(
        sql,
        [usuarioId],
        (erro, resultados) => {

            if (erro) {

                console.error(
                    "Erro ao verificar permissão:",
                    erro
                );

                return res
                    .status(500)
                    .json({
                        erro: "Erro ao verificar permissão."
                    });
            }


            if (resultados.length === 0) {

                return res
                    .status(401)
                    .json({
                        erro: "Usuário não encontrado."
                    });
            }


            const usuario =
                resultados[0];


            // Verifica se está ativo
            if (
                !usuario.status ||
                String(usuario.status)
                    .toLowerCase() !== "ativo"
            ) {

                return res
                    .status(403)
                    .json({
                        erro: "Usuário inativo."
                    });
            }


            // Somente Administrador
            if (
                !usuario.permissao ||
                String(usuario.permissao)
                    .toLowerCase() !==
                    "administrador"
            ) {

                return res
                    .status(403)
                    .json({
                        erro:
                            "Acesso negado. Somente o Administrador pode gerenciar usuários."
                    });
            }


            req.usuarioAutenticado =
                usuario;

            next();
        }
    );
}


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


                res.json(resultados);
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
    (req, res) => {

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


        // Verifica campos obrigatórios
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


        // Função responsável pela inserção
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
                (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;


            const valores = [

                nome,
                telefone,
                usuario,
                endereco,
                numero,
                bairro,
                senha,
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
                (erroAdmin, administradores) => {

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
    (req, res) => {

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
                    erro: "Usuário inválido."
                });
        }


        // Na edição a senha pode ficar vazia
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
        // FUNÇÃO PARA ATUALIZAR
        // =================================================

        function atualizarUsuario() {

            let sql;
            let valores;


            // Se informou uma nova senha
            if (
                senha &&
                senha.trim() !== ""
            ) {

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
                    senha,
                    setor,
                    permissao,
                    status,
                    email,
                    cpf,
                    id
                ];

            } else {

                // Não altera a senha
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
// =========================================================

app.get(
    "/api/clientes",
    (req, res) => {

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


                res.json(resultados);
            }
        );
    }
);


// =========================================================
// CADASTRAR CLIENTE
// =========================================================

app.post(
    "/api/clientes",
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
            status,
            usuario_logado
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


        // Verifica se o CNPJ já existe
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
                    (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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


                        registrarAuditoria(

                            usuario_logado ||
                            vendedor ||
                            "Sistema",

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
// =========================================================

app.put(
    "/api/clientes/:id",
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
            status,
            usuario_logado
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


        // Verifica se outro cliente
        // já utiliza o mesmo CNPJ
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

                            usuario_logado ||
                            vendedor ||
                            "Sistema",

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
// CONTROLE DE ACESSO POR USUÁRIO
// =========================================================

app.get(
    "/api/boletos",
    (req, res) => {

        const usuarioId =
            req.headers["x-usuario-id"];


        if (!usuarioId) {

            return res
                .status(401)
                .json({
                    erro: "Usuário não autenticado."
                });
        }


        // Primeiro descobre quem está logado
        const sqlUsuario = `
            SELECT
                id,
                nome,
                permissao,
                status
            FROM usuarios
            WHERE id = ?
            LIMIT 1
        `;


        db.query(
            sqlUsuario,
            [usuarioId],
            (erroUsuario, usuarios) => {

                if (erroUsuario) {

                    console.error(
                        "Erro ao verificar usuário:",
                        erroUsuario
                    );

                    return res
                        .status(500)
                        .json({
                            erro: "Erro ao verificar usuário."
                        });
                }


                if (usuarios.length === 0) {

                    return res
                        .status(401)
                        .json({
                            erro: "Usuário não encontrado."
                        });
                }


                const usuario =
                    usuarios[0];


                // Usuário precisa estar ativo
                if (
                    !usuario.status ||
                    String(usuario.status)
                        .trim()
                        .toLowerCase() !== "ativo"
                ) {

                    return res
                        .status(403)
                        .json({
                            erro: "Usuário inativo."
                        });
                }


                const permissao =
                    String(
                        usuario.permissao || ""
                    )
                        .trim()
                        .toLowerCase();


                // ==========================================
                // VENDEDOR
                // ==========================================
                // Só recebe boletos dos clientes
                // atribuídos ao seu nome.
                // ==========================================

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
                        [usuario.nome],
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


                            console.log(
                                `Vendedor ${usuario.nome} recebeu ${resultados.length} boleto(s).`
                            );


                            return res.json(
                                resultados
                            );
                        }
                    );


                    return;
                }


                // ==========================================
                // ADMINISTRADOR / OPERADOR
                // ==========================================
                // Podem consultar todos os boletos.
                // ==========================================

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


                // Qualquer outro perfil
                return res
                    .status(403)
                    .json({
                        erro:
                            "Usuário sem permissão para consultar boletos."
                    });
            }
        );
    }
);


// =========================================================
// CADASTRAR UM BOLETO
// =========================================================

app.post(
    "/api/boletos",
    (req, res) => {

        const {
            razao_social,
            num_boleto,
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

            instrucoes,
            usuario_logado
        } = req.body;


        // Verifica campos obrigatórios
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


        // Valor deve ser maior que zero
        if (Number(valor) <= 0) {

            return res
                .status(400)
                .json({
                    erro:
                        "O valor do boleto deve ser maior que zero."
                });
        }


        // Verifica se já existe boleto
        // com o mesmo número
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


                if (encontrados.length > 0) {

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
                        ?, ?, ?, ?, ?, ?, ?, ?,
                        ?, ?, ?, ?, ?
                    )
                `;


                const valores = [

                    razao_social,

                    num_boleto,

                    valor,

                    data_emissao,

                    vencimento,

                    vendedor || null,

                    status || "Pendente",

                    motivo_baixa || null,

                    pagador_cpf_cnpj || null,

                    pagador_endereco || null,

                    pagador_numero || null,

                    pagador_cep || null,

                    instrucoes || null
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


                        registrarAuditoria(

                            usuario_logado ||
                            vendedor ||
                            "Sistema",

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
// =========================================================

app.post(
    "/api/boletos/lote",
    (req, res) => {

        const {
            boletos,
            usuario_logado
        } = req.body;


        // Verifica se recebeu boletos
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


        // Verifica os dados obrigatórios
        // de cada boleto
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


        // Pega todos os números
        // dos boletos
        const numeros =
            boletos.map(
                boleto =>
                    String(
                        boleto.num_boleto
                    ).trim()
            );


        // Verifica números repetidos
        // dentro do próprio lote
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


        // Monta os placeholders
        // para consulta SQL
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


                // Já existem boletos com
                // algum dos números
                if (encontrados.length > 0) {

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


                const sql = `
                    INSERT INTO boletos
                    (
                        razao_social,
                        num_boleto,
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


                const valores =
                    boletos.map(
                        boleto => [

                            boleto.razao_social,

                            boleto.num_boleto,

                            boleto.valor,

                            boleto.data_emissao,

                            boleto.vencimento,

                            boleto.vendedor ||
                            null,

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

                            usuario_logado ||
                            boletos[0].vendedor ||
                            "Sistema",

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
// =========================================================

app.put(
    "/api/boletos/:id",
    (req, res) => {

        const id =
            req.params.id;


        const {
            razao_social,
            num_boleto,
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

            instrucoes,
            usuario_logado
        } = req.body;


        // Verifica dados obrigatórios
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


        // Valor precisa ser maior
        // que zero
        if (Number(valor) <= 0) {

            return res
                .status(400)
                .json({
                    erro:
                        "O valor do boleto deve ser maior que zero."
                });
        }


        // Verifica se outro boleto
        // já possui o mesmo número
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


                if (encontrados.length > 0) {

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

                    valor,

                    data_emissao,

                    vencimento,

                    vendedor || null,

                    status || "Pendente",

                    motivo_baixa || null,

                    pagador_cpf_cnpj || null,

                    pagador_endereco || null,

                    pagador_numero || null,

                    pagador_cep || null,

                    instrucoes || null,

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

                            usuario_logado ||
                            vendedor ||
                            "Sistema",

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
// =========================================================

app.post(
    "/api/cobrancas",
    (req, res) => {

        const {
            boleto_id,
            usuario_remetente,
            mensagem
        } = req.body;


        // Verifica campos obrigatórios
        if (!boleto_id) {

            return res
                .status(400)
                .json({
                    erro: "Informe o boleto."
                });
        }


        if (!mensagem || !mensagem.trim()) {

            return res
                .status(400)
                .json({
                    erro:
                        "Informe a situação ou tratativa da cobrança."
                });
        }


        const usuario =
            usuario_remetente ||
            "Usuário";


        // Verifica se o boleto existe
        const sqlBoleto = `
            SELECT
                id,
                num_boleto,
                razao_social
            FROM boletos
            WHERE id = ?
            LIMIT 1
        `;


        db.query(
            sqlBoleto,
            [boleto_id],
            (erroBoleto, boletos) => {

                if (erroBoleto) {

                    console.error(
                        "Erro ao verificar boleto:",
                        erroBoleto
                    );

                    return res
                        .status(500)
                        .json({
                            erro:
                                "Erro ao verificar boleto."
                        });
                }


                if (boletos.length === 0) {

                    return res
                        .status(404)
                        .json({
                            erro:
                                "Boleto não encontrado."
                        });
                }


                const boleto =
                    boletos[0];


                // =========================================
                // SALVA NO HISTÓRICO DE COBRANÇAS
                // =========================================

                const sql = `
                    INSERT INTO historico_cobrancas
                    (
                        boleto_id,
                        usuario_remetente,
                        mensagem
                    )
                    VALUES (?, ?, ?)
                `;


                db.query(
                    sql,
                    [
                        boleto_id,
                        usuario,
                        mensagem.trim()
                    ],
                    (
                        erro,
                        resultado
                    ) => {

                        if (erro) {

                            console.error(
                                "Erro ao registrar cobrança:",
                                erro
                            );

                            return res
                                .status(500)
                                .json({
                                    erro:
                                        "Erro ao registrar cobrança."
                                });
                        }


                        // =================================
                        // AUDITORIA
                        // =================================

                        registrarAuditoria(
                            usuario,
                            `Registrou uma tratativa de cobrança no boleto ${boleto.num_boleto} do cliente ${boleto.razao_social}`
                        );


                        return res
                            .status(201)
                            .json({

                                mensagem:
                                    "Status de cobrança registrado com sucesso.",

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
// REGISTRAR COBRANÇA / TRATATIVA
// =========================================================

app.post(
    "/api/cobrancas",
    (req, res) => {
        // código que te passei para salvar a cobrança
    }
);


// =========================================================
// BUSCAR HISTÓRICO DE COBRANÇA POR BOLETO
// =========================================================

app.get(
    "/api/cobrancas/:boletoId",
    (req, res) => {

        const boletoId =
            req.params.boletoId;

        if (!boletoId) {

            return res
                .status(400)
                .json({
                    erro: "Boleto não informado."
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
            ORDER BY data_envio DESC, id DESC
        `;

        db.query(
            sql,
            [boletoId],
            (erro, resultados) => {

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

                res.json(resultados);
            }
        );
    }
);


// =========================================================
// LISTAR AUDITORIA
// =========================================================

app.get(
    "/api/auditoria",
    (req, res) => {

        const sql = `
            SELECT *
            FROM auditoria
            ORDER BY id DESC
        `;

        db.query(
            sql,
            (erro, resultados) => {

                if (erro) {

                    console.error(
                        "Erro ao buscar auditoria:",
                        erro
                    );

                    return res
                        .status(500)
                        .json({
                            erro: "Erro ao buscar auditoria."
                        });
                }

                res.json(resultados);
            }
        );
    }
);


// =========================================================
// PÁGINA PRINCIPAL
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