// ============================================================
// EventChain — Endereços e ABIs dos contratos na Sepolia
// ============================================================

export const CHAIN_ID = 11155111 // Sepolia

export const ADDRESSES = {
  EventFactory:      '0xd9eE3631C0003Cb97CAC1F6c8C2930c7aEbFB757',
  TicketMarketplace: '0x2f8F311953FCa739173BdB7627051e4569e440fb',
} as const

// ————————————————————————————————————————————
// EventFactory ABI
// ————————————————————————————————————————————
export const EVENT_FACTORY_ABI = [
  {
    inputs: [{ name: '_taxaPlataforma', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true,  name: 'idEvento',         type: 'uint256' },
      { indexed: true,  name: 'enderecoContrato',  type: 'address' },
      { indexed: true,  name: 'organizador',       type: 'address' },
      { indexed: false, name: 'nomeEvento',        type: 'string'  },
    ],
    name: 'EventoCriado',
    type: 'event',
  },
  {
    inputs: [
      { name: '_nomeEvento',        type: 'string'  },
      { name: '_dataEvento',        type: 'uint256' },
      { name: '_localEvento',       type: 'string'  },
      { name: '_precoTicket',       type: 'uint256' },
      { name: '_maxTickets',        type: 'uint256' },
      { name: '_precoMaxRevenda',   type: 'uint256' },
      { name: '_percentagemRoyalty', type: 'uint96' },
    ],
    name: 'criarEvento',
    outputs: [{ name: 'enderecoContrato', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalEventos',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: '_idEvento', type: 'uint256' }],
    name: 'detalhesEvento',
    outputs: [
      {
        components: [
          { name: 'enderecoContrato', type: 'address' },
          { name: 'organizador',      type: 'address' },
          { name: 'nomeEvento',       type: 'string'  },
          { name: 'dataEvento',       type: 'uint256' },
          { name: 'precoTicket',      type: 'uint256' },
          { name: 'maxTickets',       type: 'uint256' },
          { name: 'activo',           type: 'bool'    },
        ],
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: '_organizador', type: 'address' }],
    name: 'eventosDoOrganizador',
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'eventosActivos',
    outputs: [
      {
        components: [
          { name: 'enderecoContrato', type: 'address' },
          { name: 'organizador',      type: 'address' },
          { name: 'nomeEvento',       type: 'string'  },
          { name: 'dataEvento',       type: 'uint256' },
          { name: 'precoTicket',      type: 'uint256' },
          { name: 'maxTickets',       type: 'uint256' },
          { name: 'activo',           type: 'bool'    },
        ],
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
] as const

// ————————————————————————————————————————————
// EventTicket ABI (interagido via endereço dinâmico)
// ————————————————————————————————————————————
export const EVENT_TICKET_ABI = [
  {
    inputs: [
      { name: '_categoria',    type: 'string' },
      { name: '_metadataURI',  type: 'string' },
    ],
    name: 'comprarTicket',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'nomeEvento',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'precoTicket',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'maxTickets',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalVendidos',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'vendaActiva',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'localEvento',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'dataEvento',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: '_endereco', type: 'address' },
      { name: '_tokenId',  type: 'uint256' },
    ],
    name: 'verificarTicket',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'operator', type: 'address' },
      { name: 'approved', type: 'bool' },
    ],
    name: 'setApprovalForAll',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const

// ————————————————————————————————————————————
// TicketMarketplace ABI
// ————————————————————————————————————————————
export const MARKETPLACE_ABI = [
  {
    inputs: [
      { name: '_enderecoContrato', type: 'address' },
      { name: '_tokenId',          type: 'uint256' },
      { name: '_preco',            type: 'uint256' },
    ],
    name: 'listarTicket',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: '_idListagem', type: 'uint256' }],
    name: 'comprarTicket',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ name: '_idListagem', type: 'uint256' }],
    name: 'cancelarListagem',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'sacarSaldo',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: '_idListagem', type: 'uint256' }],
    name: 'detalhesListagem',
    outputs: [
      {
        components: [
          { name: 'vendedor',          type: 'address' },
          { name: 'enderecoContrato',  type: 'address' },
          { name: 'tokenId',           type: 'uint256' },
          { name: 'preco',             type: 'uint256' },
          { name: 'activa',            type: 'bool'    },
        ],
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalListagens',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: '', type: 'address' }],
    name: 'saldoPendente',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const
