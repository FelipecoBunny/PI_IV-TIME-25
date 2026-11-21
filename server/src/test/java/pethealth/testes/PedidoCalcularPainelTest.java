/*
* Autoria: Felipe Nasser Coelho Moussa
* RA: 25004922
 */

 /*
 * Testes unitários INTRACLASSE (Particionamento por ATRIBUTOS) da classe PedidoCalcularPainel
 */
package pethealth.testes;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

import pethealth.protocolo.PedidoCalcularPainel;
import pethealth.protocolo.SerializadorComunicado;

class PedidoCalcularPainelTest {

    // Pedido recém-criado nasce com o tipo certo e listas vazias
    @Test
    void testConstrutorPadraoInicializaTipoEColecoesVazias() {
        PedidoCalcularPainel pedido = new PedidoCalcularPainel();

        assertEquals(PedidoCalcularPainel.TIPO, pedido.getTipo());
        assertNull(pedido.getPet());
        assertNull(pedido.getHojeStr());
        assertNotNull(pedido.getVaccines());
        assertNotNull(pedido.getMedications());
        assertNotNull(pedido.getMedicationLogs());
        assertNotNull(pedido.getConsultations());
        assertTrue(pedido.getVaccines().isEmpty());
        assertTrue(pedido.getMedications().isEmpty());
        assertTrue(pedido.getMedicationLogs().isEmpty());
        assertTrue(pedido.getConsultations().isEmpty());
    }

    // JSON sem listas e com raça nula continua devolvendo listas vazias
    @Test
    void testAtributosAusentesNoJson() {
        String json = """
                {
                  "tipo": "PEDIDO_CALCULAR_PAINEL",
                  "pet": { "_id": "pet-2", "nome": "Garfield", "especie": "Gato", "raca": null },
                  "hojeStr": ""
                }
                """;
        PedidoCalcularPainel pedido = (PedidoCalcularPainel) SerializadorComunicado.deJson(json);

        assertNotNull(pedido.getPet());
        assertEquals("pet-2", pedido.getPet().getId());
        assertEquals("Garfield", pedido.getPet().getNome());
        assertNull(pedido.getPet().getRaca());
        assertEquals("", pedido.getHojeStr());
        assertTrue(pedido.getVaccines().isEmpty());
        assertTrue(pedido.getMedications().isEmpty());
        assertTrue(pedido.getMedicationLogs().isEmpty());
        assertTrue(pedido.getConsultations().isEmpty());
    }

    // JSON completo preenche pet, data de hoje e todas as listas
    @Test
    void testAtributosPopuladosViaJson() {
        String json = """
                {
                  "tipo": "PEDIDO_CALCULAR_PAINEL",
                  "pet": { "_id": "pet-1", "nome": "Luna", "especie": "Cachorro", "raca": "SRD" },
                  "hojeStr": "2026-11-18",
                  "vaccines": [
                    { "_id": "v1", "titulo": "V10", "status": "pendente", "proximaDose": "2026-11-15" }
                  ],
                  "medications": [
                    {
                      "_id": "m1",
                      "medicamento": "Bravecto",
                      "status": "ativo",
                      "dataInicio": "2026-11-10",
                      "dataFim": null,
                      "diasDaSemana": [3],
                      "horarios": ["08:00"],
                      "dose": "1 comp"
                    }
                  ],
                  "medicationLogs": [
                    { "medicationId": "m1", "data": "2026-11-18", "horario": "08:00" }
                  ],
                  "consultations": [
                    { "_id": "c1", "motivo": "Checkup", "status": "agendada", "data": "2026-11-18", "horario": "16:00" }
                  ]
                }
                """;
        PedidoCalcularPainel pedido = (PedidoCalcularPainel) SerializadorComunicado.deJson(json);

        assertEquals("pet-1", pedido.getPet().getId());
        assertEquals("2026-11-18", pedido.getHojeStr());
        assertEquals(1, pedido.getVaccines().size());
        assertEquals("v1", pedido.getVaccines().get(0).getId());
        assertEquals(1, pedido.getMedications().size());
        assertEquals("m1", pedido.getMedications().get(0).getId());
        assertEquals(1, pedido.getMedicationLogs().size());
        assertEquals("m1", pedido.getMedicationLogs().get(0).getMedicationId());
        assertEquals(1, pedido.getConsultations().size());
        assertEquals("c1", pedido.getConsultations().get(0).getId());
    }

    // FALHA: getVaccines() devolve a lista original aberta
    @Test
    void testGetVaccinesProtegeEncapsulamento() {
        String json = """
                {
                  "tipo": "PEDIDO_CALCULAR_PAINEL",
                  "vaccines": [
                    { "_id": "v1", "titulo": "V10", "status": "pendente", "proximaDose": "2026-11-15" }
                  ]
                }
                """;
        PedidoCalcularPainel pedido = (PedidoCalcularPainel) SerializadorComunicado.deJson(json);

        assertThrows(UnsupportedOperationException.class, () -> pedido.getVaccines().clear(),
                "Getter devolveu lista interna mutavel em vez de visao imutavel.");
    }
}
