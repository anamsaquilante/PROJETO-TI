/* =========================================================================
   Resumo das seções abaixo:
   1. TIHub                       -> armazenamento dos módulos (localStorage)
   2. Toast / desfazer exclusão   -> mecanismo único usado por todas as páginas
   3. Estado de edição dos módulos (senhas, estoque, compras, impressoras)
   4. Estado e utilitários de Notebooks (antigo script.js)
   5. Render de Notebooks (colaboradores/suporte/alunos)
   6. Persistência de Notebooks (salvar/carregar)
   7. Relatórios em PDF de Notebooks
   8. Edição/exclusão de registros de Notebooks
   9. Filtros por setor/modelo (Notebooks)
   10. Termos / DocuSign (Notebooks)
   11. initNotebooks()            -> liga todos os eventos de notebooks.html
   12. Dashboard (index.html)
   13. Senhas (senhas.html)
   14. Estoque (estoque.html)
   15. Compras (compras.html)
   16. Impressoras (impressoras.html)
   17. Chamados (chamados.html)
   18. Orçamento (orcamento.html)
   19. Projetos (projetos.html)
   20. Tutoriais (tutoriais.html)
   21. Inicialização por página (DOMContentLoaded) + sincronização automática
   ========================================================================= */

/* =========================================================================
   1. TI HUB - módulos adicionais (armazenamento em localStorage)
	========================================================================= */
// Conta quantas gravações (POST /api/data) estão em andamento neste
// momento. Enquanto houver pelo menos uma, a sincronização automática
// (seção 21) NÃO busca dados do servidor - senão ela pode pegar uma
// resposta antiga (de antes do salvamento terminar) e sobrescrever o
// registro recém-criado/editado, fazendo-o "sumir" sozinho poucos
// segundos depois.
let escritasPendentesNoServidor = 0;

const TIHub = (() => {
	const KEY = "ti-hub-modulos-v1";
	const defaults = {
		emails: [
			{ id: "e1", nome: "Tec Camps", emails: "teccamps@camps.org.br", senha: "Camps@Ti301167" },
			{ id: "e2", nome: "Administrador de rede", emails: "infra@empresa.com", senha: "" },
		],
		softwares: [
			{ id: "s1", nome: "TOTVS Protheus", login: "sistemas@empresa.com", senha: "", url: "Servidor interno" },
			{ id: "s2", nome: "DocuSign", login: "docusign@empresa.com", senha: "", url: "https://apps.docusign.com" },
			{ id: "s3", nome: "Trello", login: "ti@empresa.com", senha: "", url: "https://trello.com" },
		],
		estoque: [
			{ id: "m1", item: "Mouse sem fio", quantidade: 18, minimo: 5 },
			{ id: "m2", item: "Headset", quantidade: 3, minimo: 6 },
		],
		impressoras: [
			{ id: "i1", nome: "IMP-RECEPCAO", ip: "192.168.1.41", modelo: "HP LaserJet Pro", setor: "Recepção" },
			{ id: "i2", nome: "IMP-FINANCEIRO", ip: "192.168.1.52", modelo: "Brother DCP-L5652DN", setor: "Financeiro" },
		],
		chamados: [
			{ id: "#1048", solicitante: "Juliana Martins", assunto: "Notebook não conecta ao Wi-Fi", prioridade: "Alta", responsavel: "Rafael", status: "Em atendimento", data: "24/08/2026" },
			{ id: "#1047", solicitante: "Bruno Lima", assunto: "Solicitação de acesso ao sistema", prioridade: "Média", responsavel: "Mariana", status: "Aberto", data: "24/08/2026" },
			{ id: "#1046", solicitante: "Paula Santos", assunto: "Impressora não imprime", prioridade: "Alta", responsavel: "Felipe", status: "Resolvido", data: "23/08/2026" },
		],
		compras: [
			{ id: "c1", item: "Adaptadores USB-C", prioridade: "Alta", autor: "Rafael", data: "24/08/2026", obs: "Estoque próximo do mínimo", status: "Pendente" },
			{ id: "c2", item: "Headsets para suporte", prioridade: "Média", autor: "Mariana", data: "24/08/2026", obs: "Para novas posições", status: "Pendente" },
		],
		gastos: [
			{ id: "g1", descricao: "Licenças Microsoft 365", categoria: "Software", valor: 8900, data: "15/08/2026" },
			{ id: "g2", descricao: "Renovação de firewall", categoria: "Infraestrutura", valor: 12500, data: "02/08/2026" },
		],
		projetos: [
			{ id: "pr1", titulo: "Automação DocuSign", coluna: "Em andamento", responsavel: "Mariana", detalhe: "Integração e fluxo de termos" },
			{ id: "pr2", titulo: "Controle de estoque", coluna: "Em validação", responsavel: "Felipe", detalhe: "Revisão dos mínimos" },
			{ id: "pr3", titulo: "Inventário de impressoras", coluna: "Backlog", responsavel: "TI", detalhe: "Atualização dos ativos" },
			{ id: "pr4", titulo: "Atualização do Protheus", coluna: "Concluído", responsavel: "Equipe TI", detalhe: "Finalizado" },
		],
		tutoriais: [
			{ id: "t1", titulo: "Primeiro dia no setor de TI", categoria: "Onboarding", resumo: "Visão geral dos sistemas, acessos e rotina do setor.", tempo: "10 min" },
			{ id: "t2", titulo: "Cadastro e entrega de notebooks", categoria: "Notebooks", resumo: "Como registrar patrimônio, movimentação e termo de responsabilidade.", tempo: "8 min" },
			{ id: "t3", titulo: "Envio de termos pelo DocuSign", categoria: "Notebooks", resumo: "Fluxo para gerar, enviar e acompanhar os termos.", tempo: "12 min" },
			{ id: "t4", titulo: "Instalação de impressoras", categoria: "Impressoras", resumo: "Procedimento de IP, driver e testes.", tempo: "15 min" },
		],
	};

	function load() {
		try {
			return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
		} catch {
			return structuredClone(defaults);
		}
	}
	function save(data) {
		localStorage.setItem(KEY, JSON.stringify(data));
		escritasPendentesNoServidor++;
		fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data), cache: "no-store" })
			.catch((error) => console.error("Erro ao sincronizar TIHub com o backend compartilhado:", error))
			.finally(() => {
				escritasPendentesNoServidor = Math.max(0, escritasPendentesNoServidor - 1);
			});
	}
	function uid(prefix = "id") {
		return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
	}
	function esc(v) {
		const d = document.createElement("div");
		d.textContent = v ?? "";
		return d.innerHTML;
	}
	function pill(text) {
		const map = { Alta: "priority-alta", Média: "priority-media", Baixa: "priority-baixa", Aberto: "status-pendente", "Em atendimento": "status-atendimento", Resolvido: "status-resolvido", Pendente: "status-pendente", Comprado: "status-assinado" };
		return `<span class="${map[text]?.startsWith("priority") ? "priority-pill" : "status-pill"} ${map[text] || ""}">${esc(text)}</span>`;
	}
	return { load, save, uid, esc, pill };
})();

function moduleData() {
	return TIHub.load();
}

async function syncSharedStateFromServer() {
	try {
		const resp = await fetch("/api/data", { cache: "no-store" });
		if (!resp.ok) return;
		const data = await resp.json();
		if (!data || typeof data !== "object" || !Object.keys(data).length) return;

		const notebookState = { notebooks: Array.isArray(data.notebooks) ? data.notebooks : [], suporte: Array.isArray(data.suporte) ? data.suporte : [], alunos: Array.isArray(data.alunos) ? data.alunos : [], termos: Array.isArray(data.termos) ? data.termos : [] };
		localStorage.setItem("monitoramento-ti", JSON.stringify(notebookState));

		const moduleState = { emails: Array.isArray(data.emails) ? data.emails : [], softwares: Array.isArray(data.softwares) ? data.softwares : [], estoque: Array.isArray(data.estoque) ? data.estoque : [], impressoras: Array.isArray(data.impressoras) ? data.impressoras : [], chamados: Array.isArray(data.chamados) ? data.chamados : [], compras: Array.isArray(data.compras) ? data.compras : [], gastos: Array.isArray(data.gastos) ? data.gastos : [], projetos: Array.isArray(data.projetos) ? data.projetos : [], tutoriais: Array.isArray(data.tutoriais) ? data.tutoriais : [] };
		localStorage.setItem("ti-hub-modulos-v1", JSON.stringify(moduleState));
	} catch (error) {
		console.error("Erro ao sincronizar dados do servidor compartilhado:", error);
	}
}

/* =========================================================================
   2. TOAST / DESFAZER EXCLUSÃO (mecanismo único para todas as páginas)
   -------------------------------------------------------------------------
   Guarda o último registro removido, de qual "fonte" ele veio e a qual
   coleção pertence, para restaurá-lo com um clique em "Desfazer":
     - lastDeletedSource = "notebooks" -> o item volta para `state` (em
       memória) e é persistido via salvarTudo() ("monitoramento-ti").
     - lastDeletedSource = "modulo"    -> o item volta para os dados do
       TIHub (localStorage "ti-hub-modulos-v1").
   ========================================================================= */
let lastDeletedItem = null;
let lastDeletedCollection = null; // ex.: "notebooks", "suporte", "alunos", "termos", "emails", "softwares", "estoque", "compras"
let lastDeletedSource = null; // "notebooks" ou "modulo"
let lastPurchaseUndo = null; // { purchase, gastoId } - usado quando um item é marcado como "Comprado"
let undoTimeout = null;

function toast(msg, comDesfazer) {
	const el = document.getElementById("toast");
	if (!el) return;

	if (undoTimeout) {
		clearTimeout(undoTimeout);
		undoTimeout = null;
	}

	if (comDesfazer) {
		el.innerHTML = `<span>${TIHub.esc(msg)}</span><button class="undo-button" onclick="undoDelete()">Desfazer</button>`;
	} else {
		el.textContent = msg;
	}

	el.classList.add("show");

	undoTimeout = setTimeout(() => {
		el.classList.remove("show");
		if (comDesfazer) {
			lastDeletedItem = null;
			lastDeletedCollection = null;
			lastDeletedSource = null;
			lastPurchaseUndo = null;
		}
	}, 5000);
}

// Restaura a última ação desfazível: pode ser uma exclusão (notebooks ou
// módulo) OU uma compra marcada como "Comprado" (ver initPurchases).
window.undoDelete = async function () {
	if (lastPurchaseUndo) {
		const { purchase, gastoId } = lastPurchaseUndo;
		const d = moduleData();

		d.gastos = Array.isArray(d.gastos) ? d.gastos.filter((gasto) => gasto.id !== gastoId) : [];

		const compraRestaurada = { ...purchase, status: "Pendente" };

		delete compraRestaurada.dataCompraISO;

		const indexExistente = d.compras.findIndex((compra) => compra.id === compraRestaurada.id);

		if (indexExistente >= 0) {
			d.compras[indexExistente] = compraRestaurada;
		} else {
			d.compras.unshift(compraRestaurada);
		}

		TIHub.save(d);

		lastPurchaseUndo = null;

		renderPurchases();

		if (document.getElementById("expenseRows") && typeof renderBudget === "function") {
			renderBudget();
		}

		toast("Compra desfeita.");
		return;
	}

	if (!lastDeletedItem || !lastDeletedCollection) return;

	if (lastDeletedSource === "notebooks") {
		state[lastDeletedCollection].unshift(lastDeletedItem);
		lastDeletedItem = null;
		lastDeletedCollection = null;
		lastDeletedSource = null;

		await salvarTudo();
		renderGrouped();
		renderSuporte();
		renderAlunos();
		renderListaModelos();
		if (typeof renderTermos === "function") renderTermos();
	} else {
		const d = moduleData();
		d[lastDeletedCollection].unshift(lastDeletedItem);
		TIHub.save(d);
		lastDeletedItem = null;
		lastDeletedCollection = null;
		lastDeletedSource = null;

		renderPasswords();
		renderEstoque();
		renderPurchases();
		renderPrinters();
	}

	toast("Exclusão desfeita.");
};

/* =========================================================================
   3. ESTADO DE EDIÇÃO - MÓDULOS (senhas, estoque, compras, impressoras)
   -------------------------------------------------------------------------
   Mesmo padrão de editingNbId/editingSupId usado em notebooks: guarda o id
   do registro em edição, ou null quando o formulário está em modo "criar".
	========================================================================= */
let editingEmailsId = null;
let editingSoftwareId = null;
let editingPrinterId = null;
let editingPurchaseId = null;
let editingMaterialId = null;

/* =========================================================================
   4. NOTEBOOKS - ESTADO E UTILITÁRIOS (antigo script.js)
	========================================================================= */
const state = { notebooks: [], suporte: [], alunos: [], termos: [] };

let editingNbId = null;
let editingSupId = null;
let editingAluId = null;
let editingTermoId = null; // id do termo em edição (null = nenhum em edição)

// Controle da ordenação por data de aquisição.
// A primeira vez que clicar, ficará em ordem crescente.
// Ao clicar novamente, alternará para decrescente.
const ordenacaoData = { "em-uso": "crescente", devolvido: "crescente", danificado: "crescente", "devolucao-devolvido": "crescente", "devolucao-danificado": "crescente" };

// SELECIONAR SETOR & MODELO DE NOTEBOOK /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
const ordemModelos = ["Dell Latitude 3540", "Dell Vostro 3510", "Dell Pro 16 PC16250", "Dell Alienware 16 Aurora AC16250"];

const ordemSetores = ["Almoxarifado", "Comunicação", "Compras", "Consultório", "Departamento Pessoal", "Disciplina", "Enchaminhamento", "Financeiro", "Gerência", "Jurídico", "Pedagógico", "Projetos", "Psicologia", "Secretaria", "Sec. Executiva", "Serviço Social", "TI"];

function obterModelosCadastrados() {
	const modelosExistentes = [...state.notebooks.map((n) => n.modelo), ...state.alunos.map((a) => a.modelo), ...state.suporte.map((s) => s.modelo)].map((modelo) => String(modelo || "").trim()).filter(Boolean);

	const todosModelos = [...ordemModelos, ...modelosExistentes];

	return todosModelos.filter((modelo, index, lista) => {
		return lista.indexOf(modelo) === index;
	});
}

function obterSetoresCadastrados() {
	const setoresExistentes = state.notebooks
		.map((n) => n.setor)
		.map((setor) => String(setor || "").trim())
		.filter(Boolean);

	const todosSetores = [...ordemSetores, ...setoresExistentes];

	return todosSetores.filter((setor, index, lista) => {
		return lista.indexOf(setor) === index;
	});
}

function fecharTodasListas() {
	document.querySelectorAll(".lista-modelos, .lista-setores").forEach((lista) => {
		lista.classList.remove("aberta");
	});

	document.querySelectorAll(".toggle-modelos, .toggle-setores").forEach((botao) => {
		botao.classList.remove("active");
	});
}

function configurarToggleModelos() {
	document.querySelectorAll(".toggle-modelos").forEach((botao) => {
		botao.addEventListener("click", (event) => {
			event.stopPropagation();

			const inputId = botao.dataset.input;
			const lista = document.querySelector(`.lista-modelos[data-lista-para="${inputId}"]`);

			if (!lista) return;

			const estavaAberta = lista.classList.contains("aberta");

			fecharTodasListas();

			if (!estavaAberta) {
				renderListaModelos();
				lista.classList.add("aberta");
				botao.classList.add("active");
			}
		});
	});

	document.querySelectorAll(".lista-modelos").forEach((lista) => {
		lista.addEventListener("click", (event) => {
			const item = event.target.closest(".item-modelo");

			if (!item) return;

			const inputId = lista.dataset.listaPara;
			const input = document.getElementById(inputId);

			if (!input) return;

			input.value = item.dataset.modelo;
			fecharTodasListas();
			input.focus();
		});
	});

	document.addEventListener("click", (event) => {
		if (!event.target.closest(".modelo-toggle")) {
			fecharTodasListas();
		}
	});
}

function configurarToggleSetores() {
	document.querySelectorAll(".toggle-setores").forEach((botao) => {
		botao.addEventListener("click", (event) => {
			event.stopPropagation();

			const inputId = botao.dataset.input;

			const lista = document.querySelector(`.lista-setores[data-lista-para="${inputId}"]`);

			if (!lista) {
				console.error(`Lista de setores não encontrada para: ${inputId}`);
				return;
			}

			const estavaAberta = lista.classList.contains("aberta");

			fecharTodasListas();

			if (!estavaAberta) {
				renderListaSetores();
				lista.classList.add("aberta");
				botao.classList.add("active");
			}
		});
	});

	document.querySelectorAll(".lista-setores").forEach((lista) => {
		lista.addEventListener("click", (event) => {
			const item = event.target.closest(".item-setor");

			if (!item) return;

			const inputId = lista.dataset.listaPara;
			const input = document.getElementById(inputId);

			if (!input) return;

			input.value = item.dataset.setor;

			fecharTodasListas();
			input.focus();
		});
	});
}

function configurarFechamentoDasListas() {
	document.addEventListener("click", (event) => {
		if (!event.target.closest(".modelo-toggle, .setor-toggle")) {
			fecharTodasListas();
		}
	});
}

function configurarAutocompleteModelos() {
	document.querySelectorAll(".modelo-toggle input").forEach((input) => {
		input.addEventListener("input", () => {
			const lista = document.querySelector(`.lista-modelos[data-lista-para="${input.id}"]`);

			if (!lista.classList.contains("aberta")) return;

			const texto = input.value.toLowerCase().trim();

			lista.querySelectorAll(".item-modelo").forEach((item) => {
				const modelo = item.textContent.toLowerCase();
				item.style.display = modelo.includes(texto) ? "block" : "none";
			});
		});
	});
}

function renderListaModelos() {
	const modelos = obterModelosCadastrados();

	document.querySelectorAll(".lista-modelos").forEach((lista) => {
		lista.innerHTML = modelos.length
			? modelos
					.map(
						(modelo) => `
            <button
            type="button"
            class="item-modelo"
            data-modelo="${escapeHtml(modelo)}">
            ${escapeHtml(modelo)}
            </button>
        `,
					)
					.join("")
			: `
        <div class="lista-modelos-vazia">Nenhum modelo cadastrado.</div>`;
	});
}

function renderListaSetores() {
	const setores = obterSetoresCadastrados();

	document.querySelectorAll(".lista-setores").forEach((lista) => {
		lista.innerHTML = setores.length
			? setores
					.map(
						(setor) => `
						<button
						type="button"
						class="item-setor"
						data-setor="${escapeHtml(setor)}">
						${escapeHtml(setor)}
						</button>
        `,
					)
					.join("")
			: `
        <div class="lista-setores-vazia">Nenhum setor cadastrado.</div>`;
	});
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const uid = () => "id-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
const fmtDate = (iso) => (iso ? new Date(iso + "T00:00:00").toLocaleDateString("pt-BR") : "—");

// Reaproveita o escapador de HTML já usado nos módulos (TIHub.esc), apenas
// com o nome que o restante do código de notebooks já usa.
const escapeHtml = TIHub.esc;

function ordenarPorData(lista, campo, ordem) {
	return [...lista].sort((a, b) => {
		const dataA = a[campo] ? new Date(`${a[campo]}T00:00:00`).getTime() : 0;

		const dataB = b[campo] ? new Date(`${b[campo]}T00:00:00`).getTime() : 0;

		// Registros sem data ficam no final.
		if (!dataA && !dataB) return 0;
		if (!dataA) return 1;
		if (!dataB) return -1;

		return ordem === "crescente" ? dataA - dataB : dataB - dataA;
	});
}

// Sincroniza campos do formulário de registro de notebooks
function syncRegistroFields() {
	const registroEl = document.getElementById("nb-registro");
	const tipoDevEl = document.getElementById("nb-tipo-devolucao");
	const campoDevolucaoEl = document.getElementById("field-devolucao-tipo");
	const campoDefeitoEl = document.getElementById("field-defeito");

	// Só executa em notebooks.html - nas demais páginas esses elementos
	// não existem, então não há nada a sincronizar.
	if (!registroEl || !tipoDevEl || !campoDevolucaoEl || !campoDefeitoEl) return;

	const registro = registroEl.value;
	const tipoDev = tipoDevEl.value;
	campoDevolucaoEl.classList.toggle("hidden", registro !== "devolucao");
	campoDefeitoEl.classList.toggle("hidden", !(registro === "devolucao" && tipoDev === "com-defeito"));
}

// Renderiza estatísticas de notebooks, suporte e alunos
function renderStats() {
	const emUso = state.notebooks.filter((n) => n.categoria === "em-uso").length;
	const devolvido = state.notebooks.filter((n) => n.categoria === "devolvido").length;
	const danificados = state.notebooks.filter((n) => n.categoria === "danificado").length;
	document.getElementById("s-uso") && (document.getElementById("s-uso").textContent = emUso);
	document.getElementById("s-devolvido") && (document.getElementById("s-devolvido").textContent = devolvido);
	document.getElementById("s-defeito") && (document.getElementById("s-defeito").textContent = danificados);
	document.getElementById("countNb") && (document.getElementById("countNb").textContent = emUso);
	document.getElementById("countSup") && (document.getElementById("countSup").textContent = state.suporte.length);
	document.getElementById("countAlu") && (document.getElementById("countAlu").textContent = state.alunos.length);
	const termoCount = document.getElementById("countTermos");
	if (termoCount) termoCount.textContent = state.termos.filter((t) => t.status === "pendente").length;
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/* =========================================================================
   5. NOTEBOOKS - RENDER (colaboradores / suporte / alunos)
	========================================================================= */

// NOTEBOOKS COLABORADORES
function renderGrouped() {
	// Só existe em notebooks.html.
	if (!document.getElementById("bodyEmUso")) return;

	const emUso = ordenarPorData(
		state.notebooks.filter((n) => n.categoria === "em-uso"),
		"aquisicao",
		ordenacaoData["em-uso"],
	);
	const devolvidoBase = state.notebooks.filter((n) => n.categoria === "devolvido");
	const danificadoBase = state.notebooks.filter((n) => n.categoria === "danificado");
	const devolvido = ordenarPorData(devolvidoBase, "aquisicao", ordenacaoData.devolvido);
	const danificado = ordenarPorData(danificadoBase, "aquisicao", ordenacaoData.danificado);

	// Aplica filtros aos dados
	const emUsoFiltrado = aplicarFiltrosDados(emUso, "em-uso");
	const devolvidoFiltrado = aplicarFiltrosDados(devolvido, "devolvido");
	const danificadoFiltrado = aplicarFiltrosDados(danificado, "danificado");

	// EM USO
	document.getElementById("bodyEmUso").innerHTML = emUsoFiltrado
		.map(
			(n) => `
    <tr>
		<td><div class="model">${escapeHtml(n.colaborador)}</div><span class="serial">${escapeHtml(n.setor)}</span></td>
		<td><div class="model">${escapeHtml(n.modelo)}</div><span class="serial">${escapeHtml(n.patrimonio)}</span></td>
		<td><span class="date">${fmtDate(n.aquisicao)}</span></td>
		<td></td>
		<td><div class="row-actions">
			<button class="mini" onclick="editNotebook('${n.id}')"><i class="ti ti-pencil"></i></button>
			<button class="danger-mini" onclick="deleteNotebook('${n.id}')"><i class="ti ti-trash-x"></i></button>
		</div></td>
    </tr>`,
		)
		.join("");

	// DEVOLVIDO
	document.getElementById("bodyDevolvido").innerHTML = devolvidoFiltrado
		.map(
			(n) => `
    <tr>
		<td><div class="model">${escapeHtml(n.colaborador)}</div><span class="serial">${escapeHtml(n.setor)}</span></td>    
		<td><div class="model">${escapeHtml(n.modelo)}</div><span class="serial">${escapeHtml(n.patrimonio)}</span></td>
		<td><span class="date">${fmtDate(n.aquisicao)}</span></td>
		<td><span class="date">${fmtDate(n.devolucao)}</span></td>
		<td></td>
		<td><div class="row-actions">
        <button class="mini" onclick="editNotebook('${n.id}')"><i class="ti ti-pencil"></i></button>
        <button class="danger-mini" onclick="deleteNotebook('${n.id}')"><i class="ti ti-trash-x"></i></button>
    </div></td>
    </tr>`,
		)
		.join("");

	// DANIFICADO
	document.getElementById("bodyDanificado").innerHTML = danificadoFiltrado
		.map(
			(n) => `
    <tr>
		<td><div class="model">${escapeHtml(n.colaborador)}</div><span class="serial">${escapeHtml(n.setor)}</span></td>
		<td><div class="model">${escapeHtml(n.modelo)}</div><span class="serial">${escapeHtml(n.patrimonio)}</span></td>
		<td><span class="date">${fmtDate(n.aquisicao)}</span></td>
		<td><span class="date">${fmtDate(n.devolucao)}</span></td>
		<td><span class="badge warn">${escapeHtml(n.defeito)}</span></td>
		<td><div class="row-actions">
			<button class="mini" onclick="editNotebook('${n.id}')"><i class="ti ti-pencil"></i></button>
			<button class="danger-mini" onclick="deleteNotebook('${n.id}')"><i class="ti ti-trash-x"></i></button>
		</div></td>
    </tr>`,
		)
		.join("");

	// Atualiza mensagens de vazio
	document.getElementById("emptyUso").style.display = emUsoFiltrado.length ? "none" : "block";
	document.getElementById("emptyDevolvido").style.display = devolvidoFiltrado.length ? "none" : "block";
	document.getElementById("emptyDanificado").style.display = danificadoFiltrado.length ? "none" : "block";

	// Atualiza dropdowns de filtro
	atualizarDropdownsFiltro("em-uso");
	atualizarDropdownsFiltro("devolvido");
	atualizarDropdownsFiltro("danificado");

	renderStats();
}

// SUPORTE
function renderSuporte() {
	const body = document.getElementById("bodySuporte");
	const empty = document.getElementById("emptySup");
	if (!body || !empty) return;
	if (!state.suporte.length) {
		body.innerHTML = "";
		empty.style.display = "block";
		renderStats();
		return;
	}
	empty.style.display = "none";
	body.innerHTML = state.suporte
		.map(
			(s) => `
    <tr>
		<td><div class="model">${escapeHtml(s.modelo)}</div><span class="serial">${escapeHtml(s.patrimonio)}</span></td>
		<td><span class="support-loc"><i class="ti ti-map-pin"></i> ${escapeHtml(s.local)}</span></td>
		<td><div class="row-actions">
			<button class="mini" onclick="editSuporte('${s.id}')"><i class="ti ti-pencil"></i></button>
			<button class="danger-mini" onclick="deleteSuporte('${s.id}')"><i class="ti ti-trash-x"></i></button>
		</div></td>
    </tr>`,
		)
		.join("");
	renderStats();
}

// ALUNOS
function renderAlunos() {
	const body = document.getElementById("bodyAlunos");
	const empty = document.getElementById("emptyAlu");
	if (!body || !empty) return;
	if (!state.alunos.length) {
		body.innerHTML = "";
		empty.style.display = "block";
		renderStats();
		return;
	}
	empty.style.display = "none";
	body.innerHTML = state.alunos
		.map(
			(a) => `
    <tr>
		<td><div class="model">${escapeHtml(a.modelo)}</div><span class="serial">${escapeHtml(a.patrimonio)}</span></td>
		<td>${escapeHtml(a.sala)}</td>
		<td>${escapeHtml(a.trava)}</td>
		<td><div class="row-actions">
			<button class="mini" onclick="editAluno('${a.id}')"><i class="ti ti-pencil"></i></button>
			<button class="danger-mini" onclick="deleteAluno('${a.id}')"><i class="ti ti-trash-x"></i></button>
		</div></td>
    </tr>`,
		)
		.join("");
	renderStats();
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/* =========================================================================
   6. NOTEBOOKS - PERSISTÊNCIA (salvar / carregar)
	========================================================================= */
function saveNotebookRecord(payload) {
	const sameSerialIndex = state.notebooks.findIndex((n) => n.patrimonio === payload.patrimonio && n.id !== payload.id);
	if (sameSerialIndex >= 0) {
		const antigo = state.notebooks[sameSerialIndex];
		state.notebooks.splice(sameSerialIndex, 1);
		payload.id = antigo.id;
	}
	const idx = state.notebooks.findIndex((n) => n.id === payload.id);
	if (idx >= 0) state.notebooks[idx] = payload;
	else state.notebooks.unshift(payload);
}

// SALVAR DADOS
async function salvarTudo() {
	const payload = { notebooks: state.notebooks, suporte: state.suporte, alunos: state.alunos, termos: state.termos };
	localStorage.setItem("monitoramento-ti", JSON.stringify(payload));
	escritasPendentesNoServidor++;
	try {
		await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), cache: "no-store" });
	} catch (e) {
		console.error(e);
	} finally {
		escritasPendentesNoServidor = Math.max(0, escritasPendentesNoServidor - 1);
	}
}

// CARREGAR DADOS
// IMPORTANTE: esta função só deve ser chamada na página de Notebooks
// (ela é acionada dentro de initNotebooks()). Ela mexe em elementos
// exclusivos de notebooks.html, como #nb-registro - chamá-la em outra
// página derruba a inicialização daquela página inteira.
async function carregarDados() {
	try {
		const resp = await fetch("/api/data", { cache: "no-store" });
		if (!resp.ok) throw new Error("GET failed");
		const data = await resp.json();
		const ls = JSON.parse(localStorage.getItem("monitoramento-ti") || "null");
		const source = data && (data.notebooks?.length || data.suporte?.length || data.alunos?.length) ? data : ls;
		if (source) {
			state.notebooks = Array.isArray(source.notebooks) ? source.notebooks : [];
			state.suporte = Array.isArray(source.suporte) ? source.suporte : [];
			state.alunos = Array.isArray(source.alunos) ? source.alunos : [];
			state.termos = Array.isArray(source.termos) ? source.termos : [];
		}
	} catch (e) {
		const ls = JSON.parse(localStorage.getItem("monitoramento-ti") || "null");
		if (ls) {
			state.notebooks = Array.isArray(ls.notebooks) ? ls.notebooks : [];
			state.suporte = Array.isArray(ls.suporte) ? ls.suporte : [];
			state.alunos = Array.isArray(ls.alunos) ? ls.alunos : [];
			state.termos = Array.isArray(ls.termos) ? ls.termos : [];
		}
		console.error(e);
	}
	syncRegistroFields();
	renderListaModelos();
	renderListaSetores();
	renderGrouped();
	renderSuporte();
	renderAlunos();
}

/* =========================================================================
   7. NOTEBOOKS - RELATÓRIOS EM PDF
	========================================================================= */
// Em uso //
function exportarEmUsoPDF() {
	const { jsPDF } = window.jspdf;
	const doc = new jsPDF("p", "mm", "a4");

	const emUso = aplicarFiltrosDados(
		ordenarPorData(
			state.notebooks.filter((n) => n.categoria === "em-uso"),
			"aquisicao",
			ordenacaoData["em-uso"],
		),
		"em-uso",
	);

	// Título
	doc.setFontSize(16);
	doc.setFont("helvetica", "bold");
	doc.text("Relatório de Notebooks em Uso", 105, 20, { align: "center" });

	// Data
	const hoje = new Date();
	const dataFormatada = hoje.toLocaleDateString("pt-BR", { year: "numeric", month: "numeric", day: "numeric" });
	doc.setFontSize(10);
	doc.setFont("helvetica", "normal");
	doc.setTextColor(100);
	doc.text(`Data de emissão: ${dataFormatada}`, 105, 30, { align: "center" });

	// Preparar dados da tabela
	const tableData = emUso.map((n) => [n.modelo, n.patrimonio, n.colaborador, fmtDate(n.aquisicao), "Em uso"]);

	// Gerar tabela
	doc.setFont("helvetica", "sans-serif", "bold");
	doc.autoTable({ startY: 40, head: [["Equipamento", "Patrimônio", "Colaborador(a)", "Data de aquisição"]], body: tableData, theme: "striped", headStyles: { fillColor: [109, 183, 255], textColor: 0, halign: "center" }, styles: { fontSize: 9, cellPadding: 2 }, columnStyles: { 0: { cellWidth: "auto", halign: "center" }, 1: { cellWidth: "auto", halign: "center" }, 2: { cellWidth: "auto", halign: "center" }, 3: { cellWidth: "auto", halign: "center" } } });

	// Rodapé
	const finalY = doc.lastAutoTable.finalY || 40;
	doc.setFontSize(8);
	doc.setFont("helvetica", "italic");
	doc.setTextColor(100);
	doc.text("Relatório gerado automaticamente pelo sistema de monitoramento de notebooks.", 105, finalY + 15, { align: "center" });

	// Salvar
	doc.save(`relatorio-em-uso-${hoje.toISOString().slice(0, 10)}.pdf`);
}

// Devolvidos //
function exportarDevolvidoPDF() {
	const { jsPDF } = window.jspdf;
	const doc = new jsPDF("p", "mm", "a4");

	const devolvidos = aplicarFiltrosDados(
		ordenarPorData(
			state.notebooks.filter((n) => n.categoria === "devolvido"),
			"aquisicao",
			ordenacaoData.devolvido,
		),
		"devolvido",
	);

	// Título
	doc.setFontSize(16);
	doc.setFont("helvetica", "bold");
	doc.text("Relatório de Notebooks Devolvidos", 105, 20, { align: "center" });

	// Data
	const hoje = new Date();
	const dataFormatada = hoje.toLocaleDateString("pt-BR", { year: "numeric", month: "numeric", day: "numeric" });
	doc.setFontSize(10);
	doc.setFont("helvetica", "normal");
	doc.text(`Data de emissão: ${dataFormatada}`, 105, 30, { align: "center" });

	// Preparar dados da tabela
	const tableData = devolvidos.map((n) => [n.modelo, n.patrimonio, n.colaborador, fmtDate(n.aquisicao), fmtDate(n.devolucao)]);

	// Gerar tabela
	doc.autoTable({ startY: 40, head: [["Equipamento", "Patrimônio", "Colaborador(a)", "Data de aquisição", "Data devolução"]], body: tableData, theme: "striped", headStyles: { fillColor: [65, 214, 176], textColor: 0, fontStyle: "bold", halign: "center" }, styles: { fontSize: 9, cellPadding: 2 }, columnStyles: { 0: { cellWidth: "auto", halign: "center" }, 1: { cellWidth: "auto", halign: "center" }, 2: { cellWidth: "auto", halign: "center" }, 3: { cellWidth: "auto", halign: "center" }, 4: { cellWidth: "auto", halign: "center" } } });

	// Rodapé
	const finalY = doc.lastAutoTable.finalY || 40;
	doc.setFontSize(8);
	doc.setFont("helvetica", "italic");
	doc.setTextColor(100);
	doc.text("Relatório gerado automaticamente pelo sistema de monitoramento de notebooks.", 105, finalY + 15, { align: "center" });

	// Salvar
	doc.save(`relatorio-devolvidos-${hoje.toISOString().slice(0, 10)}.pdf`);
}

// Danificados //
function exportarDanificadoPDF() {
	const { jsPDF } = window.jspdf;
	const doc = new jsPDF("p", "mm", "a4");

	const danificados = aplicarFiltrosDados(
		ordenarPorData(
			state.notebooks.filter((n) => n.categoria === "danificado"),
			"aquisicao",
			ordenacaoData.danificado,
		),
		"danificado",
	);

	// Título
	doc.setFontSize(16);
	doc.setFont("helvetica", "bold");
	doc.text("Relatório de Notebooks Danificados", 105, 20, { align: "center" });

	// Data
	const hoje = new Date();
	const dataFormatada = hoje.toLocaleDateString("pt-BR", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
	doc.setFontSize(10);
	doc.setFont("helvetica", "normal");
	doc.text(`Data de emissão: ${dataFormatada}`, 105, 30, { align: "center" });

	// Preparar dados da tabela
	const tableData = danificados.map((n) => [n.modelo, n.patrimonio, n.colaborador, fmtDate(n.aquisicao), fmtDate(n.devolucao), n.defeito, "Danificado"]);

	// Gerar tabela
	doc.autoTable({ startY: 40, head: [["Equipamento", "Patrimînio", "Colaborador(a)", "Data aquisição", "Data devolução", "Defeito"]], body: tableData, theme: "striped", headStyles: { fillColor: [239, 122, 114], textColor: 0, fontStyle: "bold", halign: "center" }, styles: { fontSize: 8, cellPadding: 2 }, columnStyles: { 0: { cellWidth: "auto", halign: "center" }, 1: { cellWidth: "auto", halign: "center" }, 2: { cellWidth: "auto", halign: "center" }, 3: { cellWidth: "auto", halign: "center" }, 4: { cellWidth: "auto", halign: "center" }, 5: { cellWidth: "auto", halign: "center" }, 6: { cellWidth: "auto", halign: "center" } } });

	// Rodapé
	const finalY = doc.lastAutoTable.finalY || 40;
	doc.setFontSize(8);
	doc.setFont("helvetica", "italic");
	doc.setTextColor(100);
	doc.text("Relatório gerado automaticamente pelo sistema de monitoramento de notebooks.", 105, finalY + 15, { align: "center" });

	// Salvar
	doc.save(`relatorio-danificados-${hoje.toISOString().slice(0, 10)}.pdf`);
}

/* =========================================================================
   8. NOTEBOOKS - EDIÇÃO / EXCLUSÃO DE REGISTROS
	========================================================================= */
window.editNotebook = function (id) {
	const n = state.notebooks.find((x) => x.id === id);
	if (!n) return;
	editingNbId = id;
	document.getElementById("nb-modelo").value = n.modelo;
	document.getElementById("nb-patrimonio").value = n.patrimonio;
	document.getElementById("nb-colaborador").value = n.colaborador;
	document.getElementById("nb-setor").value = n.setor;
	document.getElementById("nb-defeito").value = n.defeito;
	if (n.categoria === "em-uso") {
		document.getElementById("nb-registro").value = "aquisicao";
		document.getElementById("nb-data").value = n.aquisicao;
	} else {
		document.getElementById("nb-registro").value = "devolucao";
		document.getElementById("nb-data").value = n.devolucao;
	}
	document.getElementById("nb-tipo-devolucao").value = n.categoria === "danificado" ? "com-defeito" : "sem-defeito";
	document.getElementById("cancelEditNb").classList.remove("hidden");
	syncRegistroFields();
	window.scrollTo({ top: 0, behavior: "smooth" });
};

// Colaboradores
window.deleteNotebook = async function (id) {
	const notebook = state.notebooks.find((n) => n.id === id);
	if (!notebook) return;

	lastDeletedItem = notebook;
	lastDeletedCollection = "notebooks";
	lastDeletedSource = "notebooks";

	state.notebooks = state.notebooks.filter((n) => n.id !== id);

	await salvarTudo();
	renderGrouped();
	renderListaModelos();

	toast("Registro excluído.", true);
};

// Suporte
window.editSuporte = function (id) {
	const s = state.suporte.find((x) => x.id === id);
	if (!s) return;
	editingSupId = id;
	document.getElementById("sp-modelo").value = s.modelo;
	document.getElementById("sp-patrimonio").value = s.patrimonio;
	document.getElementById("sp-local").value = s.local;
	document.getElementById("cancelEditSup").classList.remove("hidden");
	document.querySelector('[data-tab="suporte"]').click();
	window.scrollTo({ top: 0, behavior: "smooth" });
};

window.deleteSuporte = async function (id) {
	const item = state.suporte.find((s) => s.id === id);
	if (!item) return;

	lastDeletedItem = item;
	lastDeletedCollection = "suporte";
	lastDeletedSource = "notebooks";

	state.suporte = state.suporte.filter((s) => s.id !== id);

	await salvarTudo();
	renderSuporte();
	renderListaModelos();

	toast("Registro excluído.", true);
};

// Alunos
window.editAluno = function (id) {
	const a = state.alunos.find((x) => x.id === id);
	if (!a) return;
	editingAluId = id;
	document.getElementById("al-modelo").value = a.modelo;
	document.getElementById("al-patrimonio").value = a.patrimonio;
	document.getElementById("al-sala").value = a.sala;
	document.getElementById("al-trava").value = a.trava;
	document.getElementById("cancelEditAlu").classList.remove("hidden");
	document.querySelector('[data-tab="alunos"]').click();
	window.scrollTo({ top: 0, behavior: "smooth" });
};

window.deleteAluno = async function (id) {
	const item = state.alunos.find((a) => a.id === id);
	if (!item) return;

	lastDeletedItem = item;
	lastDeletedCollection = "alunos";
	lastDeletedSource = "notebooks";

	state.alunos = state.alunos.filter((a) => a.id !== id);

	await salvarTudo();
	renderAlunos();
	renderListaModelos();

	toast("Registro excluído.", true);
};

/* =========================================================================
   9. NOTEBOOKS - FILTROS POR SETOR E MODELO DENTRO DE CADA CATEGORIA
	========================================================================= */
const filtrosAtivos = { "em-uso": { setor: "", modelo: "" }, devolvido: { setor: "", modelo: "" }, danificado: { setor: "", modelo: "" } };

// Atualiza os dropdowns de filtro com os valores únicos da categoria
function atualizarDropdownsFiltro(categoria) {
	const notebooksFiltrados = state.notebooks.filter((n) => n.categoria === categoria);

	// Coleta setores e modelos únicos
	const setoresUnicos = [...new Set(notebooksFiltrados.map((n) => n.setor).filter((s) => s && s.trim()))];
	const modelosUnicos = [...new Set(notebooksFiltrados.map((n) => n.modelo).filter((m) => m && m.trim()))];

	// Ordena alfabeticamente
	setoresUnicos.sort();
	modelosUnicos.sort();

	// Atualiza dropdown de setor
	const selectSetor = document.getElementById(`filtro-setor-${categoria}`);
	if (selectSetor) {
		const valorAtual = selectSetor.value;
		selectSetor.innerHTML = '<option value="">Todos os setores</option>' + setoresUnicos.map((setor) => `<option value="${escapeHtml(setor)}">${escapeHtml(setor)}</option>`).join("");
		selectSetor.value = valorAtual;
	}

	// Atualiza dropdown de modelo
	const selectModelo = document.getElementById(`filtro-modelo-${categoria}`);
	if (selectModelo) {
		const valorAtual = selectModelo.value;
		selectModelo.innerHTML = '<option value="">Todos os modelos</option>' + modelosUnicos.map((modelo) => `<option value="${escapeHtml(modelo)}">${escapeHtml(modelo)}</option>`).join("");
		selectModelo.value = valorAtual;
	}
}

// Aplica os filtros selecionados e renderiza a tabela
function aplicarFiltros(categoria) {
	const selectSetor = document.getElementById(`filtro-setor-${categoria}`);
	const selectModelo = document.getElementById(`filtro-modelo-${categoria}`);

	if (!selectSetor || !selectModelo) return;

	// Atualiza estado dos filtros
	filtrosAtivos[categoria].setor = selectSetor.value;
	filtrosAtivos[categoria].modelo = selectModelo.value;

	// Renderiza a tabela com os filtros aplicados
	renderGrouped();
}

// Aplica filtros aos dados de uma categoria
function aplicarFiltrosDados(dados, categoria) {
	const filtro = filtrosAtivos[categoria];

	return dados.filter((n) => {
		const matchSetor = !filtro.setor || n.setor === filtro.setor;
		const matchModelo = !filtro.modelo || n.modelo === filtro.modelo;
		return matchSetor && matchModelo;
	});
}

// Alterna a ordenação por data (crescente/decrescente) e atualiza o ícone do botão
function atualizarIconeOrdenacao(categoriaSelecionada) {
	document.querySelectorAll(".sort-date-btn").forEach((botao) => {
		const categoria = botao.dataset.sortDate;
		const icone = botao.querySelector("i");

		if (!icone) {
			return;
		}

		botao.classList.remove("active");

		if (categoria !== categoriaSelecionada) {
			icone.className = "ti ti-arrows-sort";
			return;
		}

		botao.classList.add("active");

		if (ordenacaoData[categoria] === "crescente") {
			icone.className = "ti ti-arrow-up";
		} else {
			icone.className = "ti ti-arrow-down";
		}
	});
}

/* =========================================================================
   10. NOTEBOOKS - TERMOS / DOCUSIGN
   -------------------------------------------------------------------------
   Os termos NÃO são criados por um formulário próprio: cada movimentação
   registrada em "Colaboradores → Registrar movimentação" (ver o listener
   de #formNotebook dentro de initNotebooks) já cria automaticamente um
   novo registro em state.termos. Esta seção cuida apenas de LISTAR,
   EDITAR, ANEXAR PDF e EXCLUIR esses registros.
	========================================================================= */
function termoLabel(tipo) {
	return { aquisicao: "Aquisição / responsabilidade", "devolucao-sem-defeito": "Devolução sem defeito", "devolucao-com-defeito": "Devolução com defeito" }[tipo] || tipo;
}

function termoStatusLabel(status) {
	return { pendente: "Pendente", assinado: "Assinado", recusado: "Recusado" }[status] || status;
}

// Lê um arquivo PDF selecionado pelo usuário e devolve uma Promise com o
// conteúdo em Data URL (base64), para ficar salvo junto do registro do
// termo (mesma ideia de persistência já usada no restante do sistema:
// tudo fica dentro de state/localStorage, sem backend de upload).
function lerArquivoComoDataURL(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result);
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(file);
	});
}

function renderTermos() {
	const body = document.getElementById("bodyTermos");
	const empty = document.getElementById("emptyTermos");
	if (!body || !empty) return;

	const busca = (document.getElementById("buscaTermo")?.value || "").toLowerCase().trim();
	const filtroStatus = document.getElementById("filtroStatusTermo")?.value || "";

	const termos = state.termos.filter((t) => {
		const texto = [t.colaborador, t.patrimonio, t.email].join(" ").toLowerCase();
		return (!busca || texto.includes(busca)) && (!filtroStatus || t.status === filtroStatus);
	});

	body.innerHTML = termos
		.map(
			(t) => `
    <tr>
		<td><div class="model">${escapeHtml(t.colaborador)}</div><span class="serial">${escapeHtml(t.setor)}</span></td>
		<td><div class="model">${escapeHtml(t.modelo)}</div><span class="serial">${escapeHtml(t.patrimonio)}</span></td>
		<td>${escapeHtml(t.email)}</td>
		<td>${escapeHtml(termoLabel(t.tipo))}</td>
		<td><span class="status-pill status-${escapeHtml(t.status)}">${escapeHtml(termoStatusLabel(t.status))}</span></td>
		<td>${t.arquivoDataUrl ? `<button class="mini" title="Abrir termo" onclick="abrirTermoPdf('${t.id}')"><i class="ti ti-file-text"></i></button>` : `<span class="badge pending" title="Nenhum PDF anexado a este registro">Sem PDF</span>`}</td>
		<td><div class="row-actions">
        <button class="mini" title="Editar" onclick="editTermo('${t.id}')"><i class="ti ti-pencil"></i></button>
        <button class="danger-mini" title="Excluir" onclick="deleteTermo('${t.id}')"><i class="ti ti-trash-x"></i></button>
    </div></td>
    </tr>
  `,
		)
		.join("");

	empty.style.display = termos.length ? "none" : "block";
	renderStats();
}

// Abre, em uma nova aba, o PDF vinculado especificamente a este registro
// de termo (nunca o de outro registro, pois cada termo guarda seu próprio
// arquivoDataUrl).
window.abrirTermoPdf = function (id) {
	const termo = state.termos.find((t) => t.id === id);
	if (!termo || !termo.arquivoDataUrl) {
		toast("Este termo ainda não possui um PDF anexado.");
		return;
	}
	window.open(termo.arquivoDataUrl, "_blank", "noopener");
};

// Abre o painel de edição já preenchido com os dados do termo selecionado.
window.editTermo = function (id) {
	const t = state.termos.find((x) => x.id === id);
	if (!t) return;
	editingTermoId = id;
	document.getElementById("termo-colaborador").value = t.colaborador || "";
	document.getElementById("termo-setor").value = t.setor || "";
	document.getElementById("termo-modelo").value = t.modelo || "";
	document.getElementById("termo-patrimonio").value = t.patrimonio || "";
	document.getElementById("termo-email").value = t.email || "";
	document.getElementById("termo-tipo").value = t.tipo || "aquisicao";
	document.getElementById("termo-status").value = t.status || "pendente";
	document.getElementById("termo-arquivo").value = "";
	document.getElementById("termo-arquivo-atual").textContent = t.arquivoNome ? `Arquivo atual: ${t.arquivoNome}` : "Nenhum PDF anexado ainda";
	document.getElementById("panelEditarTermo").classList.remove("hidden");
	document.getElementById("panelEditarTermo").scrollIntoView({ behavior: "smooth", block: "start" });
};

function fecharEdicaoTermo() {
	editingTermoId = null;
	document.getElementById("formTermo").reset();
	document.getElementById("termo-arquivo-atual").textContent = "";
	document.getElementById("panelEditarTermo").classList.add("hidden");
}

// Exclusão de termo reaproveitando o mesmo mecanismo de "excluir com opção
// de desfazer" usado para notebooks/suporte/alunos.
window.deleteTermo = async function (id) {
	const termo = state.termos.find((t) => t.id === id);
	if (!termo) return;

	lastDeletedItem = termo;
	lastDeletedCollection = "termos";
	lastDeletedSource = "notebooks";

	state.termos = state.termos.filter((t) => t.id !== id);

	await salvarTudo();
	renderTermos();

	toast("Termo excluído.", true);
};

/* =========================================================================
   11. NOTEBOOKS - initNotebooks()
   -------------------------------------------------------------------------
   Liga todos os eventos de notebooks.html. Só é chamada quando
   body[data-page="notebooks"] (ver seção 21), então é seguro assumir que
   todos os elementos abaixo existem.
	========================================================================= */
function initNotebooks() {
	configurarToggleModelos();
	configurarToggleSetores();
	configurarFechamentoDasListas();
	configurarAutocompleteModelos();

	// TABS
	document.querySelectorAll(".tab").forEach((btn) => {
		btn.addEventListener("click", () => {
			document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
			document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
			btn.classList.add("active");
			document.getElementById("tab-" + btn.dataset.tab)?.classList.add("active");
		});
	});

	// NOTEBOOKS COLABORADORES - REGISTRO
	document.getElementById("nb-registro")?.addEventListener("change", syncRegistroFields);
	document.getElementById("nb-tipo-devolucao")?.addEventListener("change", syncRegistroFields);

	document.getElementById("formNotebook")?.addEventListener("submit", async (e) => {
		e.preventDefault();
		const registro = document.getElementById("nb-registro").value;
		const tipoDevolucao = document.getElementById("nb-tipo-devolucao").value;
		const dataInformada = document.getElementById("nb-data").value;
		const patrimonioInformado = document.getElementById("nb-patrimonio").value.trim();
		const notebookExistente = state.notebooks.find((n) => n.id === editingNbId || n.patrimonio === patrimonioInformado);

		const payload = {
			// Cria ou atualiza o registro do notebook
			id: editingNbId || uid(),
			modelo: document.getElementById("nb-modelo").value.trim(),
			patrimonio: document.getElementById("nb-patrimonio").value.trim(),
			colaborador: document.getElementById("nb-colaborador").value.trim(),
			email: document.getElementById("nb-email").value.trim(),
			setor: document.getElementById("nb-setor").value.trim(),
			// Ao editar, mantém a data original de aquisição.
			// Somente um novo cadastro de aquisição recebe a data informada.
			aquisicao: registro === "aquisicao" ? dataInformada : notebookExistente?.aquisicao || "",
			// A data informada passa a ser a data de devolução.
			devolucao: registro === "devolucao" ? dataInformada : "",
			defeito: registro === "devolucao" && tipoDevolucao === "com-defeito" ? document.getElementById("nb-defeito").value.trim() : "",
			categoria: registro === "aquisicao" ? "em-uso" : tipoDevolucao === "com-defeito" ? "danificado" : "devolvido",
		};

		// Validação
		if (!payload.modelo || !payload.patrimonio) return toast("Preencha modelo e nº de patrimônio.");
		if (!payload.colaborador) return toast("Informe o colaborador.");
		if (!dataInformada) return toast("Informe a data.");
		if (registro === "devolucao" && tipoDevolucao === "com-defeito" && !payload.defeito) return toast("Descreva o defeito.");

		// Verifica patrimônio duplicado
		const duplicate = state.notebooks.find((n) => n.patrimonio === payload.patrimonio && n.id !== payload.id);
		if (duplicate) {
			return toast(`O patrimônio ${payload.patrimonio} já está registrado`);
		}
		// Salva o registro do notebook
		saveNotebookRecord(payload);

		// Gera automaticamente um registro de TERMO para esta movimentação.
		// Cada envio do formulário (aquisição, devolução sem defeito ou com
		// defeito) representa uma movimentação própria e deve virar um novo
		// registro no histórico "Termos registrados" — o registro anterior
		// (ex.: a aquisição) NUNCA é apagado ou sobrescrito por este.
		const tipoTermo = registro === "aquisicao" ? "aquisicao" : tipoDevolucao === "com-defeito" ? "devolucao-com-defeito" : "devolucao-sem-defeito";
		state.termos.unshift({ id: uid(), notebookId: payload.id, colaborador: payload.colaborador, setor: payload.setor, modelo: payload.modelo, patrimonio: payload.patrimonio, email: payload.email, tipo: tipoTermo, data: dataInformada, status: "pendente", arquivoNome: "", arquivoDataUrl: "", criadoEm: new Date().toISOString() });

		await salvarTudo();
		renderGrouped();
		renderListaModelos();
		if (typeof renderTermos === "function") renderTermos();
		e.target.reset();
		// Reseta o estado de edição
		editingNbId = null;
		document.getElementById("cancelEditNb").classList.add("hidden");
		syncRegistroFields();
		toast("Registro salvo.");
	});

	// SUPORTE - REGISTRO
	document.getElementById("formSuporte")?.addEventListener("submit", async (e) => {
		e.preventDefault();
		const payload = { id: editingSupId || uid(), modelo: document.getElementById("sp-modelo").value.trim(), patrimonio: document.getElementById("sp-patrimonio").value.trim(), local: document.getElementById("sp-local").value.trim() };
		if (!payload.modelo || !payload.patrimonio || !payload.local) return toast("Preencha todos os campos do suporte.");
		// Verifica patrimônio duplicado
		const duplicate = state.suporte.find((s) => s.patrimonio === payload.patrimonio && s.id !== payload.id);
		if (duplicate) {
			return toast(`O patrimônio ${payload.patrimonio} já está registrado para o local ${duplicate.local}.`);
		}
		const idx = state.suporte.findIndex((s) => s.id === editingSupId || s.patrimonio === payload.patrimonio);
		if (idx >= 0) state.suporte[idx] = { ...state.suporte[idx], ...payload };
		else state.suporte.unshift(payload);
		await salvarTudo();
		renderSuporte();
		renderListaModelos();
		e.target.reset();
		editingSupId = null;
		document.getElementById("cancelEditSup").classList.add("hidden");
		toast("Suporte salvo.");
	});

	// ALUNOS - REGISTRO
	document.getElementById("formAluno")?.addEventListener("submit", async (e) => {
		e.preventDefault();
		const payload = { id: editingAluId || uid(), modelo: document.getElementById("al-modelo").value.trim(), patrimonio: document.getElementById("al-patrimonio").value.trim(), sala: document.getElementById("al-sala").value.trim(), trava: document.getElementById("al-trava").value.trim() };
		if (!payload.modelo || !payload.patrimonio || !payload.sala || !payload.trava) return toast("Preencha todos os campos.");
		const idx = state.alunos.findIndex((a) => a.id === editingAluId || a.patrimonio === payload.patrimonio);
		if (idx >= 0) state.alunos[idx] = { ...state.alunos[idx], ...payload };
		else state.alunos.unshift(payload);
		await salvarTudo();
		renderAlunos();
		renderListaModelos();
		e.target.reset();
		editingAluId = null;
		document.getElementById("cancelEditAlu").classList.add("hidden");
		toast("Registro salvo.");
	});

	// FILTROS DE STATUS
	document.querySelectorAll(".status-filter").forEach((btn) => {
		btn.addEventListener("click", () => {
			document.querySelectorAll(".status-filter").forEach((b) => b.classList.remove("active"));
			document.querySelectorAll(".status-section").forEach((s) => s.classList.remove("active"));
			btn.classList.add("active");
			document.querySelector(`.status-section[data-section="${btn.dataset.status}"]`).classList.add("active");
		});
	});

	// CANCELAR EDIÇÃO
	document.getElementById("cancelEditNb")?.addEventListener("click", () => {
		editingNbId = null;
		document.getElementById("formNotebook").reset();
		document.getElementById("cancelEditNb").classList.add("hidden");
		syncRegistroFields();
	});

	document.getElementById("cancelEditSup")?.addEventListener("click", () => {
		editingSupId = null;
		document.getElementById("formSuporte").reset();
		document.getElementById("cancelEditSup").classList.add("hidden");
	});

	document.getElementById("cancelEditAlu")?.addEventListener("click", () => {
		editingAluId = null;
		document.getElementById("formAluno").reset();
		document.getElementById("cancelEditAlu").classList.add("hidden");
	});

	// Exportar PDF
	document.getElementById("btnExportarEmUsoPDF")?.addEventListener("click", exportarEmUsoPDF);
	document.getElementById("btnExportarDevolvidoPDF")?.addEventListener("click", exportarDevolvidoPDF);
	document.getElementById("btnExportarDanificadoPDF")?.addEventListener("click", exportarDanificadoPDF);

	// Ordenar por data
	document.querySelectorAll(".sort-date-btn").forEach((botao) => {
		botao.addEventListener("click", () => {
			const categoria = botao.dataset.sortDate;

			if (!categoria || !ordenacaoData[categoria]) {
				return;
			}

			ordenacaoData[categoria] = ordenacaoData[categoria] === "crescente" ? "decrescente" : "crescente";

			atualizarIconeOrdenacao(categoria);

			renderGrouped();
		});
	});

	// TERMOS / DOCUSIGN
	document.getElementById("cancelEditTermo")?.addEventListener("click", fecharEdicaoTermo);

	// Salva as alterações de um termo já existente. Este formulário só é usado
	// para EDIÇÃO (nunca para criar um termo novo), então sempre atualiza o
	// registro em vigor (editingTermoId) e nunca cria uma linha adicional.
	document.getElementById("formTermo")?.addEventListener("submit", async (e) => {
		e.preventDefault();
		if (!editingTermoId) return; // segurança: não deve acontecer, pois o painel só abre via editTermo()

		const idx = state.termos.findIndex((t) => t.id === editingTermoId);
		if (idx === -1) return;

		const colaborador = document.getElementById("termo-colaborador").value.trim();
		const modelo = document.getElementById("termo-modelo").value.trim();
		const patrimonio = document.getElementById("termo-patrimonio").value.trim();
		if (!colaborador || !modelo || !patrimonio) return toast("Preencha colaborador, modelo e patrimônio.");

		const atualizado = { ...state.termos[idx], colaborador, setor: document.getElementById("termo-setor").value.trim(), modelo, patrimonio, email: document.getElementById("termo-email").value.trim(), tipo: document.getElementById("termo-tipo").value, status: document.getElementById("termo-status").value };

		// Se um novo PDF foi selecionado, substitui o arquivo deste registro.
		const arquivoInput = document.getElementById("termo-arquivo");
		const novoArquivo = arquivoInput.files && arquivoInput.files[0];
		if (novoArquivo) {
			if (novoArquivo.type !== "application/pdf") {
				return toast("Selecione um arquivo em PDF.");
			}
			atualizado.arquivoNome = novoArquivo.name;
			atualizado.arquivoDataUrl = await lerArquivoComoDataURL(novoArquivo);
		}

		state.termos[idx] = atualizado;
		await salvarTudo();
		fecharEdicaoTermo();
		renderTermos();
		toast("Termo atualizado.");
	});

	document.getElementById("buscaTermo")?.addEventListener("input", renderTermos);
	document.getElementById("filtroStatusTermo")?.addEventListener("change", renderTermos);

	// Carrega os dados e, assim que estiverem prontos, renderiza os termos
	// (que dependem de state.termos já estar carregado).
	carregarDados().then(() => {
		if (typeof renderTermos === "function") renderTermos();
	});
}

/* =========================================================================
   12. DASHBOARD (index.html)
	========================================================================= */
function renderDashboard() {
	const d = moduleData();
	const nb = JSON.parse(localStorage.getItem("monitoramento-ti") || "{}");
	const emUso = (nb.notebooks || []).filter((x) => x.categoria === "em-uso").length;
	document.getElementById("dashNotebook")?.replaceChildren(document.createTextNode(emUso));
	document.getElementById("dashTickets")?.replaceChildren(document.createTextNode(d.chamados.filter((x) => x.status !== "Resolvido").length));
	document.getElementById("dashPurchases")?.replaceChildren(document.createTextNode(d.compras.filter((x) => x.status === "Pendente").length));
	document.getElementById("dashTutorials")?.replaceChildren(document.createTextNode(d.tutoriais.length));
	const tickets = document.getElementById("recentTickets");
	if (tickets)
		tickets.innerHTML = d.chamados
			.slice(0, 4)
			.map(
				(x) => `<div class="compact-item">
				<div>
					<strong>${TIHub.esc(x.id)} · ${TIHub.esc(x.assunto)}</strong>
					<small>${TIHub.esc(x.solicitante)}</small>
				</div>${TIHub.pill(x.status)}
			</div>`,
			)
			.join("");
	const buys = document.getElementById("recentPurchases");
	if (buys)
		buys.innerHTML = d.compras
			.slice(0, 4)
			.map(
				(x) => `<div class="compact-item">
				<div><strong>${TIHub.esc(x.item)}</strong><small>${TIHub.esc(x.obs || "Sem observação")}</small></div>${TIHub.pill(x.prioridade)}</div>`,
			)
			.join("");
}

/* =========================================================================
   13. SENHAS (senhas.html)
	========================================================================= */
function renderPasswords() {
	const d = moduleData();
	const emails = document.getElementById("EmailsRows"),
		soft = document.getElementById("softwareRows");
	if (emails) emails.innerHTML = d.emails.map((x) => `<tr><td><strong>${TIHub.esc(x.nome)}</strong></td><td>${TIHub.esc(x.emails)}</td><td class="password-cell">••••••••</td><td><div class="row-actions"><button class="mini" data-password-show="${x.id}"><i class="ti ti-eye"></i></button><button class="mini" title="Editar" data-password-edit="emails:${x.id}"><i class="ti ti-pencil"></i></button><button class="danger-mini" data-password-delete="emails:${x.id}"><i class="ti ti-trash-x"></i></button></div></td></tr>`).join("");
	if (soft) soft.innerHTML = d.softwares.map((x) => `<tr><td><strong>${TIHub.esc(x.nome)}</strong></td><td>${TIHub.esc(x.login)}</td><td>${TIHub.esc(x.url)}</td><td class="password-cell">••••••••</td><td><div class="row-actions"><button class="mini" data-password-show="${x.id}"><i class="ti ti-eye"></i></button><button class="mini" title="Editar" data-password-edit="softwares:${x.id}"><i class="ti ti-pencil"></i></button><button class="danger-mini" data-password-delete="softwares:${x.id}"><i class="ti ti-trash-x"></i></button></div></td></tr>`).join("");
}
function initPasswords() {
	renderPasswords();
	document.querySelectorAll("[data-password-tab]").forEach((b) =>
		b.addEventListener("click", () => {
			document.querySelectorAll("[data-password-tab]").forEach((x) => x.classList.remove("active"));
			b.classList.add("active");
			document.getElementById("passwordEmails").classList.toggle("hidden", b.dataset.passwordTab !== "emails");
			document.getElementById("passwordSoftware").classList.toggle("hidden", b.dataset.passwordTab !== "software");
		}),
	);
	document.getElementById("formEmails")?.addEventListener("submit", (e) => {
		e.preventDefault();
		const d = moduleData(),
			f = e.target;
		const payload = { nome: f.nome.value.trim(), emails: f.emails.value.trim(), senha: f.senha.value };
		if (editingEmailsId) {
			// Modo edição: atualiza o registro existente, sem criar um novo.
			const idx = d.emails.findIndex((x) => x.id === editingEmailsId);
			if (idx >= 0) d.emails[idx] = { ...d.emails[idx], ...payload };
			editingEmailsId = null;
			document.getElementById("cancelEditEmails").classList.add("hidden");
		} else {
			d.emails.unshift({ id: TIHub.uid("emails"), ...payload });
		}
		TIHub.save(d);
		f.reset();
		renderPasswords();
	});
	document.getElementById("formSoftware")?.addEventListener("submit", (e) => {
		e.preventDefault();
		const d = moduleData(),
			f = e.target;
		const payload = { nome: f.nome.value.trim(), login: f.login.value.trim(), url: f.url.value.trim(), senha: f.senha.value };
		if (editingSoftwareId) {
			const idx = d.softwares.findIndex((x) => x.id === editingSoftwareId);
			if (idx >= 0) d.softwares[idx] = { ...d.softwares[idx], ...payload };
			editingSoftwareId = null;
			document.getElementById("cancelEditSoftware").classList.add("hidden");
		} else {
			d.softwares.unshift({ id: TIHub.uid("sw"), ...payload });
		}
		TIHub.save(d);
		f.reset();
		renderPasswords();
	});
	document.getElementById("toggleEmailsForm")?.addEventListener("click", () => {
		document.getElementById("formEmails").hidden = false;
		const wasHidden = form.hidden;
		resetEmailsForm();
		form.hidden = !wasHidden;
		if (!form.hidden) form.item.focus();
	});
	cancelBtn?.addEventListener("click", resetEmailsForm);
	document.getElementById("toggleSoftwareForm")?.addEventListener("click", () => {
		document.getElementById("formSoftware").hidden = false;
		const wasHidden = form.hidden;
		resetSoftwareForm();
		form.hidden = !wasHidden;
		if (!form.hidden) form.item.focus();
	});
	cancelBtn?.addEventListener("click", resetSoftwareForm);
	document.getElementById("resetEmailsForm")?.addEventListener("click", () => {
		resetEmailsForm();
		form.hidden = true;
	});
	document.getElementById("cancelEditEmails")?.addEventListener("click", () => {
		editingEmailsId = null;
		document.getElementById("formEmails").reset();
		document.getElementById("cancelEditEmails").classList.add("hidden");
	});
	document.getElementById("cancelEditSoftware")?.addEventListener("click", () => {
		editingSoftwareId = null;
		document.getElementById("formSoftware").reset();
		document.getElementById("cancelEditSoftware").classList.add("hidden");
	});
	document.addEventListener("click", (e) => {
		const del = e.target.closest("[data-password-delete]");
		if (del) {
			const [key, id] = del.dataset.passwordDelete.split(":");
			const d = moduleData();
			const item = d[key].find((x) => x.id === id);
			if (!item) return;
			// Guarda o registro removido para permitir "Desfazer", usando o
			// mesmo mecanismo unificado de toast/undo (seção 2).
			lastDeletedItem = item;
			lastDeletedCollection = key;
			lastDeletedSource = "modulo";
			d[key] = d[key].filter((x) => x.id !== id);
			TIHub.save(d);
			renderPasswords();
			toast("Senha excluída.", true);
		}
		//editar a senha
		const edit = e.target.closest("[data-password-edit]");
		if (edit) {
			const [key, id] = edit.dataset.passwordEdit.split(":");
			const d = moduleData();
			const item = d[key].find((x) => x.id === id);
			if (!item) return;
			// Garante que a aba correta (Emails/Softwares) esteja visível
			// antes de preencher e mostrar o formulário daquela lista.
			document.querySelector(`[data-password-tab="${key === "emails" ? "emails" : "software"}"]`)?.click();
			if (key === "emails") {
				editingEmailsId = id;
				const f = document.getElementById("formEmails");
				f.nome.value = item.nome;
				f.emails.value = item.emails;
				f.senha.value = item.senha || "";
				document.getElementById("cancelEditEmails").classList.remove("hidden");
				f.scrollIntoView({ behavior: "smooth", block: "start" });
			} else {
				editingSoftwareId = id;
				const f = document.getElementById("formSoftware");
				f.nome.value = item.nome;
				f.login.value = item.login;
				f.url.value = item.url || "";
				f.senha.value = item.senha || "";
				document.getElementById("cancelEditSoftware").classList.remove("hidden");
				f.scrollIntoView({ behavior: "smooth", block: "start" });
			}
		}
		//mostrar a senha
		const show = e.target.closest("[data-password-show]");
		if (show) {
			// Encontra a célula da senha DENTRO DA MESMA LINHA do botão clicado,
			// garantindo que só a senha daquela linha seja afetada.
			const cell = show.closest("tr")?.querySelector(".password-cell");
			const icon = show.querySelector("i");
			if (!cell) return;
			const estaVisivel = cell.dataset.visivel === "true";
			if (estaVisivel) {
				// Oculta novamente: volta para as bolinhas e para o ícone de olho aberto.
				cell.textContent = "••••••••";
				cell.dataset.visivel = "false";
				if (icon) icon.className = "ti ti-eye";
			} else {
				// Mostra a senha real (buscada dos dados já existentes)
				const d = moduleData();
				const x = [...d.emails, ...d.softwares].find((v) => v.id === show.dataset.passwordShow);
				cell.textContent = x?.senha ? x.senha : "(sem senha cadastrada)";
				cell.dataset.visivel = "true";
				if (icon) icon.className = "ti ti-eye-closed";
			}
		}
	});
}

/* =========================================================================
   14. ESTOQUE (estoque.html)
	========================================================================= */
function formatModuleDate(value) {
	if (!value) return "—";
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("pt-BR");
}

function priorityOrder(priority) {
	return { Alta: 0, Média: 1, Baixa: 2 }[priority] ?? 99;
}

function normalizeMaterial(item) {
	return { ...item, quantidade: Number(item.quantidade) || 0, minimo: Number(item.minimo) || 0 };
}

/* Renderiza o estoque com Baixo primeiro e preserva a ordem original dentro de cada grupo. */
function renderEstoque() {
	const d = moduleData();
	const body = document.getElementById("EstoqueRows");
	if (!body) return;

	const ordered = d.estoque
		.map(normalizeMaterial)
		.map((item, index) => ({ item, index }))
		.sort((a, b) => {
			const lowA = a.item.quantidade <= a.item.minimo ? 0 : 1;
			const lowB = b.item.quantidade <= b.item.minimo ? 0 : 1;
			return lowA - lowB || a.index - b.index;
		})
		.map(({ item }) => item);

	body.innerHTML = ordered.length
		? ordered
				.map((x) => {
					const low = x.quantidade <= x.minimo;
					return `<tr>
        <td><strong>${TIHub.esc(x.item)}</strong></td>
        <td>${x.quantidade}</td>
        <td><button class="status-pill status-estoque ${low ? "status-recusado" : "status-assinado"}" type="button" disabled>${low ? "Baixo" : "Ok"}</button></td>
        <td><div class="row-actions">
			<button class="mini" type="button" title="Editar material" data-material-edit="${x.id}"><i class="ti ti-pencil"></i></button>
			<button class="danger-mini" type="button" title="Excluir material" data-material-delete="${x.id}"><i class="ti ti-trash-x"></i></button>
		</div></td>
        </tr>`;
				})
				.join("")
		: `<tr><td class="empty-row" colspan="4">Nenhum material cadastrado.</td></tr>`;
}

/* Reservado para futuras abas dentro do formulário de estoque; 
	hoje o estoque.html não define [data-material-tab]/[data-material-panel],
   então esta função simplesmente não encontra nada e não faz nada. */
function initMaterialTabs() {
	const tabs = document.querySelectorAll("[data-material-tab]");
	const panels = document.querySelectorAll("[data-material-panel]");
	if (!tabs.length || !panels.length) return;

	tabs.forEach((tab) => {
		tab.addEventListener("click", () => {
			const target = tab.dataset.materialTab;

			tabs.forEach((item) => {
				const active = item === tab;
				item.classList.toggle("active", active);
				item.setAttribute("aria-selected", String(active));
			});

			panels.forEach((panel) => {
				panel.hidden = panel.dataset.materialPanel !== target;
			});
		});
	});
}

function initEstoque() {
	initMaterialTabs();
	renderEstoque();
	const form = document.getElementById("formEstoque");
	if (!form) return;

	form.addEventListener("submit", (event) => {
		event.preventDefault();
		const d = moduleData();
		const payload = { item: form.item.value.trim(), quantidade: Number(form.quantidade.value), minimo: Number(form.minimo.value) };

		if (!payload.item || payload.quantidade < 0 || payload.minimo < 0) return;

		if (editingMaterialId) {
			const index = d.estoque.findIndex((x) => x.id === editingMaterialId);
			if (index >= 0) d.estoque[index] = { ...d.estoque[index], ...payload };
		} else {
			d.estoque.push({ id: TIHub.uid("est"), ...payload });
		}

		TIHub.save(d);
		editingMaterialId = null;
		form.reset();
		form.hidden = true;
		document.getElementById("toggleEstoqueForm").innerHTML = '<i class="ti ti-plus"></i> Adicionar';
		renderEstoque();
	});

	document.getElementById("toggleEstoqueForm")?.addEventListener("click", () => {
		editingMaterialId = null;
		form.reset();
		form.hidden = !form.hidden;
		if (!form.hidden) form.item.focus();
	});

	document.getElementById("cancelEstoque")?.addEventListener("click", () => {
		editingMaterialId = null;
		form.reset();
		form.hidden = true;
	});

	// Editar e excluir material (o botão de excluir era renderizado mas não
	// tinha nenhum listener; agora reaproveita o mecanismo de toast/undo
	// unificado, da mesma forma que a exclusão de senhas/notebooks).
	document.addEventListener("click", (event) => {
		const editButton = event.target.closest("[data-material-edit]");
		if (editButton) {
			const d = moduleData();
			const material = d.estoque.find((x) => x.id === editButton.dataset.materialEdit);
			if (!material) return;

			editingMaterialId = material.id;
			form.hidden = false;
			form.item.value = material.item || "";
			form.quantidade.value = Number(material.quantidade) || 0;
			form.minimo.value = Number(material.minimo) || 0;
			form.scrollIntoView({ behavior: "smooth", block: "nearest" });
			return;
		}

		const deleteButton = event.target.closest("[data-material-delete]");
		if (deleteButton) {
			const d = moduleData();
			const material = d.estoque.find((x) => x.id === deleteButton.dataset.materialDelete);
			if (!material) return;

			lastDeletedItem = material;
			lastDeletedCollection = "estoque";
			lastDeletedSource = "modulo";

			d.estoque = d.estoque.filter((x) => x.id !== material.id);
			TIHub.save(d);

			if (editingMaterialId === material.id) {
				editingMaterialId = null;
				form.reset();
				form.hidden = true;
			}

			renderEstoque();
			toast("Material excluído.", true);
		}
	});
}

/* =========================================================================
   15. COMPRAS (compras.html)
	========================================================================= */
/* Renderiza compras por Alta, Média e Baixa, sem alterar a ordem de adição dentro de cada prioridade. */
function renderPurchases() {
	const d = moduleData();
	const body = document.getElementById("purchaseRows");
	if (!body) return;

	const ordered = d.compras
		.map((item, index) => ({ item, index }))
		.sort((a, b) => priorityOrder(a.item.prioridade) - priorityOrder(b.item.prioridade) || a.index - b.index)
		.map(({ item }) => item);

	body.innerHTML = ordered.length
		? ordered
				.map(
					(x) => `<tr>
        <td>
			<div class="model">${TIHub.esc(x.item)}</div>
			<span class="serial">${TIHub.esc(x.categoria || "Sem categoria")}</span>
		</td>
        <td style= "text-align:center;">${TIHub.pill(x.prioridade)}</td>
        <td style= "text-align:center;">${Number(x.quantidade) || 0}</td>
        <td style= "text-align:center;">${TIHub.esc(formatModuleDate(x.dataISO || x.data))}</td>
        <td style= "text-align:center;">${TIHub.esc(x.obs || "—")}</td>
        <td style= "text-align:center;">
			<button
				class="status-pill status-button ${x.status === "Comprado" ? "status-assinado" : "status-pendente"}"
				type="button"
				data-purchase-status="${x.id}"
				${x.status === "Comprado" ? "disabled" : ""}>
				${x.status === "Comprado" ? "Comprado" : "Pendente"}
			</button>
		</td>
		<td style= "text-align:left;"><div class="row-actions">
			<button class="mini" type="button" title="Editar compra" data-purchase-edit="${x.id}"><i class="ti ti-pencil"></i></button>
			<button class="danger-mini" type="button" title="Excluir compra" data-purchase-delete="${x.id}"><i class="ti ti-trash-x"></i></button>
		</div></td>
      </tr>`,
				)
				.join("")
		: `<tr><td class="empty-row" colspan="7">Nenhum item na lista de compras.</td></tr>`;
}

/* Adiciona/edita compras e registra o gasto apenas uma vez ao marcar como comprado. */
function initPurchases() {
	renderPurchases();
	const form = document.getElementById("formPurchase");
	if (!form) return;

	const cancelBtn = document.getElementById("cancelPurchase");
	const submitBtn = document.getElementById("submitPurchase");

	// Único botão de cancelar/fechar o formulário. O texto muda conforme o
	// modo (adicionar x editar), em vez de existir um segundo botão só
	// para "Cancelar edição" (mesmo padrão já usado em Estoque).
	function resetPurchaseForm() {
		editingPurchaseId = null;
		form.reset();
		form.hidden = true;
		if (cancelBtn) cancelBtn.textContent = "Cancelar";
		if (submitBtn) submitBtn.textContent = "Adicionar item";
	}

	form.addEventListener("submit", (event) => {
		event.preventDefault();
		const d = moduleData();
		const payload = { item: form.item.value.trim(), prioridade: form.prioridade.value, quantidade: Number(form.quantidade.value), categoria: form.categoria.value.trim(), obs: form.obs.value.trim() };
		if (!payload.item || payload.quantidade < 1 || !payload.categoria) return;

		if (editingPurchaseId) {
			const index = d.compras.findIndex((x) => x.id === editingPurchaseId);
			if (index >= 0) d.compras[index] = { ...d.compras[index], ...payload };
		} else {
			const now = new Date();
			d.compras.push({ id: TIHub.uid("buy"), ...payload, dataISO: now.toISOString(), data: now.toLocaleDateString("pt-BR"), status: "Pendente" });
		}

		TIHub.save(d);
		resetPurchaseForm();
		renderPurchases();
	});

	document.getElementById("togglePurchaseForm")?.addEventListener("click", () => {
		const wasHidden = form.hidden;
		resetPurchaseForm();
		form.hidden = !wasHidden;
		if (!form.hidden) form.item.focus();
	});

	cancelBtn?.addEventListener("click", resetPurchaseForm);

	document.addEventListener("click", (event) => {
		const statusButton = event.target.closest("[data-purchase-status]");
		if (statusButton) {
			const d = moduleData();
			const purchase = d.compras.find((x) => x.id === statusButton.dataset.purchaseStatus);
			if (!purchase || purchase.status === "Comprado") return;

			// Pergunta o valor gasto antes de concluir a compra.
			const resposta = window.prompt(`Qual foi o valor gasto na compra de "${purchase.item}"?`, "");
			if (resposta === null) return; // usuário cancelou a pergunta

			const valor = Number(String(resposta).replace(",", "."));
			if (Number.isNaN(valor) || valor < 0) {
				toast("Informe um valor numérico válido.");
				return;
			}

			// Remove o item da lista de compras (ele "sai" da lista, como pedido)
			// e registra o gasto correspondente no Orçamento.
			d.compras = d.compras.filter((x) => x.id !== purchase.id);
			const purchaseCompra = { ...purchase, status: "Comprado", dataCompraISO: new Date().toISOString(), valor };
			const gasto = { id: TIHub.uid("exp"), origemCompraId: purchase.id, descricao: purchase.item, categoria: purchase.categoria || "Compras", quantidade: Number(purchase.quantidade) || 0, valor, data: new Date().toLocaleDateString("pt-BR") };
			d.gastos.unshift(gasto);
			TIHub.save(d);

			// Guarda a ação para permitir desfazer (restaura o item na lista
			// de compras e remove o gasto gerado, sem duplicar dados).
			lastPurchaseUndo = { purchase: purchaseCompra, gastoId: gasto.id };
			lastDeletedItem = null;
			lastDeletedCollection = null;
			lastDeletedSource = null;

			if (editingPurchaseId === purchase.id) resetPurchaseForm();

			renderPurchases();
			toast(`Compra registrada: R$ ${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}.`, true);
			return;
		}

		const editButton = event.target.closest("[data-purchase-edit]");
		if (editButton) {
			const d = moduleData();
			const purchase = d.compras.find((x) => x.id === editButton.dataset.purchaseEdit);
			if (!purchase) return;

			editingPurchaseId = purchase.id;
			form.hidden = false;
			form.item.value = purchase.item || "";
			form.prioridade.value = purchase.prioridade || "Média";
			form.quantidade.value = Number(purchase.quantidade) || 1;
			form.categoria.value = purchase.categoria || "";
			form.obs.value = purchase.obs || "";
			if (cancelBtn) cancelBtn.textContent = "Cancelar edição";
			if (submitBtn) submitBtn.textContent = "Salvar alterações";
			form.scrollIntoView({ behavior: "smooth", block: "nearest" });
			return;
		}

		const deleteButton = event.target.closest("[data-purchase-delete]");
		if (deleteButton) {
			const d = moduleData();
			const purchase = d.compras.find((x) => x.id === deleteButton.dataset.purchaseDelete);
			if (!purchase) return;

			lastDeletedItem = purchase;
			lastDeletedCollection = "compras";
			lastDeletedSource = "modulo";
			lastPurchaseUndo = null;

			d.compras = d.compras.filter((x) => x.id !== purchase.id);
			TIHub.save(d);

			if (editingPurchaseId === purchase.id) resetPurchaseForm();

			renderPurchases();
			toast("Item excluído da lista.", true);
		}
	});
}

/* =========================================================================
   16. IMPRESSORAS (impressoras.html)
	========================================================================= */
function renderPrinters() {
	const d = moduleData();
	const body = document.getElementById("printerRows");

	if (!body) {
		return;
	}

	const impressoras = Array.isArray(d.impressoras) ? d.impressoras : [];

	body.innerHTML = impressoras.length
		? impressoras
				.map(
					(printer) => `
            <tr>
                <td>
                <strong>${TIHub.esc(printer.setor || "")}</strong>
                </td>

                <td>
                ${TIHub.esc(printer.marca || "—")}
                </td>

                <td>
                ${TIHub.esc(printer.modelo || "")}
                </td>

                <td>
                <code>${TIHub.esc(printer.ip || "")}</code>
                </td>

                <td>
                <code>${TIHub.esc(printer.numeroSerie || "—")}</code>
                </td>

                <td>
                <div class="row-actions">
                    <button
                    class="mini"
                    type="button"
                    title="Editar"
                    onclick="editPrinter('${TIHub.esc(printer.id)}')">
                    <i class="ti ti-pencil"></i>
                    </button>

                    <button
                    class="danger-mini"
                    type="button"
                    title="Excluir"
                    onclick="deletePrinter('${TIHub.esc(printer.id)}')">
                    <i class="ti ti-trash-x"></i>
                    </button>
                </div>
                </td>
            </tr>
            `,
				)
				.join("")
		: `
        <tr>
            <td
            class="empty-row"
            colspan="6">
            Nenhuma impressora cadastrada.
            </td>
        </tr>
        `;
}

function cancelarEdicaoPrinter(form) {
	editingPrinterId = null;

	form.reset();
	form.hidden = true;

	const botaoPrincipal = document.getElementById("togglePrinterForm");

	if (botaoPrincipal) {
		botaoPrincipal.innerHTML = '<i class="ti ti-plus"></i> Cadastrar impressora';
	}

	document.getElementById("cancelEditPrinter")?.classList.add("hidden");
}

function initPrinters() {
	renderPrinters();

	const form = document.getElementById("formPrinter");

	if (!form) {
		console.error("Formulário #formPrinter não encontrado.");
		return;
	}

	form.addEventListener("submit", (event) => {
		event.preventDefault();

		const d = moduleData();

		const payload = { setor: form.setor.value.trim(), marca: form.marca.value.trim(), modelo: form.modelo.value.trim(), ip: form.ip.value.trim(), numeroSerie: form.numeroSerie.value.trim() };

		if (!payload.setor || !payload.marca || !payload.modelo || !payload.ip || !payload.numeroSerie) {
			toast("Preencha setor, marca, modelo, IP e número de série.");
			return;
		}

		if (editingPrinterId) {
			const index = d.impressoras.findIndex((printer) => printer.id === editingPrinterId);

			if (index >= 0) {
				d.impressoras[index] = { ...d.impressoras[index], ...payload };
			}
		} else {
			d.impressoras.unshift({ id: TIHub.uid("imp"), ...payload });
		}

		TIHub.save(d);

		const estavaEditando = Boolean(editingPrinterId);

		cancelarEdicaoPrinter(form);
		renderPrinters();

		toast(estavaEditando ? "Impressora atualizada." : "Impressora cadastrada.");
	});

	document.getElementById("togglePrinterForm")?.addEventListener("click", () => {
		if (!form.hidden) {
			cancelarEdicaoPrinter(form);
			return;
		}

		editingPrinterId = null;
		form.reset();

		document.getElementById("cancelEditPrinter")?.classList.add("hidden");

		const botaoPrincipal = document.getElementById("togglePrinterForm");

		if (botaoPrincipal) {
			botaoPrincipal.innerHTML = '<i class="ti ti-plus"></i> Cadastrar impressora';
		}

		form.hidden = false;
		form.setor.focus();
	});

	document.getElementById("cancelEditPrinter")?.addEventListener("click", () => {
		cancelarEdicaoPrinter(form);
	});
}

window.editPrinter = function (id) {
	const d = moduleData();

	const printer = d.impressoras.find((item) => item.id === id);

	if (!printer) {
		return;
	}

	const form = document.getElementById("formPrinter");

	if (!form) {
		return;
	}

	editingPrinterId = id;

	form.hidden = false;

	form.setor.value = printer.setor || "";
	form.marca.value = printer.marca || "";
	form.modelo.value = printer.modelo || "";
	form.ip.value = printer.ip || "";
	form.numeroSerie.value = printer.numeroSerie || "";

	document.getElementById("cancelEditPrinter")?.classList.remove("hidden");

	const botaoPrincipal = document.getElementById("togglePrinterForm");

	if (botaoPrincipal) {
		botaoPrincipal.innerHTML = '<i class="ti ti-device-floppy"></i> Salvar edição';
	}

	form.scrollIntoView({ behavior: "smooth", block: "start" });

	form.setor.focus();
};

window.deletePrinter = function (id) {
	const d = moduleData();

	const printer = d.impressoras.find((item) => item.id === id);

	if (!printer) {
		console.warn("Impressora não encontrada para exclusão:", id);
		return;
	}

	lastDeletedItem = { ...printer };

	lastDeletedCollection = "impressoras";
	lastDeletedSource = "modulo";

	d.impressoras = d.impressoras.filter((item) => item.id !== id);

	TIHub.save(d);

	if (editingPrinterId === id) {
		const form = document.getElementById("formPrinter");

		editingPrinterId = null;

		if (form) {
			cancelarEdicaoPrinter(form);
		}
	}

	renderPrinters();

	toast("Impressora excluída.", true);
};

/* =========================================================================
   17. CHAMADOS (chamados.html) — somente leitura
	========================================================================= */
function renderTickets() {
	const d = moduleData(),
		body = document.getElementById("ticketRows");
	if (body)
		body.innerHTML = d.chamados
			.map(
				(x) => `
		<tr>
			<td><strong>${TIHub.esc(x.id)}</strong></td>
			<td>${TIHub.esc(x.solicitante)}</td>
			<td>${TIHub.esc(x.assunto)}</td>
			<td>${TIHub.pill(x.prioridade)}</td>
			<td>${TIHub.esc(x.responsavel)}</td>
			<td>${TIHub.pill(x.status)}</td>
			<td>${TIHub.esc(x.data)}</td>
		</tr>`,
			)
			.join("");
}

/* =========================================================================
   18. ORÇAMENTO (orcamento.html)
	========================================================================= */
function renderBudget() {
	const d = moduleData(),
		body = document.getElementById("expenseRows"),
		total = Number(document.getElementById("budgetTotal")?.dataset.total || 100000),
		spent = d.gastos.reduce((a, x) => a + x.valor, 0),
		balance = total - spent;
	document.getElementById("budgetSpent") && (document.getElementById("budgetSpent").textContent = spent.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
	document.getElementById("budgetBalance") && (document.getElementById("budgetBalance").textContent = balance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
	document.getElementById("budgetBar") && (document.getElementById("budgetBar").style.width = Math.min(100, (spent / total) * 100) + "%");
	if (body) body.innerHTML = d.gastos.map((x) => `<tr><td><strong>${TIHub.esc(x.descricao)}</strong></td><td>${TIHub.esc(x.categoria)}</td><td>${TIHub.esc(x.data)}</td><td>${x.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td></tr>`).join("");
}
function initBudget() {
	renderBudget();
	document.getElementById("formExpense")?.addEventListener("submit", (e) => {
		e.preventDefault();
		const d = moduleData(),
			f = e.target;
		d.gastos.unshift({ id: TIHub.uid("exp"), descricao: f.descricao.value.trim(), categoria: f.categoria.value.trim(), valor: Number(f.valor.value), data: f.data.value ? new Date(f.data.value + "T00:00:00").toLocaleDateString("pt-BR") : new Date().toLocaleDateString("pt-BR") });
		TIHub.save(d);
		f.reset();
		renderBudget();
	});
}

/* =========================================================================
   19. PROJETOS (projetos.html)
	========================================================================= */
function renderProjects() {
	const d = moduleData(),
		el = document.getElementById("kanban");
	if (!el) return;
	const cols = ["Backlog", "Em andamento", "Em validação", "Concluído"];
	el.innerHTML = cols
		.map(
			(c) =>
				`<section class="kanban-col"><h3>${c}<span>${d.projetos.filter((x) => x.coluna === c).length}</span></h3>${d.projetos
					.filter((x) => x.coluna === c)
					.map((x) => `<article class="kanban-card"><strong>${TIHub.esc(x.titulo)}</strong><p>${TIHub.esc(x.detalhe)}</p><footer><span>${TIHub.esc(x.responsavel)}</span><span>Trello</span></footer></article>`)
					.join("")}</section>`,
		)
		.join("");
}

/* =========================================================================
   20. TUTORIAIS (tutoriais.html)
	========================================================================= */
function renderTutorials() {
	const d = moduleData(),
		el = document.getElementById("tutorialGrid");
	if (el)
		el.innerHTML = d.tutoriais
			.map(
				(x) => `
	<article class="tutorial-card">
	<span class="status-pill status-atendimento">${TIHub.esc(x.categoria)}</span>
		<h3>${TIHub.esc(x.titulo)}</h3>
		<p>${TIHub.esc(x.descrição)}</p>

		<footer>
			<div class="tutorial-actions">
				<thead>
					<tr>
						<th><a class="tutorial-file" href="tutoriais.html#${x.id}" title="Abrir tutorial" data-tutorial-open="${x.id}"><i class="ti ti-file"></i></a></th>
						<th><button class="edit-tutorial" type="button" title="Editar tutorial" data-tutorial-edit="${x.id}"><i class="ti ti-pencil"></i></button></th>
						<th><button class="delete-tutorial" type="button" title="Excluir tutorial" data-tutorial-delete="${x.id}"><i class="ti ti-trash-x"></i></button></th>						
					</tr>
				</thead>
			</div>
		</footer>
	</article>`,
			)
			.join("");
}
function initTutorials() {
	renderTutorials();
	const form = document.getElementById("formTutorial");
	if (!form) return;

	const cancelBtn = document.getElementById("cancelTutorial");
	const submitBtn = document.getElementById("submitTutorial");

	function resetTutorialForm() {
		editingTutorialId = null;
		form.reset();
		form.hidden = true;
		if (cancelBtn) cancelBtn.textContent = "Cancelar";
		if (submitBtn) submitBtn.textContent = "Adicionar tutorial";
	}

	form.addEventListener("submit", (event) => {
		event.preventDefault();
		const d = moduleData();
		const payload = { titulo: form.titulo.value.trim(), categoria: form.categoria.value, descrição: form.descrição.value.trim() };
		if (!payload.titulo || !payload.categoria || !payload.descrição) return;

		if (editingTutorialId) {
			const index = d.tutoriais.findIndex((x) => x.id === editingTutorialId);
			if (index >= 0) d.tutoriais[index] = { ...d.tutoriais[index], ...payload };
		} else {
			d.tutoriais.unshift({ id: TIHub.uid("tut"), ...payload });
		}

		TIHub.save(d);
		resetTutorialForm();
		renderTutorials();
	});

	document.getElementById("toggleTutorialForm")?.addEventListener("click", () => {
		const wasHidden = form.hidden;
		resetTutorialForm();
		form.hidden = !wasHidden;
		if (!form.hidden) form.item.focus();
	});

	cancelBtn?.addEventListener("click", resetTutorialForm);

	document.getElementById("formTutorial")?.addEventListener("submit", (e) => {
		e.preventDefault();
		const d = moduleData(),
			f = e.target;
		d.tutoriais.unshift({ id: TIHub.uid("tut"), titulo: f.titulo.value.trim(), categoria: f.categoria.value, descrição: f.descrição.value.trim() });
		TIHub.save(d);
		f.reset();
		renderTutorials();
	});
}

/* =========================================================================
   21. INICIALIZAÇÃO POR PÁGINA + SINCRONIZAÇÃO AUTOMÁTICA
   -------------------------------------------------------------------------
   Cada página só liga os eventos que lhe dizem respeito, com base no
   atributo data-page do <body>. É isto que garante que o código de
   notebooks.html (antigo script.js) não tente rodar em elementos que não
   existem nas demais páginas, e vice-versa.

   ATENÇÃO: carregarDados() (que preenche state.notebooks/suporte/alunos/
   termos e mexe em elementos exclusivos de notebooks.html) NÃO é mais
   chamada aqui incondicionalmente - antes disso quebrava a inicialização
   de todas as outras páginas (erro de JS ao tentar ler um elemento que
   não existe), impedindo que initEstoque()/initPurchases()/initPrinters()
   etc. rodassem. Ela continua sendo chamada normalmente dentro de
   initNotebooks(), só na página de Notebooks.
	========================================================================= */

// Re-renderiza a página atual a partir dos dados (já atualizados em
// localStorage) sem religar formulários nem resetar campos em edição.
function renderPaginaAtual() {
	const p = document.body.dataset.page;
	if (p === "dashboard") renderDashboard();
	if (p === "senhas") renderPasswords();
	if (p === "notebooks") {
		renderGrouped();
		renderSuporte();
		renderAlunos();
		renderListaModelos();
		renderListaSetores();
		if (typeof renderTermos === "function") renderTermos();
	}
	if (p === "estoque") renderEstoque();
	if (p === "compras") renderPurchases();
	if (p === "impressoras") renderPrinters();
	if (p === "chamados") renderTickets();
	if (p === "orcamento") renderBudget();
	if (p === "projetos") renderProjects();
	if (p === "tutoriais") renderTutorials();
}

// Busca o estado mais recente salvo por QUALQUER usuário no servidor
// compartilhado (192.168.20.29:5050 / "ti-hub/") e atualiza a tela sem
// precisar recarregar a página.
async function sincronizarComServidor() {
	// Se algum salvamento ainda está em andamento (POST não terminou),
	// não busca dados do servidor agora: a resposta ainda seria a de
	// ANTES desse salvamento e apagaria da tela o que acabou de ser
	// adicionado/editado. O próximo ciclo (5s depois) já pega o dado certo.
	if (escritasPendentesNoServidor > 0) return;

	await syncSharedStateFromServer();

	// Na página de Notebooks o estado fica na variável `state` (não é lido
	// direto do localStorage no render), então precisa ser recarregado.
	if (document.body.dataset.page === "notebooks") {
		const ls = JSON.parse(localStorage.getItem("monitoramento-ti") || "null");
		if (ls) {
			state.notebooks = Array.isArray(ls.notebooks) ? ls.notebooks : [];
			state.suporte = Array.isArray(ls.suporte) ? ls.suporte : [];
			state.alunos = Array.isArray(ls.alunos) ? ls.alunos : [];
			state.termos = Array.isArray(ls.termos) ? ls.termos : [];
		}
	}

	renderPaginaAtual();
}

// A cada 5s, busca o que outros usuários salvaram e atualiza a tela -
// assim qualquer pessoa acessando 192.168.20.29:5050 (ou "ti-hub/") vê,
// em poucos segundos, as mudanças feitas por qualquer outra pessoa, sem
// precisar dar F5.
const INTERVALO_SINCRONIZACAO_MS = 5000;
function iniciarSincronizacaoAutomatica() {
	setInterval(() => {
		sincronizarComServidor().catch((error) => console.error("Erro na sincronização automática:", error));
	}, INTERVALO_SINCRONIZACAO_MS);
}

document.addEventListener("DOMContentLoaded", async () => {
	await syncSharedStateFromServer();
	const p = document.body.dataset.page;
	if (p === "dashboard") renderDashboard();
	if (p === "senhas") initPasswords();
	if (p === "notebooks") initNotebooks();
	if (p === "estoque") {
		renderEstoque();
		initEstoque();
	}
	if (p === "compras") {
		renderPurchases();
		initPurchases();
	}
	if (p === "impressoras") initPrinters();
	if (p === "chamados") renderTickets();
	if (p === "orcamento") initBudget();
	if (p === "projetos") renderProjects();
	if (p === "tutoriais") initTutorials();

	iniciarSincronizacaoAutomatica();
});
