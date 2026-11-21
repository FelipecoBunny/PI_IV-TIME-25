/*
* Autoria: Felipe Nasser Coelho Moussa
* RA: 25004922
 */

 /*
 * Testes unitários INTRACLASSE (Particionamento por CATEGORIAS DE METODOS) da classe SerializadorComunicado
 */
package pethealth.testes;

import java.util.Collections;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

import pethealth.dominio.PetResumo;
import pethealth.protocolo.Comunicado;
import pethealth.protocolo.ComunicadoDeDesligamento;
import pethealth.protocolo.PedidoCalcularPainel;
import pethealth.protocolo.PedidoParaSair;
import pethealth.protocolo.RespostaErro;
import pethealth.protocolo.ResultadoPainel;
import pethealth.protocolo.SerializadorComunicado;

class SerializadorComunicadoTest {

    // Classe para testar o cadastro de um tipo novo
    static class ComunicadoPingTeste extends Comunicado {

        public static final String TIPO = "PING_TESTE_UNITARIO";
        private String origem;

        public ComunicadoPingTeste() {
            super(TIPO);
        }

        public String getOrigem() {
            return this.origem;
        }
    }

    // SERIALIZAR (objeto -> JSON)
    // Transforma objetos em JSON mantendo campos nulos
    @Test
    void testParaJsonSerializaSubclassesENulos() {
        String jsonSair = SerializadorComunicado.paraJson(new PedidoParaSair());
        assertEquals("{\"tipo\":\"PEDIDO_PARA_SAIR\"}", jsonSair);

        ResultadoPainel resultado = new ResultadoPainel(
                new PetResumo("p1", "Garfield", "Gato", null),
                null,
                Collections.emptyList(),
                Collections.emptyList(),
                Collections.emptyList(),
                Collections.emptyList()
        );
        String jsonResultado = SerializadorComunicado.paraJson(resultado);

        assertTrue(jsonResultado.contains("\"tipo\":\"RESULTADO_PAINEL\""));
        assertTrue(jsonResultado.contains("\"diasDesdeUltimaConsulta\":null"));
        assertTrue(jsonResultado.contains("\"raca\":null"));
    }

    // FALHA: passar null devolve o texto "null" em vez de dar erro
    @Test
    void testParaJsonComunicadoNulo() {
        assertThrows(IllegalArgumentException.class, () -> SerializadorComunicado.paraJson(null));
    }

    // DESSERIALIZAR (JSON -> objeto)
    // Reconhece cada tipo cadastrado e usa Comunicado genérico para tipo desconhecido
    @Test
    void testDeJsonTiposRegistradosEDesconhecido() {
        assertInstanceOf(PedidoParaSair.class,
                SerializadorComunicado.deJson("{\"tipo\":\"PEDIDO_PARA_SAIR\"}"));
        assertInstanceOf(ComunicadoDeDesligamento.class,
                SerializadorComunicado.deJson("{\"tipo\":\"COMUNICADO_DESLIGAMENTO\"}"));

        Comunicado erro = SerializadorComunicado.deJson("{\"tipo\":\"ERRO\",\"mensagem\":\"Falha\"}");
        assertInstanceOf(RespostaErro.class, erro);
        assertEquals("Falha", ((RespostaErro) erro).getMensagem());

        assertInstanceOf(PedidoCalcularPainel.class,
                SerializadorComunicado.deJson("{\"tipo\":\"PEDIDO_CALCULAR_PAINEL\"}"));
        assertInstanceOf(ResultadoPainel.class,
                SerializadorComunicado.deJson("{\"tipo\":\"RESULTADO_PAINEL\"}"));

        Comunicado desconhecido = SerializadorComunicado.deJson("{\"tipo\":\"OPERACAO_DESCONHECIDA\"}");
        assertEquals(Comunicado.class, desconhecido.getClass());
        assertEquals("OPERACAO_DESCONHECIDA", desconhecido.getTipo());
    }

    // Entrada nula devolve null
    @Test
    void testDeJsonNuloRetornaNull() {
        assertNull(SerializadorComunicado.deJson(null));
    }

    // JSON sem o campo "tipo" deve dar erro
    @Test
    void testDeJsonSemCampoTipoLancaExcecao() {
        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> SerializadorComunicado.deJson("{}"));
        assertTrue(ex.getMessage().contains("tipo"));
    }

    // FALHA: linha só com espaços devolve null em vez de dar erro
    @Test
    void testDeJsonLinhaEmBranco() {
        assertThrows(IllegalArgumentException.class, () -> SerializadorComunicado.deJson("   "));
    }

    // FALHA: "tipo": null da UnsupportedOperationException em vez de IllegalArgumentException
    @Test
    void testDeJsonTipoNulo() {
        assertThrows(IllegalArgumentException.class,
                () -> SerializadorComunicado.deJson("{\"tipo\":null}"));
    }

    // FALHA: lista JSON "[1,2,3]" ou JSON quebrado lancam erros do Gson em vez de IllegalArgumentException
    @Test
    void testDeJsonNaoObjetoEMalformado() {
        assertThrows(IllegalArgumentException.class, () -> SerializadorComunicado.deJson("[1,2,3]"));
        assertThrows(IllegalArgumentException.class, () -> SerializadorComunicado.deJson("{quebrado"));
    }

    // REGISTRAR NOVOS TIPOS
    // Cadastra um tipo novo e confere se o deJson reconhece
    @Test
    void testRegistrarNovaSubclasseEDesserializar() {
        SerializadorComunicado.registrar(ComunicadoPingTeste.TIPO, ComunicadoPingTeste.class);

        Comunicado c = SerializadorComunicado.deJson(
                "{\"tipo\":\"PING_TESTE_UNITARIO\",\"origem\":\"node\"}");

        assertInstanceOf(ComunicadoPingTeste.class, c);
        assertEquals("node", ((ComunicadoPingTeste) c).getOrigem());
    }

    // FALHA: deixa registrar classe nula sem validar e pode quebrar o deJson depois
    @Test
    void testRegistrarParametrosNulos() {
        assertThrows(IllegalArgumentException.class,
                () -> SerializadorComunicado.registrar("TIPO_INVALIDO_CLASSE_NULA", null));
    }
}
