const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// ==================== DADOS DO TRELLO ====================
const TRELLO_API_KEY = "f182a4dc570bd2a3c9af19482940f79b";
const TRELLO_TOKEN = "ATTA67351d912a65fda8a61aed6cf5446bc8f95eb7bf20496534456918399513ead4850973EF";
const TRELLO_BOARD_ID = "gYubI2E0";
// ===========================================================

const HOST = "0.0.0.0";
const PORT = Number(process.env.PORT || 5050);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const DATA_FILE = path.join(DATA_DIR, "shared-state.json");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };
const SESSION_COOKIE_NAME = "ti_hub_sessao";
const DURACAO_SESSAO_MS = 8 * 60 * 60 * 1000; // 8 horas, renovada a cada requisição autenticada

const DEFAULT_SHARED_STATE = { "monitoramento-ti": { notebooks: [], suporte: [], alunos: [], termos: [] }, "ti-hub-modulos-v1": { emails: [], softwares: [], estoque: [], impressoras: [], chamados: [], compras: [], gastos: [], orcamentos: [], projetos: [], tutoriais: [] } };

function ensureStorage() {
	fs.mkdirSync(DATA_DIR, { recursive: true });

	if (!fs.existsSync(DATA_FILE)) {
		fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_SHARED_STATE, null, 2), "utf8");
	}
}

function readStorage() {
	try {
		ensureStorage();
		const raw = fs.readFileSync(DATA_FILE, "utf8");
		const parsed = JSON.parse(raw);
		return parsed && typeof parsed === "object" ? parsed : {};
	} catch (error) {
		console.error("Falha ao ler o armazenamento compartilhado:", error);
		return {};
	}
}

function writeStorage(data) {
	try {
		ensureStorage();
		fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
		return true;
	} catch (error) {
		console.error("Falha ao gravar o armazenamento compartilhado:", error);
		return false;
	}
}

function buildApiResponse(storage) {
	return { ...(storage["monitoramento-ti"] || {}), ...(storage["ti-hub-modulos-v1"] || {}) };
}

function mergeIncomingData(storage, payload) {
	const next = { ...(storage || {}) };

	if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
		return next;
	}

	const notebookKeys = ["notebooks", "suporte", "alunos", "termos"];
	const moduleKeys = ["emails", "softwares", "estoque", "impressoras", "chamados", "compras", "gastos", "orcamentos", "projetos", "tutoriais"];

	if (notebookKeys.some((key) => Object.prototype.hasOwnProperty.call(payload, key))) {
		next["monitoramento-ti"] = { ...(next["monitoramento-ti"] || {}), ...Object.fromEntries(notebookKeys.filter((key) => Object.prototype.hasOwnProperty.call(payload, key)).map((key) => [key, Array.isArray(payload[key]) ? payload[key] : []])) };
	}

	if (moduleKeys.some((key) => Object.prototype.hasOwnProperty.call(payload, key))) {
		next["ti-hub-modulos-v1"] = { ...(next["ti-hub-modulos-v1"] || {}), ...Object.fromEntries(moduleKeys.filter((key) => Object.prototype.hasOwnProperty.call(payload, key)).map((key) => [key, Array.isArray(payload[key]) ? payload[key] : []])) };
	}

	Object.entries(payload).forEach(([key, value]) => {
		if (!notebookKeys.includes(key) && !moduleKeys.includes(key) && !(key === "monitoramento-ti" || key === "ti-hub-modulos-v1")) {
			next[key] = value;
		}
	});

	return next;
}

function readRequestBody(req) {
	return new Promise((resolve, reject) => {
		const chunks = [];
		req.on("data", (chunk) => chunks.push(chunk));
		req.on("end", () => {
			const raw = Buffer.concat(chunks).toString("utf8").trim();
			if (!raw) {
				resolve({});
				return;
			}
			try {
				resolve(JSON.parse(raw));
			} catch (error) {
				reject(new Error("Corpo da requisição inválido."));
			}
		});
		req.on("error", reject);
	});
}

/* =========================================================================
   AUTENTICAÇÃO / USUÁRIOS
   -------------------------------------------------------------------------
   Usuários ficam em data/users.json (nunca a senha em texto puro: só
   salt + hash gerados com crypto.scrypt, nativo do Node - sem depender
   de instalar nenhum pacote extra). Sessões ficam em memória (Map),
   identificadas por um cookie HttpOnly - assim o token nunca fica
   acessível via JS no navegador. Reiniciar o servidor derruba as sessões
   ativas (todo mundo precisa logar de novo), o que é esperado e aceitável
   para uma ferramenta interna como esta.
	========================================================================= */
function gerarIdUsuario() {
	return "u-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8);
}

function ensureUsersStorage() {
	fs.mkdirSync(DATA_DIR, { recursive: true });

	if (!fs.existsSync(USERS_FILE)) {
		// Primeira execução: cria o usuário administrador inicial com uma
		// senha gerada aleatoriamente (nunca fica hardcoded no código-fonte).
		const senhaGerada = crypto
			.randomBytes(9)
			.toString("base64")
			.replace(/[^a-zA-Z0-9]/g, "")
			.slice(0, 12);
		const { salt, hash } = hashSenha(senhaGerada);
		const admin = { id: gerarIdUsuario(), usuario: "admin", nome: "Administrador", role: "admin", ativo: true, salt, hash, criadoEm: new Date().toISOString() };
		fs.writeFileSync(USERS_FILE, JSON.stringify({ usuarios: [admin] }, null, 2), "utf8");

		console.log("============================================================");
		console.log("Nenhum usuário encontrado - usuário administrador criado:");
		console.log("   Usuário: admin");
		console.log(`   Senha:   ${senhaGerada}`);
		console.log("Anote agora - essa senha não será exibida de novo.");
		console.log("Recomenda-se trocar a senha após o primeiro login (em Usuários).");
		console.log("============================================================");
	}
}

function readUsers() {
	try {
		ensureUsersStorage();
		const raw = fs.readFileSync(USERS_FILE, "utf8");
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed?.usuarios) ? parsed.usuarios : [];
	} catch (error) {
		console.error("Falha ao ler usuários:", error);
		return [];
	}
}

function writeUsers(usuarios) {
	try {
		ensureUsersStorage();
		fs.writeFileSync(USERS_FILE, JSON.stringify({ usuarios }, null, 2), "utf8");
		return true;
	} catch (error) {
		console.error("Falha ao gravar usuários:", error);
		return false;
	}
}

function hashSenha(senha) {
	const salt = crypto.randomBytes(16).toString("hex");
	const hash = crypto.scryptSync(senha, salt, 64).toString("hex");
	return { salt, hash };
}

function verificarSenha(senha, salt, hashEsperado) {
	const hash = crypto.scryptSync(senha, salt, 64).toString("hex");
	const bufA = Buffer.from(hash, "hex");
	const bufB = Buffer.from(hashEsperado, "hex");
	if (bufA.length !== bufB.length) return false;
	return crypto.timingSafeEqual(bufA, bufB);
}

// Sessões em memória: token -> { usuario, nome, role, expiraEm }
const SESSOES = new Map();

function parseCookies(req) {
	const header = req.headers.cookie;
	const cookies = {};
	if (!header) return cookies;
	header.split(";").forEach((par) => {
		const idx = par.indexOf("=");
		if (idx === -1) return;
		const chave = par.slice(0, idx).trim();
		const valor = par.slice(idx + 1).trim();
		cookies[chave] = decodeURIComponent(valor);
	});
	return cookies;
}

function criarSessao(user) {
	const token = crypto.randomBytes(32).toString("hex");
	SESSOES.set(token, { usuario: user.usuario, nome: user.nome, role: user.role, expiraEm: Date.now() + DURACAO_SESSAO_MS });
	return token;
}

// Sessão "deslizante": cada requisição autenticada renova a validade,
// então o usuário só cai se ficar realmente inativo por 8h seguidas.
function obterSessao(req) {
	const token = parseCookies(req)[SESSION_COOKIE_NAME];
	if (!token) return null;
	const sessao = SESSOES.get(token);
	if (!sessao) return null;
	if (Date.now() > sessao.expiraEm) {
		SESSOES.delete(token);
		return null;
	}
	sessao.expiraEm = Date.now() + DURACAO_SESSAO_MS;
	return sessao;
}

function destruirSessao(req) {
	const token = parseCookies(req)[SESSION_COOKIE_NAME];
	if (token) SESSOES.delete(token);
}

function definirCookieSessao(res, token) {
	res.setHeader("Set-Cookie", `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(DURACAO_SESSAO_MS / 1000)}`);
}

function limparCookieSessao(res) {
	res.setHeader("Set-Cookie", `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

// Limpa sessões expiradas periodicamente, para não acumular memória em
// um processo que fica dias/semanas no ar.
setInterval(
	() => {
		const agora = Date.now();
		for (const [token, sessao] of SESSOES.entries()) {
			if (agora > sessao.expiraEm) SESSOES.delete(token);
		}
	},
	10 * 60 * 1000,
);

// Impede remover/bloquear/rebaixar o último administrador ativo - senão
// ninguém mais conseguiria gerenciar usuários no sistema.
function ultimoAdminAtivo(usuarios, usuarioAlvo) {
	return usuarios.filter((u) => u.usuario.toLowerCase() !== usuarioAlvo.toLowerCase() && u.role === "admin" && u.ativo).length === 0;
}

function serveStaticFile(filePath, res) {
	const ext = path.extname(filePath).toLowerCase();
	const mimeTypes = { ".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".woff": "font/woff", ".woff2": "font/woff2", ".map": "application/json; charset=utf-8" };

	fs.readFile(filePath, (error, buffer) => {
		if (error) {
			if (filePath !== path.join(ROOT, "index.html")) {
				serveStaticFile(path.join(ROOT, "index.html"), res);
				return;
			}
			res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
			res.end("Arquivo não encontrado.");
			return;
		}

		res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
		res.end(buffer);
	});
}

// Responde um erro 500 genérico sem derrubar a conexão, tomando cuidado
// para não tentar escrever o header duas vezes caso a resposta já tenha
// sido iniciada.
function respondErro500(res, error) {
	console.error("Erro inesperado no servidor:", error);
	if (res.headersSent) {
		try {
			res.end();
		} catch {
			/* conexão já encerrada, nada a fazer */
		}
		return;
	}
	try {
		res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
		res.end(JSON.stringify({ error: "Erro interno do servidor" }));
	} catch (writeError) {
		console.error("Falha ao responder erro 500:", writeError);
	}
}

async function handleRequest(req, res) {
	const url = new URL(req.url, `http://${req.headers.host}`);

	// ---------- LOGIN ----------
	if (url.pathname === "/api/login" && req.method === "POST") {
		try {
			const body = await readRequestBody(req);
			const usuarioInformado = String(body.usuario || "").trim();
			const senhaInformada = String(body.senha || "");

			if (!usuarioInformado || !senhaInformada) {
				res.writeHead(400, JSON_HEADERS);
				res.end(JSON.stringify({ error: "Informe usuário e senha." }));
				return;
			}

			const usuarios = readUsers();
			const user = usuarios.find((u) => u.usuario.toLowerCase() === usuarioInformado.toLowerCase());

			if (!user) {
				res.writeHead(401, JSON_HEADERS);
				res.end(JSON.stringify({ error: "Usuário ou senha inválidos." }));
				return;
			}
			if (!user.ativo) {
				res.writeHead(403, JSON_HEADERS);
				res.end(JSON.stringify({ error: "Este usuário está bloqueado. Contate o administrador." }));
				return;
			}
			if (!verificarSenha(senhaInformada, user.salt, user.hash)) {
				res.writeHead(401, JSON_HEADERS);
				res.end(JSON.stringify({ error: "Usuário ou senha inválidos." }));
				return;
			}

			const token = criarSessao(user);
			definirCookieSessao(res, token);
			res.writeHead(200, JSON_HEADERS);
			res.end(JSON.stringify({ usuario: user.usuario, nome: user.nome, role: user.role }));
		} catch (error) {
			console.error("Erro no login:", error);
			res.writeHead(400, JSON_HEADERS);
			res.end(JSON.stringify({ error: "Não foi possível processar o login." }));
		}
		return;
	}

	// ---------- LOGOUT ----------
	if (url.pathname === "/api/logout" && req.method === "POST") {
		destruirSessao(req);
		limparCookieSessao(res);
		res.writeHead(200, JSON_HEADERS);
		res.end(JSON.stringify({ ok: true }));
		return;
	}

	// ---------- SESSÃO ATUAL ----------
	if (url.pathname === "/api/session" && req.method === "GET") {
		const sessao = obterSessao(req);
		if (!sessao) {
			res.writeHead(401, JSON_HEADERS);
			res.end(JSON.stringify({ authenticated: false }));
			return;
		}
		res.writeHead(200, JSON_HEADERS);
		res.end(JSON.stringify({ authenticated: true, usuario: sessao.usuario, nome: sessao.nome, role: sessao.role }));
		return;
	}

	// ---------- USUÁRIOS (somente administradores) ----------
	if (url.pathname === "/api/users") {
		const sessao = obterSessao(req);
		if (!sessao) {
			res.writeHead(401, JSON_HEADERS);
			res.end(JSON.stringify({ error: "Não autenticado." }));
			return;
		}
		if (sessao.role !== "admin") {
			res.writeHead(403, JSON_HEADERS);
			res.end(JSON.stringify({ error: "Apenas administradores podem gerenciar usuários." }));
			return;
		}

		if (req.method === "GET") {
			const usuarios = readUsers().map((u) => ({ id: u.id, usuario: u.usuario, nome: u.nome, role: u.role, ativo: u.ativo, criadoEm: u.criadoEm }));
			res.writeHead(200, JSON_HEADERS);
			res.end(JSON.stringify({ usuarios }));
			return;
		}

		if (req.method === "POST") {
			try {
				const body = await readRequestBody(req);
				const usuarioNovo = String(body.usuario || "").trim();
				const nome = String(body.nome || "").trim();
				const senha = String(body.senha || "");
				const role = body.role === "admin" ? "admin" : "tecnico";

				if (!usuarioNovo || !nome || !senha) {
					res.writeHead(400, JSON_HEADERS);
					res.end(JSON.stringify({ error: "Preencha usuário, nome e senha." }));
					return;
				}

				const usuarios = readUsers();
				if (usuarios.some((u) => u.usuario.toLowerCase() === usuarioNovo.toLowerCase())) {
					res.writeHead(409, JSON_HEADERS);
					res.end(JSON.stringify({ error: "Já existe um usuário com esse login." }));
					return;
				}

				const { salt, hash } = hashSenha(senha);
				const novo = { id: gerarIdUsuario(), usuario: usuarioNovo, nome, role, ativo: true, salt, hash, criadoEm: new Date().toISOString() };
				usuarios.push(novo);
				writeUsers(usuarios);

				res.writeHead(201, JSON_HEADERS);
				res.end(JSON.stringify({ id: novo.id, usuario: novo.usuario, nome: novo.nome, role: novo.role, ativo: novo.ativo, criadoEm: novo.criadoEm }));
			} catch (error) {
				console.error("Erro ao criar usuário:", error);
				res.writeHead(400, JSON_HEADERS);
				res.end(JSON.stringify({ error: "Não foi possível criar o usuário." }));
			}
			return;
		}

		res.writeHead(405, JSON_HEADERS);
		res.end(JSON.stringify({ error: "Método não permitido." }));
		return;
	}

	// ---------- USUÁRIO ESPECÍFICO: editar / bloquear / excluir ----------
	if (url.pathname.startsWith("/api/users/")) {
		const sessao = obterSessao(req);
		if (!sessao) {
			res.writeHead(401, JSON_HEADERS);
			res.end(JSON.stringify({ error: "Não autenticado." }));
			return;
		}
		if (sessao.role !== "admin") {
			res.writeHead(403, JSON_HEADERS);
			res.end(JSON.stringify({ error: "Apenas administradores podem gerenciar usuários." }));
			return;
		}

		const usuarioAlvo = decodeURIComponent(url.pathname.slice("/api/users/".length));

		if (req.method === "PUT") {
			try {
				const body = await readRequestBody(req);
				const usuarios = readUsers();
				const idx = usuarios.findIndex((u) => u.usuario.toLowerCase() === usuarioAlvo.toLowerCase());

				if (idx === -1) {
					res.writeHead(404, JSON_HEADERS);
					res.end(JSON.stringify({ error: "Usuário não encontrado." }));
					return;
				}

				const alvo = usuarios[idx];
				const vaiDesativar = typeof body.ativo === "boolean" && body.ativo === false;
				const vaiRebaixar = body.role && body.role !== "admin" && alvo.role === "admin";

				if (alvo.role === "admin" && (vaiDesativar || vaiRebaixar) && ultimoAdminAtivo(usuarios, alvo.usuario)) {
					res.writeHead(400, JSON_HEADERS);
					res.end(JSON.stringify({ error: "Não é possível bloquear/rebaixar o último administrador ativo." }));
					return;
				}

				if (typeof body.nome === "string" && body.nome.trim()) alvo.nome = body.nome.trim();
				if (body.role === "admin" || body.role === "tecnico") alvo.role = body.role;
				if (typeof body.ativo === "boolean") alvo.ativo = body.ativo;
				if (typeof body.senha === "string" && body.senha.trim()) {
					const { salt, hash } = hashSenha(body.senha.trim());
					alvo.salt = salt;
					alvo.hash = hash;
				}

				usuarios[idx] = alvo;
				writeUsers(usuarios);

				res.writeHead(200, JSON_HEADERS);
				res.end(JSON.stringify({ id: alvo.id, usuario: alvo.usuario, nome: alvo.nome, role: alvo.role, ativo: alvo.ativo, criadoEm: alvo.criadoEm }));
			} catch (error) {
				console.error("Erro ao editar usuário:", error);
				res.writeHead(400, JSON_HEADERS);
				res.end(JSON.stringify({ error: "Não foi possível editar o usuário." }));
			}
			return;
		}

		if (req.method === "DELETE") {
			const usuarios = readUsers();
			const alvo = usuarios.find((u) => u.usuario.toLowerCase() === usuarioAlvo.toLowerCase());

			if (!alvo) {
				res.writeHead(404, JSON_HEADERS);
				res.end(JSON.stringify({ error: "Usuário não encontrado." }));
				return;
			}
			if (alvo.role === "admin" && ultimoAdminAtivo(usuarios, alvo.usuario)) {
				res.writeHead(400, JSON_HEADERS);
				res.end(JSON.stringify({ error: "Não é possível excluir o último administrador ativo." }));
				return;
			}

			writeUsers(usuarios.filter((u) => u.usuario.toLowerCase() !== usuarioAlvo.toLowerCase()));
			res.writeHead(200, JSON_HEADERS);
			res.end(JSON.stringify({ ok: true }));
			return;
		}

		res.writeHead(405, JSON_HEADERS);
		res.end(JSON.stringify({ error: "Método não permitido." }));
		return;
	}

	// ---------- TRELLO (exige login) ----------
	if (url.pathname === "/api/trello") {
		const sessao = obterSessao(req);

		if (!sessao) {
			res.writeHead(401, JSON_HEADERS);
			res.end(JSON.stringify({ error: "Não autenticado." }));
			return;
		}

		if (req.method !== "GET") {
			res.writeHead(405, JSON_HEADERS);
			res.end(JSON.stringify({ error: "Método não permitido." }));
			return;
		}

		if (!TRELLO_API_KEY || !TRELLO_TOKEN || !TRELLO_BOARD_ID) {
			res.writeHead(500, JSON_HEADERS);
			res.end(JSON.stringify({ error: "As credenciais do Trello não foram configuradas no servidor." }));
			return;
		}

		try {
			const caminho = `/1/boards/${encodeURIComponent(TRELLO_BOARD_ID)}?` + `lists=open&cards=open&card_fields=name,desc,url,idList&` + `fields=name&key=${encodeURIComponent(TRELLO_API_KEY)}&` + `token=${encodeURIComponent(TRELLO_TOKEN)}`;

			const dadosTrello = await new Promise((resolve, reject) => {
				const requisicao = https.get({ hostname: "api.trello.com", path: caminho, method: "GET", headers: { Accept: "application/json" } }, (respostaTrello) => {
					let corpo = "";

					respostaTrello.setEncoding("utf8");

					respostaTrello.on("data", (parte) => {
						corpo += parte;
					});

					respostaTrello.on("end", () => {
						let dados;

						try {
							dados = JSON.parse(corpo);
						} catch {
							reject(new Error(`O Trello retornou uma resposta inválida (HTTP ${respostaTrello.statusCode}).`));
							return;
						}

						if (respostaTrello.statusCode < 200 || respostaTrello.statusCode >= 300) {
							reject(new Error(`Trello recusou a consulta (HTTP ${respostaTrello.statusCode}): ${dados.message || "verifique API Key, Token e ID do quadro."}`));
							return;
						}

						resolve(dados);
					});
				});

				requisicao.setTimeout(15000, () => {
					requisicao.destroy(new Error("Tempo esgotado ao consultar o Trello."));
				});

				requisicao.on("error", reject);
			});

			res.writeHead(200, JSON_HEADERS);
			res.end(JSON.stringify(dadosTrello));
		} catch (error) {
			console.error("Erro ao consultar o Trello:", error);

			res.writeHead(502, JSON_HEADERS);
			res.end(JSON.stringify({ error: error.message || "Não foi possível consultar o Trello." }));
		}

		return;
	}

	// ---------- DADOS COMPARTILHADOS DO SISTEMA (exige login) ----------
	if (url.pathname === "/api/data") {
		const sessao = obterSessao(req);
		if (!sessao) {
			res.writeHead(401, JSON_HEADERS);
			res.end(JSON.stringify({ error: "Não autenticado." }));
			return;
		}

		if (req.method === "GET") {
			const storage = readStorage();
			res.writeHead(200, JSON_HEADERS);
			res.end(JSON.stringify(buildApiResponse(storage)));
			return;
		}

		if (req.method === "POST") {
			try {
				const body = await readRequestBody(req);
				const storage = readStorage();
				const updated = mergeIncomingData(storage, body);
				writeStorage(updated);
				res.writeHead(200, JSON_HEADERS);
				res.end(JSON.stringify(buildApiResponse(updated)));
			} catch (error) {
				console.error("Erro ao salvar dados compartilhados:", error);
				res.writeHead(400, JSON_HEADERS);
				res.end(JSON.stringify({ error: "Dados inválidos" }));
			}
			return;
		}

		res.writeHead(405, JSON_HEADERS);
		res.end(JSON.stringify({ error: "Método não permitido" }));
		return;
	}

	const normalizedPath = url.pathname === "/" ? "/index.html" : url.pathname;
	const safePath = path.normalize(path.join(ROOT, normalizedPath.replace(/^\//, "")));

	if (!safePath.startsWith(ROOT)) {
		res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
		res.end("Acesso negado.");
		return;
	}

	// A pasta data/ guarda shared-state.json e users.json (senhas com
	// hash, mas ainda assim dados internos sensíveis). Sem este bloqueio,
	// qualquer um poderia baixar esses arquivos direto pela URL como se
	// fossem um arquivo estático comum, ignorando completamente o login
	// exigido em /api/data e /api/users.
	if (safePath === DATA_DIR || safePath.startsWith(DATA_DIR + path.sep)) {
		res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
		res.end("Acesso negado.");
		return;
	}

	if (fs.existsSync(safePath) && fs.statSync(safePath).isFile()) {
		serveStaticFile(safePath, res);
		return;
	}

	const fallback = path.join(ROOT, "index.html");
	serveStaticFile(fallback, res);
}

// IMPORTANTE: http.createServer NÃO aguarda nem trata rejeição de uma
// callback assíncrona. Se handleRequest lançar um erro em QUALQUER rota
// (mesmo fora de /api/data - ex.: servir um arquivo estático com nome
// estranho) e essa rejeição não for tratada, o processo do Node inteiro
// pode ser derrubado (comportamento padrão do Node moderno para promises
// não tratadas). Isso tira o servidor do ar pra TODO MUNDO até reiniciar,
// e é o que fazia até ações sem relação nenhuma (como salvar no Estoque)
// aparentarem estar quebradas: o servidor tinha caído por outro motivo.
// Por isso cada requisição agora passa por este try/catch externo.
const server = http.createServer((req, res) => {
	handleRequest(req, res).catch((error) => respondErro500(res, error));
});

// Rede de segurança adicional: nunca deixa o processo cair sozinho por
// causa de um erro não tratado em qualquer outro lugar do código.
process.on("uncaughtException", (error) => {
	console.error("Exceção não tratada (servidor continua no ar):", error);
});
process.on("unhandledRejection", (reason) => {
	console.error("Promise rejeitada sem tratamento (servidor continua no ar):", reason);
});

server.listen(PORT, HOST, () => {
	ensureUsersStorage();
	console.log(`Servidor interno ativo em http://${HOST}:${PORT}`);
	console.log(`Acesso local via http://localhost:${PORT}`);
	console.log(`Acesso na rede via http://192.168.20.29:${PORT}`);
});
