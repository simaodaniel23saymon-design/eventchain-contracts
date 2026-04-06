// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./EventTicket.sol";

/**
 * @title EventFactory
 * @author EventChain
 * @notice Contrato fábrica responsável por criar e registar novos eventos
 * @dev Cada evento criado aqui gera um novo contrato EventTicket independente
 */
contract EventFactory {

    // =====================
    // ESTRUTURAS
    // =====================

    /**
     * @notice Estrutura com as informações resumidas de um evento
     */
    struct InfoEvento {
        address enderecoContrato; // Endereço do contrato EventTicket
        address organizador;     // Quem criou o evento
        string nomeEvento;       // Nome do evento
        uint256 dataEvento;      // Data em timestamp Unix
        uint256 precoTicket;     // Preço por ticket em wei
        uint256 maxTickets;      // Quantidade máxima de tickets
        bool activo;             // Se o evento está activo
    }

    // =====================
    // VARIÁVEIS DE ESTADO
    // =====================

    /// @notice Lista de todos os eventos criados
    InfoEvento[] public eventos;

    /// @notice Mapeamento de organizador para os índices dos seus eventos
    mapping(address => uint256[]) public eventosPorOrganizador;

    /// @notice Taxa da plataforma em base 10000 (ex: 250 = 2.5%)
    uint256 public taxaPlataforma;

    /// @notice Endereço que recebe as taxas da plataforma
    address public carteiraTaxa;

    // =====================
    // EVENTOS
    // =====================

    /// @notice Emitido quando um novo evento é criado
    event EventoCriado(
        uint256 indexed idEvento,
        address indexed enderecoContrato,
        address indexed organizador,
        string nomeEvento
    );

    // =====================
    // CONSTRUTOR
    // =====================

    /**
     * @notice Inicializa a fábrica com a taxa da plataforma
     * @param _taxaPlataforma Taxa em base 10000 (ex: 250 = 2.5%)
     */
    constructor(uint256 _taxaPlataforma) {
        taxaPlataforma = _taxaPlataforma;
        carteiraTaxa = msg.sender;
    }

    // =====================
    // FUNÇÕES PRINCIPAIS
    // =====================

    /**
     * @notice Cria um novo evento e faz deploy do contrato EventTicket
     * @param _nomeEvento Nome do evento
     * @param _dataEvento Data do evento em timestamp Unix
     * @param _localEvento Local do evento
     * @param _precoTicket Preço de cada ticket em wei
     * @param _maxTickets Quantidade máxima de tickets
     * @param _precoMaxRevenda Preço máximo permitido para revenda
     * @param _percentagemRoyalty Percentagem de royalty (ex: 1000 = 10%)
     * @return enderecoContrato Endereço do novo contrato EventTicket
     */
    function criarEvento(
        string memory _nomeEvento,
        uint256 _dataEvento,
        string memory _localEvento,
        uint256 _precoTicket,
        uint256 _maxTickets,
        uint256 _precoMaxRevenda,
        uint96 _percentagemRoyalty
    ) external returns (address enderecoContrato) {
        require(_dataEvento > block.timestamp, "Data do evento deve ser no futuro");
        require(_maxTickets > 0, "Deve haver pelo menos um ticket");
        require(_percentagemRoyalty <= 3000, "Royalty nao pode exceder 30%");

        // Faz deploy de um novo contrato EventTicket
        EventTicket novoEvento = new EventTicket(
            _nomeEvento,
            _dataEvento,
            _localEvento,
            _precoTicket,
            _maxTickets,
            _precoMaxRevenda,
            msg.sender,
            _percentagemRoyalty
        );

        enderecoContrato = address(novoEvento);

        // Regista o evento na lista global
        uint256 idEvento = eventos.length;
        eventos.push(InfoEvento({
            enderecoContrato: enderecoContrato,
            organizador: msg.sender,
            nomeEvento: _nomeEvento,
            dataEvento: _dataEvento,
            precoTicket: _precoTicket,
            maxTickets: _maxTickets,
            activo: true
        }));

        // Regista o evento no mapeamento do organizador
        eventosPorOrganizador[msg.sender].push(idEvento);

        emit EventoCriado(idEvento, enderecoContrato, msg.sender, _nomeEvento);
    }

    // =====================
    // FUNÇÕES DE LEITURA
    // =====================

    /**
     * @notice Retorna o total de eventos criados na plataforma
     */
    function totalEventos() external view returns (uint256) {
        return eventos.length;
    }

    /**
     * @notice Retorna todos os eventos de um organizador específico
     * @param _organizador Endereço do organizador
     */
    function eventosDoOrganizador(address _organizador)
        external
        view
        returns (uint256[] memory)
    {
        return eventosPorOrganizador[_organizador];
    }

    /**
     * @notice Retorna os detalhes de um evento pelo seu ID
     * @param _idEvento ID do evento
     */
    function detalhesEvento(uint256 _idEvento)
        external
        view
        returns (InfoEvento memory)
    {
        require(_idEvento < eventos.length, "Evento nao existe");
        return eventos[_idEvento];
    }

    /**
     * @notice Retorna todos os eventos activos da plataforma
     */
    function eventosActivos() external view returns (InfoEvento[] memory) {
        uint256 total = 0;

        // Conta quantos estão activos
        for (uint256 i = 0; i < eventos.length; i++) {
            if (eventos[i].activo) total++;
        }

        // Preenche o array de retorno
        InfoEvento[] memory activos = new InfoEvento[](total);
        uint256 indice = 0;
        for (uint256 i = 0; i < eventos.length; i++) {
            if (eventos[i].activo) {
                activos[indice] = eventos[i];
                indice++;
            }
        }

        return activos;
    }
}