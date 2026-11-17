package pethealth.protocolo;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import java.util.HashMap;
import java.util.Map;

public class SerializadorComunicado {

    private static final Gson GSON = new Gson();
    private static final Map<String, Class<? extends Comunicado>> REGISTRO = new HashMap<>();

    static {
        registrar(ComunicadoDeDesligamento.TIPO, ComunicadoDeDesligamento.class);
        registrar(PedidoParaSair.TIPO, PedidoParaSair.class);
        registrar(RespostaErro.TIPO, RespostaErro.class);
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
