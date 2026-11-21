/*
* Autoria: Felipe Nasser Coelho Moussa
* RA: 25004922
 */

 /*
 * Testes unitários INTERCLASSE do servico principal CalculadoraPainelService.calcularPainel()
 * Data fixa de referencia: 2026-11-18
 */
package pethealth.testes;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

import pethealth.protocolo.PedidoCalcularPainel;
import pethealth.protocolo.ResultadoPainel;
import pethealth.protocolo.SerializadorComunicado;
import pethealth.servico.CalculadoraPainelService;

class CalculadoraPainelServiceInterclasseTest {

    // CENÁRIO NORMAL: simula o fluxo completo do painel (JSON -> calculo -> JSON)
    @Test
    void testCalcularPainelCenarioNormal() {
        String jsonPedido = """
                {
                  "tipo": "PEDIDO_CALCULAR_PAINEL",
                  "hojeStr": "2026-11-18",
                  "pet": {
                    "_id": "pet-1",
                    "nome": "Luna",
                    "especie": "Cachorro",
                    "raca": "SRD"
                  },
                  "vaccines": [
                    { "_id": "v1", "titulo": "V10 Atrasada Recente", "status": "pendente", "proximaDose": "2026-11-15" },
                    { "_id": "v2", "titulo": "V10 Atrasada Antiga", "status": "pendente", "proximaDose": "2026-11-10" },
                    { "_id": "v3", "titulo": "Antirrabica Limite 7d", "status": "pendente", "proximaDose": "2026-11-25" },
                    { "_id": "v4", "titulo": "Gripe Fora 7d", "status": "pendente", "proximaDose": "2026-11-26" },
                    { "_id": "v5", "titulo": "V10 Aplicada", "status": "aplicada", "proximaDose": "2026-11-12" }
                  ],
                  "consultations": [
                    { "_id": "c1", "motivo": "Revisao Orelha", "status": "realizada", "data": "2026-11-03", "horario": "10:00" },
                    { "_id": "c2", "motivo": "Consulta Antiga", "status": "realizada", "data": "2026-10-01", "horario": "08:00" },
                    { "_id": "c3", "motivo": "Checkup Tarde", "status": "agendada", "data": "2026-11-18", "horario": "16:00" },
                    { "_id": "c4", "motivo": "Exame Manha", "status": "agendada", "data": "2026-11-18", "horario": "09:30" },
                    { "_id": "c5", "motivo": "Retorno", "status": "agendada", "data": "2026-11-22", "horario": "09:00" }
                  ],
                  "medications": [
                    {
                      "_id": "m1",
                      "medicamento": "Bravecto",
                      "status": "ativo",
                      "dataInicio": "2026-11-10",
                      "dataFim": null,
                      "diasDaSemana": [1, 3, 5],
                      "horarios": ["20:00", "08:00"],
                      "dose": "1 comp"
                    },
                    {
                      "_id": "m2",
                      "medicamento": "Ainda Nao Comecou",
                      "status": "ativo",
                      "dataInicio": "2026-11-20",
                      "dataFim": null,
                      "diasDaSemana": [3],
                      "horarios": ["10:00"],
                      "dose": "5 ml"
                    },
                    {
                      "_id": "m3",
                      "medicamento": "Ja Terminou",
                      "status": "ativo",
                      "dataInicio": "2026-11-01",
                      "dataFim": "2026-11-17",
                      "diasDaSemana": [3],
                      "horarios": ["10:00"],
                      "dose": "5 ml"
                    },
                    {
                      "_id": "m4",
                      "medicamento": "Outro Dia da Semana",
                      "status": "ativo",
                      "dataInicio": "2026-11-01",
                      "dataFim": null,
                      "diasDaSemana": [0, 2, 4],
                      "horarios": ["10:00"],
                      "dose": "1 gota"
                    },
                    {
                      "_id": "m5",
                      "medicamento": "Concluido",
                      "status": "concluido",
                      "dataInicio": "2026-11-01",
                      "dataFim": null,
                      "diasDaSemana": [3],
                      "horarios": ["12:00"],
                      "dose": "10 gotas"
                    }
                  ],
                  "medicationLogs": [
                    { "medicationId": "m1", "data": "2026-11-18", "horario": "08:00" }
                  ]
                }
                """;

        PedidoCalcularPainel pedido = (PedidoCalcularPainel) SerializadorComunicado.deJson(jsonPedido);
        ResultadoPainel resultado = CalculadoraPainelService.calcularPainel(pedido);

        assertNotNull(resultado);
        assertEquals(ResultadoPainel.TIPO, resultado.getTipo());

        // Dados do pet
        assertEquals("pet-1", resultado.getPet().getId());
        assertEquals("Luna", resultado.getPet().getNome());
        assertEquals("Cachorro", resultado.getPet().getEspecie());
        assertEquals("SRD", resultado.getPet().getRaca());

        // Dias desde a ultima consulta realizada (15 dias)
        assertEquals(15, resultado.getDiasDesdeUltimaConsulta());

        // Atrasados em ordem de data
        assertEquals(2, resultado.getAtrasados().size());
        assertEquals("v2", resultado.getAtrasados().get(0).getId());
        assertEquals("2026-11-10", resultado.getAtrasados().get(0).getData());
        assertEquals("v1", resultado.getAtrasados().get(1).getId());
        assertEquals("2026-11-15", resultado.getAtrasados().get(1).getData());

        // Consultas de hoje em ordem de horário
        assertEquals(2, resultado.getHoje().size());
        assertEquals("c4", resultado.getHoje().get(0).getId());
        assertEquals("09:30", resultado.getHoje().get(0).getRegistro());
        assertEquals("c3", resultado.getHoje().get(1).getId());
        assertEquals("16:00", resultado.getHoje().get(1).getRegistro());

        // Próximos 7 dias (consulta e vacina no limite de 7 dias)
        assertEquals(2, resultado.getProximos7Dias().size());
        assertEquals("c5", resultado.getProximos7Dias().get(0).getId());
        assertEquals("consulta", resultado.getProximos7Dias().get(0).getTipo());
        assertEquals("v3", resultado.getProximos7Dias().get(1).getId());
        assertEquals("vacina", resultado.getProximos7Dias().get(1).getTipo());

        // Medicamentos de hoje em ordem de horário (08:00 tomado, 20:00 pendente)
        assertEquals(2, resultado.getMedicamentosHoje().size());
        assertEquals("08:00", resultado.getMedicamentosHoje().get(0).getHorario());
        assertTrue(resultado.getMedicamentosHoje().get(0).isTomado());
        assertEquals("20:00", resultado.getMedicamentosHoje().get(1).getHorario());
        assertFalse(resultado.getMedicamentosHoje().get(1).isTomado());

        // Confere se a resposta volta para JSON certinho
        String jsonSaida = SerializadorComunicado.paraJson(resultado);
        assertTrue(jsonSaida.contains("\"tipo\":\"RESULTADO_PAINEL\""));
        assertTrue(jsonSaida.contains("\"diasDesdeUltimaConsulta\":15"));
    }

    // CENÁRIO ALTERNATIVO: pet sem nenhuma vacina, consulta ou medicamento
    @Test
    void testCalcularPainelPetSemRegistros() {
        String jsonPedido = """
                {
                  "tipo": "PEDIDO_CALCULAR_PAINEL",
                  "hojeStr": "2026-11-18",
                  "pet": { "_id": "pet-2", "nome": "Garfield", "especie": "Gato", "raca": "Persa" }
                }
                """;
        PedidoCalcularPainel pedido = (PedidoCalcularPainel) SerializadorComunicado.deJson(jsonPedido);
        ResultadoPainel resultado = CalculadoraPainelService.calcularPainel(pedido);

        assertEquals("Garfield", resultado.getPet().getNome());
        assertNull(resultado.getDiasDesdeUltimaConsulta());
        assertTrue(resultado.getAtrasados().isEmpty());
        assertTrue(resultado.getHoje().isEmpty());
        assertTrue(resultado.getProximos7Dias().isEmpty());
        assertTrue(resultado.getMedicamentosHoje().isEmpty());
    }

    // CENÁRIO DE ERRO: faltando pedido, pet ou data de hoje
    @Test
    void testCalcularPainelCenarioErroEntradasAusentes() {
        assertThrows(IllegalArgumentException.class,
                () -> CalculadoraPainelService.calcularPainel(null));

        PedidoCalcularPainel semPet = (PedidoCalcularPainel) SerializadorComunicado.deJson(
                "{\"tipo\":\"PEDIDO_CALCULAR_PAINEL\",\"hojeStr\":\"2026-11-18\"}");
        IllegalArgumentException exPet = assertThrows(IllegalArgumentException.class,
                () -> CalculadoraPainelService.calcularPainel(semPet));
        assertTrue(exPet.getMessage().contains("pet"));

        PedidoCalcularPainel semHoje = (PedidoCalcularPainel) SerializadorComunicado.deJson(
                "{\"tipo\":\"PEDIDO_CALCULAR_PAINEL\",\"pet\":{\"_id\":\"p1\",\"nome\":\"Luna\"}}");
        IllegalArgumentException exHoje = assertThrows(IllegalArgumentException.class,
                () -> CalculadoraPainelService.calcularPainel(semHoje));
        assertTrue(exHoje.getMessage().contains("hojeStr"));

        PedidoCalcularPainel hojeEmBranco = (PedidoCalcularPainel) SerializadorComunicado.deJson(
                "{\"tipo\":\"PEDIDO_CALCULAR_PAINEL\",\"pet\":{\"_id\":\"p1\",\"nome\":\"Luna\"},\"hojeStr\":\"   \"}");
        assertThrows(IllegalArgumentException.class,
                () -> CalculadoraPainelService.calcularPainel(hojeEmBranco));
    }

    // FALHA: vacina pendente marcada para hoje some do painel
    @Test
    void testVacinaPendenteComProximaDoseHoje() {
        String jsonPedido = """
                {
                  "tipo": "PEDIDO_CALCULAR_PAINEL",
                  "hojeStr": "2026-11-18",
                  "pet": { "_id": "pet-1", "nome": "Luna", "especie": "Cachorro", "raca": "SRD" },
                  "vaccines": [
                    { "_id": "v-hoje", "titulo": "V10 Hoje", "status": "pendente", "proximaDose": "2026-11-18" }
                  ]
                }
                """;
        PedidoCalcularPainel pedido = (PedidoCalcularPainel) SerializadorComunicado.deJson(jsonPedido);
        ResultadoPainel resultado = CalculadoraPainelService.calcularPainel(pedido);

        boolean apareceuNoPainel = !resultado.getHoje().isEmpty()
                || !resultado.getAtrasados().isEmpty()
                || !resultado.getProximos7Dias().isEmpty();
        assertTrue(apareceuNoPainel, "Vacina pendente com proximaDose igual a hoje sumiu do painel.");
    }

    // FALHA: consulta agendada com data passada e ignorada em vez de aparecer em atrasados
    @Test
    void testConsultaAgendadaComDataAnteriorAHoje() {
        String jsonPedido = """
                {
                  "tipo": "PEDIDO_CALCULAR_PAINEL",
                  "hojeStr": "2026-11-18",
                  "pet": { "_id": "pet-1", "nome": "Luna", "especie": "Cachorro", "raca": "SRD" },
                  "consultations": [
                    { "_id": "c-atrasada", "motivo": "Retorno Perdido", "status": "agendada", "data": "2026-11-17", "horario": "14:00" }
                  ]
                }
                """;
        PedidoCalcularPainel pedido = (PedidoCalcularPainel) SerializadorComunicado.deJson(jsonPedido);
        ResultadoPainel resultado = CalculadoraPainelService.calcularPainel(pedido);

        assertEquals(1, resultado.getAtrasados().size(),
                "Consulta agendada com data anterior a hoje deveria aparecer em atrasados.");
    }

    // FALHA: data de hoje em formato errado da DateTimeParseException em vez de IllegalArgumentException
    @Test
    void testHojeStrComFormatoInvalido() {
        String jsonPedido = """
                {
                  "tipo": "PEDIDO_CALCULAR_PAINEL",
                  "hojeStr": "18/11/2026",
                  "pet": { "_id": "pet-1", "nome": "Luna", "especie": "Cachorro", "raca": "SRD" }
                }
                """;
        PedidoCalcularPainel pedido = (PedidoCalcularPainel) SerializadorComunicado.deJson(jsonPedido);

        assertThrows(IllegalArgumentException.class,
                () -> CalculadoraPainelService.calcularPainel(pedido));
    }

    // FALHA: consulta realizada com data em formato errado derruba o cálculo com DateTimeParseException
    @Test
    void testConsultaRealizadaComDataMalformada() {
        String jsonPedido = """
                {
                  "tipo": "PEDIDO_CALCULAR_PAINEL",
                  "hojeStr": "2026-11-18",
                  "pet": { "_id": "pet-1", "nome": "Luna", "especie": "Cachorro", "raca": "SRD" },
                  "consultations": [
                    { "_id": "c-ruim", "motivo": "Banho", "status": "realizada", "data": "18/11/2026", "horario": "10:00" }
                  ]
                }
                """;
        PedidoCalcularPainel pedido = (PedidoCalcularPainel) SerializadorComunicado.deJson(jsonPedido);

        assertThrows(IllegalArgumentException.class,
                () -> CalculadoraPainelService.calcularPainel(pedido));
    }

    // FALHA: horário nulo dentro da lista de horários da NullPointerException
    @Test
    void testMedicamentoComHorarioNuloNaLista() {
        String jsonPedido = """
                {
                  "tipo": "PEDIDO_CALCULAR_PAINEL",
                  "hojeStr": "2026-11-18",
                  "pet": { "_id": "pet-1", "nome": "Luna", "especie": "Cachorro", "raca": "SRD" },
                  "medications": [
                    {
                      "_id": "m1",
                      "medicamento": "Bravecto",
                      "status": "ativo",
                      "dataInicio": "2026-11-10",
                      "diasDaSemana": [3],
                      "horarios": [null],
                      "dose": "1 comp"
                    }
                  ],
                  "medicationLogs": [
                    { "medicationId": "m1", "data": "2026-11-18", "horario": "08:00" }
                  ]
                }
                """;
        PedidoCalcularPainel pedido = (PedidoCalcularPainel) SerializadorComunicado.deJson(jsonPedido);

        assertDoesNotThrow(() -> CalculadoraPainelService.calcularPainel(pedido),
                "Horario nulo na lista de horarios gerou NullPointerException em vez de ser ignorado/validado.");
    }
}
