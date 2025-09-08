// DialogContext.js
import React, { createContext, useContext, useState } from "react";
import EditFunctionDialog from "../components/ui/dialogs/EditFunctionDialog";
import ChangeGraphBoundDialog from "../components/ui/dialogs/ChangeGraphBoundDialog";
import ShowHideFunctionsDialog from "../components/ui/dialogs/ShowHideFunctionsDialog";
import MovementAdjustmentsDialog from "../components/ui/dialogs/MovementAdjustmentsDialog";
import SpeedAdjustmentDialog from "../components/ui/dialogs/SpeedAdjustmentDialog";
import ShareDialog from "../components/ui/dialogs/shareDialog";
import ExportJsonDialog from "../components/ui/dialogs/ExportJsonDialog";
import ImportJsonDialog from "../components/ui/dialogs/ImportJsonDialog";
import WelcomeDialog from "../components/ui/dialogs/WelcomeDialog";

const DialogContext = createContext();

export const useDialog = () => useContext(DialogContext);

export function DialogProvider({ children }) {
  const [dialog, setDialog] = useState({ type: null, props: {} });

  const openDialog = (type, props = {}) => setDialog({ type, props });
  const closeDialog = () => setDialog({ type: null, props: {} });

  // Check if edit function dialog is open
  const isEditFunctionDialogOpen = dialog.type === "edit-function";

  return (
    <DialogContext.Provider value={{ openDialog, closeDialog, isEditFunctionDialogOpen }}>
      {children}

      <EditFunctionDialog
        isOpen={dialog.type === "edit-function"}
        onClose={closeDialog}
        {...dialog.props}
      />
      
      <ChangeGraphBoundDialog
        isOpen={dialog.type === "change-graph-bound"}
        onClose={closeDialog}
        {...dialog.props}
      />

      <ShowHideFunctionsDialog
        isOpen={dialog.type === "showHide-functions"}
        onClose={closeDialog}
        {...dialog.props}
      />

      <MovementAdjustmentsDialog
        isOpen={dialog.type === "movement-adjustments"}
        onClose={closeDialog}
        {...dialog.props}
      />

      <SpeedAdjustmentDialog
        isOpen={dialog.type === "speed-adjustment"}
        onClose={closeDialog}
        {...dialog.props}
      />

      <ShareDialog
        isOpen={dialog.type === "share"}
        onClose={closeDialog}
        {...dialog.props}
      />

      <ImportJsonDialog
        isOpen={dialog.type === "import-json"}
        onClose={closeDialog}
        {...dialog.props}
      />

      <ExportJsonDialog
        isOpen={dialog.type === "export-json"}
        onClose={closeDialog}
        {...dialog.props}
      />

      <WelcomeDialog
        isOpen={dialog.type === "welcome"}
        onClose={closeDialog}
        {...dialog.props}
      />
    </DialogContext.Provider>
  );
}
