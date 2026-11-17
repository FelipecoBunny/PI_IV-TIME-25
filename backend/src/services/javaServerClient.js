/*
* Autoria: Felipe Nasser Coelho Moussa
* RA: 25004922
* Cliente comunicador com o servidor Java
*/

import net from "node:net";

const JAVA_HOST = process.env.JAVA_SERVER_HOST || "127.0.0.1";
const JAVA_PORT = Number(process.env.JAVA_SERVER_PORT) || 4000;
const TIMEOUT_MS = 5000;

export function calcularPainelNoJava({
  pet,
  vaccines,
  medications,
  medicationLogs,
  consultations,
  hojeStr,
}) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    let buffer = "";
    let finalizado = false;

    const concluirComErro = (erro) => {
      if (finalizado) return;
      finalizado = true;
      client.destroy();
      reject(erro);
    };

    client.setTimeout(TIMEOUT_MS);

    client.connect(JAVA_PORT, JAVA_HOST, () => {
      const pedido = {
        tipo: "PEDIDO_CALCULAR_PAINEL",
        pet,
        vaccines,
        medications,
        medicationLogs,
        consultations,
        hojeStr,
      };

      client.write(`${JSON.stringify(pedido)}\n`, "utf8");
    });

    client.on("data", (chunk) => {
      buffer += chunk.toString("utf8");

      const quebraLinha = buffer.indexOf("\n");
      if (quebraLinha === -1) return;

      const linhaJson = buffer.slice(0, quebraLinha).trim();

      try {
        const resposta = JSON.parse(linhaJson);

        // Encerra a sessao de forma limpa conforme o protocolo (PedidoParaSair)
        client.write(`${JSON.stringify({ tipo: "PEDIDO_PARA_SAIR" })}\n`, "utf8", () => {
          client.end();
        });

        if (finalizado) return;
        finalizado = true;

        if (resposta.tipo === "RESPOSTA_ERRO") {
          reject(new Error(resposta.mensagem || "Erro retornado pelo servidor Java."));
          return;
        }

        if (resposta.tipo !== "RESULTADO_PAINEL") {
          reject(new Error(`Resposta inesperada do servidor Java: ${resposta.tipo}`));
          return;
        }

        resolve({
          pet: resposta.pet,
          diasDesdeUltimaConsulta: resposta.diasDesdeUltimaConsulta,
          medicamentosHoje: resposta.medicamentosHoje,
          atrasados: resposta.atrasados,
          hoje: resposta.hoje,
          proximos7Dias: resposta.proximos7Dias,
        });
      } catch (erroParse) {
        concluirComErro(new Error(`Falha ao interpretar resposta do servidor Java: ${erroParse.message}`));
      }
    });

    client.on("timeout", () => {
      concluirComErro(new Error(`Tempo limite esgotado ao aguardar o servidor Java (${JAVA_HOST}:${JAVA_PORT}).`));
    });

    client.on("error", (erro) => {
      concluirComErro(erro);
    });
  });
}
