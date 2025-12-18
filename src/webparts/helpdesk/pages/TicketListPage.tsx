import * as React from "react";
import {Text} from "@fluentui/react";
import { SpfxContextService } from "../services/SpfxContextService";

interface Props{
    spfx: SpfxContextService;
}

const TicketListPage = ({spfx}: Props) => {
    return <Text variant="xLarge">Ticket List</Text>;
};

export default TicketListPage;