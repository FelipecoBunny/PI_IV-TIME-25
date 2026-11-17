/*
Autoria: Felipe Nasser Coelho Moussa
RA: 25004922
 */
package pethealth.dominio;

public class ItemAgendado {

    private final String id;
    private final String tipo;
    private final String titulo;
    private final String data;

    public ItemAgendado(String id, String tipo, String titulo, String data) {
        this.id = id;
        this.tipo = tipo;
        this.titulo = titulo;
        this.data = data;
    }

    public String getId() {
        return this.id;
    }

    public String getTipo() {
        return this.tipo;
    }

    public String getTitulo() {
        return this.titulo;
    }

    public String getData() {
        return this.data;
    }
}
