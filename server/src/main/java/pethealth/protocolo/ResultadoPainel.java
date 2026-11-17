/*
Autoria: Felipe Nasser Coelho Moussa
RA: 25004922
 */
package pethealth.protocolo;

import java.util.List;

import pethealth.dominio.ItemAgendado;
import pethealth.dominio.ItemHoje;
import pethealth.dominio.MedicamentoHoje;
import pethealth.dominio.PetResumo;

public class ResultadoPainel extends Comunicado {

    public static final String TIPO = "RESULTADO_PAINEL";

    private final PetResumo pet;
    private final Integer diasDesdeUltimaConsulta;
    private final List<MedicamentoHoje> medicamentosHoje;
    private final List<ItemAgendado> atrasados;
    private final List<ItemHoje> hoje;
    private final List<ItemAgendado> proximos7Dias;

    public ResultadoPainel(
            PetResumo pet,
            Integer diasDesdeUltimaConsulta,
            List<MedicamentoHoje> medicamentosHoje,
            List<ItemAgendado> atrasados,
            List<ItemHoje> hoje,
            List<ItemAgendado> proximos7Dias
    ) {
        super(TIPO);
        this.pet = pet;
        this.diasDesdeUltimaConsulta = diasDesdeUltimaConsulta;
        this.medicamentosHoje = medicamentosHoje;
        this.atrasados = atrasados;
        this.hoje = hoje;
        this.proximos7Dias = proximos7Dias;
    }

    public PetResumo getPet() {
        return this.pet;
    }

    public Integer getDiasDesdeUltimaConsulta() {
        return this.diasDesdeUltimaConsulta;
    }

    public List<MedicamentoHoje> getMedicamentosHoje() {
        return this.medicamentosHoje;
    }

    public List<ItemAgendado> getAtrasados() {
        return this.atrasados;
    }

    public List<ItemHoje> getHoje() {
        return this.hoje;
    }

    public List<ItemAgendado> getProximos7Dias() {
        return this.proximos7Dias;
    }
}
