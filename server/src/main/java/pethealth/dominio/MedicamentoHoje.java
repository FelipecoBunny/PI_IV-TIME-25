/*
Autoria: Felipe Nasser Coelho Moussa
RA: 25004922
 */
package pethealth.dominio;

public class MedicamentoHoje {

    private final String id;
    private final String nome;
    private final String horario;
    private final String dose;
    private final boolean tomado;

    public MedicamentoHoje(String id, String nome, String horario, String dose, boolean tomado) {
        this.id = id;
        this.nome = nome;
        this.horario = horario;
        this.dose = dose;
        this.tomado = tomado;
    }

    public String getId() {
        return this.id;
    }

    public String getNome() {
        return this.nome;
    }

    public String getHorario() {
        return this.horario;
    }

    public String getDose() {
        return this.dose;
    }

    public boolean isTomado() {
        return this.tomado;
    }
}
