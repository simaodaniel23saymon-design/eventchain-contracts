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

function dataFutura(dias = 30) {
  return Math.floor(Date.now() / 1000) + 60 * 60 * 24 * dias;
}

// ========================
// TESTES — EventFactory
// ========================

describe("EventFactory", function () {

  async function deployFactory() {
    const signers = await getSigners();
    const dono        = signers[0];
    const organizador1 = signers[1];
    const organizador2 = signers[2];

    const factory = await deployContract("EventFactory", dono, [250n]);

    return { factory, dono, organizador1, organizador2 };
  }

  describe("Deploy", function () {
    it("Deve inicializar com a taxa correcta", async function () {
      const { factory } = await deployFactory();
      expect(await factory.taxaPlataforma()).to.equal(250n);
    });

    it("Deve iniciar com zero eventos", async function () {
      const { factory } = await deployFactory();
      expect(await factory.totalEventos()).to.equal(0n);
    });
  });

  describe("criarEvento", function () {
    it("Deve criar um evento e fazer deploy do EventTicket", async function () {
      const { factory, organizador1 } = await deployFactory();

      await factory.connect(organizador1).criarEvento(
        "Afrobeats Night", dataFutura(30), "Luanda, Angola",
        parseEther("0.05"), 200n, parseEther("0.15"), 800n
      );

      expect(await factory.totalEventos()).to.equal(1n);
    });

    it("Deve emitir evento EventoCriado", async function () {
      const { factory, organizador1 } = await deployFactory();

      await expect(
        factory.connect(organizador1).criarEvento(
          "Tech Summit", dataFutura(60), "Maputo, Mozambique",
          parseEther("0.1"), 500n, parseEther("0.3"), 1000n
        )
      ).to.emit(factory, "EventoCriado");
    });

    it("Deve falhar se a data for no passado", async function () {
      const { factory, organizador1 } = await deployFactory();
      const dataPassada = Math.floor(Date.now() / 1000) - 86400;

      await expect(
        factory.connect(organizador1).criarEvento(
          "Evento Passado", dataPassada, "Luanda",
          parseEther("0.1"), 100n, parseEther("0.3"), 500n
        )
      ).to.be.revertedWith("Data do evento deve ser no futuro");
    });

    it("Deve falhar se royalty exceder 30%", async function () {
      const { factory, organizador1 } = await deployFactory();

      await expect(
        factory.connect(organizador1).criarEvento(
          "Evento Guloso", dataFutura(30), "Luanda",
          parseEther("0.1"), 100n, parseEther("0.3"), 5000n
        )
      ).to.be.revertedWith("Royalty nao pode exceder 30%");
    });

    it("Deve registar o evento no mapeamento do organizador", async function () {
      const { factory, organizador1 } = await deployFactory();

      await factory.connect(organizador1).criarEvento(
        "Evento A", dataFutura(30), "Luanda", parseEther("0.1"), 100n, parseEther("0.3"), 500n
      );
      await factory.connect(organizador1).criarEvento(
        "Evento B", dataFutura(60), "Luanda", parseEther("0.2"), 200n, parseEther("0.6"), 500n
      );

      const indices = await factory.eventosDoOrganizador(await organizador1.getAddress());
      expect(indices.length).to.equal(2);
    });

    it("Deve retornar os detalhes correctos do evento criado", async function () {
      const { factory, organizador1 } = await deployFactory();

      await factory.connect(organizador1).criarEvento(
        "Carnaval Digital", dataFutura(30), "Benguela",
        parseEther("0.08"), 300n, parseEther("0.25"), 600n
      );

      const detalhes = await factory.detalhesEvento(0n);
      expect(detalhes.nomeEvento).to.equal("Carnaval Digital");
      expect(detalhes.organizador).to.equal(await organizador1.getAddress());
      expect(detalhes.maxTickets).to.equal(300n);
      expect(detalhes.activo).to.equal(true);
    });
  });
});

// ========================
// TESTES — TicketMarketplace
// ========================

describe("TicketMarketplace", function () {

  async function deployTudo() {
    const signers    = await getSigners();
    const dono       = signers[0];
    const organizador = signers[1];
    const vendedor   = signers[2];
    const comprador  = signers[3];
    const scalper    = signers[4];

    const precoTicket = parseEther("0.1");

    const ticket = await deployContract("EventTicket", organizador, [
      "Evento Teste", dataFutura(30), "Luanda",
      precoTicket, 100n, parseEther("0.5"),
      await organizador.getAddress(), 1000n,
    ]);

    const marketplace = await deployContract("TicketMarketplace", dono, [250n]);

    // Vendedor compra um ticket
    await ticket.connect(vendedor).comprarTicket("VIP", "ipfs://abc", { value: precoTicket });

    // Aprovação do marketplace
    await ticket.connect(vendedor).setApprovalForAll(await marketplace.getAddress(), true);

    return { ticket, marketplace, dono, organizador, vendedor, comprador, scalper, precoTicket };
  }

  describe("listarTicket", function () {
    it("Deve listar um ticket com sucesso", async function () {
      const { ticket, marketplace, vendedor } = await deployTudo();

      await marketplace.connect(vendedor).listarTicket(
        await ticket.getAddress(), 1n, parseEther("0.2")
      );

      const listagem = await marketplace.detalhesListagem(1n);
      expect(listagem.vendedor).to.equal(await vendedor.getAddress());
      expect(listagem.preco).to.equal(parseEther("0.2"));
      expect(listagem.activa).to.equal(true);
    });

    it("Deve falhar se quem lista não for o dono", async function () {
      const { ticket, marketplace, comprador } = await deployTudo();

      await expect(
        marketplace.connect(comprador).listarTicket(
          await ticket.getAddress(), 1n, parseEther("0.2")
        )
      ).to.be.revertedWith("Nao es o dono deste ticket");
    });

    it("Deve falhar se o marketplace não tiver aprovação", async function () {
      const { ticket, marketplace, vendedor } = await deployTudo();

      await ticket.connect(vendedor).setApprovalForAll(await marketplace.getAddress(), false);

      await expect(
        marketplace.connect(vendedor).listarTicket(
          await ticket.getAddress(), 1n, parseEther("0.2")
        )
      ).to.be.revertedWith("Marketplace nao tem permissao para transferir o ticket");
    });
  });

  describe("comprarTicket", function () {
    it("Deve completar a compra e transferir o NFT", async function () {
      const { ticket, marketplace, vendedor, comprador } = await deployTudo();

      await marketplace.connect(vendedor).listarTicket(
        await ticket.getAddress(), 1n, parseEther("0.2")
      );
      await marketplace.connect(comprador).comprarTicket(1n, { value: parseEther("0.2") });

      expect(await ticket.ownerOf(1n)).to.equal(await comprador.getAddress());
    });

    it("Deve falhar se o valor enviado for incorrecto", async function () {
      const { ticket, marketplace, vendedor, comprador } = await deployTudo();

      await marketplace.connect(vendedor).listarTicket(
        await ticket.getAddress(), 1n, parseEther("0.2")
      );

      await expect(
        marketplace.connect(comprador).comprarTicket(1n, { value: parseEther("0.1") })
      ).to.be.revertedWith("Valor enviado incorreto");
    });

    it("Deve distribuir royalties, taxa e valor ao vendedor", async function () {
      const { ticket, marketplace, organizador, vendedor, comprador } = await deployTudo();
      const precoRevenda = parseEther("0.2");

      await marketplace.connect(vendedor).listarTicket(
        await ticket.getAddress(), 1n, precoRevenda
      );
      await marketplace.connect(comprador).comprarTicket(1n, { value: precoRevenda });

      const saldoVendedor   = await marketplace.saldoPendente(await vendedor.getAddress());
      const saldoOrganizador = await marketplace.saldoPendente(await organizador.getAddress());

      expect(saldoVendedor).to.equal(parseEther("0.175"));
      expect(saldoOrganizador).to.equal(parseEther("0.02"));
    });
  });

  describe("cancelarListagem", function () {
    it("Deve cancelar uma listagem activa", async function () {
      const { ticket, marketplace, vendedor } = await deployTudo();

      await marketplace.connect(vendedor).listarTicket(
        await ticket.getAddress(), 1n, parseEther("0.2")
      );
      await marketplace.connect(vendedor).cancelarListagem(1n);

      const listagem = await marketplace.detalhesListagem(1n);
      expect(listagem.activa).to.equal(false);
    });
  });

  describe("sacarSaldo", function () {
    it("Deve permitir ao vendedor sacar o saldo", async function () {
      const { ticket, marketplace, vendedor, comprador } = await deployTudo();
      const provider = await getProvider();

      await marketplace.connect(vendedor).listarTicket(
        await ticket.getAddress(), 1n, parseEther("0.2")
      );
      await marketplace.connect(comprador).comprarTicket(1n, { value: parseEther("0.2") });

      const saldoAntes = await provider.getBalance(await vendedor.getAddress());
      const tx = await marketplace.connect(vendedor).sacarSaldo();
      const recibo = await tx.wait();
      const gasPrice = recibo!.effectiveGasPrice ?? recibo!.gasPrice;
      const gasCusto = gasPrice ? recibo!.gasUsed * gasPrice : 0n;
      const saldoDepois = await provider.getBalance(await vendedor.getAddress());

      expect(saldoDepois).to.be.greaterThan(saldoAntes - gasCusto);
    });
  });

  describe("Blacklist", function () {
    it("Deve impedir scalper de comprar no marketplace", async function () {
      const { ticket, marketplace, dono, vendedor, scalper } = await deployTudo();

      await marketplace.connect(vendedor).listarTicket(
        await ticket.getAddress(), 1n, parseEther("0.2")
      );
      await marketplace.connect(dono).adicionarBlacklist(await scalper.getAddress());

      await expect(
        marketplace.connect(scalper).comprarTicket(1n, { value: parseEther("0.2") })
      ).to.be.revertedWith("Endereco bloqueado no marketplace");
    });
  });
});
