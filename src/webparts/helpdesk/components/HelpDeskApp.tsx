import * as React from "react";
import { WebPartContext } from "@microsoft/sp-webpart-base";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { initializeIcons } from "@fluentui/react";

import TicketListPage from "../pages/TicketListPage";
import TicketFormPage from "../pages/TicketFormPage";
import TicketDetailsPage from "../pages/TicketDetailsPage";
import DashboardPage from "../pages/DashboardPage";
import { SpfxContextService } from "../services/SpfxContextService";

initializeIcons();

export interface IHelpdeskAppProps{
    context: WebPartContext;
}

const HelpdeskApp = ({context}: IHelpdeskAppProps) => {

    const spfxService = React.useMemo(
        () => new SpfxContextService(context),
    [context]
    );

    return(
        <HashRouter>
            <Routes>

                <Route 
                    path="/" 
                    element={<Navigate to="/tickets" replace />}
                />

                <Route 
                    path="/tickets" 
                    element={<TicketListPage spfx={spfxService} />}
                />

                <Route 
                    path="/tickets/new" 
                    element={<TicketFormPage spfx={spfxService} />}
                />

                <Route 
                    path="/tickets/:id" 
                    element={<TicketDetailsPage spfx={spfxService} />}
                />

                <Route 
                    path="/dashboard" 
                    element={<DashboardPage spfx={spfxService} />}
                />

                <Route path="*" element={<Navigate to="/tickets" replace />} />
                
            </Routes>
        </HashRouter>
    )
};

export default HelpdeskApp;




