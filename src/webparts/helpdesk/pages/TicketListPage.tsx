import * as React from "react";
import {PrimaryButton, Text} from "@fluentui/react";
import { SpfxContextService } from "../services/SpfxContextService";
import { TicketService } from "../services/TicketService";

interface Props{
    spfx: SpfxContextService;
}

const TicketListPage = ({spfx}: Props) => {

    const ticketService = React.useMemo(
        ()=> new TicketService(spfx.sp), 
        [spfx]
    );

    const [count, setCount] = React.useState<number>(0);

    const load = async () => {
        const res = await ticketService.search({ page: 1, pageSize: 10, orderBy: "Created", orderDir: "desc" });
        setCount(res.total);
    };

    return(
        <div>
            <PrimaryButton text="Cargar tickets" onClick={load} />
            <Text>Total: {count}</Text>
        </div>
    )
};

export default TicketListPage;