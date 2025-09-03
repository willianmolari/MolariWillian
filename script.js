// Variáveis e Constantes
const URL_APPS_SCRIPT = "https://script.google.com/macros/s/AKfycbxbkJd-cMeVIq3NAkbSHIFL5vB01Y-oC5cZuu0wosYTdE-Ja9DgOuzW8SwxSFdSSiyfXA/exec";
const PRECO_KWH = 0.82607;
const CONSUMO_KW = 0.12;
const TAXA_MAQUINA_HORA = 2;
const TAXA_PINTURA = 4;
const PRECOS_FILAMENTO_KG = {
  "ABS": 100,
  "PLA": 140,
  "PETG": 120
};

// Funções de Utilitário
function formatReal(valor) {
  if (isNaN(valor)) return "R$ 0,00";
  return "R$ " + valor.toFixed(2).replace(".", ",");
}

function calcularValores() {
  const material = document.getElementById("material").value;
  const quantidade = parseFloat(document.getElementById("quantidade").value) || 0;
  const horas = parseFloat(document.getElementById("horas").value) || 0;
  const maquina = document.getElementById("maquina").value;
  const pintura = document.getElementById("pintura").value;

  const custoFilamento = (quantidade / 1000) * (PRECOS_FILAMENTO_KG[material] || 0);
  const custoLuz = (maquina === "Ender 3 S1") ? CONSUMO_KW * PRECO_KWH * horas : 0;
  const taxaMaquina = TAXA_MAQUINA_HORA * horas;
  const taxaPintura = (pintura === "Sim") ? TAXA_PINTURA : 0;
  const custoReal = custoFilamento + custoLuz + taxaMaquina + taxaPintura;

  const valorMin = custoReal / (1 - 0.35);
  const valorRec = custoReal / (1 - 0.5);
  const valorMax = custoReal / (1 - 0.8);

  return { custoFilamento, custoLuz, taxaMaquina, taxaPintura, custoReal, valorMin, valorRec, valorMax };
}

function atualizarExibicaoValores() {
  const valores = calcularValores();
  const resultado = document.getElementById("resultado");
  resultado.innerHTML = `
    <p><strong>Custo Filamento:</strong> ${formatReal(valores.custoFilamento)}</p>
    <p><strong>Custo Luz:</strong> ${formatReal(valores.custoLuz)}</p>
    <p><strong>Taxa Máquina:</strong> ${formatReal(valores.taxaMaquina)}</p>
    <p><strong>Taxa Pintura:</strong> ${formatReal(valores.taxaPintura)}</p>
    <p><strong>Custo Real:</strong> ${formatReal(valores.custoReal)}</p>
    <p><strong>Valor Mínimo (35% lucro):</strong> ${formatReal(valores.valorMin)}</p>
    <p><strong>Valor Recomendado (50% lucro):</strong> ${formatReal(valores.valorRec)}</p>
    <p><strong>Valor Target (80% lucro):</strong> ${formatReal(valores.valorMax)}</p>
  `;
}

// Funções de Gerenciamento de Dados e UI
async function fetchAndDisplayGastos() {
  const loading = document.getElementById('gastos-loading');
  const tabelaBody = document.querySelector("#tabelaGastos tbody");
  loading.style.display = 'block';
  tabelaBody.innerHTML = ''; // Limpa a tabela

  try {
    const response = await fetch(`${URL_APPS_SCRIPT}?action=getGastos`);
    const data = await response.json();

    if (data && data.gastos) {
      const gastosAgrupados = agruparPorMes(data.gastos);

      for (const mesAno in gastosAgrupados) {
        const row = tabelaBody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 4;
        cell.innerHTML = `<strong>${mesAno}</strong>`;
        cell.style.backgroundColor = '#f0f0f0';

        gastosAgrupados[mesAno].forEach(gasto => {
          const gastoRow = tabelaBody.insertRow();
          const dataGasto = new Date(gasto.data).toLocaleDateString('pt-BR');
          gastoRow.innerHTML = `
            <td>${dataGasto}</td>
            <td>${gasto.tipo}</td>
            <td>${formatReal(gasto.valor)}</td>
            <td>
              <button class="delete-btn" data-id="${gasto.id}">Excluir</button>
            </td>
          `;
        });
      }
      
    } else {
      tabelaBody.innerHTML = '<tr><td colspan="4">Nenhum gasto encontrado.</td></tr>';
    }
  } catch (error) {
    console.error("Erro ao carregar gastos:", error);
    tabelaBody.innerHTML = '<tr><td colspan="4">Erro ao carregar gastos.</td></tr>';
  } finally {
    loading.style.display = 'none';
  }
}

function agruparPorMes(gastos) {
  return gastos.reduce((grupos, gasto) => {
    const data = new Date(gasto.data);
    const mesAno = data.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
    if (!grupos[mesAno]) {
      grupos[mesAno] = [];
    }
    grupos[mesAno].push(gasto);
    return grupos;
  }, {});
}

// Gerenciamento de Eventos
document.querySelectorAll("button.menu-btn").forEach(botao => {
  botao.addEventListener("click", () => {
    document.querySelectorAll("button.menu-btn").forEach(b => b.classList.remove("active"));
    botao.classList.add("active");

    document.querySelectorAll("section").forEach(sec => sec.classList.remove("active"));
    const tela = botao.getAttribute("data-tela");
    document.getElementById(tela).classList.add("active");
    
    if (tela === 'telaGastos') {
        fetchAndDisplayGastos();
    }
  });
});

document.getElementById("btnCalcular").addEventListener("click", async () => {
  const produto = document.getElementById("produto").value.trim();
  const material = document.getElementById("material").value;
  const quantidade = parseFloat(document.getElementById("quantidade").value);
  const horas = parseFloat(document.getElementById("horas").value);
  const maquina = document.getElementById("maquina").value;
  const pintura = document.getElementById("pintura").value;
  const dataVenda = document.getElementById("dataVenda").value || new Date().toISOString().split('T')[0];

  if (!produto || !material || isNaN(quantidade) || quantidade <= 0 || isNaN(horas) || horas <= 0 || !maquina || !pintura) {
    alert("Por favor, preencha todos os campos de Orçamento corretamente.");
    return;
  }

  const valoresCalculados = calcularValores();
  const dados = {
    action: "addOrcamento",
    dataVenda,
    produto,
    material,
    quantidade,
    horas,
    maquina,
    pintura,
    ...valoresCalculados
  };
  
  alert("Enviando orçamento para o servidor...");
  try {
    const response = await fetch(URL_APPS_SCRIPT, {
      method: "POST",
      body: JSON.stringify(dados),
    });
    if (response.ok) {
        alert("Orçamento enviado com sucesso!");
        // Limpar campos
    } else {
        alert("Erro ao enviar orçamento.");
    }
  } catch (error) {
    console.error("Erro ao enviar orçamento:", error);
    alert("Erro ao enviar orçamento. Verifique sua conexão ou o console do navegador.");
  }
});

document.getElementById("btnRegistrarVenda").addEventListener("click", async () => {
  const produto = document.getElementById("produto").value.trim();
  const material = document.getElementById("material").value;
  const quantidade = parseFloat(document.getElementById("quantidade").value);
  const horas = parseFloat(document.getElementById("horas").value);
  const maquina = document.getElementById("maquina").value;
  const pintura = document.getElementById("pintura").value;
  const dataVenda = document.getElementById("dataVenda").value;

  if (!produto || !material || isNaN(quantidade) || quantidade <= 0 || isNaN(horas) || horas <= 0 || !maquina || !pintura || !dataVenda) {
    alert("Por favor, preencha todos os campos e a data para registrar a venda.");
    return;
  }

  const valoresCalculados = calcularValores();
  const dadosVenda = {
    action: "addVenda",
    dataVenda,
    produto,
    material,
    quantidade,
    horas,
    maquina,
    pintura,
    ...valoresCalculados
  };
  
  alert("Registrando venda...");
  try {
    const response = await fetch(URL_APPS_SCRIPT, {
      method: "POST",
      body: JSON.stringify(dadosVenda),
    });
    if (response.ok) {
        alert("Venda registrada com sucesso! Estoque atualizado.");
        // Limpar campos
    } else {
        alert("Erro ao registrar venda.");
    }
  } catch (error) {
    console.error("Erro ao registrar venda:", error);
    alert("Erro ao registrar venda. Tente novamente.");
  }
});

document.getElementById("tipoGasto").addEventListener('change', () => {
  const tipo = document.getElementById('tipoGasto').value;
  const camposGastosDiv = document.getElementById('camposGastos');
  let html = '';

  if (tipo === 'luz') {
    html = `
      <div id="campo-luz">
        <label for="gastoLuz">Valor da Conta de Luz (R$)</label>
        <input type="number" id="gastoLuz" min="0" step="0.01" />
      </div>
    `;
  } else if (tipo === 'filamento') {
    html = `
      <div id="campo-filamento">
        <label for="gastoFilamento">Custo do Filamento (R$)</label>
        <input type="number" id="gastoFilamento" min="0" step="0.01" />
      </div>
    `;
  } else if (tipo === 'taxa') {
    html = `
      <div id="campo-taxa">
        <label for="gastoTaxa">Valor da Taxa (R$)</label>
        <input type="number" id="gastoTaxa" min="0" step="0.01" />
      </div>
    `;
  } else if (tipo === 'outro') {
    html = `
      <div id="campo-outro">
        <label for="descricaoOutroGasto">Descrição</label>
        <input type="text" id="descricaoOutroGasto" placeholder="Ex: Manutenção da máquina" />
        <label for="valorOutroGasto">Valor (R$)</label>
        <input type="number" id="valorOutroGasto" min="0" step="0.01" />
      </div>
    `;
  }
  camposGastosDiv.innerHTML = html;
});

document.getElementById("btnSalvarGasto").addEventListener("click", async () => {
  const tipo = document.getElementById('tipoGasto').value;
  const dataGasto = document.getElementById("dataGasto").value;

  if (!dataGasto) {
      alert("Por favor, preencha a data do gasto.");
      return;
  }
  
  let valor = 0;
  let descricao = '';

  if (tipo === 'luz') {
      valor = parseFloat(document.getElementById('gastoLuz').value);
      descricao = 'Gasto com Luz';
  } else if (tipo === 'filamento') {
      valor = parseFloat(document.getElementById('gastoFilamento').value);
      descricao = 'Gasto com Filamento';
  } else if (tipo === 'taxa') {
      valor = parseFloat(document.getElementById('gastoTaxa').value);
      descricao = 'Gasto com Taxa';
  } else if (tipo === 'outro') {
      valor = parseFloat(document.getElementById('valorOutroGasto').value);
      descricao = document.getElementById('descricaoOutroGasto').value.trim();
      if (!descricao) {
        alert("Por favor, adicione uma descrição para o gasto.");
        return;
      }
  }

  if (isNaN(valor) || valor <= 0) {
      alert("Por favor, insira um valor válido.");
      return;
  }

  const dados = {
    action: 'addGasto',
    dataGasto,
    tipo,
    valor,
    descricao
  };

  alert("Salvando gasto...");
  try {
    const response = await fetch(URL_APPS_SCRIPT, {
      method: "POST",
      body: JSON.stringify(dados),
    });
    if (response.ok) {
        alert("Gasto salvo com sucesso!");
        // Limpar campos
        fetchAndDisplayGastos(); // Recarrega a tabela
    } else {
        alert("Erro ao salvar gasto.");
    }
  } catch (error) {
    console.error("Erro ao salvar gasto:", error);
    alert("Erro ao salvar gasto. Tente novamente.");
  }
});

document.getElementById("btnAtualizarEstoque").addEventListener("click", async () => {
  const materialEstoque = document.getElementById("materialEstoque").value;
  const quantidadeEstoque = parseFloat(document.getElementById("quantidadeEstoque").value);
  const tipoMovimento = document.getElementById("tipoMovimento").value;
  const notaEstoque = document.getElementById("notaEstoque").value.trim();

  if (!materialEstoque || isNaN(quantidadeEstoque) || quantidadeEstoque <= 0 || !tipoMovimento) {
    alert("Por favor, preencha todos os campos de Estoque corretamente.");
    return;
  }

  const dados = {
    action: "updateEstoque",
    materialEstoque,
    quantidadeEstoque,
    tipoMovimento,
    notaEstoque,
  };

  alert("Atualizando estoque...");
  try {
    const response = await fetch(URL_APPS_SCRIPT, {
      method: "POST",
      body: JSON.stringify(dados),
    });
    if (response.ok) {
        alert("Estoque atualizado com sucesso!");
        // Limpar campos
    } else {
        alert("Erro ao atualizar estoque.");
    }
  } catch (error) {
    console.error("Erro ao atualizar estoque:", error);
    alert("Erro ao atualizar estoque. Tente novamente.");
  }
});

// Inicializa a página
window.addEventListener("load", () => {
  atualizarExibicaoValores();
  const dataHoje = new Date().toISOString().split('T')[0];
  document.getElementById('dataVenda').value = dataHoje;
});
