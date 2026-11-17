/*
Autoria: Felipe Nasser Coelho Moussa
RA: 25004922
 */
package pethealth.rede;

import java.net.ServerSocket;
import java.net.Socket;
import java.util.ArrayList;

public class AceitadoraDeConexao extends Thread {

    private final ServerSocket pedido;
    private final ArrayList<Parceiro> usuarios;
    private volatile boolean ativa = true;

    public AceitadoraDeConexao(String porta, ArrayList<Parceiro> usuarios) throws Exception {
        if (porta == null) {
            throw new Exception("Porta ausente");
        }

        try {
            this.pedido = new ServerSocket(Integer.parseInt(porta));
        } catch (Exception erro) {
            throw new Exception("Porta invalida", erro);
        }

        if (usuarios == null) {
            throw new Exception("Usuarios ausentes");
        }

        this.usuarios = usuarios;
    }

    @Override
    public void run() {
        while (this.ativa) {
            Socket conexao;
            try {
                conexao = this.pedido.accept();
            } catch (Exception erro) {
                break;
            }

            try {
                SupervisoraDeConexao supervisora = new SupervisoraDeConexao(conexao, this.usuarios);
                supervisora.start();
            } catch (Exception erro) {
                // ignora falha pontual na criacao da supervisora
            }
        }
    }

    public void pare() {
        this.ativa = false;
        try {
            this.pedido.close();
        } catch (Exception erro) {
            // ignora falha ao fechar o ServerSocket
        }
    }
}
