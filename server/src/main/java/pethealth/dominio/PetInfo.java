/*
Autoria: Felipe Nasser Coelho Moussa
RA: 25004922
 */
package pethealth.dominio;

import com.google.gson.annotations.SerializedName;

public class PetInfo {

    @SerializedName("_id")
    private String id;
    private String nome;
    private String especie;
    private String raca;

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
