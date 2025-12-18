import * as React from "react";
import { SpfxContextService } from "../services/SpfxContextService";
import { Text } from "@fluentui/react";

interface Props{
    spfx: SpfxContextService
};

const DashboardPage = ({spfx} : Props) => {
    return <Text variant="xLarge">Dashboard</Text>
};

export default DashboardPage;