/*
Autoria: Felipe Nasser Coelho Moussa
RA: 25004922
 */
package pethealth.rede;

import java.io.BufferedReader;
import java.io.PrintWriter;
import java.net.Socket;
import java.util.concurrent.Semaphore;

import pethealth.protocolo.Comunicado;
import pethealth.protocolo.SerializadorComunicado;

public class Parceiro {

    private final Socket conexao;
    private final BufferedReader receptor;
    private final PrintWriter transmissor;

    private Comunicado proximoComunicado = null;
    private final Semaphore mutEx = new Semaphore(1, true);

    public Parceiro(Socket conexao, BufferedReader receptor, PrintWriter transmissor) throws Exception {
        if (conexao == null) {
            throw new Exception("Conexao ausente");
        }
        if (receptor == null) {
            throw new Exception("Receptor ausente");
        }
        if (transmissor == null) {
            throw new Exception("Transmissor ausente");
        }

        this.conexao = conexao;
        this.receptor = receptor;
        this.transmissor = transmissor;
    }

    // Envia comunicado em JSON
    public void receba(Comunicado x) throws Exception {
        try {
            String json = SerializadorComunicado.paraJson(x);
            this.transmissor.println(json);
            if (this.transmissor.checkError()) {
                throw new Exception("Erro de transmissao");
            }
        } catch (Exception erro) {
            throw new Exception("Erro de transmissao", erro);
        }
    }

    // Lê o próximo comunicado sem consumir
    public Comunicado espie() throws Exception {
        try {
            this.mutEx.acquireUninterruptibly();
            if (this.proximoComunicado == null) {
                String linha = this.receptor.readLine();
                this.proximoComunicado = SerializadorComunicado.deJson(linha);
            }
            this.mutEx.release();
            return this.proximoComunicado;
        } catch (Exception erro) {
            this.mutEx.release();
            throw new Exception("Erro de recepcao", erro);
        }
    }

    // Entrega e limpa o comunicado em espera
    public Comunicado envie() throws Exception {
        try {
            if (this.proximoComunicado == null) {
                String linha = this.receptor.readLine();
                this.proximoComunicado = SerializadorComunicado.deJson(linha);
            }
            Comunicado ret = this.proximoComunicado;
            this.proximoComunicado = null;
            return ret;
        } catch (Exception erro) {
            throw new Exception("Erro de recepcao", erro);
        }
    }

    public void adeus() throws Exception {
        try {
            this.transmissor.close();
            this.receptor.close();
            this.conexao.close();
        } catch (Exception erro) {
            throw new Exception("Erro de desconexao", erro);
        }
    }
}
