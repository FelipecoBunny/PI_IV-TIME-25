/*
* Autoria: Felipe Nasser Coelho Moussa
* RA: 25004922
 */

 /*
 * Testes unitários INTRACLASSE (Particionamento por ESTADOS) da classe Parceiro
 */
package pethealth.testes;

import java.io.BufferedReader;
import java.io.PrintWriter;
import java.io.StringReader;
import java.io.StringWriter;
import java.net.Socket;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

import pethealth.protocolo.Comunicado;
import pethealth.protocolo.ComunicadoDeDesligamento;
import pethealth.protocolo.PedidoParaSair;
import pethealth.protocolo.RespostaErro;
import pethealth.rede.Parceiro;

class ParceiroTest {

    // Cria um Parceiro
    private Parceiro criarParceiro(String entrada, StringWriter saida) throws Exception {
        BufferedReader receptor = new BufferedReader(new StringReader(entrada));
        PrintWriter transmissor = new PrintWriter(saida, true);
        return new Parceiro(new Socket(), receptor, transmissor);
    }

    // Não pode criar Parceiro faltando socket
    @Test
    void testConstrutorRejeitaParametrosNulos() {
        BufferedReader receptor = new BufferedReader(new StringReader(""));
        PrintWriter transmissor = new PrintWriter(new StringWriter(), true);
        Socket socket = new Socket();

        assertThrows(Exception.class, () -> new Parceiro(null, receptor, transmissor));
        assertThrows(Exception.class, () -> new Parceiro(socket, null, transmissor));
        assertThrows(Exception.class, () -> new Parceiro(socket, receptor, null));
    }

    // Envia uma mensagem e confere se saiu como JSON
    @Test
    void testRecebaSerializaETransmiteJson() throws Exception {
        StringWriter saida = new StringWriter();
        Parceiro parceiro = criarParceiro("", saida);

        parceiro.receba(new RespostaErro("Pet invalido"));

        String linhaEnviada = saida.toString().trim();
        assertTrue(linhaEnviada.contains("\"tipo\":\"ERRO\""));
        assertTrue(linhaEnviada.contains("\"mensagem\":\"Pet invalido\""));
        parceiro.adeus();
    }

    // Lê duas mensagens seguidas e depois chega no fim
    @Test
    void testEnvieConsomeMensagensEmSequencia() throws Exception {
        String entrada = """
                {"tipo":"PEDIDO_PARA_SAIR"}
                {"tipo":"COMUNICADO_DESLIGAMENTO"}
                """;
        Parceiro parceiro = criarParceiro(entrada, new StringWriter());

        Comunicado primeiro = parceiro.envie();
        Comunicado segundo = parceiro.envie();
        Comunicado fim = parceiro.envie();

        assertInstanceOf(PedidoParaSair.class, primeiro);
        assertInstanceOf(ComunicadoDeDesligamento.class, segundo);
        assertNull(fim);
        parceiro.adeus();
    }

    // Espiar duas vezes devolve a mesma mensagem; depois o envie consome e passa pra proxima
    @Test
    void testEspieNaoConsomeEEnvieConsomeVoltandoAoEstadoVazio() throws Exception {
        String entrada = """
                {"tipo":"PEDIDO_PARA_SAIR"}
                {"tipo":"ERRO","mensagem":"Falha teste"}
                """;
        Parceiro parceiro = criarParceiro(entrada, new StringWriter());

        Comunicado espiado1 = parceiro.espie();
        Comunicado espiado2 = parceiro.espie();
        Comunicado consumido = parceiro.envie();
        Comunicado proximo = parceiro.envie();

        assertInstanceOf(PedidoParaSair.class, espiado1);
        assertSame(espiado1, espiado2);
        assertSame(espiado1, consumido);
        assertInstanceOf(RespostaErro.class, proximo);
        assertEquals("Falha teste", ((RespostaErro) proximo).getMensagem());
        parceiro.adeus();
    }

    // Quando não tem mais nada para ler, devolve null
    @Test
    void testFimDeFluxoRetornaNull() throws Exception {
        Parceiro parceiro = criarParceiro("", new StringWriter());

        assertNull(parceiro.espie());
        assertNull(parceiro.envie());
        parceiro.adeus();
    }

    // JSON quebrado deve dar erro de recepção
    @Test
    void testEnvieComJsonMalformadoLancaExcecao() throws Exception {
        Parceiro parceiro = criarParceiro("{json-invalido\n", new StringWriter());

        Exception ex = assertThrows(Exception.class, parceiro::envie);
        assertEquals("Erro de recepcao", ex.getMessage());
        parceiro.adeus();
    }

    // Depois de fechar com adeus(), não pode mais enviar nem ler
    @Test
    void testOperacoesAposAdeusComBufferVazioFalham() throws Exception {
        Parceiro parceiro = criarParceiro("{\"tipo\":\"PEDIDO_PARA_SAIR\"}\n", new StringWriter());
        parceiro.adeus();

        assertThrows(Exception.class, () -> parceiro.receba(new PedidoParaSair()));
        assertThrows(Exception.class, parceiro::espie);
        assertThrows(Exception.class, parceiro::envie);
    }

    // FALHA: aceita mandar null e escreve o texto "null" no socket em vez de dar erro
    @Test
    void testRecebaComunicadoNulo() throws Exception {
        StringWriter saida = new StringWriter();
        Parceiro parceiro = criarParceiro("", saida);

        assertThrows(Exception.class, () -> parceiro.receba(null));
        parceiro.adeus();
    }

    // FALHA: linha em branco volta null e derruba o cliente mesmo tendo mensagem depois
    @Test
    void testLinhaEmBrancoNaoDeveriaSerTratadaComoEof() throws Exception {
        String entrada = "\n{\"tipo\":\"PEDIDO_PARA_SAIR\"}\n";
        Parceiro parceiro = criarParceiro(entrada, new StringWriter());

        Comunicado primeiro = parceiro.envie();
        assertNotNull(primeiro, "Linha em branco foi devolvida como null (EOF), derrubando a conexao.");
        parceiro.adeus();
    }

    // FALHA: mesmo depois de fechar com adeus(), ainda devolve a mensagem que estava guardada pelo espie()
    @Test
    void testEnvieAposAdeusComComunicadoEspiado() throws Exception {
        Parceiro parceiro = criarParceiro("{\"tipo\":\"PEDIDO_PARA_SAIR\"}\n", new StringWriter());

        assertNotNull(parceiro.espie());
        parceiro.adeus();

        assertThrows(Exception.class, parceiro::envie,
                "Deveria lancar excecao ao tentar consumir comunicado apos adeus().");
    }
}
