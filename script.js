// Variáveis para facilitar a manutenção
const URL_APPS_SCRIPT = "https://script.google.com/macros/s/AKfycbxbkJd-cMeVIq3NAkbSHIFL5vB01Y-oC5cZuu0wosYTdE-Ja9DgOuzW8SwxSFdSSiyfXA/exec";
const PRECO_KWH = 0.82607;
const CONSUMO_KW = 0.12;
const TAXA_MAQUINA_HORA = 2;
const TAXA_PINTURA = 4;

// Mapeamento de preços por material
const PRECOS_FILAMENTO_KG = {
  "ABS": 100,
  "PLA": 140,
  "PETG": 120
};

/**
 * Formata um número para o padrão monetário brasileiro.
 * @param {number} valor
 * @returns {string} Valor formatado
 */
function formatReal(valor) {
  if (isNaN(valor)) return "R$ 0,00";
  return "R$ " + valor.toFixed(2).replace(".", ",");
}

/**
 * Calcula todos os custos e valores de venda.
 * @returns {object} Objeto com todos os valores calculados
 */
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

/**
 * Atualiza os valores exibidos na tela.
 */
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

// --- Funções de Eventos ---

// Lidar com a troca de telas
document.querySelectorAll("button.menu-btn").forEach(botao => {
  botao.addEventListener("click", () => {
    document.querySelectorAll("button.menu-btn").forEach(b => b.classList.remove("active"));
    botao.classList.add("active");

    document.querySelectorAll("section").forEach(sec => sec.classList.remove("active"));
    const tela = botao.getAttribute("data-tela");
    document.getElementById(tela).classList.add("active");
  });
});

// Atualizar valores ao digitar/selecionar
document.querySelectorAll("input, select").forEach(elemento => {
  elemento.addEventListener("input", atualizarExibicaoValores);
});

// Lidar com o envio do formulário
document.getElementById("btnEnviar").addEventListener("click", async () => {
  const produto = document.getElementById("produto").value.trim();
  const material = document.getElementById("material").value;
  const quantidade = parseFloat(document.getElementById("quantidade").value);
  const horas = parseFloat(document.getElementById("horas").value);
  const maquina = document.getElementById("maquina").value;
  const pintura = document.getElementById("pintura").value;

  if (!produto || !material || isNaN(quantidade) || quantidade <= 0 || isNaN(horas) || horas <= 0 || !maquina || !pintura) {
    alert("Por favor, preencha todos os campos corretamente.");
    return;
  }

  const valoresCalculados = calcularValores();

  const dados = {
    produto,
    material,
    quantidade,
    horas,
    maquina,
    pintura,
    ...valoresCalculados
  };
  
  // Alerta de envio para feedback imediato
  alert("Enviando dados para o servidor...");

  try {
    // Requisicao com `mode: 'no-cors'` para funcionar do GitHub Pages
    const response = await fetch(URL_APPS_SCRIPT, {
      method: "POST",
      body: JSON.stringify(dados),
      mode: 'no-cors' 
    });

    // A resposta do 'no-cors' não pode ser lida, então assumimos sucesso
    // se a requisição não lançar um erro.
    alert("Orçamento enviado com sucesso!");

    // Limpar os campos após o envio
    document.getElementById("produto").value = "";
    document.getElementById("material").value = "";
    document.getElementById("quantidade").value = "";
    document.getElementById("horas").value = "";
    document.getElementById("maquina").value = "";
    document.getElementById("pintura").value = "";
    atualizarExibicaoValores();
    
  } catch (error) {
    console.error("Erro ao enviar orçamento:", error);
    alert("Erro ao enviar orçamento. Verifique sua conexão ou o console do navegador.");
  }
});

// Atualizar valores na primeira carga da página
window.addEventListener("load", atualizarExibicaoValores);
