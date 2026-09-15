const state = { notebooks: [], suporte: [], alunos: [] };

let editingNbId = null;
let editingSupId = null;
let editingAluId = null;

// Controle da ordenação por data de aquisição.
// A primeira vez que clicar, ficará em ordem crescente.
// Ao clicar novamente, alternará para decrescente.
const ordenacaoData = {
  'em-uso': 'crescente',
  'devolvido': 'crescente',
  'danificado': 'crescente',
  'devolucao-devolvido': 'crescente',
  'devolucao-danificado': 'crescente'
};

// SELECIONAR SETOR & MODELO DE NOTEBOOK /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
const ordemModelos = [
  'Dell Latitude 3540',
  'Dell Vostro 3510',
  'Dell Pro 16 PC16250',
  'Dell Alienware 16 Aurora AC16250'
];

const ordemSetores = [
  'Almoxarifado',
  'Comunicação',
  'Compras',
  'Consultório',
  'Departamento Pessoal',
  'Disciplina',
  'Enchaminhamento',
  'Financeiro',
  'Gerência',
  'Jurídico',
  'Pedagógico',
  'Projetos',
  'Psicologia',
  'Secretaria',
  'Sec. Executiva',
  'Serviço Social',
  'TI'
];

function obterModelosCadastrados() {
  const modelosExistentes = [
    ...state.notebooks.map(n => n.modelo),
    ...state.alunos.map(a => a.modelo),
    ...state.suporte.map(s => s.modelo)
  ]
    .map(modelo => String(modelo || '').trim())
    .filter(Boolean);

  const todosModelos = [
    ...ordemModelos,
    ...modelosExistentes
  ];

  return todosModelos.filter((modelo, index, lista) => {
    return lista.indexOf(modelo) === index;
  });
}

function obterSetoresCadastrados() {
  const setoresExistentes = state.notebooks
    .map(n => n.setor)
    .map(setor => String(setor || '').trim())
    .filter(Boolean);

  const todosSetores = [
    ...ordemSetores,
    ...setoresExistentes
  ];

  return todosSetores.filter((setor, index, lista) => {
    return lista.indexOf(setor) === index;
  });
}

function fecharTodasListas() {
  document.querySelectorAll(
    '.lista-modelos, .lista-setores'
  ).forEach(lista => {
    lista.classList.remove('aberta');
  });

  document.querySelectorAll(
    '.toggle-modelos, .toggle-setores'
  ).forEach(botao => {
    botao.classList.remove('active');
  });
}

function configurarToggleModelos() {
  document.querySelectorAll('.toggle-modelos').forEach(botao => {
    botao.addEventListener('click', event => {
      event.stopPropagation();

      const inputId = botao.dataset.input;
      const lista = document.querySelector(
        `.lista-modelos[data-lista-para="${inputId}"]`
      );

      if (!lista) return;

      const estavaAberta = lista.classList.contains('aberta');

      fecharTodasListas();

      if (!estavaAberta) {
        renderListaModelos();
        lista.classList.add('aberta');
        botao.classList.add('active');
      }
    });
  });

  document.querySelectorAll('.lista-modelos').forEach(lista => {
    lista.addEventListener('click', event => {
      const item = event.target.closest('.item-modelo');

      if (!item) return;

      const inputId = lista.dataset.listaPara;
      const input = document.getElementById(inputId);

      if (!input) return;

      input.value = item.dataset.modelo;
      fecharTodasListas();
      input.focus();
    });
  });

  document.addEventListener('click', event => {
    if (!event.target.closest('.modelo-toggle')) {
      fecharTodasListas();
    }
  });
}

function configurarToggleSetores() {
  document.querySelectorAll('.toggle-setores').forEach(botao => {
    botao.addEventListener('click', event => {
      event.stopPropagation();

      const inputId = botao.dataset.input;

      const lista = document.querySelector(
        `.lista-setores[data-lista-para="${inputId}"]`
      );

      if (!lista) {
        console.error(`Lista de setores não encontrada para: ${inputId}`);
        return;
      }

      const estavaAberta = lista.classList.contains('aberta');

      fecharTodasListas();

      if (!estavaAberta) {
        renderListaSetores();
        lista.classList.add('aberta');
        botao.classList.add('active');
      }
    });
  });

  document.querySelectorAll('.lista-setores').forEach(lista => {
    lista.addEventListener('click', event => {
      const item = event.target.closest('.item-setor');

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
  document.addEventListener('click', event => {
    if (!event.target.closest('.modelo-toggle, .setor-toggle')) {
      fecharTodasListas();
    }
  });
}

document.querySelectorAll('.modelo-toggle input').forEach(input => {
  input.addEventListener('input', () => {
    const lista = document.querySelector(
      `.lista-modelos[data-lista-para="${input.id}"]`
    );

    if (!lista.classList.contains('aberta')) return;

    const texto = input.value.toLowerCase().trim();

    lista.querySelectorAll('.item-modelo').forEach(item => {
      const modelo = item.textContent.toLowerCase();
      item.style.display = modelo.includes(texto) ? 'block' : 'none';
    });
  });
});

function renderListaModelos() {
  const modelos = obterModelosCadastrados();

  document.querySelectorAll('.lista-modelos').forEach(lista => {
    lista.innerHTML = modelos.length
      ? modelos.map(modelo => `
          <button
            type="button"
            class="item-modelo"
            data-modelo="${escapeHtml(modelo)}"
          >
            ${escapeHtml(modelo)}
          </button>
        `).join('')
      : `
        <div class="lista-modelos-vazia">
          Nenhum modelo cadastrado.
        </div>
      `;
  });
}

function renderListaSetores() {
  const setores = obterSetoresCadastrados();

  document.querySelectorAll('.lista-setores').forEach(lista => {
    lista.innerHTML = setores.length
      ? setores.map(setor => `
          <button
            type="button"
            class="item-setor"
            data-setor="${escapeHtml(setor)}"
          >
            ${escapeHtml(setor)}
          </button>
        `).join('')
      : `
        <div class="lista-setores-vazia">
          Nenhum setor cadastrado.
        </div>
      `;
  });
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

const uid = () => 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
const fmtDate = (iso) => iso ? new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR') : '—';

function ordenarPorData(lista, campo, ordem) {
  return [...lista].sort((a, b) => {
    const dataA = a[campo]
      ? new Date(`${a[campo]}T00:00:00`).getTime()
      : 0;

    const dataB = b[campo]
      ? new Date(`${b[campo]}T00:00:00`).getTime()
      : 0;

    // Registros sem data ficam no final.
    if (!dataA && !dataB) return 0;
    if (!dataA) return 1;
    if (!dataB) return -1;

    return ordem === 'crescente'
      ? dataA - dataB
      : dataB - dataA;
  });
}

// Escapa caracteres especiais para evitar XSS
function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

// Sincroniza campos do formulário de registro de notebooks
function syncRegistroFields() {
  const registro = document.getElementById('nb-registro').value;
  const tipoDev = document.getElementById('nb-tipo-devolucao').value;
  document.getElementById('field-devolucao-tipo').classList.toggle('hidden', registro !== 'devolucao');
  document.getElementById('field-defeito').classList.toggle('hidden', !(registro === 'devolucao' && tipoDev === 'com-defeito'));
}

// Renderiza estatísticas de notebooks, suporte e alunos
function renderStats() {
  const emUso = state.notebooks.filter(n => n.categoria === 'em-uso').length;
  const devolvido = state.notebooks.filter(n => n.categoria === 'devolvido').length;
  const danificados = state.notebooks.filter(n => n.categoria === 'danificado').length;
  document.getElementById('s-uso').textContent = emUso;
  document.getElementById('s-devolvido').textContent = devolvido;
  document.getElementById('s-defeito').textContent = danificados;
  document.getElementById('countNb').textContent = emUso;
  document.getElementById('countSup').textContent = state.suporte.length;
  document.getElementById('countAlu').textContent = state.alunos.length;
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// NOTEBOOKS COLABORADORES 
function renderGrouped() {
  const emUso = ordenarPorData(state.notebooks.filter(n => n.categoria === 'em-uso'),'aquisicao',ordenacaoData['em-uso']);
  const devolvidoBase = state.notebooks.filter(n => n.categoria === 'devolvido');
  const danificadoBase = state.notebooks.filter(n => n.categoria === 'danificado');
  const devolvido = ordenarPorData(devolvidoBase,'aquisicao',ordenacaoData.devolvido);
  const danificado = ordenarPorData(danificadoBase,'aquisicao',ordenacaoData.danificado);

  // Aplica filtros aos dados
  const emUsoFiltrado = aplicarFiltrosDados(emUso, 'em-uso');
  const devolvidoFiltrado = aplicarFiltrosDados(devolvido, 'devolvido');
  const danificadoFiltrado = aplicarFiltrosDados(danificado, 'danificado');

  // EM USO
  document.getElementById('bodyEmUso').innerHTML = emUsoFiltrado.map(n => `
    <tr>
      <td><div class="model">${escapeHtml(n.modelo)}</div><span class="serial">${escapeHtml(n.patrimonio)}</span></td>
      <td><div class="model">${escapeHtml(n.colaborador)}</div><span class="serial">${escapeHtml(n.setor)}</span></td>
      <td><span class="date">${fmtDate(n.aquisicao)}</span></td>
      <td></td>
      <td><div class="row-actions">
        <button class="mini" onclick="editNotebook('${n.id}')"><i class="ti ti-pencil"></i></button>
        <button class="danger-mini" onclick="deleteNotebook('${n.id}')"><i class="ti ti-trash-x"></i></button>
      </div></td>
    </tr>`).join('');

  // DEVOLVIDO
  document.getElementById('bodyDevolvido').innerHTML = devolvidoFiltrado.map(n => `
    <tr>
      <td><div class="model">${escapeHtml(n.modelo)}</div><span class="serial">${escapeHtml(n.patrimonio)}</span></td>
      <td><div class="model">${escapeHtml(n.colaborador)}</div><span class="serial">${escapeHtml(n.setor)}</span></td>
      <td><span class="date">${fmtDate(n.aquisicao)}</span></td>
      <td><span class="date">${fmtDate(n.devolucao)}</span></td>
      <td></td>
      <td><div class="row-actions">
        <button class="mini" onclick="editNotebook('${n.id}')"><i class="ti ti-pencil"></i></button>
        <button class="danger-mini" onclick="deleteNotebook('${n.id}')"><i class="ti ti-trash-x"></i></button>
      </div></td>
    </tr>`).join('');

  // DANIFICADO
  document.getElementById('bodyDanificado').innerHTML = danificadoFiltrado.map(n => `
    <tr>
      <td><div class="model">${escapeHtml(n.modelo)}</div><span class="serial">${escapeHtml(n.patrimonio)}</span></td>
      <td><div class="model">${escapeHtml(n.colaborador)}</div><span class="serial">${escapeHtml(n.setor)}</span></td>
      <td><span class="date">${fmtDate(n.aquisicao)}</span></td>
      <td><span class="date">${fmtDate(n.devolucao)}</span></td>
      <td><span class="badge warn">${escapeHtml(n.defeito)}</span></td>
      <td><div class="row-actions">
        <button class="mini" onclick="editNotebook('${n.id}')"><i class="ti ti-pencil"></i></button>
        <button class="danger-mini" onclick="deleteNotebook('${n.id}')"><i class="ti ti-trash-x"></i></button>
      </div></td>
    </tr>`).join('');

  // Atualiza mensagens de vazio
  document.getElementById('emptyUso').style.display = emUsoFiltrado.length ? 'none' : 'block';
  document.getElementById('emptyDevolvido').style.display = devolvidoFiltrado.length ? 'none' : 'block';
  document.getElementById('emptyDanificado').style.display = danificadoFiltrado.length ? 'none' : 'block';

  // Atualiza dropdowns de filtro
  atualizarDropdownsFiltro('em-uso');
  atualizarDropdownsFiltro('devolvido');
  atualizarDropdownsFiltro('danificado');
}

// SUPORTE
function renderSuporte() {
  const body = document.getElementById('bodySuporte');
  const empty = document.getElementById('emptySup');
  if (!state.suporte.length) {
    body.innerHTML = '';
    empty.style.display = 'block';
    renderStats();
    return;
  }
  empty.style.display = 'none';
  body.innerHTML = state.suporte.map(s => `
    <tr>
      <td><div class="model">${escapeHtml(s.modelo)}</div><span class="serial">${escapeHtml(s.patrimonio)}</span></td>
      <td><span class="support-loc"><i class="ti ti-map-pin"></i> ${escapeHtml(s.local)}</span></td>
      <td><div class="row-actions">
        <button class="mini" onclick="editSuporte('${s.id}')"><i class="ti ti-pencil"></i></button>
        <button class="danger-mini" onclick="deleteSuporte('${s.id}')"><i class="ti ti-trash-x"></i></button>
      </div></td>
    </tr>`).join('');
  renderStats();
}

// ALUNOS
function renderAlunos() {
  const body = document.getElementById('bodyAlunos');
  const empty = document.getElementById('emptyAlu');
  if (!state.alunos.length) {
    body.innerHTML = '';
    empty.style.display = 'block';
    renderStats();
    return;
  }
  empty.style.display = 'none';
  body.innerHTML = state.alunos.map(a => `
    <tr>
      <td><div class="model">${escapeHtml(a.modelo)}</div><span class="serial">${escapeHtml(a.patrimonio)}</span></td>
      <td>${escapeHtml(a.sala)}</td>
      <td>${escapeHtml(a.trava)}</td>
      <td><div class="row-actions">
        <button class="mini" onclick="editAluno('${a.id}')"><i class="ti ti-pencil"></i></button>
        <button class="danger-mini" onclick="deleteAluno('${a.id}')"><i class="ti ti-trash-x"></i></button>
      </div></td>
    </tr>`).join('');
  renderStats();
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// SALVAR NOTEBOOKS //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
function saveNotebookRecord(payload) {
  const sameSerialIndex = state.notebooks.findIndex(n => n.patrimonio === payload.patrimonio && n.id !== payload.id);
  if (sameSerialIndex >= 0) {
    const antigo = state.notebooks[sameSerialIndex];
    state.notebooks.splice(sameSerialIndex, 1);
    payload.id = antigo.id;
  }
  const idx = state.notebooks.findIndex(n => n.id === payload.id);
  if (idx >= 0) state.notebooks[idx] = payload;
  else state.notebooks.unshift(payload);
}

// SALVAR DADOS
async function salvarTudo() {
  const payload = { notebooks: state.notebooks, suporte: state.suporte, alunos: state.alunos };
  localStorage.setItem('monitoramento-ti', JSON.stringify(payload));
  try {
    await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store'
    });
  } catch (e) {
    console.error(e);
  }
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// CARREGAR DADOS ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
async function carregarDados() {
  try {
    const resp = await fetch('/api/data', { cache: 'no-store' });
    if (!resp.ok) throw new Error('GET failed');
    const data = await resp.json();
    const ls = JSON.parse(localStorage.getItem('monitoramento-ti') || 'null');
    const source = (data && (data.notebooks?.length || data.suporte?.length || data.alunos?.length)) ? data : ls;
    if (source) {
      state.notebooks = Array.isArray(source.notebooks) ? source.notebooks : [];
      state.suporte = Array.isArray(source.suporte) ? source.suporte : [];
      state.alunos = Array.isArray(source.alunos) ? source.alunos : [];
    }
  } catch (e) {
    const ls = JSON.parse(localStorage.getItem('monitoramento-ti') || 'null');
    if (ls) {
      state.notebooks = Array.isArray(ls.notebooks) ? ls.notebooks : [];
      state.suporte = Array.isArray(ls.suporte) ? ls.suporte : [];
      state.alunos = Array.isArray(ls.alunos) ? ls.alunos : [];
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
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// RELATÓRIOS ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Em uso //
function exportarEmUsoPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4');

  const emUso = aplicarFiltrosDados(
    ordenarPorData(state.notebooks.filter(n => n.categoria === 'em-uso'), 'aquisicao', ordenacaoData['em-uso']),'em-uso');

  // Título
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Relatório de Notebooks em Uso', 105, 20, { align: 'center' });

  // Data
  const hoje = new Date();
  const dataFormatada = hoje.toLocaleDateString('pt-BR', { 
    year: 'numeric', 
    month: 'numeric', 
    day: 'numeric' 
  });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100)
  doc.text(`Data de emissão: ${dataFormatada}`, 105, 30, { align: 'center' });

  // Preparar dados da tabela
  const tableData = emUso.map(n => [
    n.modelo,
    n.patrimonio,
    n.colaborador,
    fmtDate(n.aquisicao),
    'Em uso'
  ]);

  // Gerar tabela
  doc.setFont('helvetica', 'sans-serif', 'bold')
  doc.autoTable({
    startY: 40,
    head: [['Equipamento', 'Patrimônio', 'Colaborador(a)', 'Data de aquisição']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [109, 183, 255], textColor: 0, halign:'center' },
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 'auto', halign: 'center' },
      1: { cellWidth: 'auto', halign: 'center' },
      2: { cellWidth: 'auto', halign: 'center' },
      3: { cellWidth: 'auto', halign: 'center' }
    }
  });

  // Rodapé
  const finalY = doc.lastAutoTable.finalY || 40;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100);
  doc.text('Relatório gerado automaticamente pelo sistema de monitoramento de notebooks.', 105, finalY + 15, { align: 'center' });

  // Salvar
  doc.save(`relatorio-em-uso-${hoje.toISOString().slice(0,10)}.pdf`);
}

// Devolvidos //
function exportarDevolvidoPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4');

  const devolvidos = aplicarFiltrosDados(
    ordenarPorData(state.notebooks.filter(n => n.categoria === 'devolvido'), 'aquisicao', ordenacaoData.devolvido),'devolvido');

  // Título
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Relatório de Notebooks Devolvidos', 105, 20, { align: 'center' });

  // Data
  const hoje = new Date();
  const dataFormatada = hoje.toLocaleDateString('pt-BR', { 
    year: 'numeric', 
    month: 'numeric', 
    day: 'numeric' 
  });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Data de emissão: ${dataFormatada}`, 105, 30, { align: 'center' });

  // Preparar dados da tabela
  const tableData = devolvidos.map(n => [
    n.modelo,
    n.patrimonio,
    n.colaborador,
    fmtDate(n.aquisicao),
    fmtDate(n.devolucao),
  ]);

  // Gerar tabela
  doc.autoTable({
    startY: 40,
    head: [['Equipamento', 'Patrimônio', 'Colaborador(a)', 'Data de aquisição', 'Data devolução']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [65, 214, 176], textColor: 0, fontStyle: 'bold', halign: 'center' },
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 'auto', halign: 'center' },
      1: { cellWidth: 'auto', halign: 'center' },
      2: { cellWidth: 'auto', halign: 'center' },
      3: { cellWidth: 'auto', halign: 'center' },
      4: { cellWidth: 'auto', halign: 'center' }
    }
  });

  // Rodapé
  const finalY = doc.lastAutoTable.finalY || 40;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100);
  doc.text('Relatório gerado automaticamente pelo sistema de monitoramento de notebooks.', 105, finalY + 15, { align: 'center' });

  // Salvar
  doc.save(`relatorio-devolvidos-${hoje.toISOString().slice(0,10)}.pdf`);
}

// Danificados //
function exportarDanificadoPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4');

  const danificados = aplicarFiltrosDados(
    ordenarPorData(state.notebooks.filter(n => n.categoria === 'danificado'), 'aquisicao', ordenacaoData.danificado),'danificado');

  // Título
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Relatório de Notebooks Danificados', 105, 20, { align: 'center' });

  // Data
  const hoje = new Date();
  const dataFormatada = hoje.toLocaleDateString('pt-BR', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Data de emissão: ${dataFormatada}`, 105, 30, { align: 'center' });

  // Preparar dados da tabela
  const tableData = danificados.map(n => [
    n.modelo,
    n.patrimonio,
    n.colaborador,
    fmtDate(n.aquisicao),
    fmtDate(n.devolucao),
    n.defeito,
    'Danificado'
  ]);

  // Gerar tabela
  doc.autoTable({
    startY: 40,
    head: [['Equipamento', 'Patrimînio', 'Colaborador(a)', 'Data aquisição', 'Data devolução', 'Defeito']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [239, 122, 114], textColor: 0, fontStyle: 'bold', halign:'center' },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 'auto', halign: 'center' },
      1: { cellWidth: 'auto', halign: 'center' },
      2: { cellWidth: 'auto', halign: 'center' },
      3: { cellWidth: 'auto', halign: 'center' },
      4: { cellWidth: 'auto', halign: 'center' },
      5: { cellWidth: 'auto', halign: 'center' },
      6: { cellWidth: 'auto', halign: 'center' }
    }
  });

  // Rodapé
  const finalY = doc.lastAutoTable.finalY || 40;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100);
  doc.text('Relatório gerado automaticamente pelo sistema de monitoramento de notebooks.', 105, finalY + 15, { align: 'center' });

  // Salvar
  doc.save(`relatorio-danificados-${hoje.toISOString().slice(0,10)}.pdf`);
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// TABS //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
document.querySelectorAll('.tab').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// NOTEBOOKS COLABORADORES - REGISTRO ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
document.getElementById('nb-registro').addEventListener('change', syncRegistroFields);
document.getElementById('nb-tipo-devolucao').addEventListener('change', syncRegistroFields);

document.getElementById('formNotebook').addEventListener('submit', async (e) => {
  e.preventDefault();
  const registro = document.getElementById('nb-registro').value;
  const tipoDevolucao = document.getElementById('nb-tipo-devolucao').value;
  const dataInformada = document.getElementById('nb-data').value;
  const patrimonioInformado = document.getElementById('nb-patrimonio').value.trim();
  const notebookExistente = state.notebooks.find(n =>
    n.id === editingNbId || n.patrimonio === patrimonioInformado
  );

  const payload = {
    // Create or update notebook record
    id: editingNbId || uid(),
    modelo: document.getElementById('nb-modelo').value.trim(),
    patrimonio: document.getElementById('nb-patrimonio').value.trim(),
    colaborador: document.getElementById('nb-colaborador').value.trim(),
    setor: document.getElementById('nb-setor').value.trim(),
    // Ao editar, mantém a data original de aquisição.
    // Somente um novo cadastro de aquisição recebe a data informada.
    aquisicao: registro === 'aquisicao'? dataInformada: (notebookExistente?.aquisicao || ''),
    // A data informada passa a ser a data de devolução.
    devolucao: registro === 'devolucao'? dataInformada: '',
    defeito: (
      registro === 'devolucao' &&
      tipoDevolucao === 'com-defeito'
    )
      ? document.getElementById('nb-defeito').value.trim()
      : '',
    categoria: registro === 'aquisicao'
      ? 'em-uso'
      : (
          tipoDevolucao === 'com-defeito'
            ? 'danificado'
            : 'devolvido'
        )
  };

  // Validation
  if (!payload.modelo || !payload.patrimonio) return toast('Preencha modelo e nº de patrimônio.');
  if (!payload.colaborador) return toast('Informe o colaborador.');
  if (!dataInformada) return toast('Informe a data.');
  if (registro === 'devolucao' && tipoDevolucao === 'com-defeito' && !payload.defeito) return toast('Descreva o defeito.');

  // Check for duplicate serial number
  const duplicate = state.notebooks.find(n => n.patrimonio === payload.patrimonio && n.id !== payload.id);
  if (duplicate) {
    return toast(`O patrimônio ${payload.patrimonio} já está registrado`);
  }
  // Save the notebook record
  saveNotebookRecord(payload);
  await salvarTudo();
  renderGrouped();
  renderListaModelos();
  e.target.reset();
  // Reset editing state
  editingNbId = null;
  document.getElementById('cancelEditNb').classList.add('hidden');
  syncRegistroFields();
  toast('Registro salvo.');
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// SUPORTE - REGISTRO ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
document.getElementById('formSuporte').addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    id: editingSupId || uid(),
    modelo: document.getElementById('sp-modelo').value.trim(),
    patrimonio: document.getElementById('sp-patrimonio').value.trim(),
    local: document.getElementById('sp-local').value.trim()
  };
  if (!payload.modelo || !payload.patrimonio || !payload.local) return toast('Preencha todos os campos do suporte.');
  // Check for duplicate serial number
  const duplicate = state.suporte.find(s => s.patrimonio === payload.patrimonio && s.id !== payload.id);
  if (duplicate) {
    return toast(`O patrimônio ${payload.patrimonio} já está registrado para o local ${duplicate.local}.`);
  }
  const idx = state.suporte.findIndex(s => s.id === editingSupId || s.patrimonio === payload.patrimonio);
  if (idx >= 0) state.suporte[idx] = { ...state.suporte[idx], ...payload };
  else state.suporte.unshift(payload);
  await salvarTudo();
  renderSuporte();
  renderListaModelos();
  e.target.reset();
  editingSupId = null;
  document.getElementById('cancelEditSup').classList.add('hidden');
  toast('Suporte salvo.');
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// ALUNOS - REGISTRO /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
document.getElementById('formAluno').addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    id: editingAluId || uid(),
    modelo: document.getElementById('al-modelo').value.trim(),
    patrimonio: document.getElementById('al-patrimonio').value.trim(),
    sala: document.getElementById('al-sala').value.trim(),
    trava: document.getElementById('al-trava').value.trim()
  };
  if (!payload.modelo || !payload.patrimonio || !payload.sala || !payload.trava) return toast('Preencha todos os campos.');
  const idx = state.alunos.findIndex(a => a.id === editingAluId || a.patrimonio === payload.patrimonio);
  if (idx >= 0) state.alunos[idx] = { ...state.alunos[idx], ...payload };
  else state.alunos.unshift(payload);
  await salvarTudo();
  renderAlunos();
  renderListaModelos();
  e.target.reset();
  editingAluId = null;
  document.getElementById('cancelEditAlu').classList.add('hidden');
  toast('Registro salvo.');
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// BOTÃO UNDO DELETE /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
let lastDeletedItem = null;
let lastDeletedCollection = null;
let undoTimeout = null;

// Exibe uma mensagem temporária na tela com opção de desfazer
function toast(msg, undoCallback) {
  const el = document.getElementById('toast');
  
  // Limpa timeout anterior se existir
  if (undoTimeout) {
    clearTimeout(undoTimeout);
    undoTimeout = null;
  }
  
  // Monta o conteúdo do toast
  if (undoCallback) {
    el.innerHTML = `
      <span>${escapeHtml(msg)}</span>
      <button class="undo-button" onclick="undoDelete()">Desfazer</button>
    `;
  } else {
    el.textContent = msg;
  }
  
  el.classList.add('show');
  
  // Fecha automaticamente após 5 segundos
  toast.t = setTimeout(() => {
    el.classList.remove('show');
    // Limpa o item excluído após o timeout
    if (undoCallback) {
      lastDeletedItem = null;
      lastDeletedCollection = null;
    }
  }, 5000);
}

// Função para desfazer a exclusão
window.undoDelete = async function() {
  if (!lastDeletedItem || !lastDeletedCollection) return;

  state[lastDeletedCollection].unshift(lastDeletedItem);

  lastDeletedItem = null;
  lastDeletedCollection = null;

  await salvarTudo();

  renderGrouped();
  renderSuporte();
  renderAlunos();
  renderListaModelos();

  toast('Exclusão desfeita.');
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// EDIT & DELETE - NOTEBOOKS COLABORADORES ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
window.editNotebook = function(id) {
  const n = state.notebooks.find(x => x.id === id);
  if (!n) return;
  editingNbId = id;
  document.getElementById('nb-modelo').value = n.modelo;
  document.getElementById('nb-patrimonio').value = n.patrimonio;
  document.getElementById('nb-colaborador').value = n.colaborador;
  document.getElementById('nb-setor').value = n.setor;
  document.getElementById('nb-defeito').value = n.defeito;
  if (n.categoria === 'em-uso') {
    document.getElementById('nb-registro').value = 'aquisicao';
    document.getElementById('nb-data').value = n.aquisicao;
  } else {
    document.getElementById('nb-registro').value = 'devolucao';
    document.getElementById('nb-data').value = n.devolucao;
  }
  document.getElementById('nb-tipo-devolucao').value = n.categoria === 'danificado' ? 'com-defeito' : 'sem-defeito';
  document.getElementById('cancelEditNb').classList.remove('hidden');
  syncRegistroFields();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Colaboradores
window.deleteNotebook = async function(id) {
  const notebook = state.notebooks.find(n => n.id === id);

  if (!notebook) return;

  lastDeletedItem = notebook;
  lastDeletedCollection = 'notebooks';

  state.notebooks = state.notebooks.filter(n => n.id !== id);

  await salvarTudo();

  renderGrouped();
  renderListaModelos();

  toast('Registro excluído.', true);
};

// Suporte
window.deleteSuporte = async function(id) {
  const notebook = state.suporte.find(s => s.id === id);

  if (!notebook) return;

  lastDeletedItem = notebook;
  lastDeletedCollection = 'suporte';

  state.suporte = state.suporte.filter(s => s.id !== id);

  await salvarTudo();

  renderSuporte();
  renderListaModelos();

  toast('Registro excluído.', true);
};

// Alunos
window.deleteAluno = async function(id) {
  const notebook = state.alunos.find(a => a.id === id);

  if (!notebook) return;

  lastDeletedItem = notebook;
  lastDeletedCollection = 'alunos';

  state.alunos = state.alunos.filter(a => a.id !== id);

  await salvarTudo();

  renderAlunos();
  renderListaModelos();

  toast('Registro excluído.', true);
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// EDIT & DELETE - SUPORTE ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
window.editSuporte = function(id) {
  const s = state.suporte.find(x => x.id === id);
  if (!s) return;
  editingSupId = id;
  document.getElementById('sp-modelo').value = s.modelo;
  document.getElementById('sp-patrimonio').value = s.patrimonio;
  document.getElementById('sp-local').value = s.local;
  document.getElementById('cancelEditSup').classList.remove('hidden');
  document.querySelector('[data-tab="suporte"]').click();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// EDIT & DELETE - ALUNOS ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
window.editAluno = function(id) {
  const a = state.alunos.find(x => x.id === id);
  if (!a) return;
  editingAluId = id;
  document.getElementById('al-modelo').value = a.modelo;
  document.getElementById('al-patrimonio').value = a.patrimonio;
  document.getElementById('al-sala').value = a.sala;
  document.getElementById('al-trava').value = a.trava;
  document.getElementById('cancelEditAlu').classList.remove('hidden');
  document.querySelector('[data-tab="alunos"]').click();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// FILTROS DE STATUS /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
document.querySelectorAll('.status-filter').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.status-filter').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.status-section').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
    document.querySelector(`.status-section[data-section="${btn.dataset.status}"]`).classList.add('active');
  });
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// CANCEL EDIT ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
document.getElementById('cancelEditNb').addEventListener('click', () => {
  editingNbId = null;
  document.getElementById('formNotebook').reset();
  document.getElementById('cancelEditNb').classList.add('hidden');
  syncRegistroFields();
});

document.getElementById('cancelEditSup').addEventListener('click', () => {
  editingSupId = null;
  document.getElementById('formSuporte').reset();
  document.getElementById('cancelEditSup').classList.add('hidden');
});

document.getElementById('cancelEditAlu').addEventListener('click', () => {
  editingAluId = null;
  document.getElementById('formAluno').reset();
  document.getElementById('cancelEditAlu').classList.add('hidden');
});
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Event listeners dos botões de exportar PDF
document.getElementById('btnExportarEmUsoPDF')?.addEventListener('click', exportarEmUsoPDF);
document.getElementById('btnExportarDevolvidoPDF')?.addEventListener('click', exportarDevolvidoPDF);
document.getElementById('btnExportarDanificadoPDF')?.addEventListener('click', exportarDanificadoPDF);

// Filtrar por data
document.querySelectorAll('.sort-date-btn').forEach(botao => {
  botao.addEventListener('click', () => {
    const categoria = botao.dataset.sortDate;

    if (!categoria || !ordenacaoData[categoria]) {
      return;
    }

    ordenacaoData[categoria] =
      ordenacaoData[categoria] === 'crescente'
        ? 'decrescente'
        : 'crescente';

    atualizarIconeOrdenacao(categoria);

    renderGrouped();
  });
});

function atualizarIconeOrdenacao(categoriaSelecionada) {
  document.querySelectorAll('.sort-date-btn').forEach(botao => {
    const categoria = botao.dataset.sortDate;
    const icone = botao.querySelector('i');

    if (!icone) {
      return;
    }

    botao.classList.remove('active');

    if (categoria !== categoriaSelecionada) {
      icone.className = 'ti ti-arrows-sort';
      return;
    }

    botao.classList.add('active');

    if (ordenacaoData[categoria] === 'crescente') {
      icone.className = 'ti ti-arrow-up';
    } else {
      icone.className = 'ti ti-arrow-down';
    }
  });
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// FILTROS POR SETOR E MODELO DENTRO DE CADA CATEGORIA ///////////////////////////////////////////////////////////////////////////////////////////////////////////

// Estado dos filtros
const filtrosAtivos = {
  'em-uso': { setor: '', modelo: '' },
  'devolvido': { setor: '', modelo: '' },
  'danificado': { setor: '', modelo: '' }
};

// Atualiza os dropdowns de filtro com os valores únicos da categoria
function atualizarDropdownsFiltro(categoria) {
  const notebooksFiltrados = state.notebooks.filter(n => n.categoria === categoria);
  
  // Coleta setores e modelos únicos
  const setoresUnicos = [...new Set(notebooksFiltrados.map(n => n.setor).filter(s => s && s.trim()))];
  const modelosUnicos = [...new Set(notebooksFiltrados.map(n => n.modelo).filter(m => m && m.trim()))];
  
  // Ordena alfabeticamente
  setoresUnicos.sort();
  modelosUnicos.sort();
  
  // Atualiza dropdown de setor
  const selectSetor = document.getElementById(`filtro-setor-${categoria}`);
  if (selectSetor) {
    const valorAtual = selectSetor.value;
    selectSetor.innerHTML = '<option value="">Todos os setores</option>' +
      setoresUnicos.map(setor => `<option value="${escapeHtml(setor)}">${escapeHtml(setor)}</option>`).join('');
    selectSetor.value = valorAtual;
  }
  
  // Atualiza dropdown de modelo
  const selectModelo = document.getElementById(`filtro-modelo-${categoria}`);
  if (selectModelo) {
    const valorAtual = selectModelo.value;
    selectModelo.innerHTML = '<option value="">Todos os modelos</option>' +
      modelosUnicos.map(modelo => `<option value="${escapeHtml(modelo)}">${escapeHtml(modelo)}</option>`).join('');
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
  
  return dados.filter(n => {
    const matchSetor = !filtro.setor || n.setor === filtro.setor;
    const matchModelo = !filtro.modelo || n.modelo === filtro.modelo;
    return matchSetor && matchModelo;
  });
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

configurarToggleModelos();
configurarToggleSetores();
configurarFechamentoDasListas();
carregarDados();