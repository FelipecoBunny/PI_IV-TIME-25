/*
Autoria: Felipe Nasser Coelho Moussa
RA: 25004922
 */
package pethealth.servico;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import pethealth.dominio.ConsultaInfo;
import pethealth.dominio.ItemAgendado;
import pethealth.dominio.ItemHoje;
import pethealth.dominio.MedicamentoHoje;
import pethealth.dominio.MedicamentoInfo;
import pethealth.dominio.PetInfo;
import pethealth.dominio.PetResumo;
import pethealth.dominio.RegistroMedicamentoInfo;
import pethealth.dominio.VacinaInfo;
import pethealth.protocolo.PedidoCalcularPainel;
import pethealth.protocolo.ResultadoPainel;

public class CalculadoraPainelService {

    public static ResultadoPainel calcularPainel(PedidoCalcularPainel pedido) {
        if (pedido == null || pedido.getPet() == null) {
            throw new IllegalArgumentException("Dados do pet ausentes no pedido.");
        }
        if (pedido.getHojeStr() == null || pedido.getHojeStr().isBlank()) {
            throw new IllegalArgumentException("Data de referencia (hojeStr) ausente.");
        }

        String hojeStr = pedido.getHojeStr();
        LocalDate hoje = LocalDate.parse(hojeStr);
        String limite7DiasStr = hoje.plusDays(7).toString();

        List<ItemAgendado> atrasados = new ArrayList<>();
        List<ItemHoje> hojeLista = new ArrayList<>();
        List<ItemAgendado> proximos7Dias = new ArrayList<>();
        List<MedicamentoHoje> medicamentosHoje = new ArrayList<>();

        // Vacinas
        for (VacinaInfo v : pedido.getVaccines()) {
            if (v == null || !"pendente".equals(v.getStatus()) || v.getProximaDose() == null || v.getProximaDose().isBlank()) {
                continue;
            }
            String doseData = v.getProximaDose();

            if (doseData.compareTo(hojeStr) < 0) {
                atrasados.add(new ItemAgendado(v.getId(), "vacina", v.getTitulo(), doseData));
            } else if (doseData.compareTo(hojeStr) > 0 && doseData.compareTo(limite7DiasStr) <= 0) {
                proximos7Dias.add(new ItemAgendado(v.getId(), "vacina", v.getTitulo(), doseData));
            }
        }

        // Consultas
        String ultimaConsulta = null;
        for (ConsultaInfo c : pedido.getConsultations()) {
            if (c == null || c.getData() == null) {
                continue;
            }
            if ("realizada".equals(c.getStatus()) && c.getData().compareTo(hojeStr) <= 0) {
                if (ultimaConsulta == null || c.getData().compareTo(ultimaConsulta) > 0) {
                    ultimaConsulta = c.getData();
                }
            }
            if ("agendada".equals(c.getStatus())) {
                if (c.getData().equals(hojeStr)) {
                    hojeLista.add(new ItemHoje(c.getId(), "consulta", c.getMotivo(), c.getHorario()));
                } else if (c.getData().compareTo(hojeStr) > 0 && c.getData().compareTo(limite7DiasStr) <= 0) {
                    proximos7Dias.add(new ItemAgendado(c.getId(), "consulta", c.getMotivo(), c.getData()));
                }
            }
        }

        // Medicamentos de hoje (0 = domingo a 6 = sábado, igual ao JS)
        int diaSemanaHoje = hoje.getDayOfWeek().getValue() % 7;
        List<RegistroMedicamentoInfo> logs = pedido.getMedicationLogs();

        for (MedicamentoInfo m : pedido.getMedications()) {
            if (m == null || !"ativo".equals(m.getStatus())) {
                continue;
            }
            if (m.getDataInicio() != null && m.getDataInicio().compareTo(hojeStr) > 0) {
                continue;
            }
            if (m.getDataFim() != null && !m.getDataFim().isBlank() && m.getDataFim().compareTo(hojeStr) < 0) {
                continue;
            }
            if (m.getDiasDaSemana() == null || !m.getDiasDaSemana().contains(diaSemanaHoje)) {
                continue;
            }
            if (m.getHorarios() == null) {
                continue;
            }

            for (String horario : m.getHorarios()) {
                boolean tomado = logs.stream().anyMatch(log
                        -> log != null
                        && log.getMedicationId() != null
                        && log.getMedicationId().equals(m.getId())
                        && hojeStr.equals(log.getData())
                        && horario.equals(log.getHorario())
                );

                medicamentosHoje.add(new MedicamentoHoje(
                        m.getId(),
                        m.getMedicamento(),
                        horario,
                        m.getDose(),
                        tomado
                ));
            }
        }

        // Ordenar
        atrasados.sort(Comparator.comparing(ItemAgendado::getData));
        hojeLista.sort(Comparator.comparing(ItemHoje::getRegistro, Comparator.nullsLast(Comparator.naturalOrder())));
        proximos7Dias.sort(Comparator.comparing(ItemAgendado::getData));
        medicamentosHoje.sort(Comparator.comparing(MedicamentoHoje::getHorario, Comparator.nullsLast(Comparator.naturalOrder())));

        Integer diasDesdeUltimaConsulta = null;
        if (ultimaConsulta != null) {
            diasDesdeUltimaConsulta = (int) ChronoUnit.DAYS.between(LocalDate.parse(ultimaConsulta), hoje);
        }

        PetInfo pet = pedido.getPet();
        PetResumo petResumo = new PetResumo(pet.getId(), pet.getNome(), pet.getEspecie(), pet.getRaca());

        return new ResultadoPainel(
                petResumo,
                diasDesdeUltimaConsulta,
                medicamentosHoje,
                atrasados,
                hojeLista,
                proximos7Dias
        );
    }
}
