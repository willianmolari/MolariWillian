// Variáveis e Constantes
const URL_APPS_SCRIPT = "https://script.google.com/macros/s/AKfycbxbkJd-cMeVIq3NAkbSHIFL5vB01Y-oC5cZuu0wosYTdE-Ja9DgOuzW8SwxSFdSSiyfXA/exec";
const PRECO_KWH = 0.82607;

const CONSUMO_KW = 0.12;         // Ender 3 S1
const CONSUMO_KW_LD002R = 0.05;  // Creality LD-002R (estimado)

const TAXA_MAQUINA_HORA = 2;
const TAXA_PINTURA = 4;

const PRECOS_FILAMENTO_KG = {
  "ABS": 100,
  "PLA": 140,
  "PETG": 120,
  "RESINA": 140
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

  const precoMaterial = PRECOS_FILAMENTO_KG[material] || 0;
  const custoFilamento = (quantidade / 1000) * precoMaterial;

  let consumo = 0;
  if (maquina === "Ender 3 S1") consumo = CONSUMO_KW;
  if (maquina === "Creality LD-002R") consumo = CONSUMO_KW_LD002R;

  const custoLuz = consumo * PRECO_KWH * horas;

  const taxaMaquina = TAXA_MAQUINA_HORA * horas;
  const taxaPintura = pintura === "Sim" ? TAXA_PINTURA : 0;

  const custoReal = custoFilamento + custoLuz + taxaMaquina + taxaPintura;

  const valorMin = custoReal / (1 - 0.35);
  const valorRec = custoReal / (1 - 0.50);
  const valorMax = custoReal / (1 - 0.80);

  return {
    custoFilamento,
    custoLuz,
    taxaMaquina,
    taxaPintura,
    custoReal,
    valorMin,
    valorRec,
    valorMax
  };
}

function atualizarExibicaoValores() {
  const valores = calcularValores();
  const resultado = document.getElementById("resultado");

  resultado.innerHTML = `
    <p><strong>Custo Filamento/Resina:</strong> ${formatReal(valores.custoFilamento)}</p>
    <p><strong>Custo Luz:</strong> ${formatReal(valores.custoLuz)}</p>
    <p><strong>Taxa Máquina:</strong> ${formatReal(valores.taxaMaquina)}</p>
    <p><strong>Taxa Pintura:</strong> ${formatReal(valores.taxaPintura)}</p>
    <p><strong>Custo Real:</strong> ${formatReal(valores.custoReal)}</p>
    <p><strong>Valor Mínimo (35% lucro):</strong> ${formatReal(valores.valorMin)}</p>
    <p><strong>Valor Recomendado (50% lucro):</strong> ${formatReal(valores.valorRec)}</p>
    <p><strong>Valor Target (80% lucro):</strong> ${formatReal(valores.valorMax)}</p>
  `;
}

// ---------------- GASTOS ---------------------
async function fetchAndDisplayGastos() {
  const loading = document.getElementById('gastos-loading');
  const tabelaBody = document.querySelector("#tabelaGastos tbody");

  loading.style.display = 'block';
  tabelaBody.innerHTML = '';

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
            <td><button class="delete-btn" data-id="${gasto.id}">Excluir</button></td>
          `;
        });
      }
    } else {
      tabelaBody.innerHTML = '<tr><td colspan="4">Nenhum gasto encontrado.</td></tr>';
    }
  } catch (error) {
    console.error("Erro ao carregar gastos:", error);
    tabelaBody.innerHTML = '<tr><td colspan="4">Erro ao carregar gastos.</td></tr>';
  }

  loading.style.display = 'none';
}

function agruparPorMes(gastos) {
  return gastos.reduce((grupos, gasto) => {
    const data = new Date(gasto.data);
    const mesAno = data.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

    if (!grupos[mesAno]) grupos[mesAno] = [];
    grupos[mesAno].push(gasto);

    return grupos;
  }, {});
}

// ---------------- EVENTOS ---------------------

document.querySelectorAll("button.menu-btn").forEach(botao => {
  botao.addEventListener("click", () => {
    document.querySelectorAll("button.menu-btn").forEach(b => b.classList.remove("active"));
    botao.classList.add("active");

    document.querySelectorAll("section").forEach(sec => sec.classList.remove("active"));
    const tela = botao.getAttribute("data-tela");
    document.getElementById(tela).classList.add("active");

    if (tela === 'telaGastos') fetchAndDisplayGastos();
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

  if (!produto || !material || !quantidade || !horas || !maquina || !pintura) {
    alert("Preencha todos os campos corretamente.");
    return;
  }

  const valores = calcularValores();

  const dados = {
    action: "addOrcamento",
    dataVenda,
    produto,
    material,
    quantidade,
    horas,
    maquina,
    pintura,
    ...valores
  };

  alert("Enviando orçamento...");

  try {
    const response = await fetch(URL_APPS_SCRIPT, {
      method: "POST",
      body: JSON.stringify(dados)
    });

    if (response.ok) alert("Orçamento enviado!");
    else alert("Erro ao enviar orçamento.");

  } catch (error) {
    alert("Erro de conexão.");
  }
});

// SALVAR GASTOS
document.getElementById("tipoGasto").addEventListener('change', () => {
  const tipo = document.getElementById('tipoGasto').value;
  const campos = document.getElementById('camposGastos');

  const templates = {
    luz: `
      <label>Valor da Conta de Luz</label>
      <input id="gastoLuz" type="number" step="0.01">
    `,
    filamento: `
      <label>Custo do Filamento</label>
      <input id="gastoFilamento" type="number" step="0.01">
    `,
    taxa: `
      <label>Valor da Taxa</label>
      <input id="gastoTaxa" type="number" step="0.01">
    `,
    outro: `
      <label>Descrição</label>
      <input id="descricaoOutroGasto" type="text">
      <label>Valor</label>
      <input id="valorOutroGasto" type="number" step="0.01">
    `
  };

  campos.innerHTML = templates[tipo] || "";
});

// ESTOQUE
document.getElementById("btnAtualizarEstoque").addEventListener("click", async () => {
  const materialEstoque = document.getElementById("materialEstoque").value;
  const quantidadeEstoque = parseFloat(document.getElementById("quantidadeEstoque").value);
  const tipoMovimento = document.getElementById("tipoMovimento").value;
  const notaEstoque = document.getElementById("notaEstoque").value.trim();

  if (!materialEstoque || !quantidadeEstoque || !tipoMovimento) {
    alert("Preencha tudo corretamente.");
    return;
  }

  const dados = {
    action: "updateEstoque",
    materialEstoque,
    quantidadeEstoque,
    tipoMovimento,
    notaEstoque
  };

  try {
    const response = await fetch(URL_APPS_SCRIPT, {
      method: "POST",
      body: JSON.stringify(dados)
    });

    if (response.ok) alert("Estoque atualizado!");
    else alert("Erro ao atualizar estoque.");
  } catch (error) {
    alert("Erro de conexão.");
  }
});

// Inicialização
window.addEventListener("load", () => {
  atualizarExibicaoValores();
  document.getElementById('dataVenda').value = new Date().toISOString().split('T')[0];
});
