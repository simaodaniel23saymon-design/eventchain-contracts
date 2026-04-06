// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title EventTicket
 * @author EventChain
 * @notice Contrato de tickets para eventos como NFTs com royalties automáticos
 * @dev Implementa ERC721 (NFT) + ERC2981 (royalties) + Ownable (controlo de acesso)
 */
contract EventTicket is ERC721, ERC2981, Ownable {

    // =====================
    // VARIÁVEIS DE ESTADO
    // =====================

    /// @notice Contador de IDs dos tickets (substitui Counters.sol removido no OZ v5)
    uint256 private _totalMintado;

    /// @notice Nome do evento
    string public nomeEvento;

    /// @notice Data do evento (timestamp Unix)
    uint256 public dataEvento;

    /// @notice Local do evento
    string public localEvento;

    /// @notice Preço de mint de cada ticket (em wei)
    uint256 public precoTicket;

    /// @notice Quantidade máxima de tickets disponíveis
    uint256 public maxTickets;

    /// @notice Indica se a venda está activa
    bool public vendaActiva;

    /// @notice Teto máximo de preço de revenda (anti-scalper)
    uint256 public precoMaxRevenda;

    /// @notice Mapeamento de endereços na blacklist
    mapping(address => bool) public blacklist;

    /// @notice Mapeamento de tokenId para categoria do assento
    mapping(uint256 => string) public categoriaTicket;

    /// @notice Mapeamento de tokenId para URI dos metadados
    mapping(uint256 => string) private _tokenURIs;

    // =====================
    // EVENTOS
    // =====================

    /// @notice Emitido quando um novo ticket é criado
    event TicketMintado(address indexed comprador, uint256 indexed tokenId, string categoria);

    /// @notice Emitido quando um endereço é adicionado à blacklist
    event EnderecoBlacklisted(address indexed endereco);

    /// @notice Emitido quando a venda é activada ou desactivada
    event VendaActualizada(bool activa);

    // =====================
    // MODIFICADORES
    // =====================

    /// @notice Garante que o endereço não está na blacklist
    modifier naoBlacklisted(address _endereco) {
        require(!blacklist[_endereco], "Endereco bloqueado pelo organizador");
        _;
    }

    /// @notice Garante que a venda está activa
    modifier vendaEstaActiva() {
        require(vendaActiva, "Venda de tickets nao esta activa");
        _;
    }

    // =====================
    // CONSTRUTOR
    // =====================

    /**
     * @notice Inicializa o contrato do evento
     * @param _nomeEvento Nome do evento
     * @param _dataEvento Data do evento em timestamp Unix
     * @param _localEvento Local onde o evento acontece
     * @param _precoTicket Preco de cada ticket em wei
     * @param _maxTickets Quantidade maxima de tickets
     * @param _precoMaxRevenda Preco maximo permitido para revenda
     * @param _organizador Endereco do organizador (recebe royalties)
     * @param _percentagemRoyalty Percentagem de royalty em base 10000 (ex: 1000 = 10%)
     */
    constructor(
        string memory _nomeEvento,
        uint256 _dataEvento,
        string memory _localEvento,
        uint256 _precoTicket,
        uint256 _maxTickets,
        uint256 _precoMaxRevenda,
        address _organizador,
        uint96 _percentagemRoyalty
    ) ERC721("EventChain Ticket", "ECT") Ownable(_organizador) {
        nomeEvento = _nomeEvento;
        dataEvento = _dataEvento;
        localEvento = _localEvento;
        precoTicket = _precoTicket;
        maxTickets = _maxTickets;
        precoMaxRevenda = _precoMaxRevenda;
        vendaActiva = true;

        // Define royalties: organizador recebe _percentagemRoyalty em cada revenda
        _setDefaultRoyalty(_organizador, _percentagemRoyalty);
    }

    // =====================
    // FUNÇÕES PRINCIPAIS
    // =====================

    /**
     * @notice Compra um ticket para o evento
     * @param _categoria Categoria do assento (ex: "VIP", "GERAL", "CAMAROTE")
     * @param _metadataURI Link IPFS com os metadados do ticket
     */
    function comprarTicket(
        string memory _categoria,
        string memory _metadataURI
    )
        external
        payable
        vendaEstaActiva
        naoBlacklisted(msg.sender)
    {
        require(msg.value == precoTicket, "Valor enviado incorreto");
        require(_totalMintado < maxTickets, "Todos os tickets foram vendidos");

        // Incrementa e faz mint
        _totalMintado++;
        uint256 novoId = _totalMintado;

        _safeMint(msg.sender, novoId);
        _tokenURIs[novoId] = _metadataURI;
        categoriaTicket[novoId] = _categoria;

        emit TicketMintado(msg.sender, novoId, _categoria);
    }

    /**
     * @notice Retorna os metadados de um ticket
     * @param tokenId ID do ticket
     */
    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        require(_ownerOf(tokenId) != address(0), "Ticket nao existe");
        return _tokenURIs[tokenId];
    }

    /**
     * @notice Adiciona um endereço à blacklist (apenas organizador)
     * @param _endereco Endereço a bloquear
     */
    function adicionarBlacklist(address _endereco) external onlyOwner {
        blacklist[_endereco] = true;
        emit EnderecoBlacklisted(_endereco);
    }

    /**
     * @notice Activa ou desactiva a venda de tickets (apenas organizador)
     * @param _activa true para activar, false para desactivar
     */
    function toggleVenda(bool _activa) external onlyOwner {
        vendaActiva = _activa;
        emit VendaActualizada(_activa);
    }

    /**
     * @notice Retira os fundos acumulados das vendas (apenas organizador)
     */
    function retirarFundos() external onlyOwner {
        uint256 saldo = address(this).balance;
        require(saldo > 0, "Sem fundos para retirar");
        payable(owner()).transfer(saldo);
    }

    /**
     * @notice Retorna o total de tickets vendidos
     */
    function totalVendidos() external view returns (uint256) {
        return _totalMintado;
    }

    /**
     * @notice Verifica se um ticket pertence a um endereço (verificação na entrada)
     * @param _endereco Endereço a verificar
     * @param _tokenId ID do ticket
     */
    function verificarTicket(address _endereco, uint256 _tokenId)
        external
        view
        returns (bool)
    {
        return ownerOf(_tokenId) == _endereco;
    }

    // =====================
    // OVERRIDES NECESSÁRIOS
    // =====================

    /**
     * @dev Override necessário para compatibilidade entre ERC721 e ERC2981
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}