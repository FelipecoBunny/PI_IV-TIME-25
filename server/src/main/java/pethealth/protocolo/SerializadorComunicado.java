/*
Autoria: Felipe Nasser Coelho Moussa
RA: 25004922
 */
package pethealth.protocolo;

import java.util.HashMap;
import java.util.Map;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

public class SerializadorComunicado {

    private static final Gson GSON = new GsonBuilder().serializeNulls().create();
    private static final Map<String, Class<? extends Comunicado>> REGISTRO = new HashMap<>();

    static {
        registrar(ComunicadoDeDesligamento.TIPO, ComunicadoDeDesligamento.class);
        registrar(PedidoParaSair.TIPO, PedidoParaSair.class);
        registrar(RespostaErro.TIPO, RespostaErro.class);
        registrar(PedidoCalcularPainel.TIPO, PedidoCalcularPainel.class);
        registrar(ResultadoPainel.TIPO, ResultadoPainel.class);
    }

    public static void registrar(String tipo, Class<? extends Comunicado> classe) {
        REGISTRO.put(tipo, classe);
    }

    public static String paraJson(Comunicado comunicado) {
        return GSON.toJson(comunicado);
    }

    public static Comunicado deJson(String json) {
        if (json == null || json.isBlank()) {
            return null;
        }

        JsonObject objeto = JsonParser.parseString(json).getAsJsonObject();
        if (!objeto.has("tipo")) {
            throw new IllegalArgumentException("Mensagem JSON sem campo 'tipo'.");
        }

        String tipo = objeto.get("tipo").getAsString();
        Class<? extends Comunicado> classe = REGISTRO.getOrDefault(tipo, Comunicado.class);
        return GSON.fromJson(objeto, classe);
    }
}
