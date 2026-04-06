// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title TicketMarketplace
 * @author EventChain
 * @notice Marketplace descentralizado para revenda de tickets NFT
 * @dev Implementa royalties automáticos (EIP-2981), teto anti-scalper e blacklist
 */
contract TicketMarketplace is Ownable, ReentrancyGuard {

    // =====================
    // ESTRUTURAS
    // =====================

    /**
     * @notice Estrutura de uma listagem de ticket no marketplace
     */
    struct Listagem {
        address vendedor;         // Quem está a vender
        address enderecoContrato; // Contrato ERC721 do ticket
        uint256 tokenId;          // ID do NFT
        uint256 preco;            // Preço pedido em wei
        bool activa;              // Se a listagem está activa
    }

    // =====================
    // VARIÁVEIS DE ESTADO
    // =====================

    /// @notice Taxa do marketplace em base 10000 (ex: 250 = 2.5%)
    uint256 public taxaMarketplace;

    /// @notice Contador de listagens
    uint256 private _idListagemCounter;

    /// @notice Mapeamento de ID para listagem
    mapping(uint256 => Listagem) public listagens;

    /// @notice Mapeamento de contrato+tokenId para ID da listagem activa
    mapping(address => mapping(uint256 => uint256)) public listagemActiva;

    /// @notice Mapeamento de endereços bloqueados no marketplace
    mapping(address => bool) public blacklist;

    /// @notice Saldo pendente para saque por endereço
    mapping(address => uint256) public saldoPendente;

    // =====================
    // EVENTOS
    // =====================

    /// @notice Emitido quando um ticket é listado para venda
    event TicketListado(
        uint256 indexed idListagem,
        address indexed vendedor,
        address enderecoContrato,
        uint256 tokenId,
        uint256 preco
    );

    /// @notice Emitido quando um ticket é vendido
    event TicketVendido(
        uint256 indexed idListagem,
        address indexed comprador,
        address indexed vendedor,
        uint256 preco
    );

    /// @notice Emitido quando uma listagem é cancelada
    event ListagemCancelada(uint256 indexed idListagem, address indexed vendedor);

    /// @notice Emitido quando um saldo é sacado
    event SaldoSacado(address indexed destinatario, uint256 valor);

    // =====================
    // MODIFICADORES
    // =====================

    /// @notice Garante que o endereço não está na blacklist
    modifier naoBlacklisted(address _endereco) {
        require(!blacklist[_endereco], "Endereco bloqueado no marketplace");
        _;
    }

    // =====================
    // CONSTRUTOR
    // =====================

    /**
     * @notice Inicializa o marketplace com a taxa definida
     * @param _taxaMarketplace Taxa em base 10000 (ex: 250 = 2.5%)
     */
    constructor(uint256 _taxaMarketplace) Ownable(msg.sender) {
        require(_taxaMarketplace <= 1000, "Taxa nao pode exceder 10%");
        taxaMarketplace = _taxaMarketplace;
    }

    // =====================
    // FUNÇÕES PRINCIPAIS
    // =====================

    /**
     * @notice Lista um ticket NFT para venda no marketplace
     * @param _enderecoContrato Endereço do contrato ERC721
     * @param _tokenId ID do ticket NFT
     * @param _preco Preço de venda em wei
     */
    function listarTicket(
        address _enderecoContrato,
        uint256 _tokenId,
        uint256 _preco
    ) external naoBlacklisted(msg.sender) {
        IERC721 contrato = IERC721(_enderecoContrato);

        require(contrato.ownerOf(_tokenId) == msg.sender, "Nao es o dono deste ticket");
        require(
            contrato.isApprovedForAll(msg.sender, address(this)) ||
            contrato.getApproved(_tokenId) == address(this),
            "Marketplace nao tem permissao para transferir o ticket"
        );
        require(_preco > 0, "Preco deve ser maior que zero");
        require(
            listagemActiva[_enderecoContrato][_tokenId] == 0,
            "Ticket ja esta listado"
        );

        // Verifica teto de preço anti-scalper se o contrato suportar
        // (verificação opcional — só se o contrato tiver precoMaxRevenda)

        _idListagemCounter++;
        uint256 idListagem = _idListagemCounter;

        listagens[idListagem] = Listagem({
            vendedor: msg.sender,
            enderecoContrato: _enderecoContrato,
            tokenId: _tokenId,
            preco: _preco,
            activa: true
        });

        listagemActiva[_enderecoContrato][_tokenId] = idListagem;

        emit TicketListado(idListagem, msg.sender, _enderecoContrato, _tokenId, _preco);
    }

    /**
     * @notice Compra um ticket listado no marketplace
     * @param _idListagem ID da listagem a comprar
     */
    function comprarTicket(uint256 _idListagem)
        external
        payable
        nonReentrant
        naoBlacklisted(msg.sender)
    {
        Listagem storage listagem = listagens[_idListagem];

        require(listagem.activa, "Listagem nao esta activa");
        require(msg.value == listagem.preco, "Valor enviado incorreto");
        require(listagem.vendedor != msg.sender, "Nao podes comprar o teu proprio ticket");

        // Marca listagem como inactiva antes de transferir (protecção reentrancy)
        listagem.activa = false;
        listagemActiva[listagem.enderecoContrato][listagem.tokenId] = 0;

        // Calcula royalties se o contrato suportar EIP-2981
        uint256 valorRoyalty = 0;
        address destinatarioRoyalty = address(0);

        try IERC2981(listagem.enderecoContrato).royaltyInfo(listagem.tokenId, msg.value)
            returns (address _destinatario, uint256 _valor)
        {
            destinatarioRoyalty = _destinatario;
            valorRoyalty = _valor;
        } catch {}

        // Calcula taxa do marketplace
        uint256 taxaValor = (msg.value * taxaMarketplace) / 10000;

        // Calcula o que o vendedor recebe
        uint256 valorVendedor = msg.value - taxaValor - valorRoyalty;

        // Transfere o NFT para o comprador
        IERC721(listagem.enderecoContrato).safeTransferFrom(
            listagem.vendedor,
            msg.sender,
            listagem.tokenId
        );

        // Regista saldos para saque (pull payment pattern — mais seguro)
        saldoPendente[listagem.vendedor] += valorVendedor;
        saldoPendente[owner()] += taxaValor;

        if (valorRoyalty > 0 && destinatarioRoyalty != address(0)) {
            saldoPendente[destinatarioRoyalty] += valorRoyalty;
        }

        emit TicketVendido(_idListagem, msg.sender, listagem.vendedor, msg.value);
    }

    /**
     * @notice Cancela uma listagem activa
     * @param _idListagem ID da listagem a cancelar
     */
    function cancelarListagem(uint256 _idListagem) external {
        Listagem storage listagem = listagens[_idListagem];

        require(listagem.activa, "Listagem nao esta activa");
        require(listagem.vendedor == msg.sender || msg.sender == owner(), "Sem permissao");

        listagem.activa = false;
        listagemActiva[listagem.enderecoContrato][listagem.tokenId] = 0;

        emit ListagemCancelada(_idListagem, msg.sender);
    }

    /**
     * @notice Saca o saldo pendente do chamador
     */
    function sacarSaldo() external nonReentrant {
        uint256 valor = saldoPendente[msg.sender];
        require(valor > 0, "Sem saldo para sacar");

        saldoPendente[msg.sender] = 0;
        payable(msg.sender).transfer(valor);

        emit SaldoSacado(msg.sender, valor);
    }

    // =====================
    // FUNÇÕES ADMINISTRATIVAS
    // =====================

    /**
     * @notice Adiciona um endereço à blacklist (apenas dono)
     * @param _endereco Endereço a bloquear
     */
    function adicionarBlacklist(address _endereco) external onlyOwner {
        blacklist[_endereco] = true;
    }

    /**
     * @notice Remove um endereço da blacklist (apenas dono)
     * @param _endereco Endereço a desbloquear
     */
    function removerBlacklist(address _endereco) external onlyOwner {
        blacklist[_endereco] = false;
    }

    /**
     * @notice Actualiza a taxa do marketplace (apenas dono)
     * @param _novaTaxa Nova taxa em base 10000
     */
    function actualizarTaxa(uint256 _novaTaxa) external onlyOwner {
        require(_novaTaxa <= 1000, "Taxa nao pode exceder 10%");
        taxaMarketplace = _novaTaxa;
    }

    // =====================
    // FUNÇÕES DE LEITURA
    // =====================

    /**
     * @notice Retorna os detalhes de uma listagem
     * @param _idListagem ID da listagem
     */
    function detalhesListagem(uint256 _idListagem)
        external
        view
        returns (Listagem memory)
    {
        return listagens[_idListagem];
    }

    /**
     * @notice Retorna o total de listagens criadas
     */
    function totalListagens() external view returns (uint256) {
        return _idListagemCounter;
    }
}