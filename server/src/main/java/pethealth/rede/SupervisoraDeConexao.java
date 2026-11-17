package pethealth.rede;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import pethealth.protocolo.Comunicado;
import pethealth.protocolo.PedidoParaSair;
import pethealth.protocolo.RespostaErro;

public class SupervisoraDeConexao extends Thread {

    private Parceiro usuario;
    private final Socket conexao;
    private final ArrayList<Parceiro> usuarios;

    public SupervisoraDeConexao(Socket conexao, ArrayList<Parceiro> usuarios) throws Exception {
        if (conexao == null) {
            throw new Exception("Conexao ausente");
        }
        if (usuarios == null) {
            throw new Exception("Usuarios ausentes");
        }

        this.conexao = conexao;
        this.usuarios = usuarios;
    }

    @Override
    public void run() {
        PrintWriter transmissor;
        try {
            transmissor = new PrintWriter(
                    new OutputStreamWriter(this.conexao.getOutputStream(), StandardCharsets.UTF_8),
                    true
            );
        } catch (Exception erro) {
            return;
        }

        BufferedReader receptor;
        try {
            receptor = new BufferedReader(
                    new InputStreamReader(this.conexao.getInputStream(), StandardCharsets.UTF_8)
            );
        } catch (Exception erro) {
            try {
                transmissor.close();
            } catch (Exception falha) {
                // ignora falha no fechamento
            }
            return;
        }

        try {
            this.usuario = new Parceiro(this.conexao, receptor, transmissor);
        } catch (Exception erro) {
            return;
        }

        try {
            synchronized (this.usuarios) {
                this.usuarios.add(this.usuario);
            }

            for (;;) {
                Comunicado comunicado = this.usuario.envie();

                if (comunicado == null) {
                    removerUsuarioEDesconectar();
                    return;
                }

                if (comunicado instanceof PedidoParaSair) {
                    removerUsuarioEDesconectar();
                    return;
                }

                // Etapa 3: despachar os pedidos de negocio do PetHealth aqui
                this.usuario.receba(new RespostaErro("Operacao nao suportada: " + comunicado.getTipo()));
            }
        } catch (Exception erro) {
            try {
                removerUsuarioEDesconectar();
            } catch (Exception falha) {
                // ignora falha no encerramento
            }
        }
    }

    private void removerUsuarioEDesconectar() throws Exception {
        synchronized (this.usuarios) {
            this.usuarios.remove(this.usuario);
        }
        this.usuario.adeus();
    }
}
