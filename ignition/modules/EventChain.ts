import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const EventChainModule = buildModule("EventChainModule", (m) => {
  // 1. Deploy do Marketplace (taxa de 5% = 500 basis points)
  const marketplace = m.contract("TicketMarketplace", [500]);

  // 2. Deploy da Factory passando o endereço do Marketplace
  const factory = m.contract("EventFactory", [marketplace]);

  return { marketplace, factory };
});

export default EventChainModule;