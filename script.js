// ---------------- CONSTANTES ---------------------
// ATENÇÃO: Substitua este URL pelo seu Google Apps Script!
const URL_APPS_SCRIPT = "https://script.google.com/macros/s/AKfycbxbkJd-cMeVIq3NAkbSHIFL5vB01Y-oC5cZuu0wosYTdE-Ja9DgOuzW8SwxSFdSSiyfXA/exec";
const PRECO_KWH = 0.82607;

const CONSUMO_KW = 0.12;         // Ender 3 S1 (exemplo)
const CONSUMO_KW_LD002R = 0.05;  // Creality LD-002R (exemplo)

const TAXA_MAQUINA_HORA = 2;
const TAXA_PINTURA = 15;

const PRECOS_FILAMENTO_KG = {
  "ABS": 100,
  "PLA": 120,
  "PETG": 120,
  "RESINA": 150
};

// ---------------- UTILITÁRIOS -------------------
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
  // Cálculo do custo do filamento (g para kg)
  const custoFilamento = (quantidade / 1000) * precoMaterial;

  let consumo = 0;
  if (maquina === "Ender 3 S1") consumo = CONSUMO_KW;
  if (maquina === "Creality LD-002R") consumo = CONSUMO_KW_LD002R;

  // Custo da energia
  const custoLuz = consumo * PRECO_KWH * horas;
  // Custo de depreciação/uso da máquina
  const taxaMaquina = TAXA_MAQUINA_HORA * horas;
  // Custo de acabamento/pintura
  const taxaPintura = pintura === "Sim" ? TAXA_PINTURA : 0;

  const custoReal = custoFilamento + custoLuz + taxaMaquina + taxaPintura;

  // Cálculo de preço de venda baseado em margem de lucro (Custo Real / (1 - %Lucro))
  const valorMin = custoReal / (1 - 0.35); // 35% de lucro (65% de custo)
  const valorRec = custoReal / (1 - 0.50); // 50% de lucro (50% de custo)
  const valorMax = custoReal / (1 - 0.80); // 80% de lucro (20% de custo)

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

// ---------------- GASTOS (Funções de Consulta) ---------------------
async function fetchAndDisplayGastos() {
  const loading = document.getElementById('gastos-loading');
  const tabelaBody = document.querySelector("#tabelaGastos tbody");

  loading.style.display = 'block';
  tabelaBody.innerHTML = '';

  try {
    const response = await fetch(`${URL_APPS_SCRIPT}?action=getGastos`);
    const data = await response.json();

    if (data && data.gastos && data.gastos.length > 0) {
      const gastosAgrupados = agruparPorMes(data.gastos);

      for (const mesAno in gastosAgrupados) {
        // Linha de cabeçalho para o mês
        const row = tabelaBody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 4;
        cell.innerHTML = `<strong>${mesAno}</strong>`;
        cell.style.backgroundColor = '#e0e0e0';

        // Linhas de gastos
        gastosAgrupados[mesAno].forEach(gasto => {
          const gastoRow = tabelaBody.insertRow();
          // Formata data e valor
          const dataGasto = new Date(gasto.data).toLocaleDateString('pt-BR', {timeZone: 'UTC'});

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
    // Usamos o new Date(gasto.data) com timeZone: 'UTC' para evitar problemas de fuso
    const data = new Date(gasto.data); 
    const mesAno = data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });

    if (!grupos[mesAno]) grupos[mesAno] = [];
    grupos[mesAno].push(gasto);

    return grupos;
  }, {});
}

// ---------------- ORÇAMENTO PERSONALIZADO ---------------------
function gerarOrcamentoPersonalizado() {
  const produto = document.getElementById("produto").value.trim();
  const material = document.getElementById("material").value;
  const quantidade = parseFloat(document.getElementById("quantidade").value) || 0;
  const lucroPercent = parseFloat(document.getElementById("lucroPercent").value) || 0;

  if (!produto || !material || quantidade <= 0 || lucroPercent < 0) {
    alert("Preencha o nome do produto, material, quantidade e margem de lucro corretamente.");
    return;
  }

  const valores = calcularValores();

  // Cálculo do valor final baseado na margem de lucro
  const valorComLucro = valores.custoReal / (1 - lucroPercent / 100);

  const resultadoDiv = document.getElementById("orcamentoPersonalizado");
  resultadoDiv.innerHTML = `
    <h3>Orçamento Gerado</h3>
    <p><strong>Custo Real:</strong> ${formatReal(valores.custoReal)}</p>
    <p><strong>Margem de Lucro:</strong> ${lucroPercent}%</p>
    <p><strong>Valor Final:</strong> ${formatReal(valorComLucro)}</p>
  `;
}


// ---------------- EVENTOS ---------------------

// Lidar com a troca de telas
document.querySelectorAll("button.menu-btn").forEach(botao => {
  botao.addEventListener("click", () => {
    document.querySelectorAll("button.menu-btn").forEach(b => b.classList.remove("active"));
    botao.classList.add("active");

    document.querySelectorAll("section").forEach(sec => sec.classList.remove("active"));
    const tela = botao.getAttribute("data-tela");
    document.getElementById(tela).classList.add("active");

    // Se for a tela de Gastos, carrega a lista
    if (tela === 'telaGastos') fetchAndDisplayGastos();
  });
});

// Atualizar valores ao digitar/selecionar
document.querySelectorAll("#telaGestao input, #telaGestao select").forEach(elemento => {
  elemento.addEventListener("input", atualizarExibicaoValores);
});

// --- Tela de Gestão: Botões de Envio e Cálculo ---
document.getElementById("btnCalcular").addEventListener("click", atualizarExibicaoValores);

document.getElementById("btnGerarOrcamento").addEventListener("click", gerarOrcamentoPersonalizado);

// Lidar com o envio do formulário (Orçamento Simples)
document.getElementById("btnEnviar").addEventListener("click", async () => {
    const produto = document.getElementById("produto").value.trim();
    const material = document.getElementById("material").value;
    const quantidade = parseFloat(document.getElementById("quantidade").value);
    const horas = parseFloat(document.getElementById("horas").value);
    const maquina = document.getElementById("maquina").value;
    const pintura = document.getElementById("pintura").value;
    const dataVenda = document.getElementById("dataVenda").value || new Date().toISOString().split('T')[0];

    if (!produto || !material || isNaN(quantidade) || quantidade <= 0 || isNaN(horas) || horas <= 0 || !maquina || !pintura) {
      alert("Por favor, preencha todos os campos do orçamento corretamente.");
      return;
    }

    const valoresCalculados = calcularValores();

    const dados = {
      action: "addOrcamento",
      data: dataVenda, // Usando dataVenda como data do orçamento
      produto,
      material,
      quantidade,
      horas,
      maquina,
      pintura,
      ...valoresCalculados
    };
    
    alert("Enviando orçamento para a planilha...");

    try {
      // Requisicao com `mode: 'no-cors'` para funcionar do GitHub Pages
      const response = await fetch(URL_APPS_SCRIPT, {
        method: "POST",
        body: JSON.stringify(dados),
        mode: 'no-cors' 
      });

      // O 'no-cors' não permite ler a resposta, então assumimos sucesso
      alert("Orçamento enviado com sucesso!");

      // Limpar os campos após o envio
      document.getElementById("produto").value = "";
      document.getElementById("material").value = "";
      document.getElementById("quantidade").value = "";
      document.getElementById("horas").value = "";
      document.getElementById("maquina").value = "";
      document.getElementById("pintura").value = "";
      document.getElementById("orcamentoPersonalizado").innerHTML = ""; // Limpa o orçamento personalizado
      atualizarExibicaoValores();
      
    } catch (error) {
      console.error("Erro ao enviar orçamento:", error);
      alert("Erro ao enviar orçamento. Verifique sua conexão ou o console do navegador.");
    }
});

// Lidar com o Registro de Venda (Ação similar ao envio de orçamento, mas com flag de venda)
document.getElementById("btnRegistrarVenda").addEventListener("click", async () => {
    const produto = document.getElementById("produto").value.trim();
    const material = document.getElementById("material").value;
    // ... (outras validações omitidas para brevidade, mas são as mesmas do btnEnviar) ...

    if (!produto || !material || isNaN(parseFloat(document.getElementById("quantidade").value))) {
      alert("Preencha todos os campos corretamente para registrar a venda.");
      return;
    }

    const valoresCalculados = calcularValores();
    // Você precisará de um campo para o valor real da venda, por exemplo, o valorRec
    const valorVenda = valoresCalculados.valorRec; // Exemplo: usando o valor recomendado

    const dados = {
      action: "addVenda", // Nova ação para o Apps Script
      data: document.getElementById("dataVenda").value, 
      produto,
      material,
      valorFinal: valorVenda, // Valor final de venda
      ...valoresCalculados
    };
    
    alert("Registrando venda...");

    try {
      const response = await fetch(URL_APPS_SCRIPT, {
        method: "POST",
        body: JSON.stringify(dados),
        mode: 'no-cors' 
      });
      alert("Venda registrada com sucesso!");
    } catch (error) {
      console.error("Erro ao registrar venda:", error);
      alert("Erro ao registrar venda.");
    }
});


// --- Tela de Gastos: Formulários Dinâmicos e Salvar ---

document.getElementById("tipoGasto").addEventListener('change', () => {
  const tipo = document.getElementById('tipoGasto').value;
  const campos = document.getElementById('camposGastos');

  const templates = {
    luz: `
      <label>Valor da Conta de Luz (R$)</label>
      <input id="gastoLuz" type="number" step="0.01">
    `,
    filamento: `
      <label>Custo do Filamento (R$)</label>
      <input id="gastoFilamento" type="number" step="0.01">
    `,
    taxa: `
      <label>Valor da Taxa (R$)</label>
      <input id="gastoTaxa" type="number" step="0.01">
    `,
    outro: `
      <label>Descrição</label>
      <input id="descricaoOutroGasto" type="text" placeholder="Ex: Manutenção da Máquina">
      <label>Valor (R$)</label>
      <input id="valorOutroGasto" type="number" step="0.01">
    `
  };

  campos.innerHTML = templates[tipo] || "";
});

// Lidar com o salvamento de gastos
document.getElementById("btnSalvarGasto").addEventListener("click", async () => {
    const tipoGasto = document.getElementById("tipoGasto").value;
    const dataGasto = document.getElementById("dataGasto").value;
    let valor = 0;
    let descricao = "";

    if (!dataGasto) {
        alert("Por favor, selecione a data do gasto.");
        return;
    }

    // Lógica para pegar o valor de acordo com o tipo de gasto
    if (tipoGasto === "luz") {
        valor = parseFloat(document.getElementById("gastoLuz").value) || 0;
    } else if (tipoGasto === "filamento") {
        valor = parseFloat(document.getElementById("gastoFilamento").value) || 0;
    } else if (tipoGasto === "taxa") {
        valor = parseFloat(document.getElementById("gastoTaxa").value) || 0;
    } else if (tipoGasto === "outro") {
        valor = parseFloat(document.getElementById("valorOutroGasto").value) || 0;
        descricao = document.getElementById("descricaoOutroGasto").value.trim();
    }

    if (valor <= 0) {
        alert("Preencha o valor do gasto corretamente (deve ser maior que zero).");
        return;
    }

    const dados = {
        action: "addGasto",
        tipo: tipoGasto,
        valor: valor,
        data: dataGasto,
        descricao: descricao
    };

    alert(`Salvando gasto de ${tipoGasto}...`);

    try {
        const response = await fetch(URL_APPS_SCRIPT, {
            method: "POST",
            body: JSON.stringify(dados)
        });

        if (response.ok) {
            alert("Gasto salvo com sucesso!");
            // Recarregar a lista de gastos
            fetchAndDisplayGastos(); 
        } else {
            alert("Erro ao salvar gasto.");
        }
    } catch (error) {
        console.error("Erro ao salvar gasto:", error);
        alert("Erro de conexão ao salvar gasto.");
    }
});

// Lidar com a exclusão de gastos (delegação de evento)
document.querySelector("#tabelaGastos tbody").addEventListener("click", async (event) => {
    if (event.target.classList.contains("delete-btn")) {
        const gastoId = event.target.getAttribute("data-id");
        if (!confirm("Tem certeza que deseja excluir este gasto?")) return;

        const dados = {
            action: "deleteGasto",
            id: gastoId
        };

        alert("Excluindo gasto...");

        try {
            const response = await fetch(URL_APPS_SCRIPT, {
                method: "POST",
                body: JSON.stringify(dados)
            });

            if (response.ok) {
                alert("Gasto excluído com sucesso!");
                fetchAndDisplayGastos(); // Recarrega a tabela
            } else {
                alert("Erro ao excluir gasto.");
            }
        } catch (error) {
            console.error("Erro ao excluir gasto:", error);
            alert("Erro de conexão ao excluir gasto.");
        }
    }
});


// --- Tela de Estoque ---
document.getElementById("btnAtualizarEstoque").addEventListener("click", async () => {
  const materialEstoque = document.getElementById("materialEstoque").value;
  const quantidadeEstoque = parseFloat(document.getElementById("quantidadeEstoque").value);
  const tipoMovimento = document.getElementById("tipoMovimento").value;
  const notaEstoque = document.getElementById("notaEstoque").value.trim();

  if (!materialEstoque || isNaN(quantidadeEstoque) || quantidadeEstoque <= 0 || !tipoMovimento) {
    alert("Preencha Material, Quantidade e Tipo de Movimento corretamente.");
    return;
  }

  const dados = {
    action: "updateEstoque",
    materialEstoque,
    quantidadeEstoque,
    tipoMovimento,
    notaEstoque
  };

  alert("Atualizando estoque...");
  try {
    const response = await fetch(URL_APPS_SCRIPT, {
      method: "POST",
      body: JSON.stringify(dados)
    });

    if (response.ok) alert("Estoque atualizado!");
    else alert("Erro ao atualizar estoque.");
  } catch (error) {
    console.error("Erro ao atualizar estoque:", error);
    alert("Erro de conexão.");
  }
});

// ---------------- INICIALIZAÇÃO ---------------------
window.addEventListener("load", () => {
  actualizarExibicaoValores();
  
  // Define a data de venda padrão para hoje
  document.getElementById('dataVenda').value = new Date().toISOString().split('T')[0];
  
  // Define a data de gasto padrão para hoje
  document.getElementById('dataGasto').value = new Date().toISOString().split('T')[0];

  // Inicializa o campo de gasto para 'luz' (que é o padrão no HTML)
  document.getElementById("tipoGasto").dispatchEvent(new Event('change'));
});
