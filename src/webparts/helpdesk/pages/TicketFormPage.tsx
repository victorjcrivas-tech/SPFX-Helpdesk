import * as React from "react";
import { SpfxContextService } from "../services/SpfxContextService";
import { Text } from "@fluentui/react";

interface Props{
    spfx: SpfxContextService;
}

const TicketFormPage = ({spfx} : Props) => {
    return <Text variant="xLarge">Ticket Form</Text>
}

export default TicketFormPage;