import { Global, Module } from "@nestjs/common";
import { EVENT_PUBLISHER } from "../../domain";
import { InMemoryEventBus } from "./in-memory-event-bus";

@Global()
@Module({
  providers: [{ provide: EVENT_PUBLISHER, useClass: InMemoryEventBus }],
  exports: [EVENT_PUBLISHER],
})
export class EventsModule {}
