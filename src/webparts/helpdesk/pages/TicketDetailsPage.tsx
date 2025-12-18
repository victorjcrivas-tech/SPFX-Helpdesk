import * as React from "react";
import { SpfxContextService } from "../services/SpfxContextService";
import { Text } from "@fluentui/react";

interface Props{
    spfx: SpfxContextService;
}

const TicketDetailsPage = ({spfx} : Props) => {
    return <Text variant="xLarge">Ticket Detail</Text>
}

export default TicketDetailsPage;