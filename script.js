function formatReal(valor) {
    return "R$ " + valor.toFixed(2).replace(".", ",");
}

function atualizarValores() {
    const produto = document.getElementById("produto").value;
    const material = document.getElementById("material").value;
    const quantidade = parseFloat(document.getElementById("quantidade").value) || 0;
    const horas = parseFloat(document.getElementById("horas").value) || 0;
    const maquina = document.getElementById("maquina").value;
    const pintura = document.getElementById("pintura").value;

    let custoFilamento = 0;
    if (material === "ABS") custoFilamento = (quantidade / 1000) * 100;
    else if (material === "PLA") custoFilamento = (quantidade / 1000) * 140;
    else if (material === "PETG") custoFilamento = (quantidade / 1000) * 120;

    let custoLuz = 0;
    const precoKwh = 0.82607;
    const consumoKw = 0.12;
    if (maquina === "Ender 3 S1") custoLuz = consumoKw * precoKwh * horas;

    const taxaMaquina = 2 * horas;
    const taxaPintura = pintura === "Sim" ? 4 : 0;
    const custoReal = custoFilamento + custoLuz + taxaMaquina + taxaPintura;

    const valorMin = custoReal / (1 - 0.35);
    const valorRec = custoReal / (1 - 0.5);
    const valorMax = custoReal / (1 - 0.8);

    const resultado = document.getElementById("resultado");
    resultado.innerHTML = `
        <p><strong>Custo Filamento:</strong> ${formatReal(custoFilamento)}</p>
        <p><strong>Custo Luz:</strong> ${formatReal(custoLuz)}</p>
        <p><strong>Taxa Máquina:</strong> ${formatReal(taxaMaquina)}</p>
        <p><strong>Taxa Pintura:</strong> ${formatReal(taxaPintura)}</p>
        <p><strong>Custo Real:</strong> ${formatReal(custoReal)}</p>
        <p><strong>Valor Mínimo (35% lucro):</strong> ${formatReal(valorMin)}</p>
        <p><strong>Valor Recomendado (50% lucro):</strong> ${formatReal(valorRec)}</p>
        <p><strong>Valor Target (80% lucro):</strong> ${formatReal(valorMax)}</p>
    `;
}

function salvarDados() {
    const produto = document.getElementById("produto").value;
    const material = document.getElementById("material").value;
    const quantidade = parseFloat(document.getElementById("quantidade").value) || 0;
    const horas = parseFloat(document.getElementById("horas").value) || 0;
    const maquina = document.getElementById("maquina").value;
    const pintura = document.getElementById("pintura").value;

    let custoFilamento = 0;
    if (material === "ABS") custoFilamento = (quantidade / 1000) * 100;
    else if (material === "PLA") custoFilamento = (quantidade / 1000) * 140;
    else if (material === "PETG") custoFilamento = (quantidade / 1000) * 120;

    let custoLuz = 0;
    const precoKwh = 0.82607;
    const consumoKw = 0.12;
    if (maquina === "Ender 3 S1") custoLuz = consumoKw * precoKwh * horas;

    const taxaMaquina = 2 * horas;
    const taxaPintura = pintura === "Sim" ? 4 : 0;
    const custoReal = custoFilamento + custoLuz + taxaMaquina + taxaPintura;

    const valorMin = custoReal / (1 - 0.35);
    const valorRec = custoReal / (1 - 0.5);
    const valorMax = custoReal / (1 - 0.8);

    const dados = {
        produto,
        material,
        quantidade,
        horas,
        maquina,
        pintura,
        custoFilamento,
        custoLuz,
        taxaMaquina,
        taxaPintura,
        custoReal,
        valorMin,
        valorRec,
        valorMax
    };

    fetch("S
