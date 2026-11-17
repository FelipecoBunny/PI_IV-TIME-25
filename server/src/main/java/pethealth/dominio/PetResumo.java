/*
Autoria: Felipe Nasser Coelho Moussa
RA: 25004922
 */
package pethealth.dominio;

public class PetResumo {

    private final String id;
    private final String nome;
    private final String especie;
    private final String raca;

    public PetResumo(String id, String nome, String especie, String raca) {
        this.id = id;
        this.nome = nome;
        this.especie = especie;
        this.raca = raca;
    }

    public String getId() {
        return this.id;
    }

    public String getNome() {
        return this.nome;
    }

    public String getEspecie() {
        return this.especie;
    }

    public String getRaca() {
        return this.raca;
    }
}
