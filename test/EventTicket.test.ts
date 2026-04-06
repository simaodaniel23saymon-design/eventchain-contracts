import hre from "hardhat";
import { expect } from "chai";
import { ContractFactory, parseEther } from "ethers";
import type { Signer } from "ethers";

// ========================
// HELPERS
// ========================

let connectionPromise: ReturnType<typeof hre.network.connect> | null = null;

async function getConnection() {
  if (!connectionPromise) {
    connectionPromise = hre.network.connect();
  }
  return connectionPromise;
}

async function getProvider() {
  const { ethers } = await getConnection();
  return ethers.provider;
}

async function getSigners() {
  const { ethers } = await getConnection();
  return ethers.getSigners();
}

async function deployContract(name: string, signer: Signer, args: any[]) {
  const artifact = await hre.artifacts.readArtifact(name);
  const factory = new ContractFactory(artifact.abi, artifact.bytecode, signer);
  const contract = await factory.deploy(...args);
  await contract.waitForDeployment();
  return contract;
}

// ========================
// TESTES — EventTicket
// ========================

describe("EventTicket", function () {

  async function deployEventTicket() {
    const signers = await getSigners();
    const organizador = signers[0];
    const comprador1  = signers[1];
    const comprador2  = signers[2];
    const scalper     = signers[3];

    const dataFutura     = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;
    const precoTicket    = parseEther("0.1");
    const maxTickets     = 100n;
    const precoMaxRevenda = parseEther("0.3");
    const royalty        = 1000n;

    const contrato = await deployContract("EventTicket", organizador, [
      "Festival EventChain 2025",
      dataFutura,
      "Luanda, Angola",
      precoTicket,
      maxTickets,
      precoMaxRevenda,
      await organizador.getAddress(),
      royalty,
    ]);

    return { contrato, organizador, comprador1, comprador2, scalper, precoTicket, maxTickets };
  }

  // ========================
  // DEPLOY
  // ========================
  describe("Deploy", function () {
    it("Deve inicializar com os dados correctos", async function () {
      const { contrato, organizador, precoTicket, maxTickets } = await deployEventTicket();

      expect(await contrato.nomeEvento()).to.equal("Festival EventChain 2025");
      expect(await contrato.localEvento()).to.equal("Luanda, Angola");
      expect(await contrato.precoTicket()).to.equal(precoTicket);
      expect(await contrato.maxTickets()).to.equal(maxTickets);
      expect(await contrato.vendaActiva()).to.equal(true);
      expect(await contrato.owner()).to.equal(await organizador.getAddress());
    });
  });

  // ========================
  // COMPRA DE TICKETS
  // ========================
  describe("comprarTicket", function () {
    it("Deve fazer mint de um ticket com sucesso", async function () {
      const { contrato, comprador1, precoTicket } = await deployEventTicket();

      await contrato.connect(comprador1).comprarTicket("VIP", "ipfs://QmExemplo123", { value: precoTicket });

      expect(await contrato.ownerOf(1)).to.equal(await comprador1.getAddress());
      expect(await contrato.categoriaTicket(1)).to.equal("VIP");
      expect(await contrato.totalVendidos()).to.equal(1n);
    });

    it("Deve falhar se o valor enviado for incorrecto", async function () {
      const { contrato, comprador1 } = await deployEventTicket();

      await expect(
        contrato.connect(comprador1).comprarTicket("GERAL", "ipfs://abc", { value: parseEther("0.05") })
      ).to.be.revertedWith("Valor enviado incorreto");
    });

    it("Deve falhar se a venda estiver desactivada", async function () {
      const { contrato, organizador, comprador1, precoTicket } = await deployEventTicket();

      await contrato.connect(organizador).toggleVenda(false);

      await expect(
        contrato.connect(comprador1).comprarTicket("VIP", "ipfs://abc", { value: precoTicket })
      ).to.be.revertedWith("Venda de tickets nao esta activa");
    });

    it("Deve falhar se o comprador estiver na blacklist", async function () {
      const { contrato, organizador, scalper, precoTicket } = await deployEventTicket();

      await contrato.connect(organizador).adicionarBlacklist(await scalper.getAddress());

      await expect(
        contrato.connect(scalper).comprarTicket("VIP", "ipfs://abc", { value: precoTicket })
      ).to.be.revertedWith("Endereco bloqueado pelo organizador");
    });

    it("Deve emitir evento TicketMintado", async function () {
      const { contrato, comprador1, precoTicket } = await deployEventTicket();

      await expect(
        contrato.connect(comprador1).comprarTicket("CAMAROTE", "ipfs://abc", { value: precoTicket })
      )
        .to.emit(contrato, "TicketMintado")
        .withArgs(await comprador1.getAddress(), 1n, "CAMAROTE");
    });

    it("Não deve permitir mint além do limite máximo", async function () {
      const signers = await getSigners();
      const organizador = signers[0];
      const dataFutura = Math.floor(Date.now() / 1000) + 86400 * 30;
      const precoTicket = parseEther("0.1");

      const contrato = await deployContract("EventTicket", organizador, [
        "Evento Limitado", dataFutura, "Luanda",
        precoTicket, 2n, parseEther("0.3"),
        await organizador.getAddress(), 500n,
      ]);

      await contrato.connect(signers[1]).comprarTicket("VIP", "ipfs://1", { value: precoTicket });
      await contrato.connect(signers[2]).comprarTicket("VIP", "ipfs://2", { value: precoTicket });

      await expect(
        contrato.connect(signers[3]).comprarTicket("VIP", "ipfs://3", { value: precoTicket })
      ).to.be.revertedWith("Todos os tickets foram vendidos");
    });
  });

  // ========================
  // ROYALTIES
  // ========================
  describe("Royalties (EIP-2981)", function () {
    it("Deve retornar os royalties correctos para um ticket", async function () {
      const { contrato, organizador, comprador1, precoTicket } = await deployEventTicket();

      await contrato.connect(comprador1).comprarTicket("VIP", "ipfs://abc", { value: precoTicket });

      const precoRevenda = parseEther("0.2");
      const [destinatario, valor] = await contrato.royaltyInfo(1n, precoRevenda);

      expect(destinatario).to.equal(await organizador.getAddress());
      expect(valor).to.equal(parseEther("0.02")); // 10% de 0.2 ETH
    });
  });

  // ========================
  // VERIFICAÇÃO DE TICKET
  // ========================
  describe("verificarTicket", function () {
    it("Deve retornar true para o dono correcto", async function () {
      const { contrato, comprador1, precoTicket } = await deployEventTicket();

      await contrato.connect(comprador1).comprarTicket("GERAL", "ipfs://abc", { value: precoTicket });

      expect(await contrato.verificarTicket(await comprador1.getAddress(), 1n)).to.equal(true);
    });

    it("Deve retornar false para endereço errado", async function () {
      const { contrato, comprador1, comprador2, precoTicket } = await deployEventTicket();

      await contrato.connect(comprador1).comprarTicket("GERAL", "ipfs://abc", { value: precoTicket });

      expect(await contrato.verificarTicket(await comprador2.getAddress(), 1n)).to.equal(false);
    });
  });

  // ========================
  // RETIRADA DE FUNDOS
  // ========================
  describe("retirarFundos", function () {
    it("Deve permitir ao organizador retirar os fundos", async function () {
      const { contrato, organizador, comprador1, precoTicket } = await deployEventTicket();
      const provider = await getProvider();

      await contrato.connect(comprador1).comprarTicket("VIP", "ipfs://abc", { value: precoTicket });

      const saldoAntes = await provider.getBalance(await organizador.getAddress());
      const tx = await contrato.connect(organizador).retirarFundos();
      const recibo = await tx.wait();
      const gasPrice = recibo!.effectiveGasPrice ?? recibo!.gasPrice;
      const gasCusto = gasPrice ? recibo!.gasUsed * gasPrice : 0n;
      const saldoDepois = await provider.getBalance(await organizador.getAddress());

      expect(saldoDepois).to.equal(saldoAntes + precoTicket - gasCusto);
    });

    it("Deve falhar se não houver fundos", async function () {
      const { contrato, organizador } = await deployEventTicket();

      await expect(contrato.connect(organizador).retirarFundos()).to.be.revertedWith("Sem fundos para retirar");
    });

    it("Não deve permitir que não-organizadores retirem fundos", async function () {
      const { contrato, comprador1, precoTicket } = await deployEventTicket();

      await contrato.connect(comprador1).comprarTicket("VIP", "ipfs://abc", { value: precoTicket });

      await expect(
        contrato.connect(comprador1).retirarFundos()
      )
        .to.be.revertedWithCustomError(contrato, "OwnableUnauthorizedAccount")
        .withArgs(await comprador1.getAddress());
    });
  });
});
