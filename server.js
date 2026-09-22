const http = require("http");
const fs = require("fs");
const path = require("path");

const HOST = "0.0.0.0";
const PORT = Number(process.env.PORT || 5050);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const DATA_FILE = path.join(DATA_DIR, "shared-state.json");

const DEFAULT_SHARED_STATE = { "monitoramento-ti": { notebooks: [], suporte: [], alunos: [], termos: [] }, "ti-hub-modulos-v1": { emails: [], softwares: [], estoque: [], impressoras: [], chamados: [], compras: [], gastos: [], projetos: [], tutoriais: [] } };

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
	const moduleKeys = ["emails", "softwares", "estoque", "impressoras", "chamados", "compras", "gastos", "projetos", "tutoriais"];

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

	if (url.pathname === "/api/data") {
		if (req.method === "GET") {
			const storage = readStorage();
			res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
			res.end(JSON.stringify(buildApiResponse(storage)));
			return;
		}

		if (req.method === "POST") {
			try {
				const body = await readRequestBody(req);
				const storage = readStorage();
				const updated = mergeIncomingData(storage, body);
				writeStorage(updated);
				res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
				res.end(JSON.stringify(buildApiResponse(updated)));
			} catch (error) {
				console.error("Erro ao salvar dados compartilhados:", error);
				res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
				res.end(JSON.stringify({ error: "Dados inválidos" }));
			}
			return;
		}

		res.writeHead(405, { "Content-Type": "application/json; charset=utf-8" });
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
	console.log(`Servidor interno ativo em http://${HOST}:${PORT}`);
	console.log(`Acesso local via http://localhost:${PORT}`);
	console.log(`Acesso na rede via http://192.168.20.29:${PORT}`);
});
